import { Fraunces, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { SocketProvider } from "@/lib/socket-context";
import { MessageNotificationsProvider } from "@/lib/message-notifications-context";
import { ThemeProvider } from "@/lib/theme-context";
import IncomingCallListener from "@/app/components/IncomingCallListener";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = {
  title: "메신저 앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        {/* ThemeProvider: 색상 프리셋과 배경 사진을 CSS 변수로 앱 전체에 적용
            AuthProvider: 로그인 토큰 공급
            SocketProvider: 토큰으로 소켓 하나를 만들어 앱 전체가 공유
            MessageNotificationsProvider: 채팅방 밖에서도 새 메시지 감지 + 안읽음 카운트
            IncomingCallListener: 어느 화면에 있든 전화 수신 감지 */}
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <MessageNotificationsProvider>
                <IncomingCallListener />
                {children}
              </MessageNotificationsProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
