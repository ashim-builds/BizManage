'use client';

import { AlertTriangle, X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface DiscardConfirmModalProps {
  isOpen: boolean;
  onClose: () => void; // Keep editing
  onConfirm: () => void; // Discard and close
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export function DiscardConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Discard unsaved changes?',
  message = 'Are you sure you want to close? Any information you have entered will not be saved.',
  confirmText = 'Discard & Close',
  cancelText = 'Keep Editing',
}: DiscardConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800"
        >
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
