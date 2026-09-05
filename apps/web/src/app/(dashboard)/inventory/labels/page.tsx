'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';

import { useState } from 'react';
import Link from 'next/link';
import { Printer, ScanBarcode, Plus, Trash2, Check, Copy, Settings2, Package, Layers, Sparkles } from 'lucide-react';
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
  const { data: itemsResponse, isLoading } = useItems({ limit: 200 });
  const allItems = itemsResponse?.data || [];

  // Selected items to print
  const [selectedItems, setSelectedItems] = useState<LabelItem[]>([]);
  const [chosenItemId, setChosenItemId] = useState('');
  const [chosenCopies, setChosenCopies] = useState(12);

  // Label configuration
  const [labelFormat, setLabelFormat] = useState<'thermal' | 'a4-24' | 'a4-65'>('a4-24');
  const [showBusinessName, setShowBusinessName] = useState(true);
  const [showItemName, setShowItemName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);

  // Add item to print queue
  const handleAddItem = () => {
    if (!chosenItemId) {
      toast.error('Please select an item to print');
      return;
    }
    const itm = allItems.find((i: any) => i.id === chosenItemId);
    if (!itm) return;

    // Check if already in queue
    const existingIndex = selectedItems.findIndex((i) => i.id === itm.id);
    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].copies += Number(chosenCopies);
      setSelectedItems(updated);
      toast.success(`Updated copies for ${itm.name}`);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: itm.id,
          name: itm.name,
          code: itm.code || `SKU-${itm.id.substring(0, 6).toUpperCase()}`,
          price: Number(itm.salePrice || 0),
          copies: Number(chosenCopies),
        },
      ]);
      toast.success(`Added ${itm.name} to print queue`);
    }
    setChosenItemId('');
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
              Custom Barcode & Label Sticker Printing
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Generate and print barcode stickers for thermal roll printers or multi-label A4 sheets.
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={flatLabels.length === 0}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all flex items-center gap-2 active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Print {flatLabels.length} Labels</span>
        </button>
      </div>

      {/* Configuration & Selection Panel (Hidden on Print) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Left 2 Cols: Add Items Queue */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-red-400" />
            Select Items to Print
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Select Item</label>
              <select
                value={chosenItemId}
                onChange={(e) => setChosenItemId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="">-- Choose Item from Inventory --</option>
                {allItems.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (Code: {i.code || 'None'} • Rs. {Number(i.salePrice).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Stickers Count</label>
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
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500 font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Queue Table */}
          <div className="pt-2 border-t border-zinc-800">
            {selectedItems.length ? (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        Code: {item.code} • MRP: Rs. {item.price.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 font-mono font-bold text-white text-[11px]">
                        {item.copies} Labels
                      </span>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs">
                No items added yet. Choose an item above to add barcode stickers to the print queue.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Label Sheet Settings */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-red-400" />
            Label Sheet Format
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">Paper / Roll Size</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                  <input
                    type="radio"
                    name="format"
                    checked={labelFormat === 'a4-24'}
                    onChange={() => setLabelFormat('a4-24')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">A4 Sheet (24 Labels)</p>
                    <p className="text-[10px] text-zinc-500">3 cols × 8 rows (63.5mm × 33.9mm)</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                  <input
                    type="radio"
                    name="format"
                    checked={labelFormat === 'a4-65'}
                    onChange={() => setLabelFormat('a4-65')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">A4 Sheet (65 Mini Labels)</p>
                    <p className="text-[10px] text-zinc-500">5 cols × 13 rows (38mm × 21.2mm)</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                  <input
                    type="radio"
                    name="format"
                    checked={labelFormat === 'thermal'}
                    onChange={() => setLabelFormat('thermal')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Thermal Barcode Roll (1-Up)</p>
                    <p className="text-[10px] text-zinc-500">50mm × 25mm continuous label roll</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Visible Fields</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBusinessName}
                  onChange={(e) => setShowBusinessName(e.target.checked)}
                  className="rounded text-red-600"
                />
                <span>Company / Shop Name</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showItemName}
                  onChange={(e) => setShowItemName(e.target.checked)}
                  className="rounded text-red-600"
                />
                <span>Item Name</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-red-600"
                />
                <span>MRP / Sale Price</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBarcodeText}
                  onChange={(e) => setShowBarcodeText(e.target.checked)}
                  className="rounded text-red-600"
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 print:hidden">
          Sheet Preview ({flatLabels.length} stickers)
        </h3>

        <div className="p-4 sm:p-8 rounded-2xl bg-white text-black shadow-2xl border border-zinc-800 min-h-[400px] overflow-x-auto print:p-0 print:border-none print:shadow-none">
          {flatLabels.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 text-sm">
              <ScanBarcode className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
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
                  className="p-2.5 rounded-lg border border-zinc-300 text-center bg-white flex flex-col justify-between items-center break-inside-avoid shadow-xs overflow-hidden"
                  style={{ minHeight: labelFormat === 'a4-65' ? '75px' : '105px' }}
                >
                  {showBusinessName && (
                    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600 truncate max-w-full">
                      {currentBiz?.name || 'STORE MRP'}
                    </p>
                  )}

                  {showItemName && (
                    <p className="text-[11px] font-bold text-black truncate max-w-full leading-tight my-0.5">
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

                  {showBarcodeText && <p className="text-[9px] font-mono tracking-widest text-zinc-700">{item.code}</p>}

                  {showPrice && (
                    <p className="text-xs font-black text-black font-mono mt-0.5">MRP Rs. {item.price.toFixed(2)}</p>
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
