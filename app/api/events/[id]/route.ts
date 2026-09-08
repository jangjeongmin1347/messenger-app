import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth-guard";

// Next.js 15부터 동적 라우트의 params가 Promise로 전달되어 await가 필요합니다.
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json();
  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.startAt && { startAt: new Date(body.startAt) }),
      ...(body.endAt && { endAt: new Date(body.endAt) }),
      ...(body.allDay !== undefined && { allDay: body.allDay }),
      ...(body.category && { category: body.category }),
    },
  });
  return NextResponse.json({ event });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
