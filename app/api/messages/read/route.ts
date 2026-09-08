import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth-guard";

// POST /api/messages/read  { friendId }
// friendId가 나에게 보낸, 아직 안읽은 메시지를 전부 읽음 처리
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { friendId } = await req.json();
  if (!friendId) return NextResponse.json({ error: "friendId가 필요합니다." }, { status: 400 });

  await prisma.message.updateMany({
    where: { senderId: friendId, receiverId: userId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
