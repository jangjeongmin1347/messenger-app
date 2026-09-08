"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTheme, PALETTES, PRESET_LABEL, ThemePreset } from "@/lib/theme-context";

const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 20; // 영상은 용량이 커서 localStorage 저장이 실패할 수 있음 (그래도 화면엔 적용됨)
const MAX_VIDEO_DURATION_SEC = 15; // 배경 영상은 짧은 루프 클립만 허용 (배터리/데이터 소모 방지)

// 영상 파일의 실제 재생 길이를 읽어옵니다. <video>에 잠깐 로드해서 메타데이터만 확인하고 바로 정리합니다.
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("영상 정보를 읽지 못했습니다."));
    };
  });
}

export default function SettingsPage() {
  const { preset, setPreset, backgroundMedia, setBackgroundMedia, persistWarning } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      setError("사진 또는 영상 파일만 올릴 수 있어요.");
      return;
    }

    const limitMb = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
    if (file.size > limitMb * 1024 * 1024) {
      setError(`${isVideo ? "영상" : "이미지"}은 ${limitMb}MB 이하로 올려주세요.`);
      e.target.value = "";
      return;
    }

    // 배경 영상은 짧은 루프 클립만 허용 — 길이를 먼저 확인하고, 넘으면 아예 적용하지 않음
    if (isVideo) {
      setChecking(true);
      try {
        const duration = await readVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION_SEC) {
          setError(
            `배경 영상은 ${MAX_VIDEO_DURATION_SEC}초 이하의 짧은 루프 클립만 사용할 수 있어요. (선택한 영상: 약 ${Math.round(duration)}초)`
          );
          setChecking(false);
          e.target.value = "";
          return;
        }
      } catch {
        setError("영상 길이를 확인하지 못했어요. 다른 파일로 시도해주세요.");
        setChecking(false);
        e.target.value = "";
        return;
      }
      setChecking(false);
    }

    const reader = new FileReader();
    reader.onload = () => setBackgroundMedia({ url: reader.result as string, type: isVideo ? "video" : "image" });
    reader.onerror = () => setError("파일을 불러오지 못했습니다.");
    reader.readAsDataURL(file);
  }

  return (
    <div className="app-shell app-shell--no-nav">
      <div className="topbar">
        <h1>화면 설정</h1>
        <Link href="/" className="btn btn-ghost">닫기</Link>
      </div>

      <div className="screen-body">
        <p className="section-title">색상 테마</p>
        <div className="theme-grid">
          {(Object.keys(PALETTES) as ThemePreset[]).map((key) => {
            const tokens = PALETTES[key];
            return (
              <button
                key={key}
                className={`theme-swatch ${preset === key ? "selected" : ""}`}
                onClick={() => setPreset(key)}
                style={{ background: tokens.bg, color: tokens.text }}
              >
                <span className="theme-swatch-dots">
                  <span style={{ background: tokens.accent }} />
                  <span style={{ background: tokens.link }} />
                  <span style={{ background: tokens.success }} />
                </span>
                <span className="theme-swatch-label">{PRESET_LABEL[key]}</span>
              </button>
            );
          })}
        </div>

        <p className="section-title">배경 사진 / 영상</p>
        <p className="subtext" style={{ marginBottom: 12 }}>
          사진은 자유롭게, 영상은 {MAX_VIDEO_DURATION_SEC}초 이하의 짧은 루프 클립만 배경으로 쓸 수 있어요.
        </p>

        {backgroundMedia?.type === "image" && (
          <div className="bg-preview" style={{ backgroundImage: `url("${backgroundMedia.url}")` }} />
        )}
        {backgroundMedia?.type === "video" && (
          <video className="bg-preview-video" src={backgroundMedia.url} autoPlay loop muted playsInline />
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={checking}>
            {checking ? "영상 확인 중..." : "사진/영상 선택"}
          </button>
          {backgroundMedia && (
            <button className="btn btn-ghost" onClick={() => setBackgroundMedia(null)}>
              배경 제거
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {error && <p className="error-text">{error}</p>}
        {persistWarning && <p className="error-text">{persistWarning}</p>}
      </div>
    </div>
  );
}
