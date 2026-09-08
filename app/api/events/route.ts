import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth-guard";

// 내 일정 목록 조회
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const events = await prisma.event.findMany({
    where: { userId },
    orderBy: { startAt: "asc" },
  });
  return NextResponse.json({ events });
}

// 새 일정 추가
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { title, description, startAt, endAt, allDay, category } = await req.json();
  if (!title || !startAt || !endAt) {
    return NextResponse.json({ error: "title, startAt, endAt은 필수입니다." }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      userId,
      title,
      description,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      allDay: !!allDay,
      category: category ?? "PERSONAL",
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}
