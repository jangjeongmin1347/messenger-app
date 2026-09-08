import twilio from "twilio";

const useMock = !process.env.TWILIO_ACCOUNT_SID;

const client = useMock
  ? null
  : twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * 전화번호로 인증번호를 발송합니다.
 * Twilio 환경변수가 없으면 콘솔에 코드만 출력하는 목 모드로 동작합니다 (로컬 개발용).
 */
export async function sendVerificationCode(phoneNumber: string) {
  if (useMock) {
    const mockCode = "123456";
    console.log(`[MOCK SMS] ${phoneNumber} 로 인증번호 ${mockCode} 발송`);
    return { status: "pending", mock: true };
  }

  const verification = await client!.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({ to: phoneNumber, channel: "sms" });

  return { status: verification.status, mock: false };
}

/**
 * 사용자가 입력한 인증번호가 맞는지 확인합니다.
 */
export async function checkVerificationCode(phoneNumber: string, code: string) {
  if (useMock) {
    return { valid: code === "123456" };
  }

  const check = await client!.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verificationChecks.create({ to: phoneNumber, code });

  return { valid: check.status === "approved" };
}
