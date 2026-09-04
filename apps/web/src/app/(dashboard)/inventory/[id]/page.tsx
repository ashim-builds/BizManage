'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useItem, useAdjustStock, useDeleteItem } from '@/services/itemService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { BarcodeStickerModal } from '@/components/inventory/BarcodeStickerModal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { toast } from 'react-hot-toast';
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
  SlidersHorizontal,
  Edit2,
  Trash2,
  X,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { ItemType } from '@bizmanage/types';

export default function ItemDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: item, isLoading, isError, refetch } = useItem(params.id);
  const { data: business } = useCurrentBusiness();
  const adjustStockMutation = useAdjustStock();
  const deleteItemMutation = useDeleteItem();

  // Modals & Bottom Sheets
  const [isAdjustSheetOpen, setIsAdjustSheetOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [txFilter, setTxFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'STOCK'>('ALL');

  // Adjustment State
  const [adjustType, setAdjustType] = useState<'ADD' | 'REDUCE'>('ADD');
  const [adjustQuantity, setAdjustQuantity] = useState<string>('1');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  if (isLoading) return <LoadingState message="Loading item details & stock records..." />;
  if (isError || !item) return <ErrorState title="Failed to load item profile" onRetry={refetch} />;

  const stock = Number(item.currentStock || 0);
  const purchasePrice = Number(item.purchasePrice || 0);
  const salePrice = Number(item.salePrice || 0);
  const costValuation = stock * purchasePrice;
  const stockMovements: any[] = item.stockMovements || [];

  const handleApplyAdjustment = async () => {
    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity greater than 0.');
      return;
    }

    if (adjustType === 'REDUCE' && qty > stock) {
      toast.error(`Cannot reduce more than current physical stock (${stock}).`);
      return;
    }

    try {
      setIsSubmittingAdjust(true);
      await adjustStockMutation.mutateAsync({
        id: item.id,
        data: {
          adjustmentType: adjustType,
          quantity: qty,
          notes: adjustReason.trim() || undefined,
        },
      });
      toast.success(
        `Stock successfully ${adjustType === 'ADD' ? 'added (+)' : 'reduced (-)'}!`
      );
      setIsAdjustSheetOpen(false);
      setAdjustQuantity('1');
      setAdjustReason('');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to adjust stock.');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleDeleteItem = async () => {
    try {
      await deleteItemMutation.mutateAsync(item.id);
      toast.success('Item deleted successfully.');
      router.push('/inventory');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete item.');
    }
  };

  // Filtered Stock Movements
  const filteredMovements = stockMovements.filter((sm) => {
    if (txFilter === 'ALL') return true;
    if (txFilter === 'BUY') return sm.type === 'PURCHASE' || sm.type === 'PURCHASE_RETURN';
    if (txFilter === 'SELL') return sm.type === 'SALE' || sm.type === 'SALE_RETURN';
    if (txFilter === 'STOCK') return sm.type === 'INITIAL' || sm.type === 'ADJUSTMENT' || sm.type === 'ADJUSTMENT_ADD' || sm.type === 'ADJUSTMENT_REDUCE';
    return true;
  });

  return (
    <div className="space-y-4 font-sans pb-24 max-w-2xl mx-auto">
      {/* Top Header Bar (Pixel match Image 2 Screen 2) */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <Link
            href="/inventory"
            className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-all"
            title="Back to Inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-base font-bold text-slate-900">Item Details</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsBarcodeOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            title="Barcode / QR"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Delete Item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Large Item Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {item.name}
        </h1>
        {item.code && (
          <p className="text-xs text-slate-400 font-mono mt-0.5">SKU / Code: {item.code}</p>
        )}
      </div>

      {/* 2x2 Stats Card (Image 2 Screen 2) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs grid grid-cols-2 gap-y-4 gap-x-6">
        <div>
          <span className="text-[11px] font-bold text-slate-500 block">Sale Price</span>
          <span className="text-sm sm:text-base font-black font-mono text-emerald-600 mt-0.5 block">
            Rs. {salePrice.toFixed(2)}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-500 block">Purchase Price</span>
          <span className="text-sm sm:text-base font-black font-mono text-emerald-600 mt-0.5 block">
            Rs. {purchasePrice.toFixed(2)}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-500 block">Stock Quantity</span>
          <span className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5 block">
            {stock} {item.unit || 'Pcs'}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-500 block">Stock Value</span>
          <span className="text-sm sm:text-base font-black font-mono text-emerald-600 mt-0.5 block">
            Rs. {costValuation.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Full-width Adjust Item Button (Image 2 Screen 2) */}
      <button
        type="button"
        onClick={() => setIsAdjustSheetOpen(true)}
        className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
        <span>Adjust Item</span>
      </button>

      {/* Transactions Section */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-black text-slate-900">
          Transactions ({stockMovements.length})
        </h3>

        {/* Filter Tabs: All | Buy (Purchases) | Sell (Sales) | Stock */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] sm:text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setTxFilter('ALL')}
            className={`px-2.5 py-1 rounded-full transition-all shrink-0 cursor-pointer ${
              txFilter === 'ALL'
                ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTxFilter('BUY')}
            className={`px-2.5 py-1 rounded-full transition-all shrink-0 cursor-pointer ${
              txFilter === 'BUY'
                ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Buy (Purchases)
          </button>
          <button
            type="button"
            onClick={() => setTxFilter('SELL')}
            className={`px-2.5 py-1 rounded-full transition-all shrink-0 cursor-pointer ${
              txFilter === 'SELL'
                ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Sell (Sales)
          </button>
          <button
            type="button"
            onClick={() => setTxFilter('STOCK')}
            className={`px-2.5 py-1 rounded-full transition-all shrink-0 cursor-pointer ${
              txFilter === 'STOCK'
                ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Stock
          </button>
        </div>

        {/* Transaction Cards List */}
        {filteredMovements.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">No transactions found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMovements.map((sm: any) => {
              const qty = Number(sm.quantity || 0);
              const isAdd = qty > 0;
              const rate = purchasePrice || 0;
              const totalAmt = Math.abs(qty * rate);

              return (
                <div
                  key={sm.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3"
                >
                  {/* Card Top Row */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {sm.type === 'INITIAL'
                        ? 'Opening Stock'
                        : sm.type === 'PURCHASE'
                        ? 'Purchase'
                        : sm.type === 'SALE'
                        ? 'Sale Invoice'
                        : sm.type === 'ADJUSTMENT' || sm.type === 'ADJUSTMENT_ADD' || sm.type === 'ADJUSTMENT_REDUCE'
                        ? 'Stock Adjustment'
                        : sm.type}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                      Recorded
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Invoice/Ref</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {sm.reference || 'INIT'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Date</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {new Date(sm.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Quantity</span>
                      <span
                        className={`font-black font-mono ${
                          isAdd ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isAdd ? `+${qty}` : qty} {item.unit || 'Pcs'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Rate</span>
                      <span className="font-bold text-slate-900 font-mono">
                        Rs. {rate.toFixed(2)}
                      </span>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400 text-[11px]">Total Amount</span>
                      <span className="font-black font-mono text-slate-900">
                        Rs. {totalAmt.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Link */}
        {stockMovements.length > 0 && (
          <div className="pt-2 text-center">
            <Link
              href="/inventory"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>View All Transactions</span>
              <span>›</span>
            </Link>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADJUST STOCK BOTTOM SHEET MODAL (Pixel match Image 2 Screen 3) */}
      {/* ========================================================================= */}
      {isAdjustSheetOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 transition-all">
            <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
              {/* Drag Handle Bar */}
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Adjust Stock</h3>
                    <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                      {item.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdjustSheetOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Physical Stock Pill */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Current Physical Stock</span>
                <span className="font-black font-mono text-slate-900">
                  {stock} {item.unit || 'Pcs'}
                </span>
              </div>

              {/* Adjustment Type Toggle Cards */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD')}
                    className={`py-3 px-3 rounded-2xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      adjustType === 'ADD'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Plus className="w-4 h-4 stroke-[3] text-emerald-600" />
                    <span>Add Stock (In)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('REDUCE')}
                    className={`py-3 px-3 rounded-2xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      adjustType === 'REDUCE'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Minus className="w-4 h-4 stroke-[3] text-rose-600" />
                    <span>Reduce (Loss-Damage)</span>
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 block">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    className="w-full pl-4 pr-14 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quantity"
                  />
                  <span className="absolute right-4 top-3 text-xs font-bold text-slate-400">
                    {item.unit || 'Pcs'}
                  </span>
                </div>
              </div>

              {/* Reason / Note Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 block">
                  Reason / Note
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical inventory count correction"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions: Cancel & Apply Adjustment */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustSheetOpen(false)}
                  disabled={isSubmittingAdjust}
                  className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyAdjustment}
                  disabled={isSubmittingAdjust}
                  className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmittingAdjust ? 'Applying...' : 'Apply Adjustment'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteItem}
        title="Delete Item?"
        description={`Are you sure you want to delete "${item.name}"? This action cannot be undone.`}
        actionText="Delete Item"
        variant="danger"
      />

      {/* Barcode / QR Modal */}
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
