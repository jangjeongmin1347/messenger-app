import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth-guard";

// 내 친구 목록 조회
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      status: "ACCEPTED",
    },
    include: { userA: true, userB: true },
  });

  const friends = friendships.map((f) => (f.userAId === userId ? f.userB : f.userA));
  return NextResponse.json({
    friends: friends.map((f) => ({ id: f.id, phoneNumber: f.phoneNumber, displayName: f.displayName })),
  });
}

// 전화번호로 친구 추가 요청
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { phoneNumber } = await req.json();
  const target = await prisma.user.findUnique({ where: { phoneNumber } });
  if (!target) {
    return NextResponse.json({ error: "해당 번호로 가입한 사용자가 없습니다." }, { status: 404 });
  }
  if (target.id === userId) {
    return NextResponse.json({ error: "본인을 친구로 추가할 수 없습니다." }, { status: 400 });
  }

  // userA/userB 순서를 항상 정렬해서 저장 (중복 방지)
  const [userAId, userBId] = [userId, target.id].sort();

  const friendship = await prisma.friendship.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId, status: "ACCEPTED" }, // 단순화를 위해 요청 즉시 수락 처리
  });

  return NextResponse.json({ friendship });
}
