"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/app/components/BottomNav";
import EventModal, { CalendarEvent, CATEGORY_LABEL, CATEGORY_CLASS } from "@/app/components/EventModal";

// 카테고리별 실제 색상값 (globals.css의 --category-* 와 동일하게 유지)
const CATEGORY_COLOR: Record<string, string> = {
  PERSONAL: "#ff8a3d",
  WORK: "#8c8fe8",
  SOCIAL: "#4fbf8b",
};

export default function CalendarPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<Partial<CalendarEvent> & { startAt: string; endAt: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/events", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setEvents(data.events ?? []));
  }, [token]);

  function openCreateModal(startAt: string, endAt: string, allDay: boolean) {
    setEditingId(null);
    setModalInitial({ startAt, endAt, allDay, category: "PERSONAL" });
    setModalOpen(true);
  }

  function openEditModal(event: CalendarEvent) {
    setEditingId(event.id);
    setModalInitial(event);
    setModalOpen(true);
  }

  async function handleSave(data: Omit<CalendarEvent, "id">) {
    if (editingId) {
      const res = await fetch(`/api/events/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const { event } = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === editingId ? event : e)));
    } else {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const { event } = await res.json();
      setEvents((prev) => [...prev, event]);
    }
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!editingId) return;
    await fetch(`/api/events/${editingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setEvents((prev) => prev.filter((e) => e.id !== editingId));
    setModalOpen(false);
  }

  // 오늘 일정만 뽑아서 시간순으로 - 캘린더 아래 아젠다 목록에 사용
  const todayEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.startAt).toDateString() === now.toDateString())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events]);

  return (
    <div className="app-shell calendar-page" style={{ maxWidth: 480 }}>
      <div className="topbar">
        <h1>캘린더</h1>
      </div>
      <div className="screen-body">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          selectable
          height="auto"
          select={(info) => openCreateModal(info.startStr, info.endStr, info.allDay)}
          eventClick={(info) => {
            const found = events.find((e) => e.id === info.event.id);
            if (found) openEditModal(found);
          }}
          events={events.map((e) => ({
            id: e.id,
            title: e.title,
            start: e.startAt,
            end: e.endAt,
            allDay: e.allDay,
            backgroundColor: CATEGORY_COLOR[e.category],
            borderColor: CATEGORY_COLOR[e.category],
            textColor: "#1a1200",
          }))}
        />

        <p className="section-title">오늘 일정</p>
        {todayEvents.length === 0 && <p className="empty-state">오늘 등록된 일정이 없어요.</p>}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {todayEvents.map((event) => (
            <li key={event.id} className="agenda-item" onClick={() => openEditModal(event)}>
              <span className={`category-dot ${CATEGORY_CLASS[event.category]}`} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{event.title}</div>
                <div className="toast-preview">
                  {event.allDay
                    ? "하루 종일"
                    : `${new Date(event.startAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} · ${CATEGORY_LABEL[event.category]}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <EventModal
        open={modalOpen}
        initial={modalInitial ?? undefined}
        isEditing={!!editingId}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={editingId ? handleDelete : undefined}
      />

      <BottomNav />
    </div>
  );
}
