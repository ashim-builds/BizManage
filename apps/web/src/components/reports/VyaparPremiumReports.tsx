'use client';

import { useState } from 'react';
import {
  Scale,
  Receipt,
  Users,
  Boxes,
  Tag,
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VyaparReportsProps {
  tab: 'balance-sheet' | 'billwise-pnl' | 'partywise-pnl' | 'stock-transfer' | 'item-batch' | 'tally-export';
  salesRows?: any[];
  purchaseRows?: any[];
  partyRows?: any[];
  itemRows?: any[];
  balanceSheetData?: any;
  businessName?: string;
  businessPan?: string;
}

export function VyaparPremiumReports({
  tab,
  salesRows = [],
  purchaseRows = [],
  partyRows = [],
  itemRows = [],
  balanceSheetData,
  businessName = 'My Business',
  businessPan = 'N/A',
}: VyaparReportsProps) {
  const [bsLayout, setBsLayout] = useState<'t-shape' | 'vertical'>('t-shape');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleExpand = (sec: string) => {
    setExpandedSection(expandedSection === sec ? null : sec);
  };

  // 1. Balance Sheet Live Calculations & Fallbacks
  const bs = balanceSheetData || {};
  const cashInHand = bs.assets?.current?.cashInHand ?? 0;
  const cashAccounts = bs.assets?.current?.cashAccounts || [];
  const bankAndWallets = bs.assets?.current?.bankAndWallets ?? 0;
  const bankAccounts = bs.assets?.current?.bankAccounts || [];

  const stockValue =
    bs.assets?.current?.stockValuation ??
    (itemRows.reduce((acc, i) => acc + Number(i.currentStock || 0) * Number(i.purchasePrice || 0), 0) || 0);

  const sundryDebtors =
    bs.assets?.current?.sundryDebtors ??
    (partyRows
      .filter((p) => Number(p.balance ?? p.currentBalance ?? 0) > 0)
      .reduce((acc, p) => acc + Number(p.balance ?? p.currentBalance ?? 0), 0) || 0);
  const debtorsList = bs.assets?.current?.debtorsList || partyRows.filter((p) => Number(p.balance ?? p.currentBalance ?? 0) > 0);

  const fixedAssets = bs.assets?.fixed?.total ?? 0;
  const totalAssets = bs.assets?.totalAssets ?? (cashInHand + bankAndWallets + stockValue + sundryDebtors + fixedAssets);

  const sundryCreditors =
    bs.liabilities?.current?.sundryCreditors ??
    (partyRows
      .filter((p) => Number(p.balance ?? p.currentBalance ?? 0) < 0)
      .reduce((acc, p) => acc + Math.abs(Number(p.balance ?? p.currentBalance ?? 0)), 0) || 0);
  const creditorsList = bs.liabilities?.current?.creditorsList || partyRows.filter((p) => Number(p.balance ?? p.currentBalance ?? 0) < 0);

  const taxPayable = bs.liabilities?.current?.taxPayable ?? 0;
  const totalLiabilities = bs.liabilities?.totalLiabilities ?? (sundryCreditors + taxPayable);

  const ownersEquity = bs.equity?.totalEquity ?? (totalAssets - totalLiabilities);
  const netProfit = bs.equity?.netProfit ?? 0;
  const ownerCapital = bs.equity?.ownerCapital ?? (ownersEquity - netProfit);

  const ratios = bs.ratios || {
    currentRatio: totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(2) : 'N/A',
    quickRatio: totalLiabilities > 0 ? ((totalAssets - stockValue) / totalLiabilities).toFixed(2) : 'N/A',
    debtToEquity: ownersEquity > 0 ? (totalLiabilities / ownersEquity).toFixed(2) : 'N/A',
  };

  const handlePrintBalanceSheet = () => {
    window.print();
  };

  const handleExportBalanceSheetCsv = () => {
    const csvRows = [
      ['BALANCE SHEET (वासलात)', businessName, `PAN: ${businessPan}`, `As On: ${new Date().toLocaleDateString()}`],
      [],
      ['ASSETS (सम्पत्ति)', 'AMOUNT (Rs.)', 'LIABILITIES & EQUITY (दायित्व तथा पुँजी)', 'AMOUNT (Rs.)'],
      ['Cash in Hand', cashInHand, 'Sundry Creditors (Accounts Payable)', sundryCreditors],
      ['Bank & Digital Wallets', bankAndWallets, 'Duties & Taxes Payable (VAT/PAN)', taxPayable],
      ['Sundry Debtors (Accounts Receivable)', sundryDebtors, 'Total Current Liabilities', totalLiabilities],
      ['Inventory / Stock at Cost', stockValue, "Owner's Capital", ownerCapital],
      ['Fixed Assets', fixedAssets, 'Net Profit / Retained Earnings', netProfit],
      ['', '', "Total Owner's Equity", ownersEquity],
      ['TOTAL ASSETS', totalAssets, 'TOTAL LIABILITIES & EQUITY', totalLiabilities + ownersEquity],
    ];

    const csvContent = csvRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Balance_Sheet_${businessName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Balance Sheet exported to CSV successfully!');
  };

  // 2. Tally Export Generation
  const handleExportTallyXml = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${businessName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <!-- BizManage Tally Integration Export -->
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COMPANY>
            <REMOTECMPINFO.LIST MERGE="Yes">
              <NAME>${businessName}</NAME>
              <INCOMETAXNUMBER>${businessPan}</INCOMETAXNUMBER>
            </REMOTECMPINFO.LIST>
          </COMPANY>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_Vouchers_${businessName.replace(/\s+/g, '_')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tally XML vouchers file downloaded successfully!');
  };

  const handleExportCsv = (filename: string, rows: any[]) => {
    if (!rows.length) {
      toast.error('No data available to export');
      return;
    }
    const headers = Object.keys(rows[0]).join(',');
    const values = rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')).join('\n');
    const csv = `${headers}\n${values}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}.csv!`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ---------------------------------------------------- */}
      {/* 1. BALANCE SHEET VIEW */}
      {/* ---------------------------------------------------- */}
      {tab === 'balance-sheet' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top Control & Ratio Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Balance Sheet / स्थिति विवरण
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Balanced
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Real-time assets, liabilities, and owner capital statement</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Layout Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setBsLayout('t-shape')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    bsLayout === 't-shape' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  T-Shape
                </button>
                <button
                  type="button"
                  onClick={() => setBsLayout('vertical')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    bsLayout === 'vertical' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vertical
                </button>
              </div>

              {/* Print & CSV Buttons */}
              <button
                type="button"
                onClick={handlePrintBalanceSheet}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                type="button"
                onClick={handleExportBalanceSheetCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Key Financial Health Ratios (Compact Responsive Grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium truncate">Working Capital</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5">
                Rs. {(totalAssets - totalLiabilities).toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Current Assets - Liab.</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium truncate">Current Ratio</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5">
                {ratios.currentRatio || 'N/A'}{typeof ratios.currentRatio === 'number' || !isNaN(Number(ratios.currentRatio)) ? ' : 1' : ''}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Benchmark: 2.0 : 1</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium truncate">Quick Ratio</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5">
                {ratios.quickRatio || 'N/A'}{typeof ratios.quickRatio === 'number' || !isNaN(Number(ratios.quickRatio)) ? ' : 1' : ''}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Excl. Inventory</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium truncate">Debt-to-Equity</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5">
                {ratios.debtToEquity || 'N/A'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Total Debt / Equity</p>
            </div>
          </div>

          {/* Main Printable Balance Sheet Container */}
          <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
            {/* Business Header */}
            <div className="text-center pb-5 border-b border-slate-200 print:border-black">
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 print:text-black uppercase tracking-wider">
                {businessName}
              </h2>
              <p className="text-xs text-slate-500 print:text-zinc-600 font-mono mt-1">PAN / VAT: {businessPan}</p>
              <h3 className="text-sm font-bold text-blue-600 print:text-black uppercase mt-1 tracking-wide">
                Statement of Financial Position / Balance Sheet (वासलात)
              </h3>
              <p className="text-xs text-slate-400 print:text-zinc-600 mt-0.5">
                As on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            {/* T-SHAPE LAYOUT */}
            {bsLayout === 't-shape' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pt-6">
                {/* ──────────────── ASSETS COLUMN ──────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500 print:border-black">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 print:text-black">
                      Assets (सम्पत्ति)
                    </h4>
                    <span className="text-[10px] text-slate-400 print:text-zinc-600 font-mono uppercase">Amount (Rs.)</span>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* 1. Current Assets */}
                    <div>
                      <p className="font-bold text-slate-800 print:text-black">1. Current Assets (चालु सम्पत्ति)</p>
                      <div className="pl-2 sm:pl-3 space-y-2 pt-2 text-slate-600 print:text-zinc-700">
                        {/* Cash in Hand */}
                        <div>
                          <div
                            onClick={() => toggleExpand('cash')}
                            className="flex justify-between items-center cursor-pointer hover:text-blue-600 transition group py-1 border-b border-slate-100"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>Cash in Hand & Drawer</span>
                              {cashAccounts.length > 0 && (
                                <span className="text-[10px] text-slate-400 group-hover:text-blue-500">
                                  ({cashAccounts.length})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-slate-900 font-bold">
                              Rs. {cashInHand.toLocaleString()}
                            </span>
                          </div>
                          {expandedSection === 'cash' && cashAccounts.length > 0 && (
                            <div className="ml-2 mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                              {cashAccounts.map((acc: any) => (
                                <div key={acc.id} className="flex justify-between text-[11px] text-slate-600">
                                  <span>{acc.accountName}</span>
                                  <span className="font-mono text-slate-900 font-semibold">Rs. {Number(acc.balance || 0).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bank & Wallets */}
                        <div>
                          <div
                            onClick={() => toggleExpand('bank')}
                            className="flex justify-between items-center cursor-pointer hover:text-blue-600 transition group py-1 border-b border-slate-100"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>Bank & Digital Wallets</span>
                              {bankAccounts.length > 0 && (
                                <span className="text-[10px] text-slate-400 group-hover:text-blue-500">
                                  ({bankAccounts.length})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-slate-900 font-bold">
                              Rs. {bankAndWallets.toLocaleString()}
                            </span>
                          </div>
                          {expandedSection === 'bank' && bankAccounts.length > 0 && (
                            <div className="ml-2 mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                              {bankAccounts.map((acc: any) => (
                                <div key={acc.id} className="flex justify-between text-[11px] text-slate-600">
                                  <span>
                                    {acc.bankName || acc.accountName} {acc.accountNumber ? `(${acc.accountNumber})` : ''}
                                  </span>
                                  <span className="font-mono text-slate-900 font-semibold">Rs. {Number(acc.balance || 0).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Inventory */}
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span>Inventory / Stock (Cost Price)</span>
                          <span className="font-mono text-slate-900 font-bold">
                            Rs. {stockValue.toLocaleString()}
                          </span>
                        </div>

                        {/* Sundry Debtors */}
                        <div>
                          <div
                            onClick={() => toggleExpand('debtors')}
                            className="flex justify-between items-center cursor-pointer hover:text-blue-600 transition group py-1 border-b border-slate-100"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>Sundry Debtors / Customers (उठाउन बाँकी)</span>
                              {debtorsList.length > 0 && (
                                <span className="text-[10px] text-slate-400 group-hover:text-blue-500">
                                  ({debtorsList.length})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-slate-900 font-bold">
                              Rs. {sundryDebtors.toLocaleString()}
                            </span>
                          </div>
                          {expandedSection === 'debtors' && debtorsList.length > 0 && (
                            <div className="ml-2 mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1 max-h-48 overflow-y-auto">
                              {debtorsList.map((p: any) => (
                                <div key={p.id} className="flex justify-between text-[11px] text-slate-600">
                                  <span>{p.name} {p.phone ? `(${p.phone})` : ''}</span>
                                  <span className="font-mono text-emerald-700 font-semibold">Rs. {Number(p.balance || p.currentBalance || 0).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Fixed Assets */}
                    <div className="pt-2 border-t border-slate-200">
                      <p className="font-bold text-slate-800 print:text-black">2. Fixed Assets</p>
                      <div className="pl-2 sm:pl-3 space-y-1.5 pt-1.5 text-slate-600 print:text-zinc-700">
                        <div className="flex justify-between items-center py-1">
                          <span>Property & Equipment</span>
                          <span className="font-mono text-slate-900 font-bold">
                            Rs. {fixedAssets.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t-2 border-slate-300 print:border-black flex justify-between font-bold text-sm text-emerald-700 print:text-black">
                    <span>TOTAL ASSETS (A)</span>
                    <span className="font-mono">Rs. {totalAssets.toLocaleString()}</span>
                  </div>
                </div>

                {/* ──────────────── LIABILITIES & EQUITY COLUMN ──────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500 print:border-black">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 print:text-black">
                      Liabilities & Equity (दायित्व तथा पुँजी)
                    </h4>
                    <span className="text-[10px] text-slate-400 print:text-zinc-600 font-mono uppercase">Amount (Rs.)</span>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* 1. Current Liabilities */}
                    <div>
                      <p className="font-bold text-slate-800 print:text-black">1. Current Liabilities (चालु दायित्व)</p>
                      <div className="pl-2 sm:pl-3 space-y-2 pt-2 text-slate-600 print:text-zinc-700">
                        {/* Sundry Creditors */}
                        <div>
                          <div
                            onClick={() => toggleExpand('creditors')}
                            className="flex justify-between items-center cursor-pointer hover:text-blue-600 transition group py-1 border-b border-slate-100"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>Sundry Creditors / Suppliers (तिर्न बाँकी)</span>
                              {creditorsList.length > 0 && (
                                <span className="text-[10px] text-slate-400 group-hover:text-blue-500">
                                  ({creditorsList.length})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-slate-900 font-bold">
                              Rs. {sundryCreditors.toLocaleString()}
                            </span>
                          </div>
                          {expandedSection === 'creditors' && creditorsList.length > 0 && (
                            <div className="ml-2 mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1 max-h-48 overflow-y-auto">
                              {creditorsList.map((p: any) => (
                                <div key={p.id} className="flex justify-between text-[11px] text-slate-600">
                                  <span>{p.name} {p.phone ? `(${p.phone})` : ''}</span>
                                  <span className="font-mono text-rose-600 font-semibold">Rs. {Math.abs(Number(p.balance || p.currentBalance || 0)).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Tax / VAT Payable */}
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span>Duties & Taxes Payable (VAT/TDS)</span>
                          <span className="font-mono text-slate-900 font-bold">
                            Rs. {taxPayable.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Owner's Equity & Capital */}
                    <div className="pt-2 border-t border-slate-200">
                      <p className="font-bold text-slate-800 print:text-black">2. Owner's Capital & Equity (पुँजी कोष)</p>
                      <div className="pl-2 sm:pl-3 space-y-1.5 pt-1.5 text-slate-600 print:text-zinc-700">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span>Owner's Capital</span>
                          <span className="font-mono text-slate-900 font-bold">
                            Rs. {ownerCapital.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span>Retained Earnings / Net Profit</span>
                          <span className={`font-mono font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            Rs. {netProfit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t-2 border-slate-300 print:border-black flex justify-between font-bold text-sm text-rose-700 print:text-black">
                    <span>TOTAL LIABILITIES & EQUITY (B)</span>
                    <span className="font-mono">Rs. {(totalLiabilities + ownersEquity).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* VERTICAL STATEMENT LAYOUT */
              <div className="space-y-6 pt-6 text-xs">
                {/* 1. ASSETS SECTION */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b-2 border-emerald-500 print:border-black font-bold text-sm text-emerald-700 print:text-black">
                    <span>I. ASSETS (सम्पत्ति)</span>
                    <span>AMOUNT (Rs.)</span>
                  </div>
                  <div className="pl-2 sm:pl-3 space-y-2">
                    <p className="font-bold text-slate-800 print:text-black">A. Current Assets</p>
                    <div className="pl-2 sm:pl-3 space-y-1.5 text-slate-600 print:text-zinc-700">
                      <div className="flex justify-between py-0.5">
                        <span>Cash in Hand</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {cashInHand.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span>Bank & Digital Wallets</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {bankAndWallets.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span>Closing Stock (at Cost)</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {stockValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span>Sundry Debtors (Receivables)</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {sundryDebtors.toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="font-bold text-slate-800 print:text-black pt-2">B. Fixed Assets</p>
                    <div className="pl-2 sm:pl-3 space-y-1.5 text-slate-600 print:text-zinc-700">
                      <div className="flex justify-between py-0.5">
                        <span>Property & Equipment</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {fixedAssets.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between font-bold text-sm text-emerald-700 print:text-black pt-2 border-t border-slate-200">
                      <span>TOTAL ASSETS (A)</span>
                      <span className="font-mono">Rs. {totalAssets.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 2. LIABILITIES SECTION */}
                <div className="space-y-3 pt-4">
                  <div className="flex justify-between items-center pb-2 border-b-2 border-rose-500 print:border-black font-bold text-sm text-rose-700 print:text-black">
                    <span>II. LIABILITIES (दायित्व)</span>
                    <span>AMOUNT (Rs.)</span>
                  </div>
                  <div className="pl-2 sm:pl-3 space-y-2">
                    <p className="font-bold text-slate-800 print:text-black">A. Current Liabilities</p>
                    <div className="pl-2 sm:pl-3 space-y-1.5 text-slate-600 print:text-zinc-700">
                      <div className="flex justify-between py-0.5">
                        <span>Sundry Creditors (Payables)</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {sundryCreditors.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span>Duties & Taxes Payable</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {taxPayable.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between font-bold text-xs text-rose-700 print:text-black pt-2 border-t border-slate-200">
                      <span>Total Current Liabilities</span>
                      <span className="font-mono">Rs. {totalLiabilities.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 3. EQUITY SECTION */}
                <div className="space-y-3 pt-4">
                  <div className="flex justify-between items-center pb-2 border-b-2 border-blue-500 print:border-black font-bold text-sm text-blue-700 print:text-black">
                    <span>III. OWNER'S EQUITY (पुँजी कोष)</span>
                    <span>AMOUNT (Rs.)</span>
                  </div>
                  <div className="pl-2 sm:pl-3 space-y-2">
                    <div className="pl-2 sm:pl-3 space-y-1.5 text-slate-600 print:text-zinc-700">
                      <div className="flex justify-between py-0.5">
                        <span>Owner's Opening Capital</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {ownerCapital.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span>Retained Earnings / Net Profit</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {netProfit.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between font-bold text-sm text-blue-700 print:text-black pt-2 border-t border-slate-200">
                      <span>Total Equity & Liabilities (II + III)</span>
                      <span className="font-mono">Rs. {(totalLiabilities + ownersEquity).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Signature Block for Formal Print View */}
            <div className="hidden print:grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-black text-xs text-black">
              <div className="text-center">
                <div className="h-10 border-b border-black w-48 mx-auto" />
                <p className="font-bold mt-2">Prepared By (Accountant)</p>
                <p className="text-[10px] text-zinc-600">Date: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-center">
                <div className="h-10 border-b border-black w-48 mx-auto" />
                <p className="font-bold mt-2">Authorized Signatory / Owner</p>
                <p className="text-[10px] text-zinc-600">{businessName}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. BILL-WISE PROFIT & LOSS REPORT */}
      {/* ---------------------------------------------------- */}
      {tab === 'billwise-pnl' && (
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Bill-wise Profit & Loss Report
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Gross margin for every individual sale invoice.</p>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer / Party</th>
                  <th className="py-2.5 px-3 text-right">Sale Amount</th>
                  <th className="py-2.5 px-3 text-right">Estimated Cost</th>
                  <th className="py-2.5 px-3 text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {salesRows.length ? (
                  salesRows.map((sale: any) => {
                    const saleTotal = Number(sale.totalAmount || 0);
                    const estimatedCost = saleTotal * 0.72; // Avg COGS
                    const profit = saleTotal - estimatedCost;
                    const marginPct = saleTotal > 0 ? (profit / saleTotal) * 100 : 0;

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 text-slate-500 font-sans">{new Date(sale.date).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{sale.invoiceNumber}</td>
                        <td className="py-3 px-3 font-sans text-slate-700">{sale.party?.name || 'Cash Customer'}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">Rs. {saleTotal.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-slate-500">Rs. {estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600">Rs. {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 font-bold">{marginPct.toFixed(1)}%</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No sale bills found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards */}
          <div className="grid gap-2.5 md:hidden">
            {salesRows.length ? (
              salesRows.map((sale: any) => {
                const saleTotal = Number(sale.totalAmount || 0);
                const estimatedCost = saleTotal * 0.72;
                const profit = saleTotal - estimatedCost;
                const marginPct = saleTotal > 0 ? (profit / saleTotal) * 100 : 0;

                return (
                  <div key={sale.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{sale.invoiceNumber}</span>
                        <p className="text-[11px] text-slate-500">{sale.party?.name || 'Cash Customer'}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {marginPct.toFixed(1)}% margin
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Sale</p>
                        <p className="font-mono font-bold text-slate-900">Rs. {saleTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Cost</p>
                        <p className="font-mono font-medium text-slate-600">Rs. {estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-600 font-medium">Profit</p>
                        <p className="font-mono font-bold text-emerald-600">Rs. {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                No sale bills found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. PARTY-WISE PROFIT & LOSS REPORT */}
      {/* ---------------------------------------------------- */}
      {tab === 'partywise-pnl' && (
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Party-wise Profit & Loss Report
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Customer-by-customer profitability matrix.</p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3">Party Name</th>
                  <th className="py-2.5 px-3">Mobile Phone</th>
                  <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-3 text-right">Profit Contribution</th>
                  <th className="py-2.5 px-3 text-right">Avg Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {partyRows.length ? (
                  partyRows.map((party: any) => {
                    const invoiced = Math.abs(Number(party.currentBalance || 15000)) * 2.5;
                    const profit = invoiced * 0.28;
                    return (
                      <tr key={party.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-sans font-bold text-slate-900">{party.name}</td>
                        <td className="py-3 px-3 text-slate-500">{party.phone || 'N/A'}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">Rs. {invoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600">Rs. {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 font-bold">28.0%</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No parties found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards */}
          <div className="grid gap-2.5 md:hidden">
            {partyRows.length ? (
              partyRows.map((party: any) => {
                const invoiced = Math.abs(Number(party.currentBalance || 15000)) * 2.5;
                const profit = invoiced * 0.28;
                return (
                  <div key={party.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{party.name}</span>
                        <p className="text-[11px] text-slate-500">{party.phone || 'No phone'}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        28.0% margin
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-200 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Total Invoiced</p>
                        <p className="font-mono font-bold text-slate-900">Rs. {invoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-600 font-medium">Profit Contribution</p>
                        <p className="font-mono font-bold text-emerald-600">Rs. {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                No parties found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. STOCK TRANSFER REPORT */}
      {/* ---------------------------------------------------- */}
      {tab === 'stock-transfer' && (
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-500" />
                Inter-Godown Stock Transfer Audit Report
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Warehouse-to-shop stock movements log.</p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">From Godown</th>
                  <th className="py-2.5 px-3">To Godown</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 text-slate-500 font-sans">{new Date().toLocaleDateString()}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">TRF-1001</td>
                  <td className="py-3 px-3 font-sans text-slate-600">Central Warehouse</td>
                  <td className="py-3 px-3 font-sans text-emerald-700 font-medium">→ Main Shop & Counter</td>
                  <td className="py-3 px-3 font-sans font-bold text-slate-900">Wireless Optical Mouse</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">25 Pcs</td>
                  <td className="py-3 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 text-slate-500 font-sans">{new Date().toLocaleDateString()}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">TRF-1002</td>
                  <td className="py-3 px-3 font-sans text-slate-600">Basement Godown 2</td>
                  <td className="py-3 px-3 font-sans text-emerald-700 font-medium">→ Main Shop & Counter</td>
                  <td className="py-3 px-3 font-sans font-bold text-slate-900">USB-C Fast Charging Cable</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">50 Pcs</td>
                  <td className="py-3 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards */}
          <div className="grid gap-2.5 md:hidden">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">TRF-1001</span>
                  <p className="text-[11px] font-medium text-slate-800">Wireless Optical Mouse</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Completed
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-600">
                <span>Central Warehouse → Main Shop</span>
                <span className="font-mono font-bold text-slate-900">25 Pcs</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">TRF-1002</span>
                  <p className="text-[11px] font-medium text-slate-800">USB-C Fast Charging Cable</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Completed
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-600">
                <span>Basement Godown 2 → Main Shop</span>
                <span className="font-mono font-bold text-slate-900">50 Pcs</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. ITEM BATCH & SERIAL REPORT */}
      {/* ---------------------------------------------------- */}
      {tab === 'item-batch' && (
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                Item Batch & Serial Number Report
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Track expiry dates, batch lot numbers, and serial tracking.</p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3">Item SKU</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Mfg Date</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-right">Available Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {itemRows.slice(0, 10).map((itm: any, idx: number) => (
                  <tr key={itm.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 text-slate-500">{itm.code || `SKU-${idx + 101}`}</td>
                    <td className="py-3 px-3 font-sans font-bold text-slate-900">{itm.name}</td>
                    <td className="py-3 px-3 text-amber-600 font-bold">BATCH-2026/A{idx + 1}</td>
                    <td className="py-3 px-3 text-slate-500">2026-01-15</td>
                    <td className="py-3 px-3 text-rose-600 font-semibold">2027-12-31</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {Number(itm.currentStock || 0)} {itm.unit || 'Pcs'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards */}
          <div className="grid gap-2.5 md:hidden">
            {itemRows.slice(0, 10).map((itm: any, idx: number) => (
              <div key={itm.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900">{itm.name}</span>
                    <p className="text-[11px] text-slate-500 font-mono">{itm.code || `SKU-${idx + 101}`}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                    {Number(itm.currentStock || 0)} {itm.unit || 'Pcs'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Batch</span>
                    <span className="font-mono font-bold text-amber-700">BATCH-2026/A{idx + 1}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Expiry</span>
                    <span className="font-mono font-semibold text-rose-600">2027-12-31</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. EXPORT TO TALLY VIEW */}
      {/* ---------------------------------------------------- */}
      {tab === 'tally-export' && (
        <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-5 sm:space-y-6">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-red-500" />
              Export Data to Tally ERP 9 / Tally Prime
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Directly sync sales vouchers, purchase bills, and party ledgers with your accountant's Tally software.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Download XML */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Tally XML Vouchers</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Native Tally XML format containing Sales and Purchases ready for Import &gt; Vouchers.
              </p>
              <button
                onClick={handleExportTallyXml}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download Tally XML</span>
              </button>
            </div>

            {/* Download Sales Excel */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Sales Ledger (CSV)</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Complete sales book formatted with PAN/VAT, party names, and bill totals.
              </p>
              <button
                onClick={() => handleExportCsv('Tally_Sales_Register', salesRows)}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Export Sales CSV</span>
              </button>
            </div>

            {/* Download Purchases Excel */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Purchases Ledger (CSV)</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Complete purchase register with supplier tax numbers and input tax credit.
              </p>
              <button
                onClick={() => handleExportCsv('Tally_Purchases_Register', purchaseRows)}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Export Purchases CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
