import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth-guard";

// GET /api/conversations
// 내 친구 목록에 최근 대화 미리보기를 붙여서 반환. 메시지가 없는 친구도 목록엔 포함하되 맨 아래로 정렬.
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }], status: "ACCEPTED" },
    include: { userA: true, userB: true },
  });
  const friends = friendships.map((f) => (f.userAId === userId ? f.userB : f.userA));

  const conversations = await Promise.all(
    friends.map(async (friend) => {
      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: friend.id },
            { senderId: friend.id, receiverId: userId },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      const unreadCount = await prisma.message.count({
        where: { senderId: friend.id, receiverId: userId, readAt: null },
      });

      return {
        friend: { id: friend.id, phoneNumber: friend.phoneNumber, displayName: friend.displayName },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              type: lastMessage.type,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount,
      };
    })
  );

  // 최근 메시지가 있는 대화를 위로, 메시지가 없는 친구는 아래로
  conversations.sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
  });

  return NextResponse.json({ conversations });
}
