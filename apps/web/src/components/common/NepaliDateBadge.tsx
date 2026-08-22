'use client';

import { adToBs } from '@/lib/nepaliDate';
import { Calendar } from 'lucide-react';

interface NepaliDateBadgeProps {
  date: Date | string | null | undefined;
  showAd?: boolean;
  className?: string;
}

export function NepaliDateBadge({
  date,
  showAd = true,
  className = '',
}: NepaliDateBadgeProps) {
  if (!date) return <span className="text-slate-500">-</span>;

  const bs = adToBs(date);
  const adStr = new Date(date).toLocaleDateString();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px] font-sans ${className}`}
      title={`AD: ${adStr} • BS: ${bs.formattedNp}`}
    >
      <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
      <span className="font-semibold text-white font-mono">{bs.shortNp}</span>
      {showAd && (
        <span className="text-[10px] text-slate-500 font-mono">({adStr})</span>
      )}
    </span>
  );
}
