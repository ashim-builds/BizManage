'use client';

import { useSaleReturn } from '@/services/saleService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StandardMonochromeDocument } from '@/components/invoice/StandardMonochromeDocument';
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
  const taxableAmount = totalTax > 0 ? Math.max(0, subTotal - totalDiscount) : undefined;

  const documentItems = (saleReturn.items || []).map((it: any, index: number) => ({
    id: it.id,
    sn: index + 1,
    name: it.item?.name || 'Item',
    code: it.item?.code,
    unit: it.item?.unit || 'Pcs',
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.unitPrice || 0),
    discount: Number(it.discount || 0),
    taxAmount: totalTax > 0 ? Number(it.taxAmount || 0) : undefined,
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
            href="/transactions/sales-return"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs"
            title="Back to Sales Return"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Sales Return / Credit Note
              </h1>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md text-xs">
                {saleReturn.returnNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Issued on {new Date(saleReturn.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print Credit Note
        </button>
      </div>

      {/* UNIFIED MONOCHROME CREDIT NOTE PAPER VIEW */}
      <StandardMonochromeDocument
        documentTitle="CREDIT NOTE / SALES RETURN"
        documentNumberLabel="Credit Note No"
        documentNumber={saleReturn.returnNumber}
        documentDate={saleReturn.date}
        referenceNumber={saleReturn.sale?.invoiceNumber || (saleReturn as any).originalInvoiceNumber}
        referenceDate={saleReturn.sale?.date}
        business={business}
        partyTitle="Customer Details"
        party={saleReturn.party}
        items={documentItems}
        subTotal={subTotal}
        discount={totalDiscount > 0 ? totalDiscount : undefined}
        taxableAmount={taxableAmount}
        taxAmount={totalTax > 0 ? totalTax : undefined}
        taxLabel="VAT (13%)"
        grandTotal={totalAmount}
        notes={saleReturn.notes}
      />
    </div>
  );
}
