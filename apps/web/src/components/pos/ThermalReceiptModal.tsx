'use client';

import { useState, useRef } from 'react';
import { ModalPortal } from '@/components/common/ModalPortal';
import { Printer, X, Receipt, Check, SlidersHorizontal, Calculator } from 'lucide-react';

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

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = new Date(sale.date);
  const dateStr = invoiceDate.toLocaleDateString();
  const timeStr = invoiceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">POS Thermal Receipt View</h3>
                <p className="text-xs text-slate-400">80mm / 58mm Thermal Printer Format</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs shrink-0">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Paper Size</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all ${
                    paperWidth === '80mm'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  80mm (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all ${
                    paperWidth === '58mm'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  58mm (Compact)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-blue-400" /> Cash Tendered (Rs.)
              </label>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <span className="text-[11px]">Include return policy footer</span>
              </label>
            </div>
          </div>

          {/* THERMAL PAPER CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950/70 rounded-2xl flex justify-center border border-slate-800">
            <div
              id="thermal-receipt-printable"
              ref={printAreaRef}
              style={{
                width: paperWidth === '80mm' ? '320px' : '230px',
              }}
              className="bg-white text-black p-4 font-mono shadow-2xl border border-dashed border-slate-300 rounded-sm text-[11px] leading-tight select-all selection:bg-slate-200"
            >
              {/* Business Header */}
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-black">
                <p className="text-base font-black tracking-tight uppercase leading-none">
                  {business.name || 'BizManage Retail'}
                </p>
                {business.address && (
                  <p className="text-[10px] text-gray-700 leading-tight">{business.address}</p>
                )}
                {business.phone && (
                  <p className="text-[10px] text-gray-700">Phone: {business.phone}</p>
                )}
                {business.taxNumber && (
                  <p className="text-[10px] font-bold">PAN/VAT: {business.taxNumber}</p>
                )}
                <p className="text-[10px] font-bold uppercase mt-1">
                  {sale.isVatBill ? '** TAX INVOICE **' : '** SALES RECEIPT **'}
                </p>
              </div>

              {/* Invoice Meta */}
              <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No: <b>{sale.invoiceNumber}</b></span>
                  <span>{timeStr}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date: {dateStr}</span>
                  <span className="uppercase">{sale.paymentMode || 'CASH'}</span>
                </div>
                <div className="pt-0.5">
                  <span>Customer: <b>{sale.party?.name || 'Walk-in Customer'}</b></span>
                  {sale.party?.phone && <span className="block text-[9px]">Ph: {sale.party.phone}</span>}
                  {sale.party?.taxNumber && <span className="block text-[9px]">PAN: {sale.party.taxNumber}</span>}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-2 border-b border-dashed border-black">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="pb-1 font-bold">Item</th>
                      <th className="pb-1 text-center font-bold">Qty</th>
                      <th className="pb-1 text-right font-bold">Rate</th>
                      <th className="pb-1 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(sale.items || []).map((line, idx) => {
                      const qty = Number(line.quantity || 1);
                      const rate = Number(line.unitPrice || 0);
                      const lineTotal = Number(line.total || qty * rate);
                      return (
                        <tr key={idx} className="py-0.5">
                          <td className="py-1 font-medium pr-1">
                            {line.item?.name || 'Item'}
                          </td>
                          <td className="py-1 text-center font-bold">
                            {qty}
                          </td>
                          <td className="py-1 text-right">
                            {rate.toLocaleString()}
                          </td>
                          <td className="py-1 text-right font-bold">
                            {lineTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Calculations & Totals */}
              <div className="py-2 border-b border-dashed border-black text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {Number(sale.subTotal || totalAmount).toLocaleString()}</span>
                </div>
                {Number(sale.discount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-Rs. {Number(sale.discount).toLocaleString()}</span>
                  </div>
                )}
                {Number(sale.taxAmount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>VAT (13%):</span>
                    <span>Rs. {Number(sale.taxAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs border-t border-black pt-1">
                  <span>GRAND TOTAL:</span>
                  <span>Rs. {totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] pt-0.5">
                  <span>Paid Amount:</span>
                  <span>Rs. {paidAmount.toLocaleString()}</span>
                </div>
                {Number(sale.dueAmount || 0) > 0 && (
                  <div className="flex justify-between font-bold text-red-600">
                    <span>Balance Due:</span>
                    <span>Rs. {Number(sale.dueAmount).toLocaleString()}</span>
                  </div>
                )}

                {tenderedNum > 0 && (
                  <div className="border-t border-dotted border-black pt-1 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Cash Tendered:</span>
                      <span>Rs. {tenderedNum.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Change Return:</span>
                      <span>Rs. {changeDue.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-3 text-[9px] space-y-1">
                <p className="font-bold">*** धन्यवाद ! THANK YOU ! ***</p>
                <p>Please visit again!</p>
                {showFooterNotes && (
                  <p className="text-[8px] text-gray-600 mt-1">
                    Goods sold can be exchanged within 7 days on presenting this receipt.
                  </p>
                )}
                <p className="text-[8px] text-gray-500 pt-1">
                  {sale.invoiceNumber} • {dateStr}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
            <span className="text-xs text-slate-400">
              Width selected: <strong className="text-white">{paperWidth}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
              >
                <Printer className="w-4 h-4" /> Print Thermal Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded print styles for thermal receipt print */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-printable,
          #thermal-receipt-printable * {
            visibility: visible;
          }
          #thermal-receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperWidth === '80mm' ? '80mm' : '58mm'} !important;
            margin: 0 !important;
            padding: 4mm !important;
            border: none !important;
            box-shadow: none !important;
            font-size: ${paperWidth === '80mm' ? '11px' : '9px'} !important;
          }
        }
      `}</style>
    </ModalPortal>
  );
}
