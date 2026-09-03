'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import { ModalPortal } from './ModalPortal';

export interface DatePickerProps {
  value?: string | Date | null;
  onChange?: (date: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
  id?: string;
  name?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date...',
  required = false,
  disabled = false,
  error,
  minDate,
  maxDate,
  className = '',
  id,
  name,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Helper format YYYY-MM-DD
  const formatISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Normalized value as ISO string
  const normalizedValue = useMemo(() => {
    if (!value) return '';
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? '' : formatISO(value);
    }
    const str = String(value);
    if (str.includes('T')) return str.split('T')[0];
    return str;
  }, [value]);

  // Parsing current selected date or fallback to today
  const selectedDateObj = useMemo(() => {
    if (!normalizedValue) return null;
    const parts = normalizedValue.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
    const fallback = new Date(normalizedValue);
    return isNaN(fallback.getTime()) ? null : fallback;
  }, [normalizedValue]);

  // Calendar navigation view date (year & month)
  const [viewDate, setViewDate] = useState<Date>(() => selectedDateObj || new Date());

  // Check mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update viewDate when value changes or when opened
  useEffect(() => {
    if (isOpen) {
      setViewDate(selectedDateObj || new Date());
      updatePosition();
    }
  }, [isOpen, normalizedValue]);

  // Compute position relative to trigger button
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverHeight = 310;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    setCoords({
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 340)),
      width: rect.width,
      placeAbove,
    });
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      if (!isMobile) updatePosition();
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, isMobile]);

  // Formatted date string for label display
  const displayFormatted = useMemo(() => {
    if (!selectedDateObj) return '';
    return selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDateObj]);

  // Calendar math for viewDate
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleYearChange = (newYear: number) => {
    setViewDate(new Date(newYear, viewMonth, 1));
  };

  const handleMonthChange = (newMonth: number) => {
    setViewDate(new Date(viewYear, newMonth, 1));
  };

  const handleSelectDate = (dateStr: string) => {
    if (disabled) return;
    if (onChange) {
      onChange(dateStr);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) {
      onChange('');
    }
  };

  // Today string for comparison
  const todayISO = formatISO(new Date());

  // Generate Year dropdown options (e.g. 2020 - 2035)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 6; y <= currentYear + 10; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Calendar Day Grid Items
  const calendarCells = useMemo(() => {
    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // 1. Previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, day);
      cells.push({
        dateStr: formatISO(prevDate),
        dayNum: day,
        isCurrentMonth: false,
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      cells.push({
        dateStr: formatISO(d),
        dayNum: day,
        isCurrentMonth: true,
      });
    }

    // 3. Next month leading days to complete grid (multiples of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(viewYear, viewMonth + 1, day);
      cells.push({
        dateStr: formatISO(nextDate),
        dayNum: day,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth, daysInCurrentMonth, firstDayOfWeek, daysInPrevMonth]);

  return (
    <div className={`relative flex flex-col ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-slate-700 font-bold mb-1 text-xs">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
      )}

      {/* Hidden input for standard forms */}
      <input type="hidden" name={name} id={id} value={normalizedValue} />

      {/* Clickable Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        className={`group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all duration-200 ${
          disabled
            ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
            : error
            ? 'bg-rose-50 border border-rose-400 text-slate-900 focus:ring-2 focus:ring-rose-400/40'
            : isOpen
            ? 'bg-white border-blue-600 ring-2 ring-blue-500/20 text-slate-900 shadow-sm'
            : 'bg-white hover:border-slate-400 border border-slate-300 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`p-1.5 rounded-lg transition-colors ${
              isOpen
                ? 'bg-blue-100 text-blue-700'
                : selectedDateObj
                ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                : 'bg-slate-100 text-slate-500 group-hover:text-slate-700'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0 flex-1">
            {normalizedValue ? (
              <span className="text-xs font-bold text-slate-900 font-mono tracking-tight">{displayFormatted}</span>
            ) : (
              <span className="text-xs text-slate-400 font-normal">{placeholder}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {normalizedValue && !disabled && !required && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Clear date"
            >
              <X className="w-3 h-3" />
            </div>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-slate-600'}`}
          />
        </div>
      </button>

      {error && <p className="text-[11px] text-rose-600 mt-1 font-medium">{error}</p>}

      {/* Popover / Modal Calendar Dropdown */}
      {isOpen && (
        <ModalPortal>
          {isMobile ? (
            /* Mobile View: Centered Modal with Backdrop */
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-center justify-center p-3 animate-in fade-in duration-200">
              <div
                ref={popoverRef}
                className="w-full max-w-[330px] bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 space-y-3 animate-in zoom-in-95 duration-150"
              >
                {/* Mobile Header with Close */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Select Date</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Calendar Body */}
                <CalendarContent
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  yearOptions={yearOptions}
                  calendarCells={calendarCells}
                  value={normalizedValue}
                  todayISO={todayISO}
                  minDate={minDate}
                  maxDate={maxDate}
                  displayFormatted={displayFormatted}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onYearChange={handleYearChange}
                  onMonthChange={handleMonthChange}
                  onSelectDate={handleSelectDate}
                  onClose={() => setIsOpen(false)}
                />
              </div>
            </div>
          ) : (
            /* Desktop View: Anchored Dropdown Popover */
            coords && (
              <div
                ref={popoverRef}
                style={{
                  position: 'fixed',
                  top: coords.placeAbove ? 'auto' : `${coords.top}px`,
                  bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
                  left: `${coords.left}px`,
                }}
                className="z-[120] w-[330px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
              >
                <CalendarContent
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  yearOptions={yearOptions}
                  calendarCells={calendarCells}
                  value={normalizedValue}
                  todayISO={todayISO}
                  minDate={minDate}
                  maxDate={maxDate}
                  displayFormatted={displayFormatted}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onYearChange={handleYearChange}
                  onMonthChange={handleMonthChange}
                  onSelectDate={handleSelectDate}
                  onClose={() => setIsOpen(false)}
                />
              </div>
            )
          )}
        </ModalPortal>
      )}
    </div>
  );
}

// Sub-component for Calendar UI
interface CalendarContentProps {
  viewYear: number;
  viewMonth: number;
  yearOptions: number[];
  calendarCells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[];
  value: string;
  todayISO: string;
  minDate?: string;
  maxDate?: string;
  displayFormatted: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  onSelectDate: (d: string) => void;
  onClose: () => void;
}

function CalendarContent({
  viewYear,
  viewMonth,
  yearOptions,
  calendarCells,
  value,
  todayISO,
  minDate,
  maxDate,
  displayFormatted,
  onPrevMonth,
  onNextMonth,
  onYearChange,
  onMonthChange,
  onSelectDate,
  onClose,
}: CalendarContentProps) {
  return (
    <div className="space-y-2.5">
      {/* Month / Year Header Navigation */}
      <div className="flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center"
          title="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {/* Month Select */}
          <select
            value={viewMonth}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx} className="bg-white text-slate-900">
                {name}
              </option>
            ))}
          </select>

          {/* Year Select */}
          <select
            value={viewYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-mono"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year} className="bg-white text-slate-900">
                {year}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onNextMonth}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center"
          title="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500 py-1 border-b border-slate-200">
        {DAY_NAMES.map((name, i) => (
          <span key={name} className={i === 0 || i === 6 ? 'text-blue-600' : ''}>
            {name}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell) => {
          const isSelected = cell.dateStr === value;
          const isToday = cell.dateStr === todayISO;

          let isDisabled = false;
          if (minDate && cell.dateStr < minDate) isDisabled = true;
          if (maxDate && cell.dateStr > maxDate) isDisabled = true;

          return (
            <button
              key={cell.dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`h-8 rounded-xl flex items-center justify-center transition-all text-xs ${
                isDisabled
                  ? 'opacity-20 cursor-not-allowed text-slate-300'
                  : isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-sm scale-105 z-10'
                  : isToday
                  ? 'bg-blue-50 border border-blue-400 text-blue-700 font-bold hover:bg-blue-100'
                  : cell.isCurrentMonth
                  ? 'text-slate-800 hover:bg-slate-100 font-semibold'
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {cell.dayNum}
            </button>
          );
        })}
      </div>

      {/* Footer Selected Summary & Done Button */}
      {value && (
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold text-slate-900 truncate font-mono">{displayFormatted}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
          >
            <Check className="w-3 h-3" /> Done
          </button>
        </div>
      )}
    </div>
  );
}
