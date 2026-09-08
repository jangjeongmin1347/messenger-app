import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth-guard";

// GET /api/messages?friendId=xxx  -> 나와 해당 친구가 주고받은 메시지 전체 (오래된 순)
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const friendId = req.nextUrl.searchParams.get("friendId");
  if (!friendId) return NextResponse.json({ error: "friendId가 필요합니다." }, { status: 400 });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}
