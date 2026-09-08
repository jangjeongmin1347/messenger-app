"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSocket } from "@/lib/socket-context";
import { useMessageNotifications } from "@/lib/message-notifications-context";
import BottomNav from "@/app/components/BottomNav";

type Conversation = {
  friend: { id: string; phoneNumber: string; displayName: string | null };
  lastMessage: { content: string; type: "TEXT" | "IMAGE" | "CALL_LOG"; senderId: string; createdAt: string } | null;
  unreadCount: number;
};

type IncomingMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "CALL_LOG";
  createdAt: string;
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function preview(msg: Conversation["lastMessage"]) {
  if (!msg) return "아직 대화가 없습니다";
  if (msg.type === "CALL_LOG") return `📞 ${msg.content}`;
  return msg.content;
}

export default function ChatsListPage() {
  const { token, user, loading } = useAuth();
  const { unreadCounts } = useMessageNotifications();
  const socket = useSocket();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/conversations", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations ?? []))
      .finally(() => setLoadingList(false));
  }, [token]);

  useEffect(() => {
    if (!socket || !user) return;

    function upsertConversation(msg: IncomingMessage) {
      const friendId = msg.senderId === user!.id ? msg.receiverId : msg.senderId;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.friend.id === friendId);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          lastMessage: { content: msg.content, type: msg.type, senderId: msg.senderId, createdAt: msg.createdAt },
        };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    }

    socket.on("message:receive", upsertConversation);
    socket.on("message:sent", upsertConversation);
    return () => {
      socket.off("message:receive", upsertConversation);
      socket.off("message:sent", upsertConversation);
    };
  }, [socket, user]);

  if (loading || loadingList) return null;

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>채팅</h1>
      </div>

      <div className="screen-body">
        {conversations.length === 0 && (
          <p className="empty-state">친구를 추가하면 대화를 시작할 수 있어요.</p>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {conversations.map(({ friend, lastMessage, unreadCount }) => {
            const liveUnread = unreadCounts[friend.id] ?? unreadCount;
            const name = friend.displayName ?? friend.phoneNumber;

            return (
              <li key={friend.id}>
                <Link href={`/chat/${friend.id}?name=${encodeURIComponent(name)}`} className="list-item">
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div className="avatar">{name.slice(0, 1)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: liveUnread > 0 ? 700 : 500 }}>{name}</div>
                      <div className="toast-preview" style={{ maxWidth: 220 }}>{preview(lastMessage)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    {lastMessage && (
                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                        {formatTime(lastMessage.createdAt)}
                      </span>
                    )}
                    {liveUnread > 0 && <span className="badge">{liveUnread}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <BottomNav />
    </div>
  );
}
