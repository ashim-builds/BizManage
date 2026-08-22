'use client';

import { useState } from 'react';
import { useSale } from '@/services/saleService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { ThermalReceiptModal } from '@/components/pos/ThermalReceiptModal';
import { WhatsAppShareModal } from '@/components/common/WhatsAppShareModal';
import { generateInvoiceWhatsAppMessage } from '@/lib/whatsapp';
import {
  Printer,
  ArrowLeft,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { InvoiceStatus } from '@bizmanage/types';

export default function SaleInvoiceDetailsPage({ params }: { params: { id: string } }) {
  const { data: sale, isLoading, isError, refetch } = useSale(params.id);
  const { data: business } = useCurrentBusiness();

  const [isThermalOpen, setIsThermalOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  if (isLoading) return <LoadingState message="Loading sales tax invoice document..." />;
  if (isError || !sale) return <ErrorState title="Failed to load sales invoice" onRetry={refetch} />;

  const subTotal = Number(sale.subTotal || 0);
  const totalTax = Number(sale.taxAmount || 0);
  const totalDiscount = Number(sale.discount || 0);
  const totalAmount = Number(sale.totalAmount || 0);
  const paidAmount = Number(sale.paidAmount || 0);
  const dueAmount = Number(sale.dueAmount || 0);

  const formattedWhatsAppMsg = generateInvoiceWhatsAppMessage({
    businessName: business?.name || 'BizManage Store',
    businessPhone: business?.phone,
    invoiceNumber: sale.invoiceNumber,
    invoiceDate: new Date(sale.date).toLocaleDateString(),
    customerName: sale.party?.name || 'Customer',
    items: (sale.items || []).map((it: any) => ({
      name: it.item?.name || 'Item',
      quantity: Number(it.quantity || 1),
      unit: it.item?.unit || 'pcs',
      price: Number(it.unitPrice || 0),
      total: Number(it.total || 0),
    })),
    subTotal,
    discount: totalDiscount,
    taxAmount: totalTax,
    totalAmount,
    paidAmount,
    dueAmount,
    isVatBill: sale.isVatBill,
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Bar (Actions & Back) - Hidden on Print */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-5 gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/transactions/sales"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {sale.isVatBill ? 'Sales Tax Invoice' : 'Sales Invoice'} <span className="font-mono text-blue-400">{sale.invoiceNumber}</span>
            </h1>
            <p className="text-xs text-slate-400">Date: {new Date(sale.date).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all"
          >
            <MessageSquare className="w-4 h-4" /> Share WhatsApp
          </button>

          <button
            onClick={() => setIsThermalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/30 text-xs font-semibold transition-all"
          >
            <Receipt className="w-4 h-4" /> Thermal POS Print
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-4 h-4" /> Print Full Invoice
          </button>
        </div>
      </div>

      {/* PRINTABLE INVOICE DOCUMENT CONTAINER */}
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-8 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Business & Invoice Header */}
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
            {business?.taxNumber && sale.isVatBill && (
              <p className="text-xs text-slate-400 print:text-slate-600 font-mono mt-0.5">
                PAN/VAT No.: {business.taxNumber}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 print:border-slate-300 print:bg-slate-100 print:text-slate-800">
              {sale.isVatBill ? 'TAX INVOICE' : 'INVOICE'}
            </span>
            <h3 className="text-xl font-bold font-mono text-white print:text-slate-900 mt-2">
              {sale.invoiceNumber}
            </h3>
            <p className="text-xs text-slate-300 print:text-slate-800 font-medium mt-1 font-mono">
              Date: {new Date(sale.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-4 rounded-xl bg-slate-800/50 print:bg-slate-50 border border-slate-800 print:border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-500 tracking-wider mb-1">
              Billed To (Customer)
            </p>
            <p className="font-bold text-white print:text-slate-900 text-sm">
              {sale.party?.name || 'Walk-in Customer'}
            </p>
            {sale.party?.phone && (
              <p className="text-slate-300 print:text-slate-600 mt-0.5">Phone: {sale.party.phone}</p>
            )}
            {sale.party?.taxNumber && sale.isVatBill && (
              <p className="text-slate-300 print:text-slate-600 font-mono">
                PAN/VAT: {sale.party.taxNumber}
              </p>
            )}
          </div>

          <div className="md:text-right">
            <p className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-500 tracking-wider mb-1">
              Payment Status
            </p>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                sale.status === InvoiceStatus.PAID
                  ? 'bg-emerald-500/10 text-emerald-400 print:bg-emerald-100 print:text-emerald-800'
                  : sale.status === InvoiceStatus.PARTIAL
                  ? 'bg-amber-500/10 text-amber-400 print:bg-amber-100 print:text-amber-800'
                  : sale.status === InvoiceStatus.RETURNED
                  ? 'bg-purple-500/10 text-purple-400 print:bg-purple-100 print:text-purple-800'
                  : 'bg-rose-500/10 text-rose-400 print:bg-rose-100 print:text-rose-800'
              }`}
            >
              {sale.status}
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
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 text-slate-300 print:text-slate-800">
              {(sale.items || []).map((line: any) => (
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
                    {Number(line.returnedQuantity || 0) > 0 && (
                      <span className="block text-[10px] text-rose-400 font-semibold mt-1">
                        Returned: {Number(line.returnedQuantity)} {line.item?.unit}
                      </span>
                    )}
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
            {sale.notes && (
              <div className="p-3 rounded-lg bg-slate-800/40 print:bg-slate-50 text-slate-400 print:text-slate-600">
                <p className="font-semibold text-slate-300 print:text-slate-800 text-[11px] mb-1">
                  Invoice Notes & Terms:
                </p>
                <p>{sale.notes}</p>
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
            
            {sale.isVatBill && (
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
              <span>Collected Amount</span>
              <span className="font-mono">Rs. {paidAmount.toLocaleString()}</span>
            </div>

            {dueAmount > 0 && (
              <div className="flex justify-between text-amber-400 print:text-slate-900 font-bold pt-1 border-t border-slate-800/60 print:border-slate-200">
                <span>Outstanding Balance</span>
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
        sale={sale}
      />

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        title="Share Invoice via WhatsApp"
        defaultPhone={sale.party?.phone}
        message={formattedWhatsAppMsg}
      />
    </div>
  );
}
