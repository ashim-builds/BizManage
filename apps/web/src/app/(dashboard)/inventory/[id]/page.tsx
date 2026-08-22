'use client';

import { useState } from 'react';
import { useItem } from '@/services/itemService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { BarcodeStickerModal } from '@/components/inventory/BarcodeStickerModal';
import {
  Package,
  Boxes,
  Tag,
  ArrowLeft,
  ArrowUpDown,
  History,
  TrendingUp,
  AlertTriangle,
  FileText,
  QrCode,
  Printer,
} from 'lucide-react';
import Link from 'next/link';
import { ItemType, StockMovementType } from '@bizmanage/types';

export default function ItemDetailsPage({ params }: { params: { id: string } }) {
  const { data: item, isLoading, isError, refetch } = useItem(params.id);
  const { data: business } = useCurrentBusiness();
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  if (isLoading) return <LoadingState message="Loading item details & stock movement logs..." />;
  if (isError || !item) return <ErrorState title="Failed to load item profile" onRetry={refetch} />;

  const stock = Number(item.currentStock || 0);
  const minAlert = Number(item.minStockAlert || 0);
  const purchasePrice = Number(item.purchasePrice || 0);
  const salePrice = Number(item.salePrice || 0);
  const isProduct = item.type === ItemType.PRODUCT;
  const isOut = isProduct && stock <= 0;
  const isLow = isProduct && stock > 0 && stock <= minAlert;

  const costValuation = stock * purchasePrice;
  const saleValuation = stock * salePrice;
  const marginPct = salePrice > 0 ? (((salePrice - purchasePrice) / salePrice) * 100).toFixed(1) : '0';

  const stockMovements = item.stockMovements || [];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/inventory"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{item.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isProduct
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                }`}
              >
                {item.type}
              </span>
            </div>
            {item.code && <p className="text-xs text-slate-400 font-mono mt-0.5">SKU / Code: {item.code}</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsBarcodeOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all shadow-sm"
        >
          <QrCode className="w-4 h-4 text-purple-400" /> Print Barcode / QR Label
        </button>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item Master Attributes Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" /> Item Master Details
          </h3>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
              <span className="text-slate-500">Category</span>
              <span className="font-semibold text-white">{item.category?.name || 'Uncategorized'}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
              <span className="text-slate-500">Measurement Unit</span>
              <span className="font-semibold text-white">{item.unit}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
              <span className="text-slate-500">Purchase Price</span>
              <span className="font-semibold font-mono text-white">Rs. {purchasePrice.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
              <span className="text-slate-500">Selling Price</span>
              <span className="font-semibold font-mono text-emerald-400">Rs. {salePrice.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
              <span className="text-slate-500">Profit Margin</span>
              <span className="font-semibold font-mono text-blue-400">{marginPct}%</span>
            </div>

            {isProduct && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Min Stock Alert</span>
                <span className="font-semibold font-mono text-amber-400">
                  {minAlert} {item.unit}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stock Valuation & Status Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current In-Stock Quantity</p>
              <h3 className="text-3xl font-bold font-mono mt-2 text-white">
                {stock} <span className="text-sm font-sans text-slate-400 font-normal">{item.unit}</span>
              </h3>
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">Stock Status</span>
              {isOut && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
                  Out of Stock
                </span>
              )}
              {isLow && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
                  Low Stock Alert
                </span>
              )}
              {!isOut && !isLow && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  Healthy In-Stock
                </span>
              )}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inventory Valuation (Cost)</p>
              <h3 className="text-2xl font-bold font-mono mt-2 text-blue-400">
                Rs. {costValuation.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Retail Sales Value: Rs. {saleValuation.toLocaleString()}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 border-t border-slate-800/80 pt-3">
              Calculated dynamically from current in-stock balance and unit cost.
            </p>
          </div>
        </div>
      </div>

      {/* Stock Movement History Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" /> Stock Movement Audit History
        </h3>

        {stockMovements.length === 0 ? (
          <EmptyState
            icon={<Boxes className="w-7 h-7 text-slate-400" />}
            title="No Stock Movements Logged"
            description="Stock changes from purchases, sales, returns, and manual adjustments will be audited here."
          />
        ) : (
          <div className="border border-slate-800 rounded-2xl overflow-x-auto overflow-y-hidden bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Movement Type</th>
                  <th className="px-6 py-4 text-right">Quantity Change</th>
                  <th className="px-6 py-4 text-right">Reference / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stockMovements.map((sm: any) => {
                  const qty = Number(sm.quantity || 0);
                  const isAdd = qty > 0;

                  return (
                    <tr key={sm.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 font-mono">
                        {new Date(sm.createdAt).toLocaleString()}
                      </td>

                      <td className="px-6 py-4 font-semibold">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sm.type === 'INITIAL'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : sm.type === 'PURCHASE' || sm.type === 'SALE_RETURN'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : sm.type === 'SALE' || sm.type === 'PURCHASE_RETURN'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {sm.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold">
                        <span className={isAdd ? 'text-emerald-400' : 'text-rose-400'}>
                          {isAdd ? `+${qty}` : qty} {item.unit}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right text-slate-300 font-sans">
                        {sm.reference || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Barcode / QR Sticker Label Generator Modal */}
      <BarcodeStickerModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        businessName={business?.name}
        item={{
          name: item.name,
          code: item.code,
          salePrice: salePrice,
          unit: item.unit,
        }}
      />
    </div>
  );
}
