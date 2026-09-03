import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading data...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-slate-600 ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
      <p className="text-xs sm:text-sm font-semibold text-slate-600">{message}</p>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center space-x-4 p-4 border-b border-slate-200">
      <div className="rounded-xl bg-slate-100 h-10 w-10 border border-slate-200"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
      </div>
      <div className="h-6 bg-slate-100 rounded w-20 border border-slate-200"></div>
    </div>
  );
}
