"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAgoraCall } from "@/lib/use-agora-call";
import { useSocket } from "@/lib/socket-context";
import { useAuth } from "@/lib/auth-context";

const RING_TIMEOUT_MS = 30_000; // 30초 동안 응답이 없으면 부재중 처리

export default function CallPage() {
  const { channelName } = useParams<{ channelName: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, loading } = useAuth();

  const callType = (searchParams.get("type") as "voice" | "video") || "voice";
  const targetUserId = searchParams.get("targetUserId");
  const peerName = searchParams.get("name") ?? "상대방";
  const isCaller = searchParams.get("role") === "caller";

  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [loading, token, router]);

  const socket = useSocket();
  const { joined, remoteUsers, localVideoTrack, micMuted, cameraOff, error, toggleMic, toggleCamera, leaveCall } =
    useAgoraCall(channelName, callType, token);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (localVideoTrack && localVideoRef.current) {
      localVideoTrack.play(localVideoRef.current);
    }
  }, [localVideoTrack]);

  useEffect(() => {
    remoteUsers.forEach((user) => {
      const el = remoteVideoRefs.current[String(user.uid)];
      if (user.videoTrack && el) {
        user.videoTrack.play(el);
      }
    });
  }, [remoteUsers]);

  function handleHangUp() {
    if (targetUserId) socket?.emit("call:end", { targetUserId });
    leaveCall();
    router.back();
  }

  useEffect(() => {
    if (!isCaller || !socket) return;
    if (remoteUsers.length > 0) return;

    const timer = setTimeout(() => {
      socket.emit("call:timeout", { channelName });
      setStatusMessage("응답이 없어 통화를 종료했습니다.");
      leaveCall();
      setTimeout(() => router.back(), 1500);
    }, RING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isCaller, socket, remoteUsers.length, channelName, leaveCall, router]);

  useEffect(() => {
    if (!socket) return;

    const onEnded = () => {
      leaveCall();
      router.back();
    };
    const onDeclined = () => {
      setStatusMessage("상대방이 통화를 거절했습니다.");
      leaveCall();
      setTimeout(() => router.back(), 1500);
    };
    const onUnavailable = () => {
      setStatusMessage("상대방이 오프라인 상태입니다.");
      leaveCall();
      setTimeout(() => router.back(), 1500);
    };

    socket.on("call:ended", onEnded);
    socket.on("call:declined", onDeclined);
    socket.on("call:unavailable", onUnavailable);
    return () => {
      socket.off("call:ended", onEnded);
      socket.off("call:declined", onDeclined);
      socket.off("call:unavailable", onUnavailable);
    };
  }, [socket, leaveCall, router]);

  const stateText =
    statusMessage ??
    error ??
    (remoteUsers.length > 0
      ? "통화 중"
      : isCaller
      ? "벨이 울리는 중..."
      : "연결하는 중...");

  return (
    <div className="call-screen">
      {callType === "video" ? (
        <div className="call-video-grid">
          <div ref={localVideoRef} className="call-video-tile" />
          {remoteUsers.map((user) => (
            <div
              key={user.uid}
              ref={(el) => {
                remoteVideoRefs.current[String(user.uid)] = el;
              }}
              className="call-video-tile"
            />
          ))}
        </div>
      ) : (
        <div className="call-status">
          <p className="call-type-label">음성 통화</p>
          <p className="call-peer-name">{peerName}</p>
          <p className="call-state-text" style={{ color: error ? "var(--color-danger)" : undefined }}>
            {stateText}
          </p>
        </div>
      )}

      {callType === "video" && (
        <p className="call-state-text" style={{ textAlign: "center", marginTop: 12 }}>{stateText}</p>
      )}

      <div className="call-controls">
        <button className="btn btn-icon" onClick={toggleMic} title="마이크">
          {micMuted ? "🔇" : "🎙️"}
        </button>
        {callType === "video" && (
          <button className="btn btn-icon" onClick={toggleCamera} title="카메라">
            {cameraOff ? "📷" : "🎦"}
          </button>
        )}
        <button className="btn btn-icon btn-danger" onClick={handleHangUp} title="통화 종료">
          📵
        </button>
      </div>
    </div>
  );
}
