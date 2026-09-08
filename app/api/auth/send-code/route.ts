import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const { phoneNumber } = await req.json();

  if (!phoneNumber || !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    return NextResponse.json(
      { error: "전화번호는 국가코드를 포함한 국제 형식(+82...)으로 입력해주세요." },
      { status: 400 }
    );
  }

  const result = await sendVerificationCode(phoneNumber);
  return NextResponse.json(result);
}
