'use client';

import { Edit2, Trash2, X, Info } from 'lucide-react';
import { ModalPortal } from '@/components/ui/ModalPortal';

export interface LongPressAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface LongPressActionSheetProps {
  /** Whether the sheet is visible */
  open: boolean;
  /** Close without acting */
  onClose: () => void;
  /** Title shown at the top (e.g. item name) */
  title?: string;
  /** Subtitle shown below the title */
  subtitle?: string;
  /** List of actions to show */
  actions?: LongPressAction[];
  /** Shorthand: show a standard Edit + Delete pair */
  onEdit?: () => void;
  onDelete?: () => void;
  /** Label for the "View Details" action, if needed */
  onView?: () => void;
}

/**
 * Mobile-native bottom-sheet that slides up when a long press fires.
 * Can render a fully custom `actions` list or a standard Edit/Delete pair.
 */
export function LongPressActionSheet({
  open,
  onClose,
  title,
  subtitle,
  actions,
  onEdit,
  onDelete,
  onView,
}: LongPressActionSheetProps) {
  if (!open) return null;

  // Build the list: either caller-supplied OR auto-generated standard pair
  const items: LongPressAction[] =
    actions ??
    [
      onView && {
        label: 'View Details',
        icon: <Info className="w-5 h-5" />,
        onClick: onView,
        variant: 'default' as const,
      },
      onEdit && {
        label: 'Edit',
        icon: <Edit2 className="w-5 h-5" />,
        onClick: onEdit,
        variant: 'default' as const,
      },
      onDelete && {
        label: 'Delete',
        icon: <Trash2 className="w-5 h-5" />,
        onClick: onDelete,
        variant: 'danger' as const,
      },
    ].filter(Boolean) as LongPressAction[];

  const handleAction = (action: LongPressAction) => {
    onClose();
    // Small delay so sheet can animate out before any confirm dialog
    setTimeout(action.onClick, 100);
  };

  return (
    <ModalPortal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-250 ease-out">
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden pb-safe"
          style={{ paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom) + 16px))' }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          {(title || subtitle) && (
            <div className="px-5 pt-2 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title && (
                  <p className="text-sm font-black text-slate-900 truncate">{title}</p>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action List */}
          <div className="p-3 space-y-1.5">
            {items.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleAction(action)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left font-bold text-sm transition-all active:scale-[0.98] ${
                  action.variant === 'danger'
                    ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100'
                    : 'text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                <span className={action.variant === 'danger' ? 'text-rose-500' : 'text-slate-500'}>
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>

          {/* Cancel */}
          <div className="px-3 pb-1">
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
