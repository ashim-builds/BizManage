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
    <div className="space-y-4 font-sans pb-12">
      {/* Top Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all"
            title="Back to Inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{item.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isProduct
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}
              >
                {item.type}
              </span>
            </div>
            {item.code && <p className="text-xs text-slate-500 font-mono mt-0.5">SKU / Code: {item.code}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBarcodeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-all shadow-xs"
          >
            <QrCode className="w-4 h-4 text-purple-600" /> Barcode / QR
          </button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Item Master Attributes Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-700" /> Product Specifications
          </h3>

          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Category</span>
              <span className="font-bold text-slate-900">{item.category?.name || 'Uncategorized'}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Measuring Unit</span>
              <span className="font-bold text-slate-900">{item.unit || 'PCS'}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Purchase Cost</span>
              <span className="font-bold font-mono text-slate-900">Rs. {purchasePrice.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Selling Price</span>
              <span className="font-bold font-mono text-emerald-600">Rs. {salePrice.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Gross Margin</span>
              <span className="font-bold font-mono text-blue-600">{marginPct}%</span>
            </div>

            {isProduct && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Min Stock Alert</span>
                <span className="font-bold font-mono text-amber-600">
                  {minAlert} {item.unit || 'PCS'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stock Valuation & Status Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current In-Stock Balance</p>
              <h3 className="text-3xl font-black font-mono mt-2 text-slate-900">
                {stock} <span className="text-sm font-sans text-slate-500 font-bold">{item.unit || 'PCS'}</span>
              </h3>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Stock Status</span>
              {isOut && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                  Out of Stock
                </span>
              )}
              {isLow && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                  Low Stock Alert
                </span>
              )}
              {!isOut && !isLow && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Healthy In-Stock
                </span>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Inventory Valuation (Cost)</p>
              <h3 className="text-2xl font-black font-mono mt-2 text-blue-600">
                Rs. {costValuation.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-500 font-mono font-medium mt-1">
                Retail Valuation: Rs. {saleValuation.toLocaleString()}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 border-t border-slate-100 pt-2.5 font-medium">
              Calculated dynamically from current stock and unit purchase cost.
            </p>
          </div>
        </div>
      </div>

      {/* Stock Movement History Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" /> Stock Movement Audit History
        </h3>

        {stockMovements.length === 0 ? (
          <EmptyState
            icon={<Boxes className="w-7 h-7 text-slate-400" />}
            title="No Stock Movements Logged"
            description="Stock changes from purchases, sales, returns, and manual adjustments will appear here."
          />
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3 text-right">Quantity Change</th>
                  <th className="px-4 py-3 text-right">Reference / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockMovements.map((sm: any) => {
                  const qty = Number(sm.quantity || 0);
                  const isAdd = qty > 0;

                  return (
                    <tr key={sm.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {new Date(sm.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            sm.type === 'INITIAL'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : sm.type === 'PURCHASE' || sm.type === 'SALE_RETURN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sm.type === 'SALE' || sm.type === 'PURCHASE_RETURN'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {sm.type}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={isAdd ? 'text-emerald-600' : 'text-rose-600'}>
                          {isAdd ? `+${qty}` : qty} {item.unit || 'PCS'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right text-slate-600 font-medium">
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
