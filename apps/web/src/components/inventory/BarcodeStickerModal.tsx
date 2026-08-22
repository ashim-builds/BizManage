'use client';

import { useState } from 'react';
import { ModalPortal } from '@/components/common/ModalPortal';
import { Printer, X, Tag, QrCode, SlidersHorizontal, Layers } from 'lucide-react';

interface BarcodeStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
  item: {
    name: string;
    code?: string | null;
    salePrice: number;
    unit?: string;
  };
}

// Generate simple SVG Code-128 visual barcode pattern from text
function SimpleBarcodeSvg({ text }: { text: string }) {
  // Generate deterministic bar widths based on char codes
  const chars = text || '000000';
  const bars: { width: number; space: number }[] = [];
  
  for (let i = 0; i < chars.length; i++) {
    const code = chars.charCodeAt(i);
    bars.push({
      width: (code % 3) + 1.5,
      space: ((code * 2) % 3) + 1.5,
    });
  }

  return (
    <svg viewBox="0 0 160 45" className="w-full h-9" preserveAspectRatio="none">
      <rect x="0" y="0" width="3" height="40" fill="black" />
      <rect x="5" y="0" width="2" height="40" fill="black" />
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={12 + i * 11}
          y="0"
          width={bar.width}
          height="40"
          fill="black"
        />
      ))}
      <rect x="150" y="0" width="2" height="40" fill="black" />
      <rect x="155" y="0" width="3" height="40" fill="black" />
    </svg>
  );
}

// Clean SVG QR Code visual pattern
function SimpleQrSvg({ text }: { text: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text || 'item')}`;
  return (
    <img
      src={qrUrl}
      alt="QR Code"
      className="w-12 h-12 object-contain mx-auto"
      loading="lazy"
    />
  );
}

export function BarcodeStickerModal({
  isOpen,
  onClose,
  businessName = 'BizManage Store',
  item,
}: BarcodeStickerModalProps) {
  const [labelCount, setLabelCount] = useState<number>(12);
  const [stickerType, setStickerType] = useState<'barcode' | 'qr' | 'both'>('barcode');
  const [showBusinessName, setShowBusinessName] = useState<boolean>(true);

  if (!isOpen) return null;

  const sku = item.code || `SKU-${item.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase()}`;
  const price = Number(item.salePrice || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Print Barcode & Price Tag Stickers</h3>
                <p className="text-xs text-slate-400">Generate retail price tags for {item.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs shrink-0">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Copies to Print</label>
              <select
                value={labelCount}
                onChange={(e) => setLabelCount(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value={1}>1 Single Sticker</option>
                <option value={4}>4 Stickers</option>
                <option value={8}>8 Stickers</option>
                <option value={12}>12 Stickers (Half A4 Sheet)</option>
                <option value={24}>24 Stickers (Full A4 Sheet - 3x8)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Sticker Format</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setStickerType('barcode')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all ${
                    stickerType === 'barcode'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Barcode
                </button>
                <button
                  type="button"
                  onClick={() => setStickerType('qr')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all ${
                    stickerType === 'qr'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  QR Code
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none py-1.5">
                <input
                  type="checkbox"
                  checked={showBusinessName}
                  onChange={(e) => setShowBusinessName(e.target.checked)}
                  className="rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-800"
                />
                <span className="text-[11px]">Show store name header</span>
              </label>
            </div>
          </div>

          {/* STICKERS SHEET PREVIEW */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
            <div
              id="barcode-sheet-printable"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
            >
              {Array.from({ length: labelCount }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white text-black p-3 rounded-lg border border-slate-300 flex flex-col justify-between items-center text-center shadow-sm font-sans"
                  style={{ minHeight: '130px' }}
                >
                  {showBusinessName && (
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-700 truncate w-full">
                      {businessName}
                    </p>
                  )}

                  <p className="text-xs font-bold text-slate-900 truncate w-full px-1">
                    {item.name}
                  </p>

                  <div className="my-1.5 w-full flex flex-col items-center justify-center">
                    {stickerType === 'barcode' ? (
                      <>
                        <SimpleBarcodeSvg text={sku} />
                        <span className="text-[9px] font-mono font-bold tracking-widest text-slate-800 mt-0.5">
                          {sku}
                        </span>
                      </>
                    ) : (
                      <>
                        <SimpleQrSvg text={sku} />
                        <span className="text-[9px] font-mono font-bold text-slate-800 mt-0.5">
                          {sku}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="w-full flex items-center justify-between border-t border-slate-200 pt-1 text-[10px] px-1">
                    <span className="text-slate-600">MRP:</span>
                    <span className="font-black text-sm text-slate-950 font-mono">
                      Rs. {price.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
            <span className="text-xs text-slate-400">
              Total Labels: <strong className="text-white">{labelCount}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all"
              >
                <Printer className="w-4 h-4" /> Print Sticker Sheet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded print styles for sticker label sheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #barcode-sheet-printable,
          #barcode-sheet-printable * {
            visibility: visible;
          }
          #barcode-sheet-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 4mm !important;
          }
        }
      `}</style>
    </ModalPortal>
  );
}
