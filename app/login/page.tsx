"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  async function sendCode() {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "인증번호 발송에 실패했습니다.");
      return;
    }
    setStep("code");
  }

  async function verifyCode() {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, code }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "인증에 실패했습니다.");
      return;
    }

    login(data.token, data.user);
    router.push("/");
  }

  return (
    <div className="app-shell app-shell--no-nav" style={{ justifyContent: "center" }}>
      <div className="screen-body">
        <p className="call-type-label" style={{ marginBottom: 4 }}>전화번호로 시작하기</p>
        <h1 className="greeting">
          {step === "phone" ? "번호를 알려주세요" : "인증번호를 입력해주세요"}
        </h1>
        <p className="subtext">
          {step === "phone"
            ? "국가코드를 포함해 입력해주세요."
            : `${phoneNumber}로 전송된 6자리 코드를 입력해주세요.`}
        </p>

        {step === "phone" && (
          <>
            <label className="field-label" htmlFor="phone">전화번호</label>
            <input
              id="phone"
              type="tel"
              className="input"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+821012345678"
            />
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 16 }}
              onClick={sendCode}
              disabled={submitting || !phoneNumber}
            >
              인증번호 받기
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <label className="field-label" htmlFor="code">인증번호</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 16 }}
              onClick={verifyCode}
              disabled={submitting || !code}
            >
              로그인
            </button>
          </>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
