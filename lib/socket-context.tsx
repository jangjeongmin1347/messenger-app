"use client";

import { createContext, useContext, ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { useRealtimeSocket } from "@/lib/use-realtime-socket";
import { useAuth } from "@/lib/auth-context";

const SocketContext = createContext<Socket | null>(null);

/**
 * 로그인 토큰이 있는 동안 소켓을 하나만 만들어서 앱 전체(채팅방, 통화, 알림)가
 * 같은 연결을 공유하도록 합니다. 화면마다 각자 소켓을 열면 서버 부하도 커지고
 * "메시지를 두 번 받는" 것 같은 버그로 이어지기 쉽습니다.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const socket = useRealtimeSocket(token);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
