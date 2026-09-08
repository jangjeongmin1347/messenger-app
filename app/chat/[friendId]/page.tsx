"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSocket } from "@/lib/socket-context";
import { useMessageNotifications } from "@/lib/message-notifications-context";
import CallButton from "@/app/components/CallButton";

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "CALL_LOG";
  createdAt: string;
};

export default function ChatPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const searchParams = useSearchParams();
  const friendName = searchParams.get("name") ?? "친구";

  const { token, user, loading } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const { markRead } = useMessageNotifications();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // 로그인 안 되어 있으면 로그인 화면으로
  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [loading, token, router]);

  // 이 채팅방에 들어온 순간 해당 친구의 안읽음 카운트를 지움
  useEffect(() => {
    if (friendId) markRead(friendId);
  }, [friendId, markRead]);

  // 대화 기록 불러오기
  useEffect(() => {
    if (!token || !friendId) return;
    fetch(`/api/messages?friendId=${friendId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []));
  }, [token, friendId]);

  // 실시간 수신/발신 확인 이벤트 연결
  useEffect(() => {
    if (!socket) return;

    function isThisConversation(msg: Message) {
      return (
        (msg.senderId === friendId && msg.receiverId === user?.id) ||
        (msg.senderId === user?.id && msg.receiverId === friendId)
      );
    }

    const onReceive = (msg: Message) => {
      if (isThisConversation(msg)) {
        setMessages((prev) => [...prev, msg]);
        if (msg.senderId === friendId) markRead(friendId); // 채팅방을 보고 있는 동안 온 메시지도 즉시 읽음 처리
      }
    };
    const onSent = (msg: Message) => {
      if (isThisConversation(msg)) setMessages((prev) => [...prev, msg]);
    };

    socket.on("message:receive", onReceive);
    socket.on("message:sent", onSent);
    return () => {
      socket.off("message:receive", onReceive);
      socket.off("message:sent", onSent);
    };
  }, [socket, friendId, user?.id, markRead]);

  // 새 메시지가 올 때마다 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const content = draft.trim();
    if (!content || !socket) return;
    socket.emit("message:send", { receiverId: friendId, content });
    setDraft("");
  }

  return (
    <div className="app-shell app-shell--no-nav" style={{ height: "100dvh" }}>
      <div className="chat-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="avatar">{friendName.slice(0, 1)}</div>
          <h1 className="chat-header-title">{friendName}</h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <CallButton targetUserId={friendId} callType="voice" name={friendName} />
          <CallButton targetUserId={friendId} callType="video" name={friendName} />
        </div>
      </div>

      <div className="chat-scroll">
        {messages.map((msg) => {
          if (msg.type === "CALL_LOG") {
            return (
              <div key={msg.id} className="call-log-row">
                <span className="call-log-chip">📞 {msg.content}</span>
              </div>
            );
          }

          const isMine = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`bubble-row ${isMine ? "mine" : ""}`}>
              <span className={`bubble ${isMine ? "mine" : "theirs"}`}>{msg.content}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-composer">
        <input
          type="text"
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지를 입력하세요"
        />
        <button className="btn btn-primary" onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
}
