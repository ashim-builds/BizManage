'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export interface CustomDateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  preset: 'all' | 'today' | 'week' | 'month' | 'custom';
  onApply: (startDate: string, endDate: string, preset: 'all' | 'today' | 'week' | 'month' | 'custom') => void;
  className?: string;
}

export function CustomDateRangePicker({
  startDate,
  endDate,
  preset,
  onApply,
  className = '',
}: CustomDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Temporary state while modal/popover is open
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [tempPreset, setTempPreset] = useState(preset);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Calendar month view navigation
  const [viewDate, setViewDate] = useState(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  // Sync with props when opened
  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      setTempPreset(preset);
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) setViewDate(d);
      }
    }
  }, [isOpen, startDate, endDate, preset]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Helper date formatters
  const formatDateISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayRange = (): string => {
    if (preset === 'today') return 'Today';
    if (preset === 'week') return 'Last 7 Days';
    if (preset === 'month') return 'This Month';
    if (preset === 'all' && !startDate && !endDate) return 'All Time';

    if (startDate && endDate) {
      if (startDate === endDate) return startDate;
      return `${startDate} → ${endDate}`;
    }
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return 'Custom Range';
  };

  // Preset Handlers
  const applyPreset = (p: 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'year' | 'all') => {
    const now = new Date();
    if (p === 'today') {
      const s = formatDateISO(now);
      setTempStart(s);
      setTempEnd(s);
      setTempPreset('today');
      setViewDate(now);
    } else if (p === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = formatDateISO(y);
      setTempStart(s);
      setTempEnd(s);
      setTempPreset('custom');
      setViewDate(y);
    } else if (p === 'week') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setTempStart(formatDateISO(past));
      setTempEnd(formatDateISO(now));
      setTempPreset('week');
      setViewDate(now);
    } else if (p === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setTempStart(formatDateISO(first));
      setTempEnd(formatDateISO(now));
      setTempPreset('month');
      setViewDate(now);
    } else if (p === 'lastMonth') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setTempStart(formatDateISO(first));
      setTempEnd(formatDateISO(last));
      setTempPreset('custom');
      setViewDate(first);
    } else if (p === 'year') {
      const first = new Date(now.getFullYear(), 0, 1);
      setTempStart(formatDateISO(first));
      setTempEnd(formatDateISO(now));
      setTempPreset('custom');
      setViewDate(now);
    } else {
      setTempStart('');
      setTempEnd('');
      setTempPreset('all');
    }
  };

  // Calendar Day Click Logic
  const handleDayClick = (isoString: string) => {
    setTempPreset('custom');
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(isoString);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      if (isoString < tempStart) {
        setTempEnd(tempStart);
        setTempStart(isoString);
      } else {
        setTempEnd(isoString);
      }
    }
  };

  // Calendar generation for viewDate month
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayISO = formatDateISO(new Date());

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleApplyClick = () => {
    onApply(tempStart, tempEnd, tempPreset);
    setIsOpen(false);
  };

  const handleResetClick = () => {
    setTempStart('');
    setTempEnd('');
    setTempPreset('all');
    onApply('', '', 'all');
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* TRIGGER BUTTON (Sleek, Compact, and Informative) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
          isOpen
            ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/30'
            : preset !== 'all' || startDate || endDate
            ? 'bg-slate-900 text-blue-400 border-blue-500/40 hover:border-blue-400'
            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
        }`}
        title="Choose date range"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-mono tracking-tight">{formatDisplayRange()}</span>
      </button>

      {/* INTERACTIVE CALENDAR POPOVER MODAL */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed sm:absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 top-20 sm:top-full sm:mt-2 w-[340px] sm:w-[540px] max-w-[95vw] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 font-sans text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Select Date Range
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
              {/* Left Column: Quick Preset Buttons */}
              <div className="p-3 space-y-1 bg-slate-950/30">
                <p className="text-[10px] font-bold uppercase text-slate-500 px-2 py-1 tracking-wider">
                  Quick Presets
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
                  <button
                    type="button"
                    onClick={() => applyPreset('today')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tempPreset === 'today'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Today (आज)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('yesterday')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
                  >
                    Yesterday (हिजो)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('week')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tempPreset === 'week'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Last 7 Days (७ दिन)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('month')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tempPreset === 'month'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    This Month (यो महिना)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('lastMonth')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
                  >
                    Last Month (अघिल्लो)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tempPreset === 'all'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    All Time (सबै)
                  </button>
                </div>
              </div>

              {/* Right 2-Columns: Visual Interactive Month Calendar */}
              <div className="sm:col-span-2 p-3.5 space-y-3">
                {/* Month & Year Navigation */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-white tracking-wide">
                    {monthNames[month]} {year}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day Header (Su, Mo, Tu, We, Th, Fr, Sa) */}
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {/* Padding empty slots */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-7" />
                  ))}

                  {/* Day Cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateObj = new Date(year, month, dayNum);
                    const iso = formatDateISO(dateObj);

                    const isSelectedStart = tempStart === iso;
                    const isSelectedEnd = tempEnd === iso;
                    const isSingleDay = isSelectedStart && (tempStart === tempEnd || !tempEnd);

                    const isInRange =
                      tempStart &&
                      tempEnd &&
                      iso > tempStart &&
                      iso < tempEnd;

                    const isHoverInRange =
                      tempStart &&
                      !tempEnd &&
                      hoverDate &&
                      ((iso > tempStart && iso <= hoverDate) || (iso < tempStart && iso >= hoverDate));

                    const isToday = iso === todayISO;

                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => handleDayClick(iso)}
                        onMouseEnter={() => setHoverDate(iso)}
                        onMouseLeave={() => setHoverDate(null)}
                        className={`h-7 w-full rounded-md text-xs font-medium flex items-center justify-center transition-all relative ${
                          isSelectedStart || isSelectedEnd
                            ? 'bg-blue-600 text-white font-bold shadow-sm z-10'
                            : isInRange || isHoverInRange
                            ? 'bg-blue-500/20 text-blue-300 font-semibold rounded-none'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {dayNum}
                        {isToday && !isSelectedStart && !isSelectedEnd && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Direct Start & End inputs */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 block mb-0.5">Start Date</label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => {
                        setTempStart(e.target.value);
                        setTempPreset('custom');
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 block mb-0.5">End Date</label>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => {
                        setTempEnd(e.target.value);
                        setTempPreset('custom');
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-950/80">
              <button
                type="button"
                onClick={handleResetClick}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset (All Time)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyClick}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
