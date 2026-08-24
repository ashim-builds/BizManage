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
  Receipt,
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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Bar (Actions & Back) - Hidden on Print */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-5 gap-3 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/transactions/purchases"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {purchase.isVatBill ? 'Purchase Tax Invoice' : 'Purchase Bill'} <span className="font-mono text-blue-400">{purchase.billNumber}</span>
            </h1>
            <p className="text-xs text-slate-400">Date: {new Date(purchase.date).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsThermalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-700 shadow-sm"
          >
            <Receipt className="w-4 h-4 text-emerald-400" /> Thermal Receipt
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
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
            {business?.taxNumber && purchase.isVatBill && (
              <p className="text-xs text-slate-400 print:text-slate-600 font-mono mt-0.5">
                PAN/VAT No.: {business.taxNumber}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 print:border-slate-300 print:bg-slate-100 print:text-slate-800">
              {purchase.isVatBill ? 'TAX INVOICE' : 'PURCHASE BILL'}
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
            {purchase.party?.taxNumber && purchase.isVatBill && (
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
                  : purchase.status === InvoiceStatus.RETURNED
                  ? 'bg-purple-500/10 text-purple-400 print:bg-purple-100 print:text-purple-800'
                  : 'bg-rose-500/10 text-rose-400 print:bg-rose-100 print:text-rose-800'
              }`}
            >
              {purchase.status}
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-800 print:border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs min-w-[800px]">
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
              {(purchase.items || []).map((line: any) => {
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
                      {Number(line.returnedQuantity || 0) > 0 && (
                        <span className="block text-[10px] text-rose-400 font-semibold mt-1">
                          Returned: {Number(line.returnedQuantity)} {line.item?.unit}
                        </span>
                      )}
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
            
            {purchase.isVatBill && (
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

      {/* POS Thermal Receipt Modal */}
      <ThermalReceiptModal
        isOpen={isThermalOpen}
        onClose={() => setIsThermalOpen(false)}
        business={{
          name: business?.name,
          address: business?.address,
          phone: business?.phone,
          taxNumber: business?.taxNumber,
          logoUrl: business?.logoUrl,
        }}
        sale={{
          invoiceNumber: purchase.billNumber,
          date: purchase.date,
          isVatBill: purchase.isVatBill,
          paymentMode: purchase.paymentMode || 'CASH',
          subTotal: purchase.subTotal,
          discount: purchase.discount,
          taxAmount: purchase.taxAmount,
          totalAmount: purchase.totalAmount,
          paidAmount: purchase.paidAmount,
          dueAmount: purchase.dueAmount,
          party: purchase.party ? {
            name: purchase.party.name,
            phone: purchase.party.phone,
            taxNumber: purchase.party.taxNumber,
          } : null,
          items: (purchase.items || []).map((line: any) => ({
            id: line.id,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            total: line.total,
            item: line.item ? {
              name: line.item.name,
              code: line.item.code,
              unit: line.item.unit,
            } : undefined,
          })),
        }}
      />
    </div>
  );
}
