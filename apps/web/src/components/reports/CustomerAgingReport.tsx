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
        const bal = Number(p.currentBalance || 0);
        return bal > 0; // Only debtors (receivable from customer)
      })
      .map((p) => {
        const bal = Number(p.currentBalance || 0);
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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Accounts Receivable Aging Analysis (उधारो विश्लेषण)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Segment outstanding customer balances by overdue duration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md"
          >
            <Printer className="w-4 h-4" /> Print Aging Report
          </button>
        </div>
      </div>

      {/* AGING SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Receivables</p>
          <h3 className="text-xl font-bold font-mono text-white mt-1">
            Rs. {totals.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{totals.debtorsCount} Customers with Balance</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold text-emerald-400 uppercase">0 – 30 Days (Current)</p>
          <h3 className="text-xl font-bold font-mono text-emerald-400 mt-1">
            Rs. {totals.b0_30.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Within regular credit period</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold text-blue-400 uppercase">31 – 60 Days</p>
          <h3 className="text-xl font-bold font-mono text-blue-400 mt-1">
            Rs. {totals.b31_60.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">First reminder stage</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold text-amber-400 uppercase">61 – 90 Days</p>
          <h3 className="text-xl font-bold font-mono text-amber-400 mt-1">
            Rs. {totals.b61_90.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Follow-up needed</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold text-rose-400 uppercase">90+ Days (Critical)</p>
          <h3 className="text-xl font-bold font-mono text-rose-400 mt-1">
            Rs. {totals.b90_plus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-rose-400/80 mt-1">High risk of default</p>
        </div>
      </div>

      {/* FILTER BUTTONS & SEARCH */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 print:hidden">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search debtor customer by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setSelectedBucket('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedBucket === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Overdue
          </button>
          <button
            onClick={() => setSelectedBucket('0-30')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedBucket === '0-30' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            0-30 Days
          </button>
          <button
            onClick={() => setSelectedBucket('31-60')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedBucket === '31-60' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            31-60 Days
          </button>
          <button
            onClick={() => setSelectedBucket('61-90')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedBucket === '61-90' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            61-90 Days
          </button>
          <button
            onClick={() => setSelectedBucket('90+')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedBucket === '90+' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            90+ Days
          </button>
        </div>
      </div>

      {/* AGING DATA TABLE */}
      <div className="border border-slate-800 rounded-2xl overflow-x-auto bg-slate-900 shadow-xl print:bg-white print:border-black">
        <table className="w-full text-left text-xs min-w-[950px]">
          <thead className="bg-slate-800/80 print:bg-gray-100 text-slate-300 print:text-black font-bold border-b border-slate-800 print:border-black">
            <tr>
              <th className="px-4 py-3">Customer Party</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Total Due (Rs.)</th>
              <th className="px-4 py-3 text-right text-emerald-400 print:text-black">0-30 Days</th>
              <th className="px-4 py-3 text-right text-blue-400 print:text-black">31-60 Days</th>
              <th className="px-4 py-3 text-right text-amber-400 print:text-black">61-90 Days</th>
              <th className="px-4 py-3 text-right text-rose-400 print:text-black">90+ Days</th>
              <th className="px-4 py-3 text-center">Aging Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 print:divide-gray-300 text-slate-300 print:text-black">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500">
                  No overdue customer receivables matching criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const riskColor =
                  row.bucket === '90+'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : row.bucket === '61-90'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : row.bucket === '31-60'
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';

                return (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white print:text-black">
                      <Link href={`/parties/${row.id}`} className="hover:text-blue-400 transition-colors">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 print:text-black">
                      {row.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white print:text-black">
                      Rs. {row.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">
                      {row.b0_30 > 0 ? `Rs. ${row.b0_30.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-400">
                      {row.b31_60 > 0 ? `Rs. ${row.b31_60.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-400">
                      {row.b61_90 > 0 ? `Rs. ${row.b61_90.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                      {row.b90_plus > 0 ? `Rs. ${row.b90_plus.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${riskColor}`}>
                        {row.bucket === '0-30' ? 'Normal' : `${row.bucket} Days`}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-800/90 print:bg-gray-100 font-bold border-t-2 border-slate-700 text-white print:text-black">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-right uppercase">
                TOTAL:
              </td>
              <td className="px-4 py-3 text-right font-mono">
                Rs. {totals.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-emerald-400">
                Rs. {totals.b0_30.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-blue-400">
                Rs. {totals.b31_60.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-amber-400">
                Rs. {totals.b61_90.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-rose-400">
                Rs. {totals.b90_plus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
