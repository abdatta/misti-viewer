import type { Metadata, Viewport } from "next";
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
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Misti Viewer",
  description: "A delightful viewer for simulator logs",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Misti Viewer",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <Navigation />
          <main className="container">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
