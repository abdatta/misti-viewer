import { useState, useEffect } from "react";
import SunCalc from "suncalc";

// Default to San Francisco coordinates (since Misti is "LA Soft Vibe", either LA or SF works well)
// Latitude: 37.7749, Longitude: -122.4194 (SF)
// Latitude: 34.0522, Longitude: -118.2437 (LA)
const LA_LAT = 34.0522;
const LA_LNG = -118.2437;

export function useSunriseSunsetTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const checkTimeAndSetTheme = () => {
      const now = new Date();
      // Get today's sunrise and sunset times
      const times = SunCalc.getTimes(now, LA_LAT, LA_LNG);

      const { sunrise, sunset } = times;

      // It is dark if:
      // 1. Current time is before today's sunrise (e.g., 2 AM)
      // 2. Current time is after today's sunset (e.g., 8 PM)
      if (now < sunrise || now > sunset) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
        updateThemeColor("#111110");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
        updateThemeColor("#fcfbfa");
      }
    };

    const updateThemeColor = (color: string) => {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute("content", color);
      } else {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.setAttribute("name", "theme-color");
        metaThemeColor.setAttribute("content", color);
        document.head.appendChild(metaThemeColor);
      }
    };

    // Check immediately on mount
    checkTimeAndSetTheme();

    // Check every 5 minutes to see if we've crossed the boundary
    const interval = setInterval(checkTimeAndSetTheme, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return theme;
}
