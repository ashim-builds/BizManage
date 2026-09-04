'use client';

import { usePurchase } from '@/services/purchaseService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StandardMonochromeDocument } from '@/components/invoice/StandardMonochromeDocument';
import {
  Printer,
  ArrowLeft,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
  const taxableAmount = purchase.isVatBill && totalTax > 0 ? Math.max(0, subTotal - totalDiscount) : undefined;

  const documentItems = (purchase.items || []).map((it: any, index: number) => ({
    id: it.id,
    sn: index + 1,
    name: it.item?.name || 'Item',
    code: it.item?.code,
    unit: it.item?.unit || 'Pcs',
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.unitPrice || 0),
    discount: Number(it.discount || 0),
    taxAmount: purchase.isVatBill ? Number(it.taxAmount || 0) : undefined,
    total: it.total !== undefined && it.total !== null && Number(it.total) > 0
      ? Number(it.total)
      : Math.max(0, Number(it.quantity || 1) * Number(it.unitPrice || 0) - Number(it.discount || 0)),
  }));

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
              <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md text-xs">
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-slate-700" /> Thermal Receipt
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* UNIFIED MONOCHROME BILL PAPER VIEW */}
      <StandardMonochromeDocument
        documentTitle={purchase.isVatBill ? 'PURCHASE TAX INVOICE' : 'PURCHASE BILL'}
        documentNumberLabel="Bill No"
        documentNumber={purchase.billNumber}
        documentDate={purchase.date}
        paymentMode={purchase.paymentMode || 'CASH'}
        paymentStatus={purchase.status}
        business={business}
        partyTitle="Supplier Details"
        party={purchase.party}
        items={documentItems}
        subTotal={subTotal}
        discount={totalDiscount > 0 ? totalDiscount : undefined}
        taxableAmount={taxableAmount}
        taxAmount={purchase.isVatBill && totalTax > 0 ? totalTax : undefined}
        taxLabel="VAT (13%)"
        grandTotal={totalAmount}
        paidAmount={paidAmount}
        dueAmount={dueAmount}
        notes={purchase.notes}
      />

      {/* MODALS */}
      {isThermalOpen && (
        <ThermalReceiptModal
          isOpen={isThermalOpen}
          onClose={() => setIsThermalOpen(false)}
          sale={{
            invoiceNumber: purchase.billNumber,
            date: purchase.date,
            isVatBill: purchase.isVatBill,
            status: purchase.status,
            paymentMode: purchase.paymentMode,
            subTotal: purchase.subTotal,
            discount: purchase.discount,
            taxAmount: purchase.taxAmount,
            totalAmount: purchase.totalAmount,
            paidAmount: purchase.paidAmount,
            dueAmount: purchase.dueAmount,
            party: purchase.party,
            items: purchase.items,
          }}
          business={business as any}
        />
      )}
    </div>
  );
}
