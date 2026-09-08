import { NextRequest, NextResponse } from "next/server";
import { checkVerificationCode } from "@/lib/sms";
import { prisma } from "@/lib/prisma";
import { issueToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const { phoneNumber, code } = await req.json();

  if (!phoneNumber || !code) {
    return NextResponse.json({ error: "전화번호와 인증번호가 필요합니다." }, { status: 400 });
  }

  const { valid } = await checkVerificationCode(phoneNumber, code);
  if (!valid) {
    return NextResponse.json({ error: "인증번호가 올바르지 않습니다." }, { status: 401 });
  }

  // 처음 로그인하는 번호면 계정을 자동 생성 (일종의 회원가입 겸 로그인)
  const user = await prisma.user.upsert({
    where: { phoneNumber },
    update: {},
    create: { phoneNumber },
  });

  const token = issueToken(user.id);

  return NextResponse.json({
    token,
    user: { id: user.id, phoneNumber: user.phoneNumber, displayName: user.displayName },
  });
}
