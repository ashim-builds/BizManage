'use client';

import React from 'react';
import { formatCurrency } from '@/lib/accounting';

export interface BusinessEntity {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  logoUrl?: string | null;
  settings?: {
    taxRegistrationType?: string | null;
    showTaxOnBills?: boolean | null;
    termsAndConditions?: string | null;
    invoicePrefix?: string;
  } | null;
}

export interface PartyEntity {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
}

export interface DocumentItemRow {
  id?: string;
  sn?: number;
  name: string;
  code?: string | null;
  unit?: string | null;
  quantity: number | string;
  unitPrice: number | string;
  discount?: number | string;
  taxAmount?: number | string;
  taxRate?: number | string;
  total: number | string;
}

export interface StandardMonochromeDocumentProps {
  // Document Identity
  documentTitle: string; // e.g., "TAX INVOICE", "PURCHASE BILL", "CREDIT NOTE", "DEBIT NOTE", "PAYMENT RECEIPT", "PAYMENT VOUCHER"
  documentNumberLabel?: string; // default "Invoice No"
  documentNumber: string;
  documentDate: string | Date;
  referenceNumber?: string | null;
  referenceDate?: string | Date | null;
  paymentMode?: string | null;
  paymentStatus?: string | null;

  // Business & Party
  business?: BusinessEntity | null;
  partyTitle?: string; // default "Billed To" or "Received From" or "Party Details"
  party?: PartyEntity | null;

  // Items (Optional for vouchers)
  items?: DocumentItemRow[];
  hideItemsTable?: boolean;

  // Totals & Financials
  subTotal?: number | string;
  discount?: number | string;
  taxableAmount?: number | string;
  taxAmount?: number | string;
  taxLabel?: string; // default "VAT (13%)" or "Tax"
  roundOff?: number | string;
  grandTotal: number | string;
  paidAmount?: number | string;
  dueAmount?: number | string;

  // Custom Content (e.g., payment voucher specific fields)
  voucherDetails?: Array<{ label: string; value: React.ReactNode }>;

  // Notes & Footer
  notes?: string | null;
  customTerms?: string | null;
  signatoryLabel?: string; // default "Authorized Signatory"
}

/**
 * Common Dynamic PAN / VAT Registration Component
 * Adheres strictly to requirements:
 * - NO NUMBER => Omit completely (no blank space or empty label)
 * - PAN + Show ON => "PAN: <number>"
 * - VAT + Show ON => "VAT: <number>"
 * - Show OFF => Omit completely
 */
export function BusinessRegistrationInfo({
  business,
  prefix = '',
  className = '',
}: {
  business?: BusinessEntity | null;
  prefix?: string;
  className?: string;
}) {
  const showTax = business?.settings?.showTaxOnBills !== false;
  const taxNumber = business?.taxNumber?.trim();

  if (!showTax || !taxNumber) {
    return null;
  }

  const taxType = (business?.settings?.taxRegistrationType || 'PAN').toUpperCase();

  return (
    <span className={className}>
      {prefix}
      {taxType}: {taxNumber}
    </span>
  );
}

/**
 * Standard Monochrome Business Document
 * Clean, professional, high-contrast Black & White accounting layout
 */
export function StandardMonochromeDocument({
  documentTitle,
  documentNumberLabel = 'Document No',
  documentNumber,
  documentDate,
  referenceNumber,
  referenceDate,
  paymentMode,
  business,
  partyTitle = 'Billed To',
  party,
  items,
  hideItemsTable = false,
  subTotal,
  discount,
  taxableAmount,
  taxAmount,
  taxLabel = 'Tax / VAT',
  roundOff,
  grandTotal,
  paidAmount,
  dueAmount,
  voucherDetails,
  notes,
  customTerms,
  signatoryLabel = 'Authorized Signatory',
}: StandardMonochromeDocumentProps) {
  const formattedDate = new Date(documentDate).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedRefDate = referenceDate
    ? new Date(referenceDate).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const termsText = customTerms || business?.settings?.termsAndConditions;
  const numGrandTotal = Number(grandTotal || 0);
  const numPaidAmount = paidAmount !== undefined ? Number(paidAmount || 0) : null;
  const numDueAmount = dueAmount !== undefined ? Number(dueAmount || 0) : null;

  return (
    <div className="w-full bg-white text-black p-4 sm:p-8 md:p-10 border border-slate-300 print:border-none print:p-0 print:m-0 font-sans shadow-xs select-text">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* HEADER SECTION: Business Details */}
      <div className="text-center pb-4 space-y-1">
        {business?.logoUrl && (
          <div className="flex justify-center mb-2">
            <img
              src={business.logoUrl}
              alt="Logo"
              className="max-h-16 max-w-48 object-contain filter grayscale contrast-125"
            />
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-black">
          {business?.name || 'BUSINESS NAME'}
        </h1>

        {/* Business Contact Line */}
        <div className="text-xs text-slate-800 flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5">
          {business?.address && <span>{business.address}</span>}
          {business?.phone && (
            <>
              <span className="text-slate-400 font-bold">•</span>
              <span>Tel: {business.phone}</span>
            </>
          )}
          {business?.email && (
            <>
              <span className="text-slate-400 font-bold">•</span>
              <span>Email: {business.email}</span>
            </>
          )}
          {/* Dynamic PAN / VAT */}
          <BusinessRegistrationInfo
            business={business}
            prefix="• "
            className="font-bold text-black"
          />
        </div>
      </div>

      {/* DOCUMENT TITLE BAR (Clean Monochrome Centered Double Rule) */}
      <div className="my-3 border-y-2 border-black py-1 text-center bg-slate-50 print:bg-transparent">
        <h2 className="text-sm sm:text-base font-black tracking-widest uppercase text-black">
          {documentTitle}
        </h2>
      </div>

      {/* META & PARTY INFORMATION GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 p-3 border border-slate-300 text-xs rounded-none">
        {/* Left Column: Party Details */}
        <div className="space-y-1">
          <div className="font-bold uppercase tracking-wider text-[11px] text-slate-700 border-b border-slate-200 pb-1 mb-1">
            {partyTitle}
          </div>
          {party?.name ? (
            <>
              <div className="font-bold text-sm text-black">{party.name}</div>
              {party.address && <div className="text-slate-700">{party.address}</div>}
              {party.phone && <div className="text-slate-700">Phone: {party.phone}</div>}
              {party.taxNumber && (
                <div className="font-mono font-semibold text-black">
                  Party PAN/VAT: {party.taxNumber}
                </div>
              )}
            </>
          ) : (
            <div className="italic text-slate-500">Cash / General Party</div>
          )}
        </div>

        {/* Right Column: Invoice / Voucher Metadata */}
        <div className="space-y-1 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
          <div className="font-bold uppercase tracking-wider text-[11px] text-slate-700 border-b border-slate-200 pb-1 mb-1">
            Document Info
          </div>
          <div className="flex justify-between sm:justify-end gap-3">
            <span className="text-slate-600 font-medium">{documentNumberLabel}:</span>
            <span className="font-mono font-black text-black">{documentNumber}</span>
          </div>
          <div className="flex justify-between sm:justify-end gap-3">
            <span className="text-slate-600 font-medium">Date:</span>
            <span className="font-mono font-bold text-black">{formattedDate}</span>
          </div>
          {referenceNumber && (
            <div className="flex justify-between sm:justify-end gap-3">
              <span className="text-slate-600 font-medium">Ref / Bill No:</span>
              <span className="font-mono text-black">{referenceNumber}</span>
            </div>
          )}
          {formattedRefDate && (
            <div className="flex justify-between sm:justify-end gap-3">
              <span className="text-slate-600 font-medium">Ref Date:</span>
              <span className="font-mono text-black">{formattedRefDate}</span>
            </div>
          )}
          {paymentMode && (
            <div className="flex justify-between sm:justify-end gap-3">
              <span className="text-slate-600 font-medium">Payment Mode:</span>
              <span className="font-semibold uppercase text-black">{paymentMode}</span>
            </div>
          )}
        </div>
      </div>

      {/* VOUCHER SPECIFIC KEY-VALUE DETAILS (If provided and no items table) */}
      {voucherDetails && voucherDetails.length > 0 && (
        <div className="my-4 border border-slate-300 p-4 space-y-2 text-xs">
          {voucherDetails.map((detail, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center py-1.5 border-b border-slate-200 last:border-b-0"
            >
              <span className="font-bold text-slate-700 uppercase text-[11px]">
                {detail.label}
              </span>
              <span className="font-mono font-semibold text-black">{detail.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ITEMS TABLE (Monochrome, High-Contrast, Responsive) */}
      {!hideItemsTable && items && items.length > 0 && (
        <div className="my-4 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse border border-black">
            <thead>
              <tr className="bg-slate-100 border-b border-black text-black font-bold uppercase text-[10.5px]">
                <th className="py-2 px-2 border-r border-black w-10 text-center">S.N.</th>
                <th className="py-2 px-3 border-r border-black">Item Description</th>
                <th className="py-2 px-2 border-r border-black text-right w-16">Qty</th>
                <th className="py-2 px-3 border-r border-black text-right w-24">Rate</th>
                {discount !== undefined && (
                  <th className="py-2 px-2 border-r border-black text-right w-20">Discount</th>
                )}
                {taxAmount !== undefined && (
                  <th className="py-2 px-2 border-r border-black text-right w-20">Tax</th>
                )}
                <th className="py-2 px-3 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, index) => {
                const itemQty = Number(it.quantity || 1);
                const itemRate = Number(it.unitPrice || 0);
                const itemTotal = Number(it.total || 0);
                const itemDiscount = Number(it.discount || 0);
                const itemTax = Number(it.taxAmount || 0);

                return (
                  <tr
                    key={it.id || index}
                    className="border-b border-slate-300 text-black hover:bg-slate-50/50"
                  >
                    <td className="py-2 px-2 border-r border-slate-300 text-center font-mono">
                      {it.sn || index + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 font-medium">
                      <div className="font-bold text-slate-900 break-words">{it.name}</div>
                      {it.code && (
                        <div className="text-[10px] font-mono text-slate-500">
                          SKU: {it.code}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-right font-mono">
                      {itemQty} {it.unit ? <span className="text-[10px] text-slate-600">{it.unit}</span> : ''}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 text-right font-mono">
                      {formatCurrency(itemRate)}
                    </td>
                    {discount !== undefined && (
                      <td className="py-2 px-2 border-r border-slate-300 text-right font-mono">
                        {itemDiscount > 0 ? formatCurrency(itemDiscount) : '-'}
                      </td>
                    )}
                    {taxAmount !== undefined && (
                      <td className="py-2 px-2 border-r border-slate-300 text-right font-mono">
                        {itemTax > 0 ? formatCurrency(itemTax) : '-'}
                      </td>
                    )}
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      {formatCurrency(itemTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SUMMARY TOTALS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 my-4 pt-2">
        {/* Left Side: Notes & In Words */}
        <div className="sm:col-span-7 space-y-3">
          {notes && (
            <div className="p-3 border border-slate-300 text-xs bg-slate-50/50">
              <div className="font-bold text-slate-700 uppercase text-[10px] mb-1">Notes:</div>
              <p className="text-slate-800 whitespace-pre-wrap">{notes}</p>
            </div>
          )}

          {/* Payment Status Summary (Strictly monochrome) */}
          {(numPaidAmount !== null || numDueAmount !== null) && (
            <div className="border border-slate-300 p-3 space-y-1.5 text-xs">
              <div className="font-bold uppercase tracking-wider text-[10px] text-slate-600 border-b border-slate-200 pb-1">
                Payment Summary
              </div>
              {numPaidAmount !== null && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid Amount:</span>
                  <span className="font-mono font-bold text-black">
                    {formatCurrency(numPaidAmount)}
                  </span>
                </div>
              )}
              {numDueAmount !== null && (
                <div className="flex justify-between font-bold">
                  <span className="text-slate-800">Due / Balance:</span>
                  <span className="font-mono text-black">
                    {formatCurrency(numDueAmount)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Totals Calculation Table */}
        <div className="sm:col-span-5 space-y-1.5 text-xs">
          {subTotal !== undefined && (
            <div className="flex justify-between py-1 text-slate-700">
              <span>Sub Total:</span>
              <span className="font-mono font-medium">{formatCurrency(Number(subTotal || 0))}</span>
            </div>
          )}

          {discount !== undefined && Number(discount) > 0 && (
            <div className="flex justify-between py-1 text-slate-700">
              <span>Discount:</span>
              <span className="font-mono font-medium">- {formatCurrency(Number(discount || 0))}</span>
            </div>
          )}

          {taxableAmount !== undefined && Number(taxableAmount) > 0 && (
            <div className="flex justify-between py-1 text-slate-700">
              <span>Taxable Amount:</span>
              <span className="font-mono font-medium">
                {formatCurrency(Number(taxableAmount || 0))}
              </span>
            </div>
          )}

          {taxAmount !== undefined && Number(taxAmount) > 0 && (
            <div className="flex justify-between py-1 text-slate-700">
              <span>{taxLabel}:</span>
              <span className="font-mono font-medium">
                + {formatCurrency(Number(taxAmount || 0))}
              </span>
            </div>
          )}

          {roundOff !== undefined && Number(roundOff) !== 0 && (
            <div className="flex justify-between py-1 text-slate-700">
              <span>Round Off:</span>
              <span className="font-mono font-medium">
                {Number(roundOff) > 0 ? `+ ${formatCurrency(Number(roundOff))}` : formatCurrency(Number(roundOff))}
              </span>
            </div>
          )}

          {/* GRAND TOTAL ROW */}
          <div className="flex justify-between py-2 border-t-2 border-b-2 border-black font-black text-sm text-black my-1">
            <span className="uppercase">Grand Total:</span>
            <span className="font-mono text-base">{formatCurrency(numGrandTotal)}</span>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION: Terms, Thank you note & Authorized Signature */}
      <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end text-xs">
        {/* Left: Terms & Conditions */}
        <div className="space-y-2">
          {termsText ? (
            <div>
              <div className="font-bold uppercase text-[10px] text-slate-700 mb-1">
                Terms & Conditions:
              </div>
              <div className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                {termsText}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-600">
              Thank you for your business.
            </div>
          )}
        </div>

        {/* Right: Signature Line */}
        <div className="text-center sm:text-right pt-8 sm:pt-0">
          <div className="inline-block text-center min-w-44">
            <div className="border-b border-black w-full pb-1 mb-1" />
            <div className="font-bold text-[11px] uppercase tracking-wider text-black">
              {signatoryLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
