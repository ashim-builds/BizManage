'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  itemName?: string; // Kept for backwards compatibility
  actionText?: string;
  isProcessing?: boolean;
  error?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  actionText = 'Confirm',
  isProcessing = false,
  error,
  variant = 'danger',
  icon,
}: ConfirmActionModalProps) {
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

  if (!isOpen) return null;

  // Variants styling
  const styles = {
    danger: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-600',
      shadow: 'shadow-rose-500/10',
      buttonBg: 'bg-rose-600 hover:bg-rose-500',
      buttonShadow: 'shadow-rose-600/20',
      defaultIcon: <Trash2 className="w-6 h-6" />,
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-600',
      shadow: 'shadow-amber-500/10',
      buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      buttonShadow: 'shadow-amber-600/20',
      defaultIcon: <AlertTriangle className="w-6 h-6" />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-600',
      shadow: 'shadow-blue-500/10',
      buttonBg: 'bg-blue-600 hover:bg-blue-500',
      buttonShadow: 'shadow-blue-600/20',
      defaultIcon: <AlertTriangle className="w-6 h-6" />,
    },
  }[variant];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4 font-sans"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-center">
            <div className={`w-14 h-14 rounded-2xl ${styles.bg} border ${styles.border} ${styles.text} flex items-center justify-center mb-3 shadow-xs`}>
              {icon || styles.defaultIcon}
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
            <p className="text-xs text-slate-500 mt-1.5">
              {description ? (
                description
              ) : itemName ? (
                <>
                  Are you sure you want to delete{' '}
                  <span className="font-bold text-slate-800">"{itemName}"</span>? This action cannot be undone.
                </>
              ) : (
                'Are you sure you want to proceed with this action?'
              )}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 text-left font-medium shadow-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {error ? 'Close' : 'Cancel'}
            </button>
            {!error && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isProcessing}
                className={`w-full py-2.5 rounded-xl ${styles.buttonBg} text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${styles.buttonShadow} cursor-pointer active:scale-95 disabled:opacity-50`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                  </>
                ) : (
                  actionText
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
