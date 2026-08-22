'use client';

import { useState } from 'react';
import { usePaymentIn } from '@/services/paymentService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { WhatsAppShareModal } from '@/components/common/WhatsAppShareModal';
import { generatePaymentReceiptWhatsAppMessage } from '@/lib/whatsapp';
import {
  Printer,
  ArrowLeft,
  Banknote,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

export default function PaymentInVoucherPage({ params }: { params: { id: string } }) {
  const { data: payment, isLoading, isError, refetch } = usePaymentIn(params.id);
  const { data: business } = useCurrentBusiness();

  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  if (isLoading) return <LoadingState message="Loading payment receipt voucher..." />;
  if (isError || !payment) return <ErrorState title="Failed to load receipt voucher" onRetry={refetch} />;

  const totalAmount = Number(payment.amount || 0);

  const formattedWhatsAppMsg = generatePaymentReceiptWhatsAppMessage({
    businessName: business?.name || 'BizManage Store',
    businessPhone: business?.phone,
    voucherNumber: payment.referenceNumber,
    date: new Date(payment.date).toLocaleDateString(),
    customerName: payment.party?.name || 'Customer',
    amountReceived: totalAmount,
    paymentMode: payment.mode,
    currentBalance: payment.party?.currentBalance,
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Bar (Actions & Back) - Hidden on Print */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-5 gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/transactions/payment-in"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Receipt Voucher
            </h1>
            <p className="text-xs text-slate-400">Date: {new Date(payment.date).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all"
          >
            <MessageSquare className="w-4 h-4" /> Share WhatsApp
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-4 h-4" /> Print Receipt Voucher
          </button>
        </div>
      </div>

      {/* PRINTABLE VOUCHER DOCUMENT CONTAINER */}
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-8 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Business & Voucher Header */}
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
            <span className="text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-slate-300 print:bg-slate-100 print:text-slate-800">
              RECEIPT VOUCHER
            </span>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-2">
              Date: {new Date(payment.date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Party Info */}
        <div className="p-4 rounded-xl bg-slate-800/50 print:bg-slate-50 border border-slate-800 print:border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-500 tracking-wider mb-1">
              Received From
            </p>
            <p className="font-bold text-white print:text-slate-900 text-sm">
              {payment.party?.name || 'Walk-in Customer'}
            </p>
            {payment.party?.phone && (
              <p className="text-slate-300 print:text-slate-600 mt-0.5">Phone: {payment.party.phone}</p>
            )}
          </div>

          <div className="md:text-right">
            <p className="text-[10px] font-bold uppercase text-slate-400 print:text-slate-500 tracking-wider mb-1">
              Payment Status
            </p>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                payment.status === 'VOIDED'
                  ? 'bg-rose-500/10 text-rose-400 print:bg-rose-100 print:text-rose-800'
                  : 'bg-emerald-500/10 text-emerald-400 print:bg-emerald-100 print:text-emerald-800'
              }`}
            >
              {payment.status === 'VOIDED' ? 'VOIDED' : 'SUCCESS'}
            </span>
          </div>
        </div>

        {/* Voucher Details Table */}
        <div className="border border-slate-800 print:border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-200">
              <tr>
                <th className="px-4 py-3">Description / Mode</th>
                <th className="px-4 py-3">Reference No.</th>
                <th className="px-4 py-3">Deposited To</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 text-slate-300 print:text-slate-800">
              <tr>
                <td className="px-4 py-3 font-semibold text-white print:text-slate-900">
                  {payment.mode}
                  {payment.notes && (
                    <span className="text-[10px] text-slate-400 print:text-slate-500 block font-normal mt-1">
                      {payment.notes}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono">
                  {payment.referenceNumber || '-'}
                </td>
                <td className="px-4 py-3">
                  {payment.account?.accountName || '-'}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-white print:text-slate-900">
                  Rs. {totalAmount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-wrap justify-end items-start pt-4 border-t border-slate-800 print:border-slate-300 gap-4 text-xs">
          <div className="w-64 space-y-2 text-slate-400 print:text-slate-700">
            <div className="flex justify-between text-sm font-bold text-white print:text-slate-900 pt-2 border-t border-slate-800 print:border-slate-300">
              <span>Total Received</span>
              <span className="font-mono text-emerald-400 print:text-slate-900">
                Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        title="Share Payment Receipt via WhatsApp"
        defaultPhone={payment.party?.phone}
        message={formattedWhatsAppMsg}
      />
    </div>
  );
}
