"use client";

import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/socket-context";

type Props = {
  targetUserId: string;
  callType: "voice" | "video";
  name?: string;
};

/**
 * 친구 프로필이나 채팅방 상단에 놓고 쓰는 발신 버튼.
 * 클릭하면 채널을 만들고, 상대에게 벨을 울린 뒤, 내 화면도 통화 페이지로 이동시킵니다.
 */
export default function CallButton({ targetUserId, callType, name }: Props) {
  const socket = useSocket();
  const router = useRouter();

  function startCall() {
    const channelName = `call-${crypto.randomUUID()}`;
    socket?.emit("call:invite", { receiverId: targetUserId, callType, channelName });
    const nameParam = name ? `&name=${encodeURIComponent(name)}` : "";
    router.push(`/call/${channelName}?type=${callType}&targetUserId=${targetUserId}&role=caller${nameParam}`);
  }

  return (
    <button
      onClick={startCall}
      className="btn btn-ghost"
      style={{ width: 40, height: 40, borderRadius: 999, padding: 0, fontSize: 17 }}
      aria-label={callType === "video" ? "영상통화 걸기" : "음성통화 걸기"}
      title={callType === "video" ? "영상통화 걸기" : "음성통화 걸기"}
    >
      {callType === "video" ? "🎥" : "📞"}
    </button>
  );
}
