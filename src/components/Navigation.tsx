"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BookOpen,
  Receipt,
  CalendarCheck,
  Inbox as InboxIcon,
} from "lucide-react";

function NavigationContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const dateQuery = dateParam ? `?date=${dateParam}` : "";

  const navItems = [
    { name: "Diary", href: "/diary", icon: BookOpen },
    { name: "Inbox", href: "/inbox", icon: InboxIcon },
    { name: "Money", href: "/money", icon: Receipt },
    { name: "Plan", href: "/plan", icon: CalendarCheck },
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
              href={`${item.href}${dateQuery}`}
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

export default function Navigation() {
  return (
    <Suspense fallback={<nav className="bottom-nav"></nav>}>
      <NavigationContent />
    </Suspense>
  );
}
