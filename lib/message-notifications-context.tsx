"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSocket } from "@/lib/socket-context";
import { useAuth } from "@/lib/auth-context";

type IncomingMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
};

type Toast = {
  id: string;
  senderId: string;
  preview: string;
};

type MessageNotificationsValue = {
  unreadCounts: Record<string, number>; // friendId -> 안읽은 메시지 수
  markRead: (friendId: string) => void;
};

const MessageNotificationsContext = createContext<MessageNotificationsValue>({
  unreadCounts: {},
  markRead: () => {},
});

/**
 * app/layout.tsx에 한 번 배치. 지금 보고 있는 채팅방의 메시지는 안읽음 처리하지 않고,
 * 그 외의 채팅방에서 온 메시지는 카운트를 올리고 잠깐 토스트로 알려줍니다.
 */
export function MessageNotificationsProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const { user, token } = useAuth();
  const pathname = usePathname();

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<Toast | null>(null);

  // 지금 열려 있는 채팅방의 상대 id를 경로에서 추출 (/chat/[friendId])
  const activeFriendId = pathname?.startsWith("/chat/") ? pathname.split("/")[2] : null;

  // 로그인 직후(또는 새로고침 후) 서버에 저장된 안읽음 개수로 배지를 복원
  useEffect(() => {
    if (!token) return;
    fetch("/api/messages/unread-counts", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setUnreadCounts(data.counts ?? {}))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const onReceive = (msg: IncomingMessage) => {
      if (msg.receiverId !== user?.id) return; // 내가 보낸 메시지의 sent 이벤트는 무시
      if (msg.senderId === activeFriendId) return; // 이미 보고 있는 대화면 알림 불필요

      setUnreadCounts((prev) => ({
        ...prev,
        [msg.senderId]: (prev[msg.senderId] ?? 0) + 1,
      }));
      setToast({ id: msg.id, senderId: msg.senderId, preview: msg.content });
    };

    socket.on("message:receive", onReceive);
    return () => {
      socket.off("message:receive", onReceive);
    };
  }, [socket, user?.id, activeFriendId]);

  // 토스트는 4초 후 자동으로 사라짐
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function markRead(friendId: string) {
    setUnreadCounts((prev) => {
      if (!prev[friendId]) return prev;
      const next = { ...prev };
      delete next[friendId];
      return next;
    });

    // 로컬 표시뿐 아니라 서버의 readAt도 갱신해서 새로고침해도 안읽음이 남지 않도록 함
    if (token) {
      fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId }),
      }).catch(() => {});
    }
  }

  return (
    <MessageNotificationsContext.Provider value={{ unreadCounts, markRead }}>
      {children}
      {toast && <MessageToast toast={toast} onDismiss={() => setToast(null)} />}
    </MessageNotificationsContext.Provider>
  );
}

export function useMessageNotifications() {
  return useContext(MessageNotificationsContext);
}

function MessageToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div className="floating-banner" style={{ padding: 12 }}>
      <a href={`/chat/${toast.senderId}`} onClick={onDismiss} className="toast-link">
        <p className="toast-title" style={{ margin: 0 }}>새 메시지</p>
        <p className="toast-preview" style={{ margin: "2px 0 0" }}>{toast.preview}</p>
      </a>
    </div>
  );
}
