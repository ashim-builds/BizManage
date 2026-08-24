'use client';

import { useSaleReturn } from '@/services/saleService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import {
  Printer,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function SaleReturnCreditNotePage({ params }: { params: { id: string } }) {
  const { data: saleReturn, isLoading, isError, refetch } = useSaleReturn(params.id);
  const { data: business } = useCurrentBusiness();

  if (isLoading) return <LoadingState message="Loading credit note document..." />;
  if (isError || !saleReturn) return <ErrorState title="Failed to load credit note" onRetry={refetch} />;

  const subTotal = Number(saleReturn.subTotal || 0);
  const totalTax = Number(saleReturn.taxAmount || 0);
  const totalDiscount = Number(saleReturn.discount || 0);
  const totalAmount = Number(saleReturn.totalAmount || 0);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Bar (Actions & Back) - Hidden on Print */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/transactions/sales-return"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Credit Note <span className="font-mono text-blue-400">{saleReturn.returnNumber}</span>
            </h1>
            <p className="text-xs text-slate-400">Date: {new Date(saleReturn.date).toLocaleDateString()}</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          <Printer className="w-4 h-4" /> Print Credit Note
        </button>
      </div>

      {/* PRINTABLE DOCUMENT CONTAINER */}
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-8 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Business & Header */}
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
              CREDIT NOTE
            </span>
            <h3 className="text-xl font-bold font-mono text-white print:text-slate-900 mt-2">
              {saleReturn.returnNumber}
            </h3>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
              Date: {new Date(saleReturn.date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-4 rounded-xl bg-slate-800/50 print:bg-slate-50 border border-slate-800 print:border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-500 tracking-wider mb-1">
              Customer Details
            </p>
            <p className="font-bold text-white print:text-slate-900 text-sm">
              {saleReturn.party?.name || 'Walk-in Customer'}
            </p>
            {saleReturn.party?.phone && (
              <p className="text-slate-300 print:text-slate-600 mt-0.5">Phone: {saleReturn.party.phone}</p>
            )}
            {saleReturn.party?.taxNumber && (
              <p className="text-slate-300 print:text-slate-600 font-mono">
                PAN/VAT: {saleReturn.party.taxNumber}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-800 print:border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-200">
              <tr>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-4 py-3 text-right">Qty Returned</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 text-slate-300 print:text-slate-800">
              {(saleReturn.items || []).map((line: any) => {
                const qty = Number(line.quantity || 0);
                const price = Number(line.unitPrice || 0);
                const disc = Number(line.discount || 0);
                const itemLineTotal = line.total !== undefined && line.total !== null && Number(line.total) > 0
                  ? Number(line.total)
                  : Math.max(0, qty * price - disc);

                return (
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
                      {qty} {line.item?.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      Rs. {price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-400 print:text-slate-700">
                      {disc > 0 ? `-Rs. ${disc.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white print:text-slate-900">
                      Rs. {itemLineTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-wrap justify-between items-start pt-4 border-t border-slate-800 print:border-slate-300 gap-4 text-xs">
          <div className="max-w-md">
            {saleReturn.notes && (
              <div className="p-3 rounded-lg bg-slate-800/40 print:bg-slate-50 text-slate-400 print:text-slate-600">
                <p className="font-semibold text-slate-300 print:text-slate-800 text-[11px] mb-1">
                  Notes:
                </p>
                <p>{saleReturn.notes}</p>
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
            
            {totalTax > 0 && (
              <>
                <div className="flex justify-between text-slate-400 print:text-slate-700">
                  <span>Taxable Amount</span>
                  <span className="font-mono text-white print:text-slate-900">Rs. {(totalAmount - totalTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-amber-400 print:text-slate-800 font-semibold">
                  <span>VAT (13%)</span>
                  <span className="font-mono">+ Rs. {totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between text-sm font-bold text-white print:text-slate-900 pt-2 border-t border-slate-800 print:border-slate-300">
              <span>Grand Total</span>
              <span className="font-mono text-blue-400 print:text-slate-900">
                Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
