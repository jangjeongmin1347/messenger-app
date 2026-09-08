"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import CallButton from "@/app/components/CallButton";
import BottomNav from "@/app/components/BottomNav";

type Friend = { id: string; phoneNumber: string; displayName: string | null };

export default function HomePage() {
  const { token, user, loading, logout } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriendPhone, setNewFriendPhone] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch("/api/friends", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setFriends(data.friends ?? []));
  }, [token]);

  async function addFriend() {
    if (!newFriendPhone) return;
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phoneNumber: newFriendPhone }),
    });
    if (res.ok) {
      setNewFriendPhone("");
      const refreshed = await fetch("/api/friends", { headers: { Authorization: `Bearer ${token}` } });
      const data = await refreshed.json();
      setFriends(data.friends ?? []);
    } else {
      const data = await res.json();
      alert(data.error ?? "친구 추가에 실패했습니다.");
    }
  }

  if (loading) return null;

  if (!token) {
    return (
      <div className="app-shell app-shell--no-nav">
        <div className="screen-body">
          <p className="subtext">로그인이 필요합니다.</p>
          <Link href="/login" className="btn btn-primary">로그인 하러 가기</Link>
        </div>
      </div>
    );
  }

  const name = user?.displayName ?? user?.phoneNumber ?? "";

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <p className="call-type-label" style={{ margin: 0 }}>안녕하세요</p>
          <h1>{name}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/settings" className="btn btn-ghost" style={{ width: 40, height: 40, borderRadius: 999, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ⚙️
          </Link>
          <button className="btn btn-ghost" onClick={logout}>로그아웃</button>
        </div>
      </div>

      <div className="screen-body">
        <p className="section-title">친구 추가</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="tel"
            className="input"
            value={newFriendPhone}
            onChange={(e) => setNewFriendPhone(e.target.value)}
            placeholder="+821012345678"
          />
          <button className="btn btn-primary" onClick={addFriend}>추가</button>
        </div>

        <p className="section-title">친구 목록</p>
        {friends.length === 0 && <p className="empty-state">아직 친구가 없어요. 전화번호로 추가해보세요.</p>}

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {friends.map((friend) => {
            const friendName = friend.displayName ?? friend.phoneNumber;
            return (
              <li key={friend.id} className="list-item">
                <Link
                  href={`/chat/${friend.id}?name=${encodeURIComponent(friendName)}`}
                  style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit", minWidth: 0 }}
                >
                  <div className="avatar">{friendName.slice(0, 1)}</div>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{friendName}</span>
                </Link>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <CallButton targetUserId={friend.id} callType="voice" name={friendName} />
                  <CallButton targetUserId={friend.id} callType="video" name={friendName} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <BottomNav />
    </div>
  );
}
