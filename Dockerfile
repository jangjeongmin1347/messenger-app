# Next.js 앱을 Vercel 없이 직접 호스팅하고 싶을 때 사용하는 이미지.
# Vercel에 배포한다면 이 파일은 필요 없습니다 (Vercel이 알아서 빌드합니다).

# ---- 1단계: 의존성 설치 ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ---- 2단계: 빌드 ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- 3단계: 실행 (필요한 파일만 담아 이미지 용량을 줄임) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start"]
