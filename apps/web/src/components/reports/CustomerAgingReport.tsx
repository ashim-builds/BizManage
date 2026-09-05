'use client';

import { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  Download,
  Printer,
  Search,
  CheckCircle2,
  Users,
} from 'lucide-react';
import Link from 'next/link';

interface CustomerAgingReportProps {
  partyBalances: any[];
  businessName?: string;
  businessPhone?: string;
}

export function CustomerAgingReport({
  partyBalances = [],
  businessName = 'My Business',
  businessPhone = '',
}: CustomerAgingReportProps) {
  const [search, setSearch] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<'all' | '0-30' | '31-60' | '61-90' | '90+'>('all');

  // Compute aging data per party
  const agingData = useMemo(() => {
    const now = new Date().getTime();

    return partyBalances
      .filter((p) => {
        const bal = Number(p.currentBalance || p.balance || 0);
        return bal > 0; // Only debtors (receivable from customer)
      })
      .map((p) => {
        const bal = Number(p.currentBalance || p.balance || 0);
        const createdAt = p.updatedAt || p.createdAt ? new Date(p.updatedAt || p.createdAt).getTime() : now;
        const daysOld = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));

        let bucket: '0-30' | '31-60' | '61-90' | '90+' = '0-30';
        if (daysOld > 90) bucket = '90+';
        else if (daysOld > 60) bucket = '61-90';
        else if (daysOld > 30) bucket = '31-60';

        return {
          id: p.id,
          name: p.name,
          phone: p.phone,
          taxNumber: p.taxNumber,
          currentBalance: bal,
          daysOld,
          bucket,
          b0_30: bucket === '0-30' ? bal : 0,
          b31_60: bucket === '31-60' ? bal : 0,
          b61_90: bucket === '61-90' ? bal : 0,
          b90_plus: bucket === '90+' ? bal : 0,
          lastActivity: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Recent',
        };
      });
  }, [partyBalances]);

  // Summary totals
  const totals = useMemo(() => {
    let totalOutstanding = 0;
    let b0_30 = 0;
    let b31_60 = 0;
    let b61_90 = 0;
    let b90_plus = 0;

    agingData.forEach((row) => {
      totalOutstanding += row.currentBalance;
      b0_30 += row.b0_30;
      b31_60 += row.b31_60;
      b61_90 += row.b61_90;
      b90_plus += row.b90_plus;
    });

    return {
      totalOutstanding,
      b0_30,
      b31_60,
      b61_90,
      b90_plus,
      debtorsCount: agingData.length,
    };
  }, [agingData]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return agingData.filter((row) => {
      const matchSearch =
        search === '' ||
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        (row.phone && row.phone.includes(search));

      const matchBucket =
        selectedBucket === 'all' || row.bucket === selectedBucket;

      return matchSearch && matchBucket;
    });
  }, [agingData, search, selectedBucket]);

  const exportCsv = () => {
    const headers = [
      'S.N.',
      'Customer Name',
      'Phone',
      'PAN / VAT',
      'Total Due (Rs.)',
      '0-30 Days (Current)',
      '31-60 Days Overdue',
      '61-90 Days Overdue',
      '90+ Days High Risk',
      'Days Overdue',
      'Last Transaction Date',
    ];

    const rows = filteredRows.map((r, idx) => [
      idx + 1,
      `"${r.name}"`,
      `"${r.phone || '-'}"`,
      `"${r.taxNumber || '-'}"`,
      r.currentBalance.toFixed(2),
      r.b0_30.toFixed(2),
      r.b31_60.toFixed(2),
      r.b61_90.toFixed(2),
      r.b90_plus.toFixed(2),
      r.daysOld,
      `"${r.lastActivity}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Customer_Receivables_Aging_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3 print:hidden">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> Accounts Receivable Aging Analysis (उधारो विश्लेषण)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Segment outstanding customer balances by overdue duration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-all cursor-pointer min-h-[36px]"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer min-h-[36px]"
          >
            <Printer className="w-3.5 h-3.5" /> Print Aging Report
          </button>
        </div>
      </div>

      {/* AGING SUMMARY METRIC CARDS - Compact Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-0.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase truncate">Total Receivables</p>
          <h3 className="text-base sm:text-lg font-bold font-mono text-slate-900 truncate">
            Rs. {totals.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] text-slate-400">{totals.debtorsCount} Debtors</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-0.5">
          <p className="text-[10px] font-bold text-emerald-600 uppercase truncate">0 – 30 Days (Current)</p>
          <h3 className="text-base sm:text-lg font-bold font-mono text-emerald-600 truncate">
            Rs. {totals.b0_30.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] text-slate-400">Regular credit</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-0.5">
          <p className="text-[10px] font-bold text-blue-600 uppercase truncate">31 – 60 Days</p>
          <h3 className="text-base sm:text-lg font-bold font-mono text-blue-600 truncate">
            Rs. {totals.b31_60.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] text-slate-400">First reminder</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-0.5">
          <p className="text-[10px] font-bold text-amber-600 uppercase truncate">61 – 90 Days</p>
          <h3 className="text-base sm:text-lg font-bold font-mono text-amber-600 truncate">
            Rs. {totals.b61_90.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] text-slate-400">Follow-up needed</p>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-0.5">
          <p className="text-[10px] font-bold text-rose-600 uppercase truncate">90+ Days (Critical)</p>
          <h3 className="text-base sm:text-lg font-bold font-mono text-rose-600 truncate">
            Rs. {totals.b90_plus.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] text-rose-500">High risk of default</p>
        </div>
      </div>

      {/* FILTER BUTTONS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs print:hidden">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search debtor by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors min-h-[38px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedBucket('all')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-xs cursor-pointer ${
              selectedBucket === 'all' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setSelectedBucket('0-30')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-xs cursor-pointer ${
              selectedBucket === '0-30' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            0-30d
          </button>
          <button
            type="button"
            onClick={() => setSelectedBucket('31-60')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-xs cursor-pointer ${
              selectedBucket === '31-60' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            31-60d
          </button>
          <button
            type="button"
            onClick={() => setSelectedBucket('61-90')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-xs cursor-pointer ${
              selectedBucket === '61-90' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            61-90d
          </button>
          <button
            type="button"
            onClick={() => setSelectedBucket('90+')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-xs cursor-pointer ${
              selectedBucket === '90+' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            90+d
          </button>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (< md) */}
      <div className="grid gap-2.5 md:hidden">
        {filteredRows.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No overdue customer receivables matching criteria.
          </div>
        ) : (
          filteredRows.map((row) => {
            const riskBadge =
              row.bucket === '90+'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : row.bucket === '61-90'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : row.bucket === '31-60'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200';

            return (
              <div key={row.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <Link href={`/parties/${row.id}`} className="font-bold text-slate-900 hover:text-blue-600 text-xs">
                      {row.name}
                    </Link>
                    {row.phone && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{row.phone}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${riskBadge}`}>
                    {row.bucket === '0-30' ? 'Current' : `${row.bucket} Days`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Due:</span>
                    <strong className="font-mono text-slate-900 text-sm">
                      Rs. {row.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </strong>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <span>Overdue: <strong className="text-slate-800 font-mono">{row.daysOld} days</strong></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW (>= md) */}
      <div className="hidden md:block border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-xs print:border-black">
        <table className="w-full text-left text-xs min-w-[850px]">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 print:border-black">
            <tr>
              <th className="px-4 py-3">Customer Party</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Total Due (Rs.)</th>
              <th className="px-4 py-3 text-right text-emerald-700">0-30 Days</th>
              <th className="px-4 py-3 text-right text-blue-700">31-60 Days</th>
              <th className="px-4 py-3 text-right text-amber-700">61-90 Days</th>
              <th className="px-4 py-3 text-right text-rose-700">90+ Days</th>
              <th className="px-4 py-3 text-center">Aging Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400">
                  No overdue customer receivables matching criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const riskColor =
                  row.bucket === '90+'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : row.bucket === '61-90'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : row.bucket === '31-60'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                return (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link href={`/parties/${row.id}`} className="hover:text-blue-600 transition-colors">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {row.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      Rs. {row.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">
                      {row.b0_30 > 0 ? `Rs. ${row.b0_30.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-700">
                      {row.b31_60 > 0 ? `Rs. ${row.b31_60.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">
                      {row.b61_90 > 0 ? `Rs. ${row.b61_90.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                      {row.b90_plus > 0 ? `Rs. ${row.b90_plus.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${riskColor}`}>
                        {row.bucket === '0-30' ? 'Normal' : `${row.bucket} Days`}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-right uppercase">
                TOTAL:
              </td>
              <td className="px-4 py-3 text-right font-mono">
                Rs. {totals.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-emerald-700">
                Rs. {totals.b0_30.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-blue-700">
                Rs. {totals.b31_60.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-amber-700">
                Rs. {totals.b61_90.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-rose-700">
                Rs. {totals.b90_plus.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
