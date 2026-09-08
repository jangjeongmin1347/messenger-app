import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { getUserIdFromRequest } from "@/lib/auth-guard";

const APP_ID = process.env.AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;
const TOKEN_TTL_SECONDS = 60 * 60; // 1시간짜리 토큰

// Agora는 채널마다 숫자 uid를 요구하므로, 우리 서비스의 문자열 userId를
// 안정적인 정수로 변환해서 사용합니다 (같은 userId는 항상 같은 uid가 나옴).
function toAgoraUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash % 1_000_000_000;
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { channelName } = await req.json();
  if (!channelName) {
    return NextResponse.json({ error: "channelName이 필요합니다." }, { status: 400 });
  }

  if (!APP_ID || !APP_CERTIFICATE) {
    // Agora 콘솔에서 App Certificate를 아직 설정하지 않은 개발 초기 단계용 안내
    return NextResponse.json(
      { error: "AGORA_APP_ID / AGORA_APP_CERTIFICATE 환경변수가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const uid = toAgoraUid(userId);
  const expireAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expireAt
  );

  return NextResponse.json({ token, appId: APP_ID, uid, channelName });
}
