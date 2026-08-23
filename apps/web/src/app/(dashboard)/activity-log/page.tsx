'use client';

import { useState } from 'react';
import { useAuditLogs, AuditLogItem } from '@/services/auditLogService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/ui/ModalPortal';
import {
  History,
  Search,
  RefreshCw,
  Download,
  Filter,
  User,
  ShoppingBag,
  Receipt,
  Package,
  Wallet,
  Calendar,
  Eye,
  X,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export default function ActivityLogPage() {
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [page, setPage] = useState(1);
  const [inspectingItem, setInspectingItem] = useState<AuditLogItem | null>(null);

  const { data, isLoading, isError, refetch } = useAuditLogs({
    search: search || undefined,
    module: selectedModule !== 'ALL' ? selectedModule : undefined,
    page,
    limit: 30,
  });

  const logs = data?.data || [];
  const meta = data?.meta;
  const summary = meta?.summary || {
    totalEvents: 0,
    salesCount: 0,
    purchasesCount: 0,
    inventoryCount: 0,
    financialCount: 0,
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['Timestamp', 'Module', 'Action', 'User Name', 'User Email', 'IP Address', 'Record ID'];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.module,
      log.action,
      log.user?.name || 'System / Guest',
      log.user?.email || 'N/A',
      log.ipAddress || 'N/A',
      log.recordId || 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Business_Activity_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getModuleBadgeStyle = (mod: string) => {
    const m = (mod || '').toLowerCase();
    if (m.includes('sale')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (m.includes('purchase')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (m.includes('item') || m.includes('inventory') || m.includes('stock')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (m.includes('payment') || m.includes('expense') || m.includes('income') || m.includes('account')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const getModuleIcon = (mod: string) => {
    const m = (mod || '').toLowerCase();
    if (m.includes('sale')) return Receipt;
    if (m.includes('purchase')) return ShoppingBag;
    if (m.includes('item') || m.includes('inventory')) return Package;
    if (m.includes('payment') || m.includes('expense') || m.includes('account')) return Wallet;
    return History;
  };

  const formatActionDescription = (log: AuditLogItem) => {
    const action = log.action || '';
    const details = log.newValue || log.details || {};
    
    if (action.includes('CREATE_SALE')) return `Issued Sales Invoice ${details.invoiceNumber ? `#${details.invoiceNumber}` : ''}`;
    if (action.includes('CREATE_PURCHASE')) return `Recorded Purchase Bill ${details.billNumber ? `#${details.billNumber}` : ''}`;
    if (action.includes('CREATE_ITEM')) return `Added new product "${details.name || 'Item'}"`;
    if (action.includes('UPDATE_ITEM')) return `Updated product details "${details.name || 'Item'}"`;
    if (action.includes('CREATE_STOCKMOVEMENT')) return `Stock movement logged (${details.type || 'Adjustment'})`;
    if (action.includes('CREATE_PAYMENT')) return `Recorded payment (${details.paymentMode || 'Cash'})`;
    if (action.includes('CREATE_EXPENSE')) return `Logged expense receipt`;
    if (action.includes('CREATE_PARTY')) return `Registered new party "${details.name || 'Contact'}"`;

    return action.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-purple-400" /> Business Activity Log
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider">
              Real-time Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete operational activity history for sales, purchases, product additions, stock movements, and financial entries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!logs.length}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV Log
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Events Logged</p>
            <h3 className="text-xl font-bold text-white mt-0.5">{summary.totalEvents.toLocaleString()}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Sales Invoices & Returns</p>
            <h3 className="text-xl font-bold text-emerald-400 mt-0.5">{summary.salesCount.toLocaleString()}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Purchases & Inwards</p>
            <h3 className="text-xl font-bold text-blue-400 mt-0.5">{summary.purchasesCount.toLocaleString()}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Product & Stock Changes</p>
            <h3 className="text-xl font-bold text-amber-400 mt-0.5">{summary.inventoryCount.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Module Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
            {[
              { id: 'ALL', label: 'All Operations' },
              { id: 'Sale', label: 'Sales (sell)' },
              { id: 'Purchase', label: 'Purchases (buy)' },
              { id: 'Item', label: 'Products & Stock' },
              { id: 'Payment', label: 'Payments & Financials' },
              { id: 'Party', label: 'Parties & Customers' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedModule(tab.id);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 ${
                  selectedModule === tab.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by action, user, email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Activity Log Table */}
      {isLoading ? (
        <LoadingState message="Fetching real-time business audit trail..." />
      ) : isError ? (
        <ErrorState title="Failed to load activity logs" onRetry={refetch} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<History className="w-7 h-7" />}
          title="No activity logs found"
          description={search ? `No activity events matching "${search}"` : 'Operations will automatically appear here as team members create sales, purchases, or products.'}
        />
      ) : (
        <div className="space-y-4">
          <div className="border border-slate-800 rounded-2xl overflow-x-auto bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Action & Details</th>
                  <th className="px-6 py-4">Performed By</th>
                  <th className="px-6 py-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => {
                  const Icon = getModuleIcon(log.module);
                  const formattedTime = new Date(log.createdAt).toLocaleString();

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formattedTime}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-max ${getModuleBadgeStyle(
                            log.module
                          )}`}
                        >
                          <Icon className="w-3 h-3" /> {log.module}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white flex items-center gap-2">
                            {formatActionDescription(log)}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Action code: <span className="text-slate-300">{log.action}</span>
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {log.user?.name ? log.user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{log.user?.name || 'System Auto'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{log.user?.email || 'System'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectingItem(log)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Inspect raw details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <p>
                Showing Page <strong className="text-white">{page}</strong> of <strong className="text-white">{meta.totalPages}</strong> ({meta.total} total logs)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold transition-all"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INSPECT DETAIL MODAL */}
      {inspectingItem && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-400" /> Inspect Audit Event
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Event ID: {inspectingItem.id}</p>
                </div>
                <button
                  onClick={() => setInspectingItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <span className="text-slate-400">Action Code</span>
                  <p className="font-mono font-bold text-white">{inspectingItem.action}</p>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <span className="text-slate-400">Module</span>
                  <p className="font-mono font-bold text-purple-400">{inspectingItem.module}</p>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <span className="text-slate-400">User / Performer</span>
                  <p className="font-semibold text-white">{inspectingItem.user?.name || 'System'}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{inspectingItem.user?.email || 'N/A'}</p>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <span className="text-slate-400">IP Address</span>
                  <p className="font-mono text-slate-300">{inspectingItem.ipAddress || 'Internal'}</p>
                </div>
              </div>

              {/* Raw JSON details */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">New Value / Mutation Data</label>
                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
                  {JSON.stringify(inspectingItem.newValue || inspectingItem.details || {}, null, 2)}
                </pre>
              </div>

              {inspectingItem.oldValue && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">Previous Value (Before Edit)</label>
                  <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-400 overflow-x-auto max-h-60">
                    {JSON.stringify(inspectingItem.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
