"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/socket-context";

type IncomingCall = {
  callerId: string;
  callType: "voice" | "video";
  channelName: string;
};

/**
 * app/layout.tsx에 한 번만 넣어두면, 로그인해 있는 동안 어느 화면에 있든
 * 전화가 오면 이 컴포넌트가 알림을 띄워줍니다.
 */
export default function IncomingCallListener() {
  const socket = useSocket();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onIncoming = (call: IncomingCall) => setIncomingCall(call);
    socket.on("call:incoming", onIncoming);

    // 발신자가 일정 시간 응답이 없어 스스로 포기한 경우 — 아직 안 받은 벨 알림을 정리
    const onCancelled = ({ channelName }: { channelName: string }) => {
      setIncomingCall((prev) => (prev?.channelName === channelName ? null : prev));
    };
    socket.on("call:cancelled", onCancelled);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:cancelled", onCancelled);
    };
  }, [socket]);

  if (!incomingCall) return null;

  function accept() {
    if (!incomingCall) return;
    socket?.emit("call:accept", { channelName: incomingCall.channelName });
    router.push(
      `/call/${incomingCall.channelName}?type=${incomingCall.callType}&targetUserId=${incomingCall.callerId}&role=callee`
    );
    setIncomingCall(null);
  }

  function decline() {
    if (!incomingCall) return;
    socket?.emit("call:decline", { callerId: incomingCall.callerId, channelName: incomingCall.channelName });
    setIncomingCall(null);
  }

  return (
    <div className="floating-banner">
      <p>{incomingCall.callType === "video" ? "🎥 영상 통화가 왔습니다" : "📞 음성 통화가 왔습니다"}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={accept}>수락</button>
        <button className="btn btn-danger" style={{ flex: 1 }} onClick={decline}>거절</button>
      </div>
    </div>
  );
}
