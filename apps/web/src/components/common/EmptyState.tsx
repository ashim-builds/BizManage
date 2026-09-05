import { FolderOpen, Plus } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="p-8 sm:p-12 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-white shadow-2xs my-4 sm:my-6">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3.5 border border-blue-100 shadow-2xs">
        {icon || <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7" />}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer min-h-[40px]"
        >
          <Plus className="w-4 h-4" /> {actionLabel}
        </button>
      )}
    </div>
  );
}
