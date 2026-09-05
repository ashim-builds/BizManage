'use client';

import { useMemo } from 'react';
import { Download, Printer, FileSpreadsheet } from 'lucide-react';

interface VatPurchaseBookAnnex6Props {
  purchases: any[];
  startDate?: string;
  endDate?: string;
  businessName?: string;
  businessPan?: string;
}

export function VatPurchaseBookAnnex6({
  purchases = [],
  startDate,
  endDate,
  businessName = 'My Business',
  businessPan = '-',
}: VatPurchaseBookAnnex6Props) {
  // Aggregate calculations
  const totals = useMemo(() => {
    let totalPurchases = 0;
    let totalTaxable = 0;
    let totalVat = 0;
    let totalExempt = 0;

    purchases.forEach((p) => {
      const amount = Number(p.totalAmount || 0);
      const vat = Number(p.taxAmount || 0);
      const isVat = vat > 0;
      
      totalPurchases += amount;
      if (isVat) {
        const taxable = amount - vat;
        totalTaxable += taxable;
        totalVat += vat;
      } else {
        totalExempt += amount;
      }
    });

    return {
      totalPurchases,
      totalTaxable,
      totalVat,
      totalExempt,
    };
  }, [purchases]);

  const exportCsv = () => {
    const headers = [
      'S.N.',
      'Date',
      'Bill No',
      'Supplier Name',
      'Supplier PAN',
      'Total Purchase (Rs.)',
      'Tax Exempt Purchase (Rs.)',
      'Taxable Purchase (Rs.)',
      'VAT 13% Paid (Rs.)',
      'Capital Assets Purchase (Rs.)',
    ];

    const rows = purchases.map((p, idx) => {
      const ad = new Date(p.date).toISOString().split('T')[0];
      const amount = Number(p.totalAmount || 0);
      const vat = Number(p.taxAmount || 0);
      const isVat = vat > 0;
      const taxable = isVat ? amount - vat : 0;
      const exempt = isVat ? 0 : amount;

      return [
        idx + 1,
        `"${ad}"`,
        `"${p.billNumber || ''}"`,
        `"${p.party?.name || 'Supplier'}"`,
        `"${p.party?.taxNumber || '-'}"`,
        amount.toFixed(2),
        exempt.toFixed(2),
        taxable.toFixed(2),
        vat.toFixed(2),
        '0.00',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `VAT_Purchase_Book_Annex6_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* IRD Official Form Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 print:border-none print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold uppercase print:hidden">
                IRD Nepal Format
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 print:text-black">
                अनुसूची-६ (खरिद खाता) / Annex-6: Purchase Book
              </h2>
            </div>
            <p className="text-xs text-slate-500 print:text-gray-700 mt-1">
              (नियम २३ को उपनियम (१) को खण्ड (झ) सँग सम्बन्धित) • Value Added Tax Rules, 2053
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-all cursor-pointer min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV / Excel
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer min-h-[36px]"
            >
              <Printer className="w-3.5 h-3.5" /> Print Annex-6
            </button>
          </div>
        </div>

        {/* Business Tax Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-white">
            <p className="text-[10px] text-slate-500 font-bold uppercase">करदाताको नाम (Taxpayer Name)</p>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{businessName}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-white">
            <p className="text-[10px] text-slate-500 font-bold uppercase">स्थायी लेखा नं (PAN / VAT No.)</p>
            <p className="font-mono font-bold text-purple-600 text-sm mt-0.5">{businessPan}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-white">
            <p className="text-[10px] text-slate-500 font-bold uppercase">कर अवधि (Tax Period)</p>
            <p className="font-medium text-slate-700 text-xs mt-0.5">
              {startDate || 'Start'} to {endDate || 'Present'}
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY KPI CARDS - Compact 2-Column Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 print:grid-cols-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase truncate">जम्मा खरिद (Total)</p>
          <h3 className="text-base sm:text-xl font-bold font-mono text-slate-900 mt-0.5 truncate">
            Rs. {totals.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h3>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-bold text-purple-600 uppercase truncate">करयोग्य (Taxable)</p>
          <h3 className="text-base sm:text-xl font-bold font-mono text-purple-600 mt-0.5 truncate">
            Rs. {totals.totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h3>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase truncate">भ्याट (13% VAT)</p>
          <h3 className="text-base sm:text-xl font-bold font-mono text-amber-600 mt-0.5 truncate">
            Rs. {totals.totalVat.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h3>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase truncate">कर छुट (Exempt)</p>
          <h3 className="text-base sm:text-xl font-bold font-mono text-slate-700 mt-0.5 truncate">
            Rs. {totals.totalExempt.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h3>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (< md) */}
      <div className="grid gap-2.5 md:hidden">
        {purchases.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No purchase records found for the selected period.
          </div>
        ) : (
          purchases.map((p, idx) => {
            const amount = Number(p.totalAmount || 0);
            const vat = Number(p.taxAmount || 0);
            const isVat = vat > 0;
            const taxable = isVat ? amount - vat : 0;

            return (
              <div key={p.id || idx} className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-mono font-bold text-purple-600 text-xs">{p.billNumber || 'PUR'}</span>
                    <strong className="block text-slate-900 font-semibold">{p.party?.name || 'Vendor'}</strong>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(p.date).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total:</span>
                    <strong className="font-mono text-slate-900">Rs. {amount.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-600 block">Taxable:</span>
                    <strong className="font-mono text-purple-600">Rs. {taxable.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 block">VAT 13%:</span>
                    <strong className="font-mono text-amber-600">Rs. {vat.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP OFFICIAL ANNEX-6 TABLE (>= md) */}
      <div className="hidden md:block border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-xs print:border-black">
        <table className="w-full text-left text-xs min-w-[850px]">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 print:border-black">
            <tr>
              <th className="px-3 py-3 text-center w-10">क्र.सं.</th>
              <th className="px-4 py-3">मिति (Date)</th>
              <th className="px-4 py-3">बीजक नं. (Bill No)</th>
              <th className="px-4 py-3">आपूर्तिकर्ताको नाम (Supplier)</th>
              <th className="px-4 py-3">स्थायी लेखा नं. (PAN)</th>
              <th className="px-4 py-3 text-right">जम्मा खरिद (Total)</th>
              <th className="px-4 py-3 text-right">कर छुट (Exempt)</th>
              <th className="px-4 py-3 text-right">करयोग्य (Taxable)</th>
              <th className="px-4 py-3 text-right text-amber-700">कर (VAT 13%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-400">
                  No purchase bills recorded for the selected period.
                </td>
              </tr>
            ) : (
              purchases.map((p, idx) => {
                const ad = new Date(p.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                const amount = Number(p.totalAmount || 0);
                const vat = Number(p.taxAmount || 0);
                const isVat = vat > 0;
                const taxable = isVat ? amount - vat : 0;
                const exempt = isVat ? 0 : amount;

                return (
                  <tr key={p.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      {ad}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-purple-600">
                      {p.billNumber || '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {p.party?.name || 'Supplier'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {p.party?.taxNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      Rs. {amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      {exempt > 0 ? `Rs. ${exempt.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-purple-600">
                      {taxable > 0 ? `Rs. ${taxable.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
                      {vat > 0 ? `Rs. ${vat.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right uppercase">
                कुल जम्मा (GRAND TOTAL):
              </td>
              <td className="px-4 py-3 text-right font-mono">
                Rs. {totals.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                Rs. {totals.totalExempt.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-purple-600">
                Rs. {totals.totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-amber-600">
                Rs. {totals.totalVat.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
