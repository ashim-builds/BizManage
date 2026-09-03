'use client';

import { useState } from 'react';
import { ModalPortal } from '@/components/common/ModalPortal';
import { Download, X, FileSpreadsheet, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExportConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  recordCount: number;
  onConfirm: (format: 'csv' | 'json') => void;
}

export function ExportConfirmModal({
  isOpen,
  onClose,
  title,
  description,
  recordCount,
  onConfirm,
}: ExportConfirmModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsExporting(true);
    try {
      onConfirm(selectedFormat);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                <Download className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Confirm Data Export</h3>
                <p className="text-xs text-slate-500 mt-0.5">{title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Record Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Records to export:</span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {recordCount} {recordCount === 1 ? 'record' : 'records'}
              </span>
            </div>

            {description && (
              <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
            )}

            {/* Format Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Select Export Format
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* CSV / Excel Option */}
                <div
                  onClick={() => setSelectedFormat('csv')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedFormat === 'csv'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    {selectedFormat === 'csv' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-600/20" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Excel / CSV</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Opens in Excel, Google Sheets, or Numbers
                    </p>
                  </div>
                </div>

                {/* JSON Option */}
                <div
                  onClick={() => setSelectedFormat('json')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedFormat === 'json'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                      <FileCode className="w-4 h-4" />
                    </div>
                    {selectedFormat === 'json' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-600/20" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">JSON File</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Structured raw data for backup or import
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Exported files include complete column headers and formatting ready for re-importing into BizManage anytime.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Confirm & Export {selectedFormat.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
