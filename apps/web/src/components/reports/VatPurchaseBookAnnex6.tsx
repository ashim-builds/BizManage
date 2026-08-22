'use client';

import { useMemo } from 'react';
import { adToBs } from '@/lib/nepaliDate';
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
      'Date (BS)',
      'Date (AD)',
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
      const bs = adToBs(p.date);
      const ad = new Date(p.date).toISOString().split('T')[0];
      const amount = Number(p.totalAmount || 0);
      const vat = Number(p.taxAmount || 0);
      const isVat = vat > 0;
      const taxable = isVat ? amount - vat : 0;
      const exempt = isVat ? 0 : amount;

      return [
        idx + 1,
        `"${bs.shortNp}"`,
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
    <div className="space-y-6">
      {/* IRD Official Form Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 print:bg-white print:text-black print:border-none print:p-0">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase print:hidden">
                IRD Nepal Format
              </span>
              <h2 className="text-lg font-bold text-white print:text-black">
                अनुसूची-६ (खरिद खाता) / Annex-6: Purchase Book
              </h2>
            </div>
            <p className="text-xs text-slate-400 print:text-gray-700 mt-1">
              (नियम २३ को उपनियम (१) को खण्ड (झ) सँग सम्बन्धित) • Value Added Tax Rules, 2053
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV / Excel
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md"
            >
              <Printer className="w-4 h-4" /> Print Annex-6
            </button>
          </div>
        </div>

        {/* Business Tax Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 print:border-gray-300 print:bg-white">
            <p className="text-[10px] text-slate-500 print:text-gray-600 font-bold uppercase">करदाताको नाम (Taxpayer Name)</p>
            <p className="font-bold text-white print:text-black text-sm mt-0.5">{businessName}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 print:border-gray-300 print:bg-white">
            <p className="text-[10px] text-slate-500 print:text-gray-600 font-bold uppercase">स्थायी लेखा नं (PAN / VAT No.)</p>
            <p className="font-mono font-bold text-purple-400 print:text-black text-sm mt-0.5">{businessPan}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 print:border-gray-300 print:bg-white">
            <p className="text-[10px] text-slate-500 print:text-gray-600 font-bold uppercase">कर अवधि (Tax Period)</p>
            <p className="font-medium text-slate-300 print:text-black text-xs mt-0.5">
              {startDate || 'Start'} to {endDate || 'Present'}
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 print:border-gray-300 print:bg-white">
          <p className="text-[10px] font-bold text-slate-400 uppercase">जम्मा खरिद (Total Purchases)</p>
          <h3 className="text-xl font-bold font-mono text-white print:text-black mt-1">
            Rs. {totals.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 print:border-gray-300 print:bg-white">
          <p className="text-[10px] font-bold text-purple-400 uppercase">करयोग्य खरिद (Taxable Purchases)</p>
          <h3 className="text-xl font-bold font-mono text-purple-400 print:text-black mt-1">
            Rs. {totals.totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 print:border-gray-300 print:bg-white">
          <p className="text-[10px] font-bold text-amber-400 uppercase">खरिद भ्याट (13% VAT Paid)</p>
          <h3 className="text-xl font-bold font-mono text-amber-400 print:text-black mt-1">
            Rs. {totals.totalVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 print:border-gray-300 print:bg-white">
          <p className="text-[10px] font-bold text-slate-400 uppercase">कर छुट खरिद (Tax Exempt)</p>
          <h3 className="text-xl font-bold font-mono text-slate-300 print:text-black mt-1">
            Rs. {totals.totalExempt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* OFFICIAL ANNEX-6 TABLE */}
      <div className="border border-slate-800 print:border-black rounded-2xl overflow-x-auto bg-slate-900 shadow-xl print:bg-white">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-slate-800/80 print:bg-gray-100 text-slate-300 print:text-black font-bold border-b border-slate-800 print:border-black">
            <tr>
              <th className="px-3 py-3 text-center w-10">क्र.सं.</th>
              <th className="px-4 py-3">मिति (Date)</th>
              <th className="px-4 py-3">बीजक नं. (Bill No)</th>
              <th className="px-4 py-3">आपूर्तिकर्ताको नाम (Supplier)</th>
              <th className="px-4 py-3">स्थायी लेखा नं. (PAN)</th>
              <th className="px-4 py-3 text-right">जम्मा खरिद (Total)</th>
              <th className="px-4 py-3 text-right">कर छुट (Exempt)</th>
              <th className="px-4 py-3 text-right">करयोग्य (Taxable)</th>
              <th className="px-4 py-3 text-right text-amber-400 print:text-black">कर (VAT 13%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 print:divide-gray-300 text-slate-300 print:text-black">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-500">
                  No purchase bills recorded for the selected period.
                </td>
              </tr>
            ) : (
              purchases.map((p, idx) => {
                const bs = adToBs(p.date);
                const ad = new Date(p.date).toLocaleDateString();
                const amount = Number(p.totalAmount || 0);
                const vat = Number(p.taxAmount || 0);
                const isVat = vat > 0;
                const taxable = isVat ? amount - vat : 0;
                const exempt = isVat ? 0 : amount;

                return (
                  <tr key={p.id || idx} className="hover:bg-slate-800/30 print:hover:bg-transparent transition-colors">
                    <td className="px-3 py-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className="font-bold text-white print:text-black">{bs.shortNp}</span>
                      <span className="text-[10px] text-slate-500 block">{ad}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-purple-400 print:text-black">
                      {p.billNumber || '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white print:text-black">
                      {p.party?.name || 'Supplier'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 print:text-black">
                      {p.party?.taxNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      Rs. {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {exempt > 0 ? `Rs. ${exempt.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-purple-300 print:text-black">
                      {taxable > 0 ? `Rs. ${taxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-400 print:text-black">
                      {vat > 0 ? `Rs. ${vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-800/90 print:bg-gray-100 font-bold border-t-2 border-slate-700 print:border-black text-white print:text-black">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right uppercase">
                कुल जम्मा (GRAND TOTAL):
              </td>
              <td className="px-4 py-3 text-right font-mono">
                Rs. {totals.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                Rs. {totals.totalExempt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-purple-300 print:text-black">
                Rs. {totals.totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-amber-400 print:text-black">
                Rs. {totals.totalVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
