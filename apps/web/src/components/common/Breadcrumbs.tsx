'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center space-x-1 sm:space-x-2 text-xs font-medium text-slate-400">
      <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1 shrink-0">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const formatted = segment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

        return (
          <div key={href} className="flex items-center space-x-1 sm:space-x-2 min-w-0">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {isLast ? (
              <span className="text-blue-400 font-semibold truncate">{formatted}</span>
            ) : (
              <Link href={href} className="hover:text-white transition-colors truncate hidden sm:block">
                {formatted}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
