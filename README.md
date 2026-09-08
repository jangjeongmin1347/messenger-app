# 전화번호 기반 메신저 앱 (프로토타입 스캐폴드)

전화번호 인증 → 실시간 메시징 → 음성/영상 통화 → 개인 캘린더 순으로 기능을 붙여나가는 구조입니다.
지금 상태는 "1단계: 전화번호 인증"과 "3단계: 캘린더 API/DB"까지 뼈대가 잡혀 있고,
메시징·통화는 다음 단계에서 채워 넣을 수 있도록 폴더와 시그널링 서버 뼈대를 미리 준비해뒀습니다.

## 폴더 구조

```
messenger-app/
├─ prisma/
│  └─ schema.prisma        # User, Friendship, Message, Event 테이블 정의
├─ app/
│  ├─ layout.tsx           # AuthProvider + IncomingCallListener를 전역에 연결하는 루트 레이아웃
│  ├─ page.tsx             # 홈 화면 (친구 목록, 친구 추가, 통화 버튼)
│  ├─ login/               # 전화번호 인증 로그인 화면
│  ├─ api/
│  │  ├─ auth/
│  │  │  ├─ send-code/     # 인증번호 발송
│  │  │  └─ verify-code/   # 인증번호 검증 + 로그인 토큰 발급
│  │  ├─ friends/          # 친구 추가/목록 API
│  │  ├─ messages/         # 대화 기록 조회, 읽음 처리, 안읽음 개수 조회 API
│  │  ├─ conversations/    # 채팅방 목록용 - 친구별 마지막 메시지 + 안읽음 개수 API
│  │  ├─ events/           # 캘린더 일정 CRUD API
│  │  └─ calls/token/      # Agora RTC 토큰 발급 API
│  ├─ chat/[friendId]/     # 1:1 실시간 채팅방 (대화 기록 + 실시간 송수신)
│  ├─ chats/               # 채팅방 목록 (친구별 마지막 메시지 미리보기, 안읽음 배지, 실시간 갱신)
│  ├─ settings/            # 화면 설정 (색상 테마 프리셋, 배경 사진/영상 업로드)
│  ├─ calendar/            # 캘린더 화면 (FullCalendar + 카테고리별 색상 + 오늘 일정 아젠다)
│  ├─ call/[channelName]/  # 실제 통화 화면 (Agora 입장, 로컬/원격 비디오)
│  └─ components/
│     ├─ CallButton.tsx            # 발신 버튼 (친구 목록/채팅방에 배치)
│     ├─ IncomingCallListener.tsx  # 전역 수신 알림 (레이아웃에 한 번만 배치)
│     ├─ BottomNav.tsx             # 채팅/친구/캘린더 하단 탭
│     └─ EventModal.tsx            # 일정 추가/수정/삭제 모달 (카테고리 선택 포함)
├─ lib/
│  ├─ theme-context.tsx    # 색상 테마 프리셋 + 배경 사진/영상을 CSS 변수·<video>로 앱 전체에 적용
│  ├─ auth-context.tsx     # 로그인 토큰/사용자 정보를 앱 전역에 공급하는 컨텍스트
│  ├─ socket-context.tsx   # 앱 전체가 공유하는 소켓 연결 하나를 관리
│  ├─ message-notifications-context.tsx  # 채팅방 밖에서도 새 메시지 감지 + 안읽음 카운트 + 토스트
│  ├─ prisma.ts            # Prisma 클라이언트 싱글턴
│  ├─ sms.ts               # Twilio Verify 연동 함수
│  ├─ jwt.ts               # 로그인 토큰 발급/검증
│  ├─ use-realtime-socket.ts  # Socket.io 클라이언트 연결 훅
│  └─ use-agora-call.ts       # Agora 채널 입장/퇴장, 트랙 관리 훅
└─ server/
   └─ realtime-server.js   # Socket.io 기반 메시징 + 통화 벨소리 신호 서버 (별도 프로세스)
```

## 디자인 시스템

`app/globals.css`에 색상·타이포·컴포넌트 스타일을 전부 모아뒀습니다.

- **색**: 깊은 잉크빛 남색 배경 위에 시그널 앰버(`--color-accent`) 하나만 강조색으로 사용 — 통화 버튼, 전송 버튼, 안읽음 배지 등 "지금 눌러야 하는 것"에만 씀
- **타이포**: 인사말·채팅방 이름·통화 상대 이름처럼 사람 이름이 드러나는 자리는 세리프(Fraunces)로, 나머지 UI 텍스트는 Inter로 구분
- **레이아웃**: `.app-shell`이 폰 화면처럼 480px 폭을 고정하고, `채팅/친구/캘린더` 세 화면은 `BottomNav` 탭으로 이동
- **말풍선**: 내 메시지와 상대 메시지가 모서리 방향(꼬리)이 다른 비대칭 라운드로 구분됨 (`.bubble.mine` / `.bubble.theirs`)
- **캘린더**: FullCalendar 기본 테마를 `.calendar-page .fc` 안에서 다크 톤으로 오버라이드

디자인 토큰만 바꾸고 싶다면 `globals.css` 최상단의 `:root` 변수만 수정하면 전체 화면에 반영됩니다.

## 캘린더 기능

- **카테고리**: 개인(앰버) / 업무(라벤더) / 약속(그린) 세 가지로 구분되고, 월간 캘린더의 이벤트 색과 오늘 일정 목록의 점 색이 같은 색상 토큰(`--color-accent`, `--color-link`, `--color-success`)을 공유합니다.
- **추가**: 날짜(또는 기간)를 드래그하면 `EventModal`이 뜨고, 제목·설명·시작/종료 시각·하루종일 여부·카테고리를 입력해 저장합니다.
- **수정/삭제**: 캘린더에 표시된 일정을 클릭하면 같은 모달이 기존 값으로 채워진 채 열리고, 저장하면 `PATCH`, 삭제 버튼을 누르면 `DELETE`가 호출됩니다.
- **오늘 일정**: 캘린더 아래에 오늘 날짜의 일정만 시간순으로 뽑아 보여주는 아젠다 목록이 있습니다 (탭하면 바로 수정 모달로 이어짐).

## 화면 커스터마이징 (색상 테마 / 배경 사진)

홈 화면 우측 상단 ⚙️ 버튼으로 `/settings`에 들어가면:

- **색상 테마**: 화이트그레이(기본) / 시그널 / 미드나잇 오로라 / 선셋 플럼 / 포레스트 나이트 5가지 프리셋 중 선택. 앱을 처음 실행하면(아무 설정도 저장되어 있지 않으면) 흰색·회색 조합의 **화이트그레이**가 기본값입니다. 앱의 모든 화면이 `--color-bg`, `--color-text`, `--color-accent` 같은 CSS 변수만 참조하도록 만들어져 있어서, 프리셋을 고르면 `ThemeProvider`가 `document.documentElement`에 변수 값을 다시 써서 전체 화면(배경·텍스트·테두리·버튼색까지)이 즉시 리스킨됩니다.
- **배경 사진/영상**: 기기에 있는 사진이나 짧은 영상을 올리면 `FileReader`로 data URL로 변환됩니다. 사진은 CSS 배경(`--app-bg-image`)으로, 영상은 실제 `<video autoPlay loop muted>` 태그로 화면 전체 뒤에 고정 재생됩니다. 텍스트 가독성을 위해 어두운 오버레이가 자동으로 깔리고, 상/하단 바는 반투명 + 블러 처리돼서 배경이 은은하게 비칩니다.
- **영상 제약**: 배경 영상은 자동재생·반복 재생 특성상 배터리·데이터 소모가 크기 때문에 **15초 이하의 짧은 루프 클립만** 허용합니다. 파일을 고르면 업로드 전에 `<video>` 엘리먼트로 실제 재생 길이를 읽어 확인하고, 초과하면 적용 자체를 막습니다 (용량 제한과 별개로 검사). 용량은 이미지 5MB, 영상 20MB로 제한해뒀습니다.
- 색상 테마는 `localStorage`에 저장되어 기기별로 유지됩니다. 배경 사진/영상도 `localStorage`에 저장을 시도하지만, 영상은 용량이 커서 브라우저 저장 한도(보통 5~10MB)를 넘기면 저장에 실패할 수 있습니다 — 이 경우 지금 화면에는 그대로 적용되고, 새로고침하면 초기화된다는 안내 문구가 뜹니다.

## 통화 연결 방식

실제 음성/영상 데이터는 Agora의 미디어 서버(SFU)가 처리하고, 우리 서버(`realtime-server.js`)는
"누가 전화를 걸었는지"와 "어느 채널에서 만날지"만 상대방에게 알려주는 벨소리 역할만 합니다.

1. 발신자가 `CallButton`을 누르면 무작위 채널명을 만들어 `call:invite`로 상대에게 전송하고, 본인은 바로 `/call/[channelName]` 화면으로 이동
2. 수신자는 `IncomingCallListener`(레이아웃에 항상 떠 있음)가 `call:incoming` 이벤트를 받아 수락/거절 버튼을 띄움
3. 수락하면 같은 `channelName`으로 `/call/[channelName]` 화면에 진입
4. 통화 화면은 `/api/calls/token`에서 Agora 토큰을 발급받아 Agora 채널에 입장하고, 입장 후에는 Agora가 알아서 두 사람의 오디오/비디오를 연결
5. 통화 종료 시 `call:end` 신호로 상대방 화면도 함께 정리

## 부재중 전화 기록

서버(`realtime-server.js`)가 통화 상태를 `pendingCalls`로 추적하다가 아래 세 경우에
`Message`(type: `CALL_LOG`)를 자동 생성해서 채팅방에 남깁니다.

- **오프라인**: 발신 시점에 상대가 아예 접속해 있지 않으면 즉시 "부재중 전화"로 기록
- **무응답**: 수신자가 30초 안에 수락도 거절도 하지 않으면(`call:timeout`), 발신자 화면이 스스로 포기하며 "부재중 전화"로 기록. 이때 아직 떠 있는 수신자의 알림 배너도 `call:cancelled`로 정리됨
- **거절**: 수신자가 거절 버튼을 누르면 "거절된 통화"로 기록

이 기록은 일반 메시지와 같은 `message:receive`/`message:sent` 이벤트로 전달되기 때문에
채팅 UI(가운데 정렬된 회색 뱃지로 표시)와 안읽음 배지·토스트 알림에도 자연스럽게 반영됩니다.
수락해서 실제로 연결된 통화는 별도 로그를 남기지 않습니다 (`call:accept`로 pending 목록에서 제거됨).

## 안읽음 메시지 서버 동기화

- 로그인 직후 `/api/messages/unread-counts`로 서버에 남아있는 안읽음 개수를 불러와 배지를 복원합니다 (새로고침해도 유지됨)
- 채팅방에 들어가거나, 채팅방을 보고 있는 동안 메시지를 받으면 `/api/messages/read`를 호출해 해당 대화의 `readAt`을 갱신합니다

## 설치 및 실행

```bash
npm install
npx prisma migrate dev --name init
npm run dev            # Next.js 앱 (localhost:3000)
node server/realtime-server.js   # 별도 터미널에서 실시간 서버 (localhost:4000)
```

## 필요한 환경 변수 (.env)

```
DATABASE_URL="postgresql://user:password@localhost:5432/messenger"
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid
JWT_SECRET=아무-랜덤-긴-문자열
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
NEXT_PUBLIC_REALTIME_URL=http://localhost:4000
```

Agora App ID/Certificate는 [Agora 콘솔](https://console.agora.io)에서 프로젝트를 만들면 발급받을 수 있습니다.
무료 티어로 매달 일정 시간(2025년 기준 월 10,000분) 음성/영상 통화를 테스트할 수 있어요.

Twilio 계정이 아직 없다면 `lib/sms.ts`의 `sendVerificationCode` 함수 안에 있는 목(mock) 모드를 사용해
콘솔에 인증번호를 출력하는 방식으로 우선 개발을 진행할 수 있습니다.

## 배포하기

로컬 개발 후 실제로 인터넷에 올리려면 세 가지가 필요합니다: ① Next.js 웹 앱, ② 실시간 서버(realtime-server.js, 상시 연결이 필요해서 서버리스로는 못 올림), ③ PostgreSQL DB. 이 저장소에는 배포 방식별로 아래 파일들을 준비해뒀습니다.

### 방법 A — Render 하나로 전부 (가장 간단, 추천)

`render.yaml`이 웹 + 실시간 서버 + DB 세 개를 한 번에 정의해둔 블루프린트입니다.

1. 이 코드를 GitHub 저장소에 올림
2. [render.com](https://render.com) → **New +** → **Blueprint** → 저장소 선택
3. `render.yaml`을 읽어서 서비스 3개가 자동 생성됨
4. 대시보드에서 `TWILIO_*`, `AGORA_*` 값만 채워넣기 (자동 생성이 불가능한 값들)
5. `messenger-realtime` 서비스의 실제 URL이 나오면, `messenger-web`의 `NEXT_PUBLIC_REALTIME_URL` 환경변수를 그 값으로 업데이트 (반대로 `CORS_ORIGIN`도 `messenger-web` 실제 도메인으로)
6. 첫 배포 후 Render 셸(Shell 탭)에서 `npx prisma migrate deploy` 한 번 실행해서 DB 테이블 생성

### 방법 B — Vercel(웹) + Railway/Render(실시간 서버) 나눠서

- **웹**: `vercel.json`이 이미 설정되어 있어서, GitHub 저장소를 Vercel에 연결하면 자동으로 인식·빌드됩니다. Vercel 프로젝트 설정에서 `.env.example`의 환경변수들을 등록하세요.
- **실시간 서버**: Vercel은 서버리스라 Socket.io 같은 상시 연결 서버를 못 돌립니다. `Dockerfile.realtime`을 사용해 Railway, Render(Web Service), Fly.io 중 아무 곳에나 별도로 올리세요.
- **DB**: Supabase나 Neon에서 PostgreSQL 하나 만들어서 두 서비스의 `DATABASE_URL`에 동일하게 연결
- 웹의 `NEXT_PUBLIC_REALTIME_URL`을 실시간 서버의 실제 주소로, 실시간 서버의 `CORS_ORIGIN`을 웹의 실제 도메인으로 맞춰주는 것 필수

### 방법 C — Docker로 직접 서버(VPS)에

`docker-compose.yml`이 웹 + 실시간 서버 + DB를 컨테이너 3개로 한 번에 띄웁니다. 직접 관리하는 서버(VPS)나 로컬에서 배포 전 마지막 점검용으로 적합합니다.

```bash
cp .env.example .env   # 값 채우기
docker compose up --build -d
docker compose exec web npx prisma migrate deploy
```

### 공통 체크리스트

- `JWT_SECRET`은 웹과 실시간 서버 두 곳에 **반드시 같은 값**을 넣어야 로그인 토큰이 서로 통합니다 (`render.yaml`은 `envVarGroups`로 자동 공유, 나머지 방법은 수동으로 동일하게 입력)
- `CORS_ORIGIN`을 실제 배포된 웹 도메인으로 좁혀서 실시간 서버가 아무 사이트에서나 접속되지 않도록 하기
- Twilio/Agora는 개발 중엔 비워둬도 목 모드로 동작하지만, 실서비스로 쓰려면 각 콘솔에서 발급받은 실제 키를 넣어야 함
- 도메인을 연결한 뒤에는 `NEXT_PUBLIC_REALTIME_URL`, `CORS_ORIGIN`을 실제 도메인 기준으로 다시 한번 확인

## 다음에 채워야 할 것

1. NextAuth 등 더 견고한 세션 관리로 전환 (지금은 localStorage + JWT로 단순 구현)
2. 벨소리 사운드, 통화 중 재연결(네트워크 끊김) 처리 등 UX 다듬기
3. 메시지 목록 페이지네이션 (지금은 대화 전체를 한 번에 불러옴)

## 지금 실행하면 되는 것

`npm install` 후 `npm run dev`와 `npm run realtime`을 각각 실행하면:

1. `/login`에서 전화번호 인증 → 로그인 (Twilio 미설정 시 인증번호는 `123456`)
2. `/`(홈)에서 전화번호로 친구 추가 → 친구 목록에 채팅/음성/영상통화 버튼 표시
3. "채팅"을 누르면 `/chat/[friendId]`에서 실시간 1:1 메시지 송수신 (새로고침해도 `/api/messages`로 대화 기록 복원)
4. `/chats`에서 대화 목록을 확인 — 친구별 마지막 메시지, 시간, 안읽음 배지가 표시되고 새 메시지가 오면 실시간으로 맨 위로 올라옴
5. 통화 버튼을 누르면 상대 계정(다른 브라우저/시크릿창으로 로그인)에 실시간으로 수신 알림이 뜨고, 수락하면 같은 통화방(`/call/[channelName]`)에서 Agora로 실제 연결됨
6. `/calendar`에서 날짜를 드래그해 개인 일정 추가

로그인 상태는 `AuthProvider`가, 소켓 연결은 `SocketProvider`가 앱 전체에서 하나씩만 관리하고,
`app/layout.tsx`에 이미 다 연결되어 있어 어느 페이지에서든 전화·메시지가 자동으로 감지됩니다.
