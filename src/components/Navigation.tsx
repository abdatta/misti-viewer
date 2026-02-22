"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Receipt,
  CalendarCheck,
  Inbox as InboxIcon,
} from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: "Diary", href: "/diary", icon: BookOpen },
    { name: "Money", href: "/money", icon: Receipt },
    { name: "Plan", href: "/plan", icon: CalendarCheck },
    { name: "Inbox", href: "/inbox", icon: InboxIcon },
  ];

  return (
    <nav className="bottom-nav">
      <div className="nav-links">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
