import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth-guard";

// GET /api/messages/unread-counts -> { counts: { [senderId]: number } }
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const grouped = await prisma.message.groupBy({
    by: ["senderId"],
    where: { receiverId: userId, readAt: null },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    counts[row.senderId] = row._count._all;
  }

  return NextResponse.json({ counts });
}
