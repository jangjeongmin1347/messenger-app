// 실시간 메시징 + 통화 시그널링 서버
// Next.js 앱과 별도 프로세스로 띄웁니다: node server/realtime-server.js
const { createServer } = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const httpServer = createServer();
const io = new Server(httpServer, {
  // 운영 환경에서는 CORS_ORIGIN 환경변수에 실제 프론트엔드 도메인을 넣어 제한하세요 (쉼표로 여러 개 가능).
  // 설정하지 않으면 개발 편의를 위해 모든 출처를 허용합니다.
  cors: { origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*" },
});

// 소켓 연결 시 토큰으로 사용자 인증
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

// userId -> socket.id 매핑 (한 사용자가 여러 탭을 열 수도 있어 배열로 관리)
const onlineUsers = new Map();

// channelName -> { callerId, receiverId, callType } — 아직 연결되지 않은(벨이 울리는 중인) 통화 추적용
// 여기 남아있는 채로 거절/무응답/오프라인 상황을 맞으면 "부재중 전화"로 기록합니다.
const pendingCalls = new Map();

async function logCallMessage(callerId, receiverId, callType, outcome) {
  // outcome: "no-answer" | "declined" | "unavailable"
  const label =
    outcome === "declined"
      ? callType === "video"
        ? "거절된 영상통화"
        : "거절된 음성통화"
      : callType === "video"
      ? "부재중 영상통화"
      : "부재중 전화";

  const message = await prisma.message.create({
    data: { senderId: callerId, receiverId, content: label, type: "CALL_LOG" },
  });

  // 평소 메시지와 같은 이벤트로 흘려보내서 채팅 UI·안읽음 배지·토스트가 자동으로 반응하게 함
  const receiverSockets = onlineUsers.get(receiverId);
  if (receiverSockets) {
    receiverSockets.forEach((sid) => io.to(sid).emit("message:receive", message));
  }
  const callerSockets = onlineUsers.get(callerId);
  if (callerSockets) {
    callerSockets.forEach((sid) => io.to(sid).emit("message:sent", message));
  }
}

io.on("connection", (socket) => {
  const userId = socket.userId;
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  // ---- 실시간 메시징 ----
  socket.on("message:send", async ({ receiverId, content }) => {
    const message = await prisma.message.create({
      data: { senderId: userId, receiverId, content },
    });

    // 상대방이 접속 중이면 즉시 전달
    const receiverSockets = onlineUsers.get(receiverId);
    if (receiverSockets) {
      receiverSockets.forEach((sid) => io.to(sid).emit("message:receive", message));
    }
    // 보낸 사람에게도 저장 완료를 알려 UI를 업데이트
    socket.emit("message:sent", message);
  });

  // ---- 통화 벨소리 알림 ----
  // 실제 음성/영상 미디어는 Agora SFU가 처리하므로, 여기서는 "누가 전화를 걸었는지"와
  // "어느 채널에서 만날지"만 상대방에게 알려주면 됩니다 (SDP/ICE 교환은 필요 없음).
  socket.on("call:invite", ({ receiverId, callType, channelName }) => {
    // callType: "voice" | "video"
    const receiverSockets = onlineUsers.get(receiverId);
    if (!receiverSockets || receiverSockets.size === 0) {
      socket.emit("call:unavailable", { receiverId });
      logCallMessage(userId, receiverId, callType, "unavailable");
      return;
    }
    pendingCalls.set(channelName, { callerId: userId, receiverId, callType });
    receiverSockets.forEach((sid) =>
      io.to(sid).emit("call:incoming", { callerId: userId, callType, channelName })
    );
  });

  // 수신자가 수락 버튼을 눌렀을 때 — 더 이상 "무응답"으로 취급하지 않도록 pending 목록에서 제거
  socket.on("call:accept", ({ channelName }) => {
    const pending = pendingCalls.get(channelName);
    if (!pending) return;
    pendingCalls.delete(channelName);
    const callerSockets = onlineUsers.get(pending.callerId);
    if (callerSockets) {
      callerSockets.forEach((sid) => io.to(sid).emit("call:accepted", { channelName }));
    }
  });

  socket.on("call:decline", ({ callerId, channelName }) => {
    const pending = pendingCalls.get(channelName);
    if (pending) {
      pendingCalls.delete(channelName);
      logCallMessage(pending.callerId, pending.receiverId, pending.callType, "declined");
    }
    const callerSockets = onlineUsers.get(callerId);
    if (callerSockets) {
      callerSockets.forEach((sid) => io.to(sid).emit("call:declined", { fromUserId: userId }));
    }
  });

  // 벨이 일정 시간 울렸는데도 응답이 없을 때 발신자 쪽에서 보내는 신호
  socket.on("call:timeout", ({ channelName }) => {
    const pending = pendingCalls.get(channelName);
    if (!pending) return; // 이미 수락/거절/오프라인 처리가 끝난 경우 무시
    pendingCalls.delete(channelName);
    logCallMessage(pending.callerId, pending.receiverId, pending.callType, "no-answer");

    // 수신자 화면에 아직 떠 있는 "전화 옴" 알림을 정리
    const receiverSockets = onlineUsers.get(pending.receiverId);
    if (receiverSockets) {
      receiverSockets.forEach((sid) => io.to(sid).emit("call:cancelled", { channelName }));
    }
  });

  socket.on("call:end", ({ targetUserId }) => {
    const targetSockets = onlineUsers.get(targetUserId);
    if (targetSockets) {
      targetSockets.forEach((sid) => io.to(sid).emit("call:ended", { fromUserId: userId }));
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.get(userId)?.delete(socket.id);
    if (onlineUsers.get(userId)?.size === 0) onlineUsers.delete(userId);
  });
});

// Render 같은 플랫폼은 자체적으로 PORT 환경변수를 할당하고 그 포트로 열려있는지 확인합니다.
// 로컬 개발 시에는 REALTIME_PORT(또는 기본값 4000)를 그대로 사용합니다.
const PORT = process.env.PORT || process.env.REALTIME_PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`실시간 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
