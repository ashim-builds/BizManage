'use client';

import { useState, useRef } from 'react';
import { ModalPortal } from '@/components/common/ModalPortal';
import { Printer, X, Receipt, Calculator, CheckCircle2, QrCode } from 'lucide-react';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: {
    name?: string;
    address?: string | null;
    phone?: string | null;
    taxNumber?: string | null;
    logoUrl?: string | null;
  };
  sale: {
    invoiceNumber: string;
    date: string | Date;
    isVatBill?: boolean;
    status?: string;
    paymentMode?: string;
    subTotal?: number | string;
    discount?: number | string;
    taxAmount?: number | string;
    totalAmount: number | string;
    paidAmount?: number | string;
    dueAmount?: number | string;
    party?: {
      name?: string;
      phone?: string | null;
      taxNumber?: string | null;
    } | null;
    items?: Array<{
      id?: string;
      quantity: number | string;
      unitPrice: number | string;
      discount?: number | string;
      total: number | string;
      item?: {
        name?: string;
        code?: string | null;
        unit?: string | null;
      };
    }>;
  };
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  business,
  sale,
}: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [showFooterNotes, setShowFooterNotes] = useState(true);

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const totalAmount = Number(sale.totalAmount || 0);
  const paidAmount = Number(sale.paidAmount || totalAmount);
  const tenderedNum = Number(cashTendered) || 0;
  const changeDue = tenderedNum > totalAmount ? tenderedNum - totalAmount : 0;

  const totalLineItems = (sale.items || []).length;
  const totalUnits = (sale.items || []).reduce((acc, i) => acc + Number(i.quantity || 1), 0);

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = new Date(sale.date);
  const dateStr = invoiceDate.toLocaleDateString();
  const timeStr = invoiceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    sale.invoiceNumber || 'POS-INV'
  )}`;

  return (
    <ModalPortal>
      <style>{`
        @page {
          size: ${paperWidth === '80mm' ? '80mm auto' : '58mm auto'};
          margin: 0mm;
        }
        @media print {
          html, body {
            width: ${paperWidth === '80mm' ? '80mm' : '58mm'} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-printable, #thermal-receipt-printable * {
            visibility: visible !important;
          }
          #thermal-receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '80mm' ? '78mm' : '56mm'} !important;
            margin: 0 !important;
            padding: 3mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto font-sans">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-inner">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  POS Thermal Receipt View
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/25">
                    VERIFIED
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">Invoice #{sale.invoiceNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs shrink-0">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Paper Roll Size</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-xs ${
                    paperWidth === '80mm'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  80mm Standard
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-xs ${
                    paperWidth === '58mm'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  58mm Mini
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-blue-400" /> Cash Tendered (Rs.)
              </label>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder={`e.g. ${totalAmount}`}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none py-1.5">
                <input
                  type="checkbox"
                  checked={showFooterNotes}
                  onChange={(e) => setShowFooterNotes(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-800"
                />
                <span className="text-[11px] font-medium">Include return policy footer</span>
              </label>
            </div>
          </div>

          {/* THERMAL PAPER CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/95 rounded-2xl flex justify-center items-start border border-slate-800 shadow-inner max-h-[520px] min-h-[320px]">
            <div
              id="thermal-receipt-printable"
              ref={printAreaRef}
              className={`bg-white text-slate-950 p-4 sm:p-5 font-mono shadow-2xl border border-slate-300 rounded-md text-[11px] leading-tight space-y-3 transition-all w-full h-fit min-h-max shrink-0 select-text ${
                paperWidth === '80mm' ? 'max-w-[320px]' : 'max-w-[250px]'
              }`}
            >
              {/* Business Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2.5">
                <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
                  {business.name || 'BizManage Store'}
                </h2>
                {business.address && (
                  <p className="text-[10px] text-slate-700 leading-tight">{business.address}</p>
                )}
                {business.phone && (
                  <p className="text-[10px] text-slate-700">Tel: {business.phone}</p>
                )}
                {business.taxNumber && (
                  <p className="text-[10px] text-slate-700 font-bold">PAN/VAT: {business.taxNumber}</p>
                )}
                <p className="text-[9px] text-slate-500 pt-0.5 font-bold uppercase">
                  {sale.isVatBill ? 'RETAIL TAX INVOICE' : 'SALES RECEIPT'}
                </p>
              </div>

              {/* Invoice Meta */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Bill No: {sale.invoiceNumber}</span>
                  <span className="px-1 bg-slate-100 rounded border border-slate-300 text-[9px]">{sale.paymentMode || 'CASH'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Date: {dateStr}</span>
                  <span>{timeStr}</span>
                </div>
                <div className="pt-0.5 text-slate-700">
                  <span>Customer: <strong className="text-slate-900">{sale.party?.name || 'Walk-in Customer'}</strong></span>
                  {sale.party?.phone && <span className="block text-[9px]">Ph: {sale.party.phone}</span>}
                  {sale.party?.taxNumber && <span className="block text-[9px]">PAN: {sale.party.taxNumber}</span>}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-1 border-b border-dashed border-slate-400">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-400 text-slate-800">
                      <th className="pb-1 font-bold">Item Description</th>
                      <th className="pb-1 text-center font-bold">Qty</th>
                      <th className="pb-1 text-right font-bold">Rate</th>
                      <th className="pb-1 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(sale.items || []).map((line, idx) => {
                      const qty = Number(line.quantity || 1);
                      const rate = Number(line.unitPrice || 0);
                      const disc = Number(line.discount || 0);
                      const rawTotal = line.total !== undefined && line.total !== null && Number(line.total) > 0 
                        ? Number(line.total) 
                        : Math.max(0, qty * rate - disc);
                      return (
                        <tr key={idx}>
                          <td className="py-1.5 font-bold text-slate-900 pr-1">
                            {line.item?.name || 'Item'}
                            {disc > 0 && (
                              <span className="block text-[8px] text-rose-600 font-medium">
                                Disc: -Rs. {disc.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-center font-bold align-top">
                            {qty}
                          </td>
                          <td className="py-1.5 text-right font-mono align-top">
                            {rate.toLocaleString()}
                          </td>
                          <td className="py-1.5 text-right font-mono font-bold align-top">
                            Rs. {rawTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Item Summary Line */}
              <div className="border-b border-slate-300 py-1 text-[9px] font-bold text-slate-700 flex justify-between">
                <span>Items: {totalLineItems}</span>
                <span>Total Qty: {totalUnits} Pcs</span>
              </div>

              {/* Calculations & Totals */}
              <div className="py-1 text-[10px] space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal:</span>
                  <span>Rs. {Number(sale.subTotal || totalAmount).toLocaleString()}</span>
                </div>
                {Number(sale.discount || 0) > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Discount:</span>
                    <span>-Rs. {Number(sale.discount).toLocaleString()}</span>
                  </div>
                )}
                {Number(sale.taxAmount || 0) > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>VAT (13%):</span>
                    <span>Rs. {Number(sale.taxAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs border-t border-b border-slate-300 py-1">
                  <span>GRAND TOTAL:</span>
                  <span>Rs. {totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-700 text-[10px]">
                  <span>Paid Amount:</span>
                  <span>Rs. {paidAmount.toLocaleString()}</span>
                </div>
                {Number(sale.dueAmount || 0) > 0 && (
                  <div className="flex justify-between font-extrabold text-rose-700">
                    <span>Balance Due:</span>
                    <span>Rs. {Number(sale.dueAmount).toLocaleString()}</span>
                  </div>
                )}

                {tenderedNum > 0 && (
                  <div className="border-t border-dashed border-slate-400 pt-1 space-y-0.5">
                    <div className="flex justify-between text-slate-700">
                      <span>Cash Tendered:</span>
                      <span>Rs. {tenderedNum.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-emerald-900">
                      <span>Change Return:</span>
                      <span>Rs. {changeDue.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer QR & Barcode */}
              <div className="text-center pt-2 border-t border-dashed border-slate-400 space-y-2 text-[9px] text-slate-700">
                <div className="space-y-1">
                  <img src={qrCodeUrl} alt="Invoice Verification QR" className="w-20 h-20 mx-auto object-contain p-1 bg-white border border-slate-300 rounded" />
                  <p className="text-[8px] font-mono text-slate-500">Scan QR to verify invoice</p>
                </div>

                {/* Simulated Barcode */}
                <div className="py-1 space-y-0.5">
                  <div className="h-6 w-3/4 mx-auto bg-[repeating-linear-gradient(90deg,#000_0px,#000_2px,#fff_2px,#fff_4px,#000_4px,#000_7px,#fff_7px,#fff_8px)] opacity-85" />
                  <p className="font-mono text-[9px] text-slate-800 tracking-wider">*{sale.invoiceNumber}*</p>
                </div>

                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 uppercase">*** THANK YOU FOR SHOPPING ***</p>
                  {showFooterNotes && (
                    <p className="text-[8px] text-slate-600">Goods sold can be exchanged within 7 days with bill.</p>
                  )}
                  <p className="text-[8px] text-slate-500 font-mono pt-0.5">Powered by BizManage POS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
            <span className="text-xs text-slate-400">
              Selected Width: <strong className="text-white">{paperWidth}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" /> Print Thermal Receipt ({paperWidth})
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
