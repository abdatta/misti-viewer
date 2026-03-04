import React, { useMemo } from "react";
import SunCalc from "suncalc";
import { parseISO } from "date-fns";
import { Sun } from "lucide-react";

const LA_LAT = 34.0522;
const LA_LNG = -118.2437;

interface TimeIconProps {
  date: string; // ISO date string, e.g. "2026-01-09"
  timeLabel: string; // e.g. "2:00 PM"
  size?: number;
}

export default function TimeIcon({
  date,
  timeLabel,
  size = 18,
}: TimeIconProps) {
  const { isDay, moonPhase, moonRotation } = useMemo(() => {
    try {
      // Parse "2:00 PM" into an actual Date object
      // Note: Some diary entries may have different header formats, so we handle standard HH:MM AM/PM gracefully.
      const match = timeLabel.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (!match) {
        // Fallback if parsing fails - just assume daytime
        return { isDay: true, moonPhase: 0, moonRotation: 0 };
      }

      const [_, hStr, mStr, modifier] = match;
      let h = parseInt(hStr, 10);
      if (modifier.toUpperCase() === "PM" && h < 12) h += 12;
      if (modifier.toUpperCase() === "AM" && h === 12) h = 0;

      const exactDate = parseISO(
        `${date}T${String(h).padStart(2, "0")}:${mStr}:00`,
      );

      const times = SunCalc.getTimes(exactDate, LA_LAT, LA_LNG);
      const isDayTime = exactDate >= times.sunrise && exactDate < times.sunset;

      const phaseInfo = SunCalc.getMoonIllumination(exactDate);

      // Simple fixed rotation pointing left or right depending on Waxing/Waning phase
      const isWaxingCalc = phaseInfo.phase <= 0.5;

      // We want the moon to ALWAYS point generally downwards.
      // 0 degrees usually points right.
      // -135 degrees makes Waxing point down and left.
      // -45 degrees makes Waning point down and right.
      const moonRotation = isWaxingCalc ? 45 : -45;

      return {
        isDay: isDayTime,
        moonPhase: phaseInfo.phase,
        moonRotation,
      };
    } catch (err) {
      console.error("Error calculating sun/moon times:", err);
      return { isDay: true, moonPhase: 0, moonRotation: 0 };
    }
  }, [date, timeLabel]);

  if (isDay) {
    return <Sun size={size * 1.25} color="#eab308" fill="#eab308" />;
  }

  // Draw Exact Moon Phase
  const isWaxing = moonPhase <= 0.5;
  const normPhase = isWaxing ? moonPhase * 2 : (moonPhase - 0.5) * 2;
  const cosPhase = Math.cos(normPhase * Math.PI);
  const rx = Math.abs(cosPhase * 9);

  const sweepWaxing = cosPhase >= 0 ? 0 : 1;
  const sweepWaning = cosPhase >= 0 ? 1 : 0;

  const d = isWaxing
    ? `M 12 3 A 9 9 0 0 1 12 21 A ${rx} 9 0 0 ${sweepWaxing} 12 3 Z`
    : `M 12 3 A 9 9 0 0 0 12 21 A ${rx} 9 0 0 ${sweepWaning} 12 3 Z`;

  return (
    <svg
      width={size * 1.25} // Increase visible container slightly
      height={size * 1.25}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#60a5fa"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform={`rotate(${moonRotation}, 12, 12)`}>
        {/* Illuminated portion */}
        <path d={d} fill="#60a5fa" stroke="none" />
      </g>
    </svg>
  );
}
