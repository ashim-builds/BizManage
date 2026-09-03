'use client';

import { usePurchase } from '@/services/purchaseService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { formatCurrency } from '@/lib/accounting';
import {
  ShoppingBag,
  Printer,
  ArrowLeft,
  Building2,
  Calendar,
  Phone,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { InvoiceStatus } from '@bizmanage/types';
import { ThermalReceiptModal } from '@/components/pos/ThermalReceiptModal';

export default function PurchaseBillDetailsPage({ params }: { params: { id: string } }) {
  const { data: purchase, isLoading, isError, refetch } = usePurchase(params.id);
  const { data: business } = useCurrentBusiness();
  const [isThermalOpen, setIsThermalOpen] = useState(false);

  if (isLoading) return <LoadingState message="Loading purchase bill document..." />;
  if (isError || !purchase) return <ErrorState title="Failed to load purchase bill" onRetry={refetch} />;

  const subTotal = Number(purchase.subTotal || 0);
  const totalTax = Number(purchase.taxAmount || 0);
  const totalDiscount = Number(purchase.discount || 0);
  const totalAmount = Number(purchase.totalAmount || 0);
  const paidAmount = Number(purchase.paidAmount || 0);
  const dueAmount = Number(purchase.dueAmount || 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Top Bar (Actions & Back) - Hidden on Print */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/transactions/purchases"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs"
            title="Back to Purchases"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {purchase.isVatBill ? 'Purchase Tax Invoice' : 'Purchase Bill'}
              </h1>
              <span className="font-mono font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md text-xs">
                {purchase.billNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Issued on {new Date(purchase.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsThermalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <Receipt className="w-4 h-4 text-purple-600" /> Thermal Receipt
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-all shadow-md shadow-purple-600/25 active:scale-95"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* PRINTABLE BILL DOCUMENT CONTAINER */}
      <div className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-6 sm:space-y-8 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
        
        {/* Business & Bill Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {business?.name || 'My Store'}
            </h2>
            {business?.address && (
              <p className="text-xs text-slate-500 font-medium">{business.address}</p>
            )}
            {business?.phone && (
              <p className="text-xs text-slate-500 font-medium">Phone: {business.phone}</p>
            )}
            {business?.taxNumber && (
              <p className="text-xs text-slate-700 font-mono font-bold mt-0.5">
                PAN/VAT No.: {business.taxNumber}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right w-full sm:w-auto">
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 inline-block font-mono">
              {purchase.isVatBill ? 'TAX INVOICE (PURCHASE)' : 'PURCHASE BILL'}
            </span>
            <h3 className="text-xl font-black font-mono text-slate-900 mt-2">
              {purchase.billNumber}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1 font-mono">
              Date: {new Date(purchase.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Supplier Info & Payment Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Supplier Party (आपूर्तिकर्ता)
            </p>
            <p className="font-extrabold text-slate-900 text-sm">
              {purchase.party?.name || 'Cash / Walk-in Supplier'}
            </p>
            {purchase.party?.phone && (
              <p className="text-slate-600 font-mono">Phone: {purchase.party.phone}</p>
            )}
            {purchase.party?.taxNumber && (
              <p className="text-slate-700 font-mono font-bold">
                PAN/VAT: {purchase.party.taxNumber}
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1.5">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Bill Payment Status
            </p>
            <div>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase inline-block ${
                  purchase.status === InvoiceStatus.PAID
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : purchase.status === InvoiceStatus.PARTIAL
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : purchase.status === InvoiceStatus.RETURNED
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {purchase.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Mode: <strong className="text-slate-800 uppercase">{purchase.paymentMode || 'Cash'}</strong>
            </p>
          </div>
        </div>

        {/* Mobile Line Items View (< 768px) */}
        <div className="md:hidden print:hidden space-y-2.5">
          {(purchase.items || []).map((line: any, idx: number) => {
            const qty = Number(line.quantity || 0);
            const price = Number(line.unitPrice || 0);
            const disc = Number(line.discount || 0);
            const itemLineTotal = line.total !== undefined && line.total !== null && Number(line.total) > 0
              ? Number(line.total)
              : Math.max(0, qty * price - disc);

            return (
              <div key={line.id || idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <strong className="text-slate-900 block font-bold">{line.item?.name}</strong>
                    {line.item?.code && (
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {line.item.code}</span>
                    )}
                  </div>
                  <span className="font-mono font-black text-slate-900 text-sm shrink-0">
                    Rs. {formatCurrency(itemLineTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-mono">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-sans font-bold">Qty</span>
                    {qty} {line.item?.unit || 'Pcs'}
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-sans font-bold">Cost Rate</span>
                    Rs. {formatCurrency(price)}
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-sans font-bold">Discount</span>
                    {disc > 0 ? `-Rs. ${formatCurrency(disc)}` : '-'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop & Print Table (>= 768px) */}
        <div className="hidden md:block print:block border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 border-r border-slate-200 w-12 text-center">#</th>
                <th className="px-4 py-3 border-r border-slate-200">Item / Product</th>
                <th className="px-4 py-3 text-center border-r border-slate-200 w-24">Quantity</th>
                <th className="px-4 py-3 text-right border-r border-slate-200 w-32">Cost Price (Rs.)</th>
                <th className="px-4 py-3 text-center border-r border-slate-200 w-24">Discount</th>
                {purchase.isVatBill && <th className="px-4 py-3 text-right border-r border-slate-200 w-28">VAT (13%)</th>}
                <th className="px-4 py-3 text-right w-36">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {(purchase.items || []).map((line: any, idx: number) => {
                const qty = Number(line.quantity || 0);
                const price = Number(line.unitPrice || 0);
                const disc = Number(line.discount || 0);
                const itemLineTotal = line.total !== undefined && line.total !== null && Number(line.total) > 0
                  ? Number(line.total)
                  : Math.max(0, qty * price - disc);

                return (
                  <tr key={line.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400 font-bold text-center border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">
                      {line.item?.name}
                      {line.item?.code && (
                        <span className="text-[10px] text-slate-400 block font-mono font-normal">
                          SKU: {line.item.code}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-semibold border-r border-slate-100">
                      {qty} {line.item?.unit || 'Pcs'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold border-r border-slate-100">
                      Rs. {formatCurrency(price)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600 border-r border-slate-100">
                      {disc > 0 ? `-Rs. ${formatCurrency(disc)}` : '-'}
                    </td>
                    {purchase.isVatBill && (
                      <td className="px-4 py-3 text-right font-mono font-semibold border-r border-slate-100">
                        Rs. {formatCurrency(Number(line.taxAmount || 0))}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                      Rs. {formatCurrency(itemLineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary & Notes */}
        <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-slate-200 gap-6 text-xs">
          <div className="max-w-md w-full space-y-3">
            {purchase.notes ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Remarks / Notes:
                </p>
                <p>{purchase.notes}</p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
                <p className="font-bold text-slate-700">Inventory Update Status:</p>
                <p>Stock quantities automatically received into primary warehouse.</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 space-y-2.5 text-slate-600">
            <div className="flex justify-between font-medium">
              <span>Subtotal</span>
              <span className="font-mono text-slate-900 font-bold">Rs. {formatCurrency(subTotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Total Discount</span>
                <span className="font-mono font-bold">- Rs. {formatCurrency(totalDiscount)}</span>
              </div>
            )}
            
            {purchase.isVatBill && (
              <div className="flex justify-between text-blue-600 font-medium">
                <span>VAT (13%)</span>
                <span className="font-mono font-bold">+ Rs. {formatCurrency(totalTax)}</span>
              </div>
            )}

            {/* Grand Total Highlight */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-baseline justify-between shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Grand Total</span>
              <span className="text-xl font-black font-mono text-purple-400 tracking-tight">
                Rs. {formatCurrency(totalAmount)}
              </span>
            </div>

            {/* Paid / Due Breakdown */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px] font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Paid Out:</span>
                <span className="font-mono font-bold text-emerald-600">
                  Rs. {formatCurrency(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Supplier Payable Due:</span>
                <span className={`font-mono font-black ${dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  Rs. {formatCurrency(dueAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Box */}
        <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p className="font-medium">Inventory Received & Verified</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Recorded via BizManage ERP</p>
          </div>
          <div className="text-center">
            <div className="w-44 border-b border-slate-400 pb-1 mb-1"></div>
            <p className="text-[11px] font-bold text-slate-700">Store Manager / Receiver</p>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isThermalOpen && (
        <ThermalReceiptModal
          isOpen={isThermalOpen}
          onClose={() => setIsThermalOpen(false)}
          sale={purchase}
          business={business}
        />
      )}
    </div>
  );
}
