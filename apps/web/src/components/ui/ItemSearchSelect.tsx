'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, Package, X, ChevronDown, Tag, QrCode } from 'lucide-react';

export interface SelectableItem {
  id: string;
  name: string;
  code?: string | null;
  unit: string;
  currentStock?: number | string | null;
  salePrice?: number | string | null;
  purchasePrice?: number | string | null;
  type?: string | null;
  minStockAlert?: number | string | null;
  category?: { id?: string; name?: string } | null;
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
  items = [],
  value,
  onChange,
  placeholder = 'Search product or scan barcode (SKU)…',
  priceField = 'salePrice',
  className = '',
}: ItemSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const selectedItem = useMemo(
    () => safeItems.find((i) => i && i.id === value) ?? null,
    [safeItems, value]
  );

  // Multi-term fuzzy / partial filter matching across Name, Code/SKU, Unit, Category
  const filtered = useMemo(() => {
    const rawQuery = query.trim().toLowerCase();
    if (!rawQuery) return safeItems;

    const terms = rawQuery.split(/\s+/).filter(Boolean);

    return safeItems.filter((item) => {
      if (!item) return false;
      const name = (item.name || '').toLowerCase();
      const code = (item.code || '').toLowerCase();
      const fallbackSku = `sku-${name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)}`;
      const unit = (item.unit || '').toLowerCase();
      const category = (item.category?.name || '').toLowerCase();

      const combined = `${name} ${code} ${fallbackSku} ${unit} ${category}`;
      return terms.every((term) => combined.includes(term));
    });
  }, [safeItems, query]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

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

  const select = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

  const clear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

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
      setHighlighted((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
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
    if (stock <= 0) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (stock <= min) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={[
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left',
          'bg-slate-800/90 border transition-all',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
          open ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700/80 hover:border-slate-600',
          selectedItem ? 'text-white' : 'text-slate-400',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          {selectedItem ? (
            <>
              <Package className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="truncate font-semibold">{selectedItem.name}</span>
              {selectedItem.code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 hidden sm:inline-block">
                  {selectedItem.code}
                </span>
              )}
              <span className="text-slate-500 font-normal flex-shrink-0">
                · {selectedItem.unit}
              </span>
            </>
          ) : (
            <>
              <QrCode className="w-3.5 h-3.5 flex-shrink-0 text-purple-400" />
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
              className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition-colors"
              aria-label="Clear selection"
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
          className="absolute z-[200] left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ maxHeight: '19rem' }}
          role="listbox"
        >
          {/* Search input */}
          <div className="p-2.5 border-b border-slate-800 flex-shrink-0 bg-slate-900/90 backdrop-blur">
            <div className="relative">
              <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan Barcode (SKU) or type name..."
                className="w-full pl-8 pr-8 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Item List */}
          <div className="overflow-y-auto flex-1 overscroll-contain divide-y divide-slate-800/40">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-xs">
                <Package className="w-6 h-6 mx-auto mb-2 text-slate-600 opacity-50" />
                No products match &quot;{query}&quot;
              </div>
            ) : (
              filtered.map((item, idx) => {
                const stock = Number(item.currentStock ?? 0);
                const price = Number(priceField === 'salePrice' ? item.salePrice : item.purchasePrice);
                const isSelected = item.id === value;
                const isService = item.type === 'SERVICE';

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(item.id)}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={[
                      'w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3',
                      'transition-colors',
                      idx === highlighted ? 'bg-blue-500/10' : 'hover:bg-slate-800/60',
                      isSelected ? 'bg-blue-500/15 border-l-[3px] border-l-blue-500 pl-3' : '',
                    ].join(' ')}
                  >
                    {/* Name + details */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <Package
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                            {item.name}
                          </p>
                          {item.code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/80">
                              {item.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                          <span>Unit: {item.unit}</span>
                          {item.category?.name && (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <Tag className="w-2.5 h-2.5 text-slate-500" />
                              {item.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock + price badges */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                      {price > 0 && (
                        <span className="text-xs text-white font-mono font-bold">
                          Rs. {price.toLocaleString()}
                        </span>
                      )}
                      {!isService ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${stockColor(item)}`}
                        >
                          {stock <= 0 ? 'Out of stock' : `Stock: ${stock} ${item.unit}`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md font-semibold">
                          Service
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer stats */}
          {safeItems.length > 0 && (
            <div className="px-3.5 py-1.5 border-t border-slate-800 flex-shrink-0 flex items-center justify-between bg-slate-900 text-[10px] text-slate-500">
              <span>
                Showing {filtered.length} of {safeItems.length} products
              </span>
              <span className="hidden sm:inline text-slate-600">
                ↑↓ Navigate · Enter Select · Esc Close
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
