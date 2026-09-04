'use client';

import { useState } from 'react';
import { usePaymentIn } from '@/services/paymentService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { WhatsAppShareModal } from '@/components/common/WhatsAppShareModal';
import { generatePaymentReceiptWhatsAppMessage } from '@/lib/whatsapp';
import { StandardMonochromeDocument } from '@/components/invoice/StandardMonochromeDocument';
import { formatCurrency } from '@/lib/accounting';
import {
  Printer,
  ArrowLeft,
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

  const voucherDetails = [
    { label: 'Amount Received (In Figures)', value: `Rs. ${formatCurrency(totalAmount)}` },
    { label: 'Payment Mode', value: (payment.mode || 'CASH').toUpperCase() },
    ...(payment.account ? [{ label: 'Deposited Account', value: payment.account.accountName }] : []),
    ...(payment.party?.currentBalance !== undefined
      ? [{ label: 'Customer Balance After Receipt', value: `Rs. ${formatCurrency(Number(payment.party.currentBalance))}` }]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Top Bar (Actions & Back) - Hidden on Print */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/transactions/payment-in"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs"
            title="Back to Payment Receipts"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Payment Receipt Voucher
              </h1>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md text-xs">
                {payment.referenceNumber || 'RCV-#'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Issued on {new Date(payment.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" /> Share WhatsApp
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>

      {/* UNIFIED MONOCHROME RECEIPT VOUCHER PAPER VIEW */}
      <StandardMonochromeDocument
        documentTitle="PAYMENT RECEIPT VOUCHER"
        documentNumberLabel="Receipt No"
        documentNumber={payment.referenceNumber || 'RCV-#'}
        documentDate={payment.date}
        paymentMode={payment.mode}
        business={business}
        partyTitle="Received From (Customer)"
        party={payment.party}
        hideItemsTable={true}
        voucherDetails={voucherDetails}
        grandTotal={totalAmount}
        paidAmount={totalAmount}
        notes={payment.description}
      />

      {/* MODALS */}
      {isWhatsAppOpen && (
        <WhatsAppShareModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          phoneNumber={payment.party?.phone || ''}
          defaultMessage={formattedWhatsAppMsg}
        />
      )}
    </div>
  );
}
