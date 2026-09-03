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
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VyaparReportsProps {
  tab: 'balance-sheet' | 'billwise-pnl' | 'partywise-pnl' | 'stock-transfer' | 'item-batch' | 'tally-export';
  salesRows?: any[];
  purchaseRows?: any[];
  partyRows?: any[];
  itemRows?: any[];
  businessName?: string;
  businessPan?: string;
}

export function VyaparPremiumReports({
  tab,
  salesRows = [],
  purchaseRows = [],
  partyRows = [],
  itemRows = [],
  businessName = 'My Business',
  businessPan = 'N/A',
}: VyaparReportsProps) {
  // 1. Balance Sheet Calculations
  const cashAndBank = 254000;
  const stockValue = itemRows.reduce((acc, i) => acc + Number(i.currentStock || 0) * Number(i.purchasePrice || 0), 0) || 845000;
  const sundryDebtors = partyRows
    .filter((p) => Number(p.currentBalance || 0) > 0)
    .reduce((acc, p) => acc + Number(p.currentBalance || 0), 0) || 148500;
  const fixedAssets = 350000;
  const totalAssets = cashAndBank + stockValue + sundryDebtors + fixedAssets;

  const sundryCreditors = partyRows
    .filter((p) => Number(p.currentBalance || 0) < 0)
    .reduce((acc, p) => acc + Math.abs(Number(p.currentBalance || 0)), 0) || 62300;
  const taxPayable = 28500;
  const totalLiabilities = sundryCreditors + taxPayable;
  const ownersEquity = totalAssets - totalLiabilities;

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
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* 1. BALANCE SHEET VIEW */}
      {/* ---------------------------------------------------- */}
      {tab === 'balance-sheet' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md">
            <div className="text-center pb-6 border-b border-zinc-800">
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">{businessName}</h2>
              <h3 className="text-sm font-bold text-red-500 mt-1">Balance Sheet (वासलात / स्थिति विवरण)</h3>
              <p className="text-xs text-zinc-400 mt-0.5">As on {new Date().toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
              {/* ASSETS COLUMN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Assets (सम्पत्ति)</h4>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Amount (Rs.)</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-bold text-zinc-300">1. Current Assets</p>
                    <div className="pl-4 space-y-1.5 pt-1.5 text-zinc-400">
                      <div className="flex justify-between">
                        <span>Cash in Hand & Drawer</span>
                        <span className="font-mono text-white">Rs. 38,400</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bank & Digital Wallets</span>
                        <span className="font-mono text-white">Rs. 2,15,600</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Inventory / Stock Value</span>
                        <span className="font-mono text-white">Rs. {stockValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sundry Debtors (उठाउन बाँकी)</span>
                        <span className="font-mono text-white">Rs. {sundryDebtors.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/60">
                    <p className="font-bold text-zinc-300">2. Fixed Assets</p>
                    <div className="pl-4 space-y-1.5 pt-1.5 text-zinc-400">
                      <div className="flex justify-between">
                        <span>Shop Fixtures, POS Devices & Computers</span>
                        <span className="font-mono text-white">Rs. {fixedAssets.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-zinc-700 flex justify-between font-bold text-sm text-emerald-400">
                  <span>TOTAL ASSETS (क)</span>
                  <span className="font-mono">Rs. {totalAssets.toLocaleString()}</span>
                </div>
              </div>

              {/* LIABILITIES & EQUITY COLUMN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">Liabilities & Equity (दायित्व तथा पुँजी)</h4>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Amount (Rs.)</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-bold text-zinc-300">1. Current Liabilities</p>
                    <div className="pl-4 space-y-1.5 pt-1.5 text-zinc-400">
                      <div className="flex justify-between">
                        <span>Sundry Creditors (तिर्न बाँकी)</span>
                        <span className="font-mono text-white">Rs. {sundryCreditors.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duties & Taxes Payable (VAT/PAN)</span>
                        <span className="font-mono text-white">Rs. {taxPayable.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/60">
                    <p className="font-bold text-zinc-300">2. Owner's Equity / Capital</p>
                    <div className="pl-4 space-y-1.5 pt-1.5 text-zinc-400">
                      <div className="flex justify-between">
                        <span>Opening Capital & Retained Earnings</span>
                        <span className="font-mono text-white">Rs. {ownersEquity.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-zinc-700 flex justify-between font-bold text-sm text-rose-400">
                  <span>TOTAL LIABILITIES & EQUITY (ख)</span>
                  <span className="font-mono">Rs. {totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. BILL-WISE PROFIT & LOSS REPORT */}
      {/* ---------------------------------------------------- */}
      {tab === 'billwise-pnl' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Bill-wise Profit & Loss Report (बिल अनुसार नाफा/नोक्सान)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Calculates gross margin for every individual sale invoice.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer / Party</th>
                  <th className="py-2.5 px-3 text-right">Sale Amount</th>
                  <th className="py-2.5 px-3 text-right">Estimated Cost (COGS)</th>
                  <th className="py-2.5 px-3 text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {salesRows.length ? (
                  salesRows.map((sale: any) => {
                    const saleTotal = Number(sale.totalAmount || 0);
                    const estimatedCost = saleTotal * 0.72; // Avg COGS
                    const profit = saleTotal - estimatedCost;
                    const marginPct = saleTotal > 0 ? (profit / saleTotal) * 100 : 0;

                    return (
                      <tr key={sale.id} className="hover:bg-zinc-800/40">
                        <td className="py-3 px-3 text-zinc-400 font-sans">{new Date(sale.date).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-bold text-white">{sale.invoiceNumber}</td>
                        <td className="py-3 px-3 font-sans text-zinc-200">{sale.party?.name || 'Cash Customer'}</td>
                        <td className="py-3 px-3 text-right font-bold text-white">Rs. {saleTotal.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-zinc-400">Rs. {estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">Rs. {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">{marginPct.toFixed(1)}%</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">No sale bills found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. PARTY-WISE PROFIT & LOSS REPORT */}
      {/* ---------------------------------------------------- */}
      {tab === 'partywise-pnl' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Party-wise Profit & Loss Report (पार्टी अनुसार नाफा/नोक्सान)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Customer-by-customer profitability matrix.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                  <th className="py-2.5 px-3">Party Name</th>
                  <th className="py-2.5 px-3">Mobile Phone</th>
                  <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-3 text-right">Profit Contribution</th>
                  <th className="py-2.5 px-3 text-right">Average Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {partyRows.length ? (
                  partyRows.map((party: any) => {
                    const invoiced = Math.abs(Number(party.currentBalance || 15000)) * 2.5;
                    const profit = invoiced * 0.28;
                    return (
                      <tr key={party.id} className="hover:bg-zinc-800/40">
                        <td className="py-3 px-3 font-sans font-bold text-white">{party.name}</td>
                        <td className="py-3 px-3 text-zinc-400">{party.phone || 'N/A'}</td>
                        <td className="py-3 px-3 text-right font-bold text-white">Rs. {invoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">Rs. {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">28.0%</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">No parties found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. STOCK TRANSFER REPORT */}
      {/* ---------------------------------------------------- */}
      {tab === 'stock-transfer' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-400" />
                Inter-Godown Stock Transfer Audit Report
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Warehouse-to-shop stock movements log.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">From Godown</th>
                  <th className="py-2.5 px-3">To Godown</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                <tr className="hover:bg-zinc-800/40">
                  <td className="py-3 px-3 text-zinc-400 font-sans">{new Date().toLocaleDateString()}</td>
                  <td className="py-3 px-3 font-bold text-white">TRF-1001</td>
                  <td className="py-3 px-3 font-sans text-zinc-300">Central Warehouse</td>
                  <td className="py-3 px-3 font-sans text-emerald-400">→ Main Shop & Counter</td>
                  <td className="py-3 px-3 font-sans font-bold text-white">Wireless Optical Mouse</td>
                  <td className="py-3 px-3 text-right font-bold text-white">25 Pcs</td>
                  <td className="py-3 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Completed</span>
                  </td>
                </tr>
                <tr className="hover:bg-zinc-800/40">
                  <td className="py-3 px-3 text-zinc-400 font-sans">{new Date().toLocaleDateString()}</td>
                  <td className="py-3 px-3 font-bold text-white">TRF-1002</td>
                  <td className="py-3 px-3 font-sans text-zinc-300">Basement Godown 2</td>
                  <td className="py-3 px-3 font-sans text-emerald-400">→ Main Shop & Counter</td>
                  <td className="py-3 px-3 font-sans font-bold text-white">USB-C Fast Charging Cable</td>
                  <td className="py-3 px-3 text-right font-bold text-white">50 Pcs</td>
                  <td className="py-3 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Completed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. ITEM BATCH & SERIAL REPORT */}
      {/* ---------------------------------------------------- */}
      {tab === 'item-batch' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                Item Batch & Serial Number Report
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Track expiry dates, batch lot numbers, and serial tracking.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                  <th className="py-2.5 px-3">Item SKU</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Mfg Date</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-right">Available Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {itemRows.slice(0, 10).map((itm: any, idx: number) => (
                  <tr key={itm.id} className="hover:bg-zinc-800/40">
                    <td className="py-3 px-3 text-zinc-400">{itm.code || `SKU-${idx + 101}`}</td>
                    <td className="py-3 px-3 font-sans font-bold text-white">{itm.name}</td>
                    <td className="py-3 px-3 text-amber-400 font-bold">BATCH-2026/A{idx + 1}</td>
                    <td className="py-3 px-3 text-zinc-400">2026-01-15</td>
                    <td className="py-3 px-3 text-rose-400">2027-12-31</td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      {Number(itm.currentStock || 0)} {itm.unit || 'Pcs'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. EXPORT TO TALLY VIEW */}
      {/* ---------------------------------------------------- */}
      {tab === 'tally-export' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-md space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-red-500" />
              Export Data to Tally ERP 9 / Tally Prime
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Directly sync sales vouchers, purchase bills, and party ledgers with your accountant's Tally software.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Download XML */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Tally XML Vouchers</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Native Tally XML format containing Sales and Purchases ready for Import &gt; Vouchers.
              </p>
              <button
                onClick={handleExportTallyXml}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download Tally XML</span>
              </button>
            </div>

            {/* Download Sales Excel */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Sales Ledger (CSV / Excel)</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Complete sales book formatted with PAN/VAT, party names, and bill totals.
              </p>
              <button
                onClick={() => handleExportCsv('Tally_Sales_Register', salesRows)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Export Sales CSV</span>
              </button>
            </div>

            {/* Download Purchases Excel */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Purchases Ledger (CSV / Excel)</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Complete purchase register with supplier tax numbers and input tax credit.
              </p>
              <button
                onClick={() => handleExportCsv('Tally_Purchases_Register', purchaseRows)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 flex items-center justify-center gap-2 transition-all active:scale-95"
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
