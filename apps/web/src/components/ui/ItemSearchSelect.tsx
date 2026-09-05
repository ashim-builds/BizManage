'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, Package, X, ChevronDown, Tag, QrCode, Plus, Camera, AlertCircle } from 'lucide-react';
import { CameraScannerModal } from '@/components/common/CameraScannerModal';
import { toast } from 'react-hot-toast';

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
  disableOutOfStock?: boolean;
  className?: string;
  onCreateNewItem?: (initialName?: string) => void;
}

export function ItemSearchSelect({
  items = [],
  value,
  onChange,
  placeholder = 'Search product or scan barcode (SKU)…',
  priceField = 'salePrice',
  disableOutOfStock,
  className = '',
  onCreateNewItem,
}: ItemSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shouldBlockOutOfStock = disableOutOfStock !== undefined ? disableOutOfStock : priceField === 'salePrice';

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const selectedItem = useMemo(
    () => safeItems.find((i) => i && i.id === value) ?? null,
    [safeItems, value]
  );

  // Multi-term fuzzy / punctuation-agnostic filter matching across Name, Code/SKU, Unit, Category
  const filtered = useMemo(() => {
    const rawQuery = query.replace(/[\r\n\t]/g, '').trim().toLowerCase();
    if (!rawQuery) return safeItems;

    const cleanSkuQuery = rawQuery.replace(/^(sku|code)[-:\s]*/i, '').trim();
    const cleanAlphaQuery = rawQuery.replace(/[^a-z0-9]/g, '');
    const terms = rawQuery.split(/\s+/).filter(Boolean);

    return safeItems.filter((item) => {
      if (!item) return false;
      const name = (item.name || '').toLowerCase();
      const code = (item.code || '').toLowerCase();
      const cleanCode = code.replace(/[^a-z0-9]/g, '');
      const cleanName = name.replace(/[^a-z0-9]/g, '');
      const fallbackSku = `sku-${cleanName.substring(0, 8)}`;
      const unit = (item.unit || '').toLowerCase();
      const category = (item.category?.name || '').toLowerCase();

      // Direct barcode SKU or clean code match
      if (
        code &&
        (code === rawQuery ||
          code === cleanSkuQuery ||
          code.includes(rawQuery) ||
          code.includes(cleanSkuQuery) ||
          (cleanAlphaQuery && cleanCode.includes(cleanAlphaQuery)) ||
          (cleanAlphaQuery && cleanAlphaQuery.includes(cleanCode)))
      ) {
        return true;
      }

      // Direct name or clean name match
      if (
        cleanAlphaQuery &&
        (name.includes(rawQuery) ||
          cleanName.includes(cleanAlphaQuery) ||
          cleanAlphaQuery.includes(cleanName))
      ) {
        return true;
      }

      if (fallbackSku.includes(rawQuery) || fallbackSku.includes(cleanSkuQuery) || (cleanAlphaQuery && fallbackSku.includes(cleanAlphaQuery))) {
        return true;
      }

      const combined = `${name} ${code} ${fallbackSku} ${unit} ${category}`;
      const normalizedCombined = combined.replace(/[^a-z0-9]/g, ' ');
      const cleanCombined = combined.replace(/[^a-z0-9]/g, '');

      return terms.every((term) => {
        const cleanTerm = term.replace(/[^a-z0-9]/g, '');
        return (
          combined.includes(term) ||
          normalizedCombined.includes(term) ||
          (cleanTerm.length > 0 && cleanCombined.includes(cleanTerm))
        );
      });
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
      const targetItem = safeItems.find((i) => i.id === id);
      if (targetItem && shouldBlockOutOfStock && targetItem.type !== 'SERVICE') {
        const stock = Number(targetItem.currentStock ?? 0);
        if (stock <= 0) {
          toast.error(`"${targetItem.name}" is Out of Stock (0 ${targetItem.unit}). Cannot select.`);
          return;
        }
      }

      onChange(id);
      setOpen(false);
      setQuery('');
    },
    [onChange, safeItems, shouldBlockOutOfStock]
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
    if (stock <= 0) return 'text-rose-800 bg-rose-50 border-rose-200 font-bold';
    if (stock <= min) return 'text-amber-900 bg-amber-50 border-amber-300 font-bold';
    return 'text-emerald-800 bg-emerald-50 border-emerald-200 font-bold';
  };

  const handleCameraScan = (scannedText: string) => {
    setIsCameraOpen(false);
    const term = scannedText.trim().toLowerCase();
    const matched = safeItems.find((i) => {
      if (!i) return false;
      const code = (i.code || '').toLowerCase();
      const name = (i.name || '').toLowerCase();
      return code === term || code.includes(term) || name === term;
    });
    if (matched) {
      select(matched.id);
    } else {
      setQuery(scannedText);
      setOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={[
          'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-left min-h-[42px]',
          'bg-white border transition-all shadow-xs',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
          open ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300 hover:border-slate-400',
          selectedItem ? 'text-slate-900' : 'text-slate-600',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 py-0.5">
          {selectedItem ? (
            <div className="flex flex-wrap items-center gap-1.5 min-w-0" title={selectedItem.name}>
              <Package className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="font-bold text-slate-900 break-words text-xs leading-snug">
                {selectedItem.name}
              </span>
              {selectedItem.code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-300">
                  {selectedItem.code}
                </span>
              )}
              <span className="text-slate-600 font-medium text-[11px] flex-shrink-0">
                · {selectedItem.unit}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 min-w-0 font-medium">
              <QrCode className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
              <span className="break-words text-xs">{placeholder}</span>
            </div>
          )}
        </span>

        <span className="flex items-center gap-1 flex-shrink-0 ml-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCameraOpen(true);
            }}
            title="Scan QR/Barcode with Camera"
            className="p-1 rounded-md text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-all flex items-center gap-1 text-[10px] font-bold"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Camera Scan</span>
          </button>
          {selectedItem && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-[200] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ maxHeight: '20rem' }}
          role="listbox"
        >
          {/* Search input */}
          <div className="p-2.5 border-b border-slate-200 flex-shrink-0 bg-slate-50">
            <div className="relative flex items-center gap-1.5">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan Barcode (SKU) or type name..."
                  className="w-full pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                title="Scan QR Code / Barcode with Camera"
                className="px-2.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Camera</span>
              </button>
            </div>
          </div>

          {/* Item List */}
          <div className="overflow-y-auto flex-1 overscroll-contain divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-500 text-xs space-y-2">
                <Package className="w-6 h-6 mx-auto text-slate-400 opacity-50" />
                <p>No products match &quot;{query}&quot;</p>
                {onCreateNewItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onCreateNewItem(query);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Quick Create &quot;{query || 'Product'}&quot;
                  </button>
                )}
              </div>
            ) : (
              filtered.map((item, idx) => {
                const stock = Number(item.currentStock ?? 0);
                const price = Number(priceField === 'salePrice' ? item.salePrice : item.purchasePrice);
                const isSelected = item.id === value;
                const isService = item.type === 'SERVICE';
                const isOutOfStock = !isService && stock <= 0;
                const isBlocked = isOutOfStock && shouldBlockOutOfStock;

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
                      isBlocked
                        ? 'opacity-50 bg-slate-50/70 hover:bg-rose-50/40 cursor-not-allowed'
                        : idx === highlighted
                        ? 'bg-blue-50/80'
                        : 'hover:bg-slate-50',
                      isSelected ? 'bg-blue-50 border-l-[3px] border-l-blue-600 pl-3 font-semibold' : '',
                    ].join(' ')}
                  >
                    {/* Name + details */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <Package
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          isBlocked ? 'text-slate-300' : isSelected ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            title={item.name}
                            className={`text-xs font-semibold break-words leading-snug ${
                              isBlocked
                                ? 'text-slate-500 line-through'
                                : isSelected
                                ? 'text-blue-700 font-bold'
                                : 'text-slate-800'
                            }`}
                          >
                            {item.name}
                          </p>
                          {item.code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {item.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                          <span>Unit: {item.unit}</span>
                          {item.category?.name && (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              {item.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock + price badges */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                      {price > 0 && (
                        <span className="text-xs text-slate-900 font-mono font-bold">
                          Rs. {price.toLocaleString()}
                        </span>
                      )}
                      {!isService ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${stockColor(item)}`}
                        >
                          {stock <= 0
                            ? shouldBlockOutOfStock
                              ? 'Out of Stock (Disabled)'
                              : 'Out of Stock'
                            : `Stock: ${stock} ${item.unit}`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-semibold">
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
            <div className="px-3.5 py-1.5 border-t border-slate-200 flex-shrink-0 flex items-center justify-between bg-slate-50 text-[10px] text-slate-500">
              <span>
                Showing {filtered.length} of {safeItems.length} products
              </span>
              <span className="hidden sm:inline text-slate-400">
                ↑↓ Navigate · Enter Select · Esc Close
              </span>
            </div>
          )}
        </div>
      )}

      {/* Camera QR & Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={handleCameraScan}
        title="Scan Product Barcode / QR Code"
      />
    </div>
  );
}
