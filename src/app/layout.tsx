import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Link from "next/link";
import {
  BookOpen,
  Receipt,
  CalendarCheck,
  Inbox as InboxIcon,
} from "lucide-react";
import Navigation from "@/components/Navigation"; // We'll extract this to a client component for active states

export const metadata: Metadata = {
  title: "Misti Viewer",
  description: "A delightful viewer for simulator logs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
