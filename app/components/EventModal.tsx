"use client";

import { useEffect, useState } from "react";

export type EventCategory = "PERSONAL" | "WORK" | "SOCIAL";

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  category: EventCategory;
};

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  PERSONAL: "개인",
  WORK: "업무",
  SOCIAL: "약속",
};

// 카테고리별 색상은 globals.css의 --category-* 변수와 짝을 맞춤
export const CATEGORY_CLASS: Record<EventCategory, string> = {
  PERSONAL: "category-personal",
  WORK: "category-work",
  SOCIAL: "category-social",
};

type Props = {
  open: boolean;
  initial?: Partial<CalendarEvent> & { startAt: string; endAt: string };
  isEditing: boolean;
  onClose: () => void;
  onSave: (data: Omit<CalendarEvent, "id">) => void;
  onDelete?: () => void;
};

function toDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 캘린더 화면의 날짜 선택(새 일정) / 이벤트 클릭(수정) 모두 이 모달 하나로 처리합니다.
 */
export default function EventModal({ open, initial, isEditing, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState<EventCategory>("PERSONAL");

  useEffect(() => {
    if (!open || !initial) return;
    setTitle(initial.title ?? "");
    setDescription(initial.description ?? "");
    setStartAt(toDateTimeLocal(initial.startAt));
    setEndAt(toDateTimeLocal(initial.endAt));
    setAllDay(initial.allDay ?? false);
    setCategory(initial.category ?? "PERSONAL");
  }, [open, initial]);

  if (!open) return null;

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      allDay,
      category,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditing ? "일정 수정" : "새 일정"}</h2>

        <label className="field-label">제목</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="일정 제목"
          autoFocus
        />

        <label className="field-label" style={{ marginTop: 12 }}>설명 (선택)</label>
        <textarea
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="메모를 남겨보세요"
          rows={2}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="field-label">시작</label>
            <input
              type="datetime-local"
              className="input"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={allDay}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label">종료</label>
            <input
              type="datetime-local"
              className="input"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              disabled={allDay}
            />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 14 }}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          하루 종일
        </label>

        <label className="field-label" style={{ marginTop: 12 }}>카테고리</label>
        <div className="category-picker">
          {(Object.keys(CATEGORY_LABEL) as EventCategory[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`category-option ${CATEGORY_CLASS[key]} ${category === key ? "selected" : ""}`}
              onClick={() => setCategory(key)}
            >
              {CATEGORY_LABEL[key]}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {isEditing && onDelete && (
            <button className="btn btn-danger" onClick={onDelete}>삭제</button>
          )}
          <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: "auto" }}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!title.trim()}>저장</button>
        </div>
      </div>
    </div>
  );
}
