'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Package, X, ChevronDown } from 'lucide-react';

export interface SelectableItem {
  id: string;
  name: string;
  unit: string;
  currentStock?: number;
  salePrice?: number;
  purchasePrice?: number;
  type?: string;
  minStockAlert?: number;
}

interface ItemSearchSelectProps {
  items: SelectableItem[];
  value: string;
  onChange: (itemId: string) => void;
  placeholder?: string;
  priceField?: 'salePrice' | 'purchasePrice';
  className?: string;
}

export function ItemSearchSelect({
  items,
  value,
  onChange,
  placeholder = 'Select Product / Item',
  priceField = 'salePrice',
  className = '',
}: ItemSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find((i) => i.id === value) ?? null;

  const filtered = query.trim()
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(query.toLowerCase()) ||
          i.unit.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  useEffect(() => { setHighlighted(0); }, [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const select = useCallback((id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  const clear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  }, [onChange]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const stockColor = (item: SelectableItem) => {
    const stock = Number(item.currentStock ?? 0);
    const min = Number(item.minStockAlert ?? 0);
    if (stock <= 0) return 'text-rose-400';
    if (stock <= min) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={[
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium',
          'bg-slate-800/90 border transition-all',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
          open ? 'border-blue-500' : 'border-slate-700/80 hover:border-slate-600',
          selectedItem ? 'text-white' : 'text-slate-400',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          {selectedItem ? (
            <>
              <Package className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="truncate">{selectedItem.name}</span>
              <span className="text-slate-500 font-normal flex-shrink-0 hidden sm:inline">
                &middot; {selectedItem.unit}
              </span>
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{placeholder}</span>
            </>
          )}
        </span>

        <span className="flex items-center gap-1 flex-shrink-0 ml-1">
          {selectedItem && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              className="p-0.5 rounded text-slate-500 hover:text-rose-400 transition-colors"
              aria-label="Clear"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-[200] left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '18rem' }}
          role="listbox"
        >
          {/* Search input */}
          <div className="p-2 border-b border-slate-800 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search product…"
                className="w-full pl-8 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-500 text-xs">
                No products match &quot;{query}&quot;
              </div>
            ) : (
              filtered.map((item, idx) => {
                const stock = Number(item.currentStock ?? 0);
                const price = Number(priceField === 'salePrice' ? item.salePrice : item.purchasePrice);
                const isSelected = item.id === value;

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(item.id)}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={[
                      'w-full text-left px-3 py-2.5 flex items-center justify-between gap-2',
                      'border-b border-slate-800/50 last:border-0 transition-colors',
                      idx === highlighted ? 'bg-blue-500/10' : 'hover:bg-slate-800/60',
                      isSelected ? 'bg-blue-500/15 border-l-[3px] border-l-blue-500 pl-2.5' : '',
                    ].join(' ')}
                  >
                    {/* Name + unit */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Package
                        className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`}
                      />
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500">{item.unit}</p>
                      </div>
                    </div>

                    {/* Stock + price badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.type === 'PRODUCT' && (
                        <span className={`text-[10px] font-bold whitespace-nowrap ${stockColor(item)}`}>
                          {stock <= 0 ? 'Out of stock' : `${stock} ${item.unit}`}
                        </span>
                      )}
                      {price > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          Rs.{price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-3 py-1 border-t border-slate-800 flex-shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-slate-600">
                {filtered.length}/{items.length} items
              </span>
              <span className="text-[10px] text-slate-700">↑↓ navigate · Enter select · Esc close</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
