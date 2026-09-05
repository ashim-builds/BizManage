'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, ArrowRight, Loader2, X } from 'lucide-react';
import { useItems } from '@/services/itemService';

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data, isLoading } = useItems({ search: debouncedQuery, limit: 5 });
  const items = data?.data || [];

  const handleSelect = (item: any) => {
    setQuery('');
    setIsOpen(false);
    router.push(`/inventory/${item.id}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && items.length > 0) {
      handleSelect(items[0]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md hidden md:block z-50">
      <form onSubmit={handleSearchSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={`w-4 h-4 transition-colors ${isOpen ? 'text-blue-500' : 'text-slate-500 group-hover:text-blue-400'}`} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search products & inventory..."
          className="w-full bg-slate-100 border border-slate-200 text-sm rounded-xl pl-10 pr-10 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all shadow-xs"
        />
        
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Popover suggestions */}
      {isOpen && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 text-slate-900">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center p-4 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="ml-2 text-sm font-medium">Searching...</span>
              </div>
            ) : items.length > 0 ? (
              <ul className="space-y-1">
                {items.map((item: any) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p title={item.name} className="text-xs sm:text-sm font-bold text-slate-900 break-words leading-snug">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-600 font-medium">
                          <span className="font-mono font-semibold">CODE: {item.code || 'N/A'}</span>
                          <span>&bull;</span>
                          <span>Stock: {item.currentStock || 0}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <p className="text-sm font-mono font-black text-slate-950">Rs. {Number(item.salePrice || 0).toLocaleString()}</p>
                      </div>
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/inventory?search=${encodeURIComponent(query)}`);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors border border-blue-100"
                  >
                    View all results for "{query}" <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </li>
              </ul>
            ) : (
              <div className="p-4 text-center">
                <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900">No products found</p>
                <p className="text-xs text-slate-600 mt-1">We couldn't find anything matching "{query}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
