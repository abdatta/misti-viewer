"use client";

import { useState, useRef, useEffect } from "react";
import {
  format,
  parseISO,
  isToday,
  isYesterday,
  isValid,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CustomDatePickerProps {
  // String "yyyy-MM-dd" or empty
  selectedDate: string;
  // Triggered when a new date is clicked, passing "yyyy-MM-dd"
  onChange: (date: string) => void;
  // List of all valid selectable dates
  displayDates: string[];
  // Fallback text if no dates
  disabled?: boolean;
}

export default function CustomDatePicker({
  selectedDate,
  onChange,
  displayDates,
  disabled,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // The month currently being viewed in the calendar pane
  const initialViewDate =
    selectedDate && isValid(parseISO(selectedDate))
      ? parseISO(selectedDate)
      : new Date();
  const [viewDate, setViewDate] = useState<Date>(initialViewDate);

  const popupRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update view month when selected date externally changes
  useEffect(() => {
    if (selectedDate && isValid(parseISO(selectedDate))) {
      setViewDate(parseISO(selectedDate));
    }
  }, [selectedDate]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    // Reset view to currently selected date on open
    if (!isOpen && selectedDate && isValid(parseISO(selectedDate))) {
      setViewDate(parseISO(selectedDate));
    }
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(subMonths(viewDate, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(addMonths(viewDate, 1));
  };

  const handleSelectDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    onChange(dateStr);
    setIsOpen(false);
  };

  let oldestDateStr = "";
  let oldestDateLabel = "Oldest";
  if (displayDates && displayDates.length > 0) {
    oldestDateStr = displayDates.reduce(
      (min, curr) => (curr < min ? curr : min),
      displayDates[0],
    );
    if (isValid(parseISO(oldestDateStr))) {
      const oldestDate = parseISO(oldestDateStr);
      const isCurrentYear =
        oldestDate.getFullYear() === new Date().getFullYear();
      oldestDateLabel = format(
        oldestDate,
        isCurrentYear ? "MMM d" : "MMM d, yyyy",
      );
    }
  }

  const handleOldest = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (oldestDateStr) {
      onChange(oldestDateStr);
    }
    setIsOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const todayStr = format(new Date(), "yyyy-MM-dd");
    onChange(todayStr);
    setIsOpen(false);
  };

  // Generate calendar grid (including leading/trailing days to fill 7 columns)
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);

  // Back up to the previous Sunday (0)
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Move forward to the next Saturday (6)
  const endDate = new Date(monthEnd);
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  }

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Generate trigger button text
  let buttonText = "Select Date";
  if (displayDates.length === 0) {
    buttonText = "No dates available";
  } else if (selectedDate && isValid(parseISO(selectedDate))) {
    const d = parseISO(selectedDate);
    if (isToday(d)) {
      buttonText = "Today";
    } else if (isYesterday(d)) {
      buttonText = "Yesterday";
    } else {
      buttonText = format(d, "EEEE, MMM d, yyyy");
    }
  } else if (selectedDate) {
    buttonText = "Invalid Date";
  }

  return (
    <div className="custom-datepicker" ref={popupRef}>
      <button
        type="button"
        className="datepicker-trigger"
        onClick={handleToggle}
        disabled={disabled}
      >
        {buttonText}
      </button>

      {isOpen && (
        <div className="datepicker-popup">
          {/* Calendar Header */}
          <div className="datepicker-header">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="btn-icon-clear datepicker-nav"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <div className="datepicker-month-year">
              {format(viewDate, "MMMM yyyy")}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="btn-icon-clear datepicker-nav"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="datepicker-week-days">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div key={day} className="datepicker-week-day">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="datepicker-grid">
            {calendarDays.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const isSelected = selectedDate === dayStr;
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isSameDay(day, new Date());
              // We could disable dates not in `displayDates`, but sometimes
              // it's nice to see standard calendar traversal. It matches chromium to leave them clickable
              // but you might want to gray them out.
              const isAvailable = displayDates.includes(dayStr);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`datepicker-day 
                    ${!isCurrentMonth ? "datepicker-day-outside" : ""}
                    ${isSelected ? "datepicker-day-selected" : ""}
                    ${isTodayDate && !isSelected ? "datepicker-day-today" : ""}
                    ${!isAvailable ? "datepicker-day-unavailable" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="datepicker-actions">
            <button
              type="button"
              className="datepicker-action-btn"
              onClick={handleOldest}
              disabled={!oldestDateStr}
            >
              {oldestDateLabel}
            </button>
            <button
              type="button"
              className="datepicker-action-btn"
              onClick={handleToday}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
