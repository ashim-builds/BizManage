'use client';

import { useState } from 'react';
import { useSale } from '@/services/saleService';
import { useCurrentBusiness } from '@/services/businessService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { ThermalReceiptModal } from '@/components/pos/ThermalReceiptModal';
import { StandardMonochromeDocument } from '@/components/invoice/StandardMonochromeDocument';
import {
  Printer,
  ArrowLeft,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';

export default function SaleInvoiceDetailsPage({ params }: { params: { id: string } }) {
  const { data: sale, isLoading, isError, refetch } = useSale(params.id);
  const { data: business } = useCurrentBusiness();

  const [isThermalOpen, setIsThermalOpen] = useState(false);

  if (isLoading) return <LoadingState message="Loading sales invoice document..." />;
  if (isError || !sale) return <ErrorState title="Failed to load sales invoice" onRetry={refetch} />;

  const subTotal = Number(sale.subTotal || 0);
  const totalTax = Number(sale.taxAmount || 0);
  const totalDiscount = Number(sale.discount || 0);
  const totalAmount = Number(sale.totalAmount || 0);
  const paidAmount = Number(sale.paidAmount || 0);
  const dueAmount = Number(sale.dueAmount || 0);
  const taxableAmount = sale.isVatBill && totalTax > 0 ? Math.max(0, subTotal - totalDiscount) : undefined;

  const documentItems = (sale.items || []).map((it: any, index: number) => ({
    id: it.id,
    sn: index + 1,
    name: it.item?.name || 'Item',
    code: it.item?.code,
    unit: it.item?.unit || 'Pcs',
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.unitPrice || 0),
    discount: Number(it.discount || 0),
    taxAmount: sale.isVatBill ? Number(it.taxAmount || 0) : undefined,
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
            href="/transactions/sales"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs"
            title="Back to Sales"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {sale.isVatBill ? 'Sales Tax Invoice' : 'Sales Invoice'}
              </h1>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md text-xs">
                {sale.invoiceNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Issued on {new Date(sale.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsThermalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <Receipt className="w-4 h-4 text-slate-700" /> Thermal POS
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* UNIFIED MONOCHROME INVOICE PAPER VIEW */}
      <StandardMonochromeDocument
        documentTitle={sale.isVatBill ? 'TAX INVOICE' : 'INVOICE'}
        documentNumberLabel="Invoice No"
        documentNumber={sale.invoiceNumber}
        documentDate={sale.date}
        paymentMode={sale.paymentMode || 'CASH'}
        paymentStatus={sale.status}
        business={business}
        partyTitle="Billed To (Customer)"
        party={sale.party}
        items={documentItems}
        subTotal={subTotal}
        discount={totalDiscount > 0 ? totalDiscount : undefined}
        taxableAmount={taxableAmount}
        taxAmount={sale.isVatBill && totalTax > 0 ? totalTax : undefined}
        taxLabel="VAT (13%)"
        grandTotal={totalAmount}
        paidAmount={paidAmount}
        dueAmount={dueAmount}
        notes={sale.notes}
      />

      {/* MODALS */}
      {isThermalOpen && (
        <ThermalReceiptModal
          isOpen={isThermalOpen}
          onClose={() => setIsThermalOpen(false)}
          sale={sale}
          business={business as any}
        />
      )}
    </div>
  );
}
