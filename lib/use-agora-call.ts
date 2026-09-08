"use client";

import { useEffect, useRef, useState } from "react";
import type AgoraRTC from "agora-rtc-sdk-ng";
import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  ICameraVideoTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";

type CallType = "voice" | "video";

type RemoteUser = {
  uid: string | number;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
};

/**
 * Agora 채널에 입장해서 통화를 진행하는 훅.
 * 화면 쪽에서는 localVideoRef/remoteUsers만 렌더링에 붙이면 됩니다.
 */
export function useAgoraCall(channelName: string | null, callType: CallType, token: string | null) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);

  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [joined, setJoined] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelName || !token) return;
    let cancelled = false;

    async function join() {
      // 브라우저 환경에서만 동적으로 불러옵니다 (SSR 중에는 로드하지 않음)
      const { default: AgoraRTCSdk } = await import("agora-rtc-sdk-ng");
      const client = AgoraRTCSdk.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        setRemoteUsers((prev) => {
          const others = prev.filter((u) => u.uid !== user.uid);
          return [
            ...others,
            {
              uid: user.uid,
              videoTrack: mediaType === "video" ? user.videoTrack : others.find((u) => u.uid === user.uid)?.videoTrack,
              audioTrack: mediaType === "audio" ? user.audioTrack : others.find((u) => u.uid === user.uid)?.audioTrack,
            },
          ];
        });
        if (mediaType === "audio") user.audioTrack?.play();
      });

      client.on("user-unpublished", (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      client.on("user-left", (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      try {
        const tokenRes = await fetch("/api/calls/token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ channelName }),
        });
        const { token: rtcToken, appId, uid } = await tokenRes.json();
        if (!rtcToken) throw new Error("통화 토큰을 발급받지 못했습니다.");

        await client.join(appId, channelName, rtcToken, uid);
        if (cancelled) return;

        const audioTrack = await AgoraRTCSdk.createMicrophoneAudioTrack();
        localAudioTrackRef.current = audioTrack;
        const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [audioTrack];

        if (callType === "video") {
          const videoTrack = await AgoraRTCSdk.createCameraVideoTrack();
          localVideoTrackRef.current = videoTrack;
          tracksToPublish.push(videoTrack);
        }

        await client.publish(tracksToPublish);
        setJoined(true);
      } catch (err: any) {
        setError(err.message ?? "통화 연결 중 오류가 발생했습니다.");
      }
    }

    join();

    return () => {
      cancelled = true;
      localAudioTrackRef.current?.close();
      localVideoTrackRef.current?.close();
      clientRef.current?.leave();
      setJoined(false);
      setRemoteUsers([]);
    };
  }, [channelName, callType, token]);

  function toggleMic() {
    const track = localAudioTrackRef.current;
    if (!track) return;
    track.setEnabled(micMuted); // 현재 꺼져있으면 켜고, 켜져있으면 끔
    setMicMuted((prev) => !prev);
  }

  function toggleCamera() {
    const track = localVideoTrackRef.current;
    if (!track) return;
    track.setEnabled(cameraOff);
    setCameraOff((prev) => !prev);
  }

  function leaveCall() {
    localAudioTrackRef.current?.close();
    localVideoTrackRef.current?.close();
    clientRef.current?.leave();
    setJoined(false);
  }

  return {
    joined,
    remoteUsers,
    localVideoTrack: localVideoTrackRef.current,
    micMuted,
    cameraOff,
    error,
    toggleMic,
    toggleCamera,
    leaveCall,
  };
}
