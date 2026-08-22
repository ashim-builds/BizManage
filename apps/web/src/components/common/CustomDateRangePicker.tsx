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
import { ModalPortal } from './ModalPortal';

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

  // Block background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Temporary selection state while modal is open
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

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      setTempPreset(preset);
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) setViewDate(d);
      } else {
        setViewDate(new Date());
      }
    }
  }, [isOpen, startDate, endDate, preset]);

  // Helper date formatters
  const formatDateISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Button label formatter
  const formatDisplayLabel = (): string => {
    if (preset === 'custom' && startDate && endDate) {
      if (startDate === endDate) return `Custom: ${startDate}`;
      return `Custom: ${startDate} → ${endDate}`;
    }
    if (preset === 'custom' && startDate) return `Custom: From ${startDate}`;
    if (preset === 'custom' && endDate) return `Custom: Until ${endDate}`;
    return 'Custom Date';
  };

  // Preset Handlers inside the modal
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

  const isCustomActive = preset === 'custom' || (Boolean(startDate) && Boolean(endDate));

  return (
    <div className={`relative inline-block ${className}`}>
      {/* TRIGGER BUTTON (Clearly Named "Custom Date") */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm shrink-0 ${
          isCustomActive
            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20'
            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
        }`}
        title="Open custom calendar date picker"
      >
        <CalendarIcon className={`w-3.5 h-3.5 ${isCustomActive ? 'text-white' : 'text-blue-400'} shrink-0`} />
        <span className="font-mono tracking-tight whitespace-nowrap">{formatDisplayLabel()}</span>
      </button>

      {/* FULLY ACCESSIBLE CENTERED CALENDAR MODAL WITH BACKDROP */}
      {isOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
            {/* Modal Container */}
            <div
              className="w-full max-w-[560px] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden font-sans text-slate-200 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Custom Date Range (क्यालेन्डर मिति छान्नुहोस्)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Select start and end dates from the calendar below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
              {/* Left Column: Presets */}
              <div className="p-3 space-y-1 bg-slate-950/40">
                <p className="text-[10px] font-bold uppercase text-slate-500 px-2 py-1 tracking-wider">
                  Quick Presets
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-1 gap-1">
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
              <div className="sm:col-span-2 p-4 space-y-3.5">
                {/* Month & Year Navigation */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-white tracking-wide">
                    {monthNames[month]} {year}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day Header */}
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {/* Padding empty slots */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}

                  {/* Day Cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateObj = new Date(year, month, dayNum);
                    const iso = formatDateISO(dateObj);

                    const isSelectedStart = tempStart === iso;
                    const isSelectedEnd = tempEnd === iso;

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
                        className={`h-8 w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-all relative ${
                          isSelectedStart || isSelectedEnd
                            ? 'bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400/40 z-10'
                            : isInRange || isHoverInRange
                            ? 'bg-blue-500/20 text-blue-300 font-semibold rounded-none'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {dayNum}
                        {isToday && !isSelectedStart && !isSelectedEnd && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Direct Manual Date Inputs */}
                <div className="pt-2.5 border-t border-slate-800 flex items-center gap-3 text-xs">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Start Date (सुरु मिति)
                    </label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => {
                        setTempStart(e.target.value);
                        setTempPreset('custom');
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                      End Date (अन्तिम मिति)
                    </label>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => {
                        setTempEnd(e.target.value);
                        setTempPreset('custom');
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/80">
              <button
                type="button"
                onClick={handleResetClick}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset (All Time)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
                >
                  <Check className="w-4 h-4" /> Apply Filter (लागू गर्नुहोस्)
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}
    </div>
  );
}
