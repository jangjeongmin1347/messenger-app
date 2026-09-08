"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/chats", icon: "💬", label: "채팅" },
  { href: "/", icon: "👥", label: "친구" },
  { href: "/calendar", icon: "🗓", label: "캘린더" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} className={`bottom-nav-item ${active ? "active" : ""}`}>
            <span className="bottom-nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
