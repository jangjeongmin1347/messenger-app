import { PrismaClient } from "@prisma/client";

// Next.js 개발 모드에서 핫리로드 시 커넥션이 계속 늘어나는 것을 방지하기 위한 싱글턴 패턴
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
