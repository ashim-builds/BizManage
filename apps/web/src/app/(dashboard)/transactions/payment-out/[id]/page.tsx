'use client';

import { usePaymentOut } from '@/services/paymentService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StandardMonochromeDocument } from '@/components/invoice/StandardMonochromeDocument';
import { formatCurrency } from '@/lib/accounting';
import {
  Printer,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function PaymentOutVoucherPage({ params }: { params: { id: string } }) {
  const { data: payment, isLoading, isError, refetch } = usePaymentOut(params.id);
  const { data: business } = useCurrentBusiness();

  if (isLoading) return <LoadingState message="Loading payment voucher..." />;
  if (isError || !payment) return <ErrorState title="Failed to load payment voucher" onRetry={refetch} />;

  const totalAmount = Number(payment.amount || 0);

  const voucherDetails = [
    { label: 'Amount Paid (In Figures)', value: `Rs. ${formatCurrency(totalAmount)}` },
    { label: 'Payment Mode', value: (payment.mode || 'CASH').toUpperCase() },
    ...(payment.account ? [{ label: 'Paid From Account', value: payment.account.accountName }] : []),
    ...(payment.party?.currentBalance !== undefined
      ? [{ label: 'Supplier Balance After Payment', value: `Rs. ${formatCurrency(Number(payment.party.currentBalance))}` }]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Top Bar (Actions & Back) - Hidden on Print */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/transactions/payment-out"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs"
            title="Back to Payment Out"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Payment Voucher
              </h1>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md text-xs">
                {payment.referenceNumber || 'PMT-#'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Issued on {new Date(payment.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print Voucher
        </button>
      </div>

      {/* UNIFIED MONOCHROME PAYMENT VOUCHER PAPER VIEW */}
      <StandardMonochromeDocument
        documentTitle="PAYMENT VOUCHER"
        documentNumberLabel="Voucher No"
        documentNumber={payment.referenceNumber || 'PMT-#'}
        documentDate={payment.date}
        paymentMode={payment.mode}
        business={business}
        partyTitle="Paid To (Supplier / Payee)"
        party={payment.party}
        hideItemsTable={true}
        voucherDetails={voucherDetails}
        grandTotal={totalAmount}
        paidAmount={totalAmount}
        notes={payment.description}
      />
    </div>
  );
}
