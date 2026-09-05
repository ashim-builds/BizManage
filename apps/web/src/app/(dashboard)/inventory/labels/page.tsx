'use client';

import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';
import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Printer,
  ScanBarcode,
  Plus,
  Trash2,
  Check,
  Copy,
  Settings2,
  Package,
  Layers,
  Sparkles,
  Search,
  X,
  ChevronDown,
} from 'lucide-react';
import { useItems } from '@/services/itemService';
import { useAuth } from '@/providers/AuthProvider';
import toast from 'react-hot-toast';

interface LabelItem {
  id: string;
  name: string;
  code: string;
  price: number;
  copies: number;
}

export default function BarcodeLabelPage() {
  const { user } = useAuth();
  const currentBiz = user?.memberships?.[0]?.business;
  const { data: itemsResponse, isLoading } = useItems({ limit: 500 });
  const allItems = itemsResponse?.data || [];

  // Selected items to print
  const [selectedItems, setSelectedItems] = useState<LabelItem[]>([]);
  const [chosenItemId, setChosenItemId] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chosenCopies, setChosenCopies] = useState(12);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Label configuration
  const [labelFormat, setLabelFormat] = useState<'thermal' | 'a4-24' | 'a4-65'>('a4-24');
  const [showBusinessName, setShowBusinessName] = useState(true);
  const [showItemName, setShowItemName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products by name, code, barcode
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return allItems.slice(0, 50);
    const query = productSearchQuery.toLowerCase().trim();
    return allItems.filter((i: any) => {
      const name = (i.name || '').toLowerCase();
      const code = (i.code || '').toLowerCase();
      const barcode = (i.barcode || '').toLowerCase();
      return name.includes(query) || code.includes(query) || barcode.includes(query);
    });
  }, [allItems, productSearchQuery]);

  const selectedItemObj = useMemo(() => {
    return allItems.find((i: any) => i.id === chosenItemId);
  }, [allItems, chosenItemId]);

  // Add item to print queue
  const handleAddItem = (itemToAdd?: any) => {
    const itm = itemToAdd || selectedItemObj;
    if (!itm) {
      toast.error('Please select or search an item to print');
      return;
    }

    const copies = Math.max(1, Number(chosenCopies) || 1);

    // Check if already in queue
    const existingIndex = selectedItems.findIndex((i) => i.id === itm.id);
    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].copies += copies;
      setSelectedItems(updated);
      toast.success(`Added ${copies} more copies for ${itm.name}`);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: itm.id,
          name: itm.name,
          code: itm.barcode || itm.code || `SKU-${itm.id.substring(0, 6).toUpperCase()}`,
          price: Number(itm.salePrice || 0),
          copies: copies,
        },
      ]);
      toast.success(`Added ${itm.name} (${copies} labels) to print queue`);
    }
    setChosenItemId('');
    setProductSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleUpdateCopies = (id: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextCopies = item.copies + delta;
            return nextCopies > 0 ? { ...item, copies: nextCopies } : null;
          }
          return item;
        })
        .filter(Boolean) as LabelItem[]
    );
  };

  const handleRemove = (id: string) => {
    setSelectedItems(selectedItems.filter((i) => i.id !== id));
  };

  // Generate flattened array of labels to render
  const flatLabels = selectedItems.flatMap((item) => Array.from({ length: item.copies }, () => item));

  const handlePrint = () => {
    if (flatLabels.length === 0) {
      toast.error('Please add at least one item to print');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Custom Barcode &amp; Label Sticker Printing
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search products, generate, and print barcode stickers for thermal roll printers or multi-label A4 sheets.
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={flatLabels.length === 0}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95 self-start sm:self-auto cursor-pointer min-h-[44px]"
        >
          <Printer className="w-4 h-4" />
          <span>Print {flatLabels.length} Labels</span>
        </button>
      </div>

      {/* Configuration & Selection Panel (Hidden on Print) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Left 2 Cols: Add Items Queue */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Search &amp; Add Products to Print Queue
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Combobox */}
            <div className="sm:col-span-2 relative" ref={searchContainerRef}>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Search Product (Name, Code, Barcode) *
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={productSearchQuery}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  placeholder={selectedItemObj ? selectedItemObj.name : 'Type product name, SKU or barcode…'}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                />
                {productSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearchQuery('');
                      setChosenItemId('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Search Dropdown */}
              {isSearchOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No products found matching &ldquo;{productSearchQuery}&rdquo;
                    </div>
                  ) : (
                    filteredProducts.map((i: any) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => {
                          setChosenItemId(i.id);
                          setProductSearchQuery(i.name);
                          setIsSearchOpen(false);
                        }}
                        className="w-full p-3 text-left hover:bg-blue-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{i.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Code: {i.code || 'None'} • Barcode: {i.barcode || '—'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold text-emerald-600">
                            Rs. {Number(i.salePrice || 0).toLocaleString()}
                          </p>
                          <span className="text-[10px] text-slate-500 font-medium">Stock: {Number(i.stock || 0)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Copies Count & Add Button */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Stickers Count
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  onKeyDown={onNumericKeyDown}
                  onFocus={onNumericFocus}
                  onBlur={onNumericBlur}
                  min="1"
                  max="500"
                  value={chosenCopies}
                  onChange={(e) => setChosenCopies(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono font-bold min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-md shadow-blue-600/20 active:scale-95 min-h-[44px] cursor-pointer"
                  title="Add to Print Queue"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Queue List / Cards */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Queued Products ({selectedItems.length} items • {flatLabels.length} total stickers)
              </span>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {selectedItems.length ? (
              <div className="space-y-2.5">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Code: {item.code} • MRP: Rs. {item.price.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                      {/* Increment / Decrement Counter */}
                      <div className="flex items-center rounded-xl bg-white border border-slate-300 overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateCopies(item.id, -1)}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                          title="Decrease"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-mono font-bold text-slate-900 text-xs border-x border-slate-200">
                          {item.copies} Labels
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCopies(item.id, 1)}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                          title="Increase"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No items added yet. Search a product above to add barcode stickers to the print queue.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Label Sheet Settings */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-blue-600" />
            Label Sheet Format
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Paper / Roll Size
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    checked={labelFormat === 'a4-24'}
                    onChange={() => setLabelFormat('a4-24')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">A4 Sheet (24 Labels)</p>
                    <p className="text-[10px] text-slate-500">3 cols × 8 rows (63.5mm × 33.9mm)</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    checked={labelFormat === 'a4-65'}
                    onChange={() => setLabelFormat('a4-65')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">A4 Sheet (65 Mini Labels)</p>
                    <p className="text-[10px] text-slate-500">5 cols × 13 rows (38mm × 21.2mm)</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    checked={labelFormat === 'thermal'}
                    onChange={() => setLabelFormat('thermal')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Thermal Barcode Roll (1-Up)</p>
                    <p className="text-[10px] text-slate-500">50mm × 25mm continuous label roll</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Visible Fields
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBusinessName}
                  onChange={(e) => setShowBusinessName(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Company / Shop Name</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showItemName}
                  onChange={(e) => setShowItemName(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Item Name</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>MRP / Sale Price</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBarcodeText}
                  onChange={(e) => setShowBarcodeText(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Barcode Digits / Code</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          LIVE PRINT PREVIEW & SHEET RENDER
      ========================================================= */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 print:hidden">
          Sheet Preview ({flatLabels.length} stickers)
        </h3>

        <div className="p-4 sm:p-8 rounded-2xl bg-white text-slate-900 shadow-xs border border-slate-200 min-h-[400px] overflow-x-auto print:p-0 print:border-none print:shadow-none">
          {flatLabels.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <ScanBarcode className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              Add items from the queue above to preview label sheet.
            </div>
          ) : (
            <div
              className={`grid gap-2 ${
                labelFormat === 'thermal'
                  ? 'grid-cols-1 max-w-[240px] mx-auto'
                  : labelFormat === 'a4-65'
                    ? 'grid-cols-5 gap-1.5'
                    : 'grid-cols-3 gap-3'
              }`}
            >
              {flatLabels.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-300 text-center bg-white flex flex-col justify-between items-center break-inside-avoid shadow-2xs overflow-hidden"
                  style={{ minHeight: labelFormat === 'a4-65' ? '75px' : '105px' }}
                >
                  {showBusinessName && (
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-600 truncate max-w-full">
                      {currentBiz?.name || 'STORE MRP'}
                    </p>
                  )}

                  {showItemName && (
                    <p className="text-[11px] font-bold text-slate-900 truncate max-w-full leading-tight my-0.5">
                      {item.name}
                    </p>
                  )}

                  {/* SVG Barcode Representation */}
                  <div className="my-1 flex items-center justify-center">
                    <svg className="w-28 h-6" viewBox="0 0 100 24">
                      <rect x="2" y="0" width="2" height="24" fill="#000" />
                      <rect x="6" y="0" width="1" height="24" fill="#000" />
                      <rect x="9" y="0" width="3" height="24" fill="#000" />
                      <rect x="14" y="0" width="1" height="24" fill="#000" />
                      <rect x="17" y="0" width="2" height="24" fill="#000" />
                      <rect x="21" y="0" width="4" height="24" fill="#000" />
                      <rect x="27" y="0" width="1" height="24" fill="#000" />
                      <rect x="30" y="0" width="3" height="24" fill="#000" />
                      <rect x="35" y="0" width="2" height="24" fill="#000" />
                      <rect x="39" y="0" width="1" height="24" fill="#000" />
                      <rect x="42" y="0" width="3" height="24" fill="#000" />
                      <rect x="47" y="0" width="2" height="24" fill="#000" />
                      <rect x="51" y="0" width="1" height="24" fill="#000" />
                      <rect x="54" y="0" width="4" height="24" fill="#000" />
                      <rect x="60" y="0" width="2" height="24" fill="#000" />
                      <rect x="64" y="0" width="1" height="24" fill="#000" />
                      <rect x="67" y="0" width="3" height="24" fill="#000" />
                      <rect x="72" y="0" width="2" height="24" fill="#000" />
                      <rect x="76" y="0" width="1" height="24" fill="#000" />
                      <rect x="79" y="0" width="4" height="24" fill="#000" />
                      <rect x="85" y="0" width="2" height="24" fill="#000" />
                      <rect x="89" y="0" width="1" height="24" fill="#000" />
                      <rect x="92" y="0" width="3" height="24" fill="#000" />
                      <rect x="97" y="0" width="2" height="24" fill="#000" />
                    </svg>
                  </div>

                  {showBarcodeText && <p className="text-[9px] font-mono tracking-widest text-slate-700">{item.code}</p>}

                  {showPrice && (
                    <p className="text-xs font-black text-slate-900 font-mono mt-0.5">MRP Rs. {item.price.toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
