"use client";

import { useSunriseSunsetTheme } from "@/hooks/useSunriseSunsetTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The hook handles adding/removing the .dark class on document.documentElement
  useSunriseSunsetTheme();

  return <>{children}</>;
}
