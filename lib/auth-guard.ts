import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

/**
 * Authorization: Bearer <token> 헤더에서 로그인한 사용자 ID를 꺼냅니다.
 * 토큰이 없거나 유효하지 않으면 null을 반환합니다.
 */
export function getUserIdFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length);
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}
