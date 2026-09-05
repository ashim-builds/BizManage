'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tag, Printer, X, Crown, Lock, CheckCircle2 } from 'lucide-react';
import { ModalPortal } from '@/components/common/ModalPortal';
import { useAuth } from '@/providers/AuthProvider';

interface BarcodeStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
  item: {
    id?: string;
    name: string;
    code?: string;
    salePrice?: number;
    unit?: string;
  };
}

function SimpleBarcodeSvg({ text }: { text: string }) {
  const bars = Array.from(text).map((char, index) => {
    const charCode = char.charCodeAt(0);
    const width = (charCode % 3) + 1.5;
    return (
      <rect
        key={index}
        x={index * 6 + 4}
        y="4"
        width={width}
        height="32"
        fill="#0f172a"
      />
    );
  });

  return (
    <svg viewBox="0 0 140 40" className="w-full h-8 object-contain">
      <rect width="140" height="40" fill="transparent" />
      {bars}
    </svg>
  );
}

function SimpleQrSvg({ text }: { text: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
    text
  )}`;

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
  const { user, activeBusinessId } = useAuth();
  const currentBiz = (user?.memberships?.find((m: any) => m.business?.id === activeBusinessId)?.business || user?.memberships?.[0]?.business) as any;
  const rawFeatures = currentBiz?.subscriptionPackage?.features;
  const userFeatures = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : (rawFeatures || []);

  const createdAt = currentBiz?.createdAt ? new Date(currentBiz.createdAt) : new Date();
  const trialDays = 14;
  const trialEndDate = currentBiz?.trialEndsAt 
    ? new Date(currentBiz.trialEndsAt) 
    : new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const isTrialActive = new Date() < trialEndDate;

  const isUnlocked = isTrialActive || userFeatures.includes('BARCODE_PRINTING') || currentBiz?.subscriptionPackage?.name?.toLowerCase().includes('premium');

  const [labelCount, setLabelCount] = useState<number>(12);
  const [stickerType, setStickerType] = useState<'barcode' | 'qr' | 'both'>('barcode');
  const [showBusinessName, setShowBusinessName] = useState<boolean>(true);

  if (!isOpen) return null;

  if (!isUnlocked) {
    return (
      <ModalPortal>
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 text-center font-sans">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                Premium Feature
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">Print Barcode & Price Tag Stickers</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Barcode tag printing is available exclusively on <strong>Premium Monthly</strong> and <strong>Premium Yearly</strong> subscription plans.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1 text-left">
              <p className="text-slate-900 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> Premium Plan Perks:
              </p>
              <ul className="space-y-1 text-[11px] text-slate-600 pt-1">
                <li>• Print custom Code-128 & QR Code price tags</li>
                <li>• POS Quick Billing & Counter Mode</li>
                <li>• Priority 24/7 dedicated technical support</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <Link
                href="/subscription"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
              >
                Upgrade to Premium Plan
              </Link>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  const sku = item.code || `SKU-${item.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase()}`;
  const price = Number(item.salePrice || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 my-8 max-h-[95vh] flex flex-col font-sans">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Print Barcode & Price Tag Stickers</h3>
                <p className="text-xs text-slate-500">Generate retail price tags for {item.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs shrink-0">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Copies to Print</label>
              <select
                value={labelCount}
                onChange={(e) => setLabelCount(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
              >
                <option value={1}>1 Single Sticker</option>
                <option value={4}>4 Stickers</option>
                <option value={8}>8 Stickers</option>
                <option value={12}>12 Stickers (Half A4 Sheet)</option>
                <option value={24}>24 Stickers (Full A4 Sheet - 3x8)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sticker Format</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setStickerType('barcode')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all ${
                    stickerType === 'barcode'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Barcode
                </button>
                <button
                  type="button"
                  onClick={() => setStickerType('qr')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all ${
                    stickerType === 'qr'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  QR Code
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none py-1.5">
                <input
                  type="checkbox"
                  checked={showBusinessName}
                  onChange={(e) => setShowBusinessName(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px]">Show store name header</span>
              </label>
            </div>
          </div>

          {/* STICKERS SHEET PREVIEW */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-100/60 rounded-2xl border border-slate-200">
            <div
              id="barcode-sheet-printable"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
            >
              {Array.from({ length: labelCount }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white text-slate-900 p-3 rounded-xl border border-slate-300 flex flex-col justify-between items-center text-center shadow-xs font-sans"
                  style={{ minHeight: '130px' }}
                >
                  {showBusinessName && (
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 truncate w-full">
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
                        <span className="text-[9px] font-mono font-bold tracking-widest text-slate-700 mt-0.5">
                          {sku}
                        </span>
                      </>
                    ) : (
                      <>
                        <SimpleQrSvg text={sku} />
                        <span className="text-[9px] font-mono font-bold text-slate-700 mt-0.5">
                          {sku}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="w-full flex items-center justify-between border-t border-slate-200 pt-1 text-[10px] px-1">
                    <span className="text-slate-500">MRP:</span>
                    <span className="font-black text-sm text-slate-900 font-mono">
                      Rs. {price.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
            <span className="text-xs text-slate-500">
              Total Labels: <strong className="text-slate-900 font-bold">{labelCount}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
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
