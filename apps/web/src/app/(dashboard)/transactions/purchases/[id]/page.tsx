'use client';

import { usePurchase } from '@/services/purchaseService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import {
  ShoppingBag,
  Printer,
  ArrowLeft,
  Building2,
  Calendar,
  User,
  Phone,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { InvoiceStatus } from '@bizmanage/types';

export default function PurchaseBillDetailsPage({ params }: { params: { id: string } }) {
  const { data: purchase, isLoading, isError, refetch } = usePurchase(params.id);
  const { data: business } = useCurrentBusiness();

  if (isLoading) return <LoadingState message="Loading purchase bill document..." />;
  if (isError || !purchase) return <ErrorState title="Failed to load purchase bill" onRetry={refetch} />;

  const subTotal = Number(purchase.subTotal || 0);
  const totalTax = Number(purchase.taxAmount || 0);
  const totalDiscount = Number(purchase.discount || 0);
  const totalAmount = Number(purchase.totalAmount || 0);
  const paidAmount = Number(purchase.paidAmount || 0);
  const dueAmount = Number(purchase.dueAmount || 0);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Bar (Actions & Back) - Hidden on Print */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/transactions/purchases"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Purchase Bill <span className="font-mono text-blue-400">{purchase.billNumber}</span>
            </h1>
            <p className="text-xs text-slate-400">Date: {new Date(purchase.date).toLocaleDateString()}</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700 shadow-lg"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* PRINTABLE BILL DOCUMENT CONTAINER */}
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-8 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Business & Bill Header */}
        <div className="flex flex-wrap justify-between items-start border-b border-slate-800 print:border-slate-300 pb-6 gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white print:text-slate-900">
              {business?.name || 'My Business'}
            </h2>
            {business?.address && (
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">{business.address}</p>
            )}
            {business?.phone && (
              <p className="text-xs text-slate-400 print:text-slate-600">Phone: {business.phone}</p>
            )}
            {business?.taxNumber && (
              <p className="text-xs text-slate-400 print:text-slate-600 font-mono mt-0.5">
                PAN/VAT: {business.taxNumber}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 print:border-slate-300 print:bg-slate-100 print:text-slate-800">
              VAT PURCHASE BILL
            </span>
            <h3 className="text-xl font-bold font-mono text-white print:text-slate-900 mt-2">
              {purchase.billNumber}
            </h3>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
              Date: {new Date(purchase.date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Supplier Info */}
        <div className="p-4 rounded-xl bg-slate-800/50 print:bg-slate-50 border border-slate-800 print:border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-500 tracking-wider mb-1">
              Supplier (Vendor)
            </p>
            <p className="font-bold text-white print:text-slate-900 text-sm">{purchase.party?.name}</p>
            {purchase.party?.phone && (
              <p className="text-slate-300 print:text-slate-600 mt-0.5">Phone: {purchase.party.phone}</p>
            )}
            {purchase.party?.taxNumber && (
              <p className="text-slate-300 print:text-slate-600 font-mono">
                PAN/VAT: {purchase.party.taxNumber}
              </p>
            )}
          </div>

          <div className="md:text-right">
            <p className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-500 tracking-wider mb-1">
              Payment Status
            </p>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                purchase.status === InvoiceStatus.PAID
                  ? 'bg-emerald-500/10 text-emerald-400 print:bg-emerald-100 print:text-emerald-800'
                  : purchase.status === InvoiceStatus.PARTIAL
                  ? 'bg-amber-500/10 text-amber-400 print:bg-amber-100 print:text-amber-800'
                  : 'bg-rose-500/10 text-rose-400 print:bg-rose-100 print:text-rose-800'
              }`}
            >
              {purchase.status}
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-800 print:border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-200">
              <tr>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 text-slate-300 print:text-slate-800">
              {(purchase.items || []).map((line: any) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 font-semibold text-white print:text-slate-900">
                    {line.item?.name}
                    {line.item?.code && (
                      <span className="text-[10px] text-slate-400 print:text-slate-500 block font-mono">
                        SKU: {line.item.code}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {Number(line.quantity)} {line.item?.unit}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    Rs. {Number(line.unitPrice).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-rose-400 print:text-slate-700">
                    {Number(line.discount) > 0 ? `-Rs. ${Number(line.discount).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-white print:text-slate-900">
                    Rs. {Number(line.total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-wrap justify-between items-start pt-4 border-t border-slate-800 print:border-slate-300 gap-4 text-xs">
          <div className="max-w-md">
            {purchase.notes && (
              <div className="p-3 rounded-lg bg-slate-800/40 print:bg-slate-50 text-slate-400 print:text-slate-600">
                <p className="font-semibold text-slate-300 print:text-slate-800 text-[11px] mb-1">
                  Bill Notes & Terms:
                </p>
                <p>{purchase.notes}</p>
              </div>
            )}
          </div>

          <div className="w-64 space-y-2 text-slate-400 print:text-slate-700">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono text-white print:text-slate-900">Rs. {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-400 print:text-slate-800">
                <span>Total Discount</span>
                <span className="font-mono">- Rs. {totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400 print:text-slate-700">
              <span>Taxable Amount</span>
              <span className="font-mono text-white print:text-slate-900">Rs. {(subTotal - totalDiscount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {totalTax > 0 ? (
              <div className="flex justify-between text-amber-400 print:text-slate-800 font-semibold">
                <span>VAT (13%)</span>
                <span className="font-mono">+ Rs. {totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ) : (
              <div className="flex justify-between text-slate-500 print:text-slate-500">
                <span>VAT (13%)</span>
                <span className="font-mono">Rs. 0.00</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-white print:text-slate-900 pt-2 border-t border-slate-800 print:border-slate-300">
              <span>Grand Total</span>
              <span className="font-mono text-blue-400 print:text-slate-900">
                Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between text-emerald-400 print:text-slate-800 pt-1">
              <span>Paid Amount</span>
              <span className="font-mono">Rs. {paidAmount.toLocaleString()}</span>
            </div>

            {dueAmount > 0 && (
              <div className="flex justify-between text-rose-400 print:text-slate-900 font-bold pt-1 border-t border-slate-800/60 print:border-slate-200">
                <span>Balance Due</span>
                <span className="font-mono">Rs. {dueAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
