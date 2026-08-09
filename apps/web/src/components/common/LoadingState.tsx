import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading data...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-slate-400 ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center space-x-4 p-4 border-b border-slate-800">
      <div className="rounded-lg bg-slate-800 h-10 w-10"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-800 rounded w-1/4"></div>
        <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
      </div>
      <div className="h-6 bg-slate-800 rounded w-20"></div>
    </div>
  );
}
