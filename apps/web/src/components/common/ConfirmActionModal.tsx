'use client';

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
  if (!isOpen) return null;

  // Variants styling
  const styles = {
    danger: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      shadow: 'shadow-red-500/10',
      buttonBg: 'bg-red-600 hover:bg-red-500',
      buttonShadow: 'shadow-red-600/20',
      defaultIcon: <Trash2 className="w-6 h-6" />,
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      shadow: 'shadow-amber-500/10',
      buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      buttonShadow: 'shadow-amber-600/20',
      defaultIcon: <AlertTriangle className="w-6 h-6" />,
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      shadow: 'shadow-blue-500/10',
      buttonBg: 'bg-blue-600 hover:bg-blue-500',
      buttonShadow: 'shadow-blue-600/20',
      defaultIcon: <AlertTriangle className="w-6 h-6" />,
    },
  }[variant];

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto scrollbar-thin">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full ${styles.bg} border ${styles.border} ${styles.text} flex items-center justify-center mb-3 shadow-lg ${styles.shadow}`}>
              {icon || styles.defaultIcon}
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {description ? (
                description
              ) : itemName ? (
                <>
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-slate-200">"{itemName}"</span>? This action cannot be undone.
                </>
              ) : (
                'Are you sure you want to proceed with this action?'
              )}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2 text-left font-medium animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {error ? 'Close' : 'Cancel'}
            </button>
            {!error && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isProcessing}
                className={`w-full py-2.5 rounded-xl ${styles.buttonBg} text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-lg ${styles.buttonShadow} disabled:opacity-50`}
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
