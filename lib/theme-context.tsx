"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemePreset = "mono" | "signal" | "aurora" | "sunset" | "forest";
export type BackgroundMediaType = "image" | "video";
export type BackgroundMedia = { url: string; type: BackgroundMediaType } | null;

type PaletteTokens = {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  link: string;
  success: string;
};

// 팔레트 값이 곧 --color-* CSS 변수가 됩니다. 앱의 모든 화면이 이미 이 변수들을 참조하고 있어서
// 여기 값만 바뀌면 전체 화면이 한 번에 다시 칠해집니다.
// mono가 앱을 처음 켰을 때의 기본값입니다 (흰색/회색 조합).
export const PALETTES: Record<ThemePreset, PaletteTokens> = {
  mono: {
    bg: "#f4f4f5",
    surface: "#ffffff",
    surfaceRaised: "#e4e4e7",
    border: "rgba(0, 0, 0, 0.08)",
    text: "#18181b",
    textMuted: "#71717a",
    accent: "#d4d4d8",
    link: "#71717a",
    success: "#52525b",
  },
  signal: {
    bg: "#12142b",
    surface: "#1b1e3d",
    surfaceRaised: "#242761",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#f3f1ea",
    textMuted: "#9a9dc4",
    accent: "#ff8a3d",
    link: "#8c8fe8",
    success: "#4fbf8b",
  },
  aurora: {
    bg: "#0d1b2a",
    surface: "#14283d",
    surfaceRaised: "#1b3a57",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#f3f1ea",
    textMuted: "#9a9dc4",
    accent: "#64ffda",
    link: "#7db9ff",
    success: "#b892ff",
  },
  sunset: {
    bg: "#241220",
    surface: "#341a2e",
    surfaceRaised: "#47223d",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#f3f1ea",
    textMuted: "#9a9dc4",
    accent: "#ff6f91",
    link: "#ffb26b",
    success: "#6ee7b7",
  },
  forest: {
    bg: "#101913",
    surface: "#16241a",
    surfaceRaised: "#1e3324",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#f3f1ea",
    textMuted: "#9a9dc4",
    accent: "#d4af37",
    link: "#7fd1ae",
    success: "#a3d977",
  },
};

export const PRESET_LABEL: Record<ThemePreset, string> = {
  mono: "화이트그레이 (기본)",
  signal: "시그널",
  aurora: "미드나잇 오로라",
  sunset: "선셋 플럼",
  forest: "포레스트 나이트",
};

type ThemeContextValue = {
  preset: ThemePreset;
  setPreset: (p: ThemePreset) => void;
  backgroundMedia: BackgroundMedia;
  setBackgroundMedia: (media: BackgroundMedia) => void;
  // 영상/큰 사진은 localStorage 용량을 넘길 수 있음 - 그 경우 이번 세션에서만 적용되고 저장은 안 됨을 알려주는 메시지
  persistWarning: string | null;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY_PRESET = "theme-preset";
const STORAGE_KEY_BG_URL = "theme-bg-url";
const STORAGE_KEY_BG_TYPE = "theme-bg-type";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 앱을 처음 켰을 때(아직 아무것도 저장 안 된 상태)의 기본값은 흰색/회색 조합인 mono
  const [preset, setPresetState] = useState<ThemePreset>("mono");
  const [backgroundMedia, setBackgroundMediaState] = useState<BackgroundMedia>(null);
  const [persistWarning, setPersistWarning] = useState<string | null>(null);

  // 새로고침해도 유지되도록 localStorage에서 복원 (저장된 게 없으면 mono 기본값 그대로 유지)
  useEffect(() => {
    const savedPreset = localStorage.getItem(STORAGE_KEY_PRESET) as ThemePreset | null;
    const savedUrl = localStorage.getItem(STORAGE_KEY_BG_URL);
    const savedType = localStorage.getItem(STORAGE_KEY_BG_TYPE) as BackgroundMediaType | null;
    if (savedPreset && PALETTES[savedPreset]) setPresetState(savedPreset);
    if (savedUrl && savedType) setBackgroundMediaState({ url: savedUrl, type: savedType });
  }, []);

  // 팔레트가 바뀔 때마다 CSS 변수를 문서 루트에 다시 씀 -> 모든 화면이 즉시 반영됨
  useEffect(() => {
    const tokens = PALETTES[preset];
    const root = document.documentElement;
    root.style.setProperty("--color-bg", tokens.bg);
    root.style.setProperty("--color-surface", tokens.surface);
    root.style.setProperty("--color-surface-raised", tokens.surfaceRaised);
    root.style.setProperty("--color-border", tokens.border);
    root.style.setProperty("--color-text", tokens.text);
    root.style.setProperty("--color-text-muted", tokens.textMuted);
    root.style.setProperty("--color-accent", tokens.accent);
    root.style.setProperty("--color-link", tokens.link);
    root.style.setProperty("--color-success", tokens.success);
  }, [preset]);

  // 배경 사진(이미지)일 때만 CSS 배경으로 처리. 영상은 아래에서 실제 <video> 태그로 렌더링합니다.
  useEffect(() => {
    const root = document.documentElement;
    if (backgroundMedia?.type === "image") {
      root.style.setProperty("--app-bg-image", `url("${backgroundMedia.url}")`);
    } else {
      root.style.removeProperty("--app-bg-image");
    }

    if (backgroundMedia) {
      document.body.classList.add("has-bg-media");
    } else {
      document.body.classList.remove("has-bg-media");
    }
  }, [backgroundMedia]);

  function setPreset(p: ThemePreset) {
    setPresetState(p);
    localStorage.setItem(STORAGE_KEY_PRESET, p);
  }

  function setBackgroundMedia(media: BackgroundMedia) {
    setBackgroundMediaState(media);
    setPersistWarning(null);

    if (!media) {
      localStorage.removeItem(STORAGE_KEY_BG_URL);
      localStorage.removeItem(STORAGE_KEY_BG_TYPE);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY_BG_URL, media.url);
      localStorage.setItem(STORAGE_KEY_BG_TYPE, media.type);
    } catch {
      // 영상은 용량이 커서 브라우저의 localStorage 한도(보통 5~10MB)를 넘기기 쉬움.
      // 저장은 실패해도 화면에는 적용해주고, 새로고침하면 사라진다는 걸 안내함.
      localStorage.removeItem(STORAGE_KEY_BG_URL);
      localStorage.removeItem(STORAGE_KEY_BG_TYPE);
      setPersistWarning(
        "파일 용량이 커서 저장하지 못했어요. 지금 화면에는 적용되지만, 새로고침하면 초기화돼요."
      );
    }
  }

  return (
    <ThemeContext.Provider value={{ preset, setPreset, backgroundMedia, setBackgroundMedia, persistWarning }}>
      {backgroundMedia?.type === "video" && (
        <video
          key={backgroundMedia.url}
          className="app-bg-video"
          src={backgroundMedia.url}
          autoPlay
          loop
          muted
          playsInline
        />
      )}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme은 ThemeProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}
