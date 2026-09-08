"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:4000";

/**
 * 실시간 서버(메시징 + 통화 시그널링)에 연결하는 훅.
 * 채팅 화면과 통화 화면에서 공통으로 사용합니다.
 *
 * 사용 예:
 *   const socket = useRealtimeSocket(token);
 *   socket?.on("message:receive", (msg) => { ... });
 *   socket?.emit("message:send", { receiverId, content });
 */
export function useRealtimeSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(REALTIME_URL, { auth: { token } });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return socketRef.current;
}
