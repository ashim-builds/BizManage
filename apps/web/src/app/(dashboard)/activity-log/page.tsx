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
    if (m.includes('sale')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (m.includes('purchase')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (m.includes('item') || m.includes('inventory') || m.includes('stock'))
      return 'bg-purple-50 text-purple-700 border-purple-200';
    if (m.includes('payment') || m.includes('expense') || m.includes('income') || m.includes('account'))
      return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
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

    if (action.includes('CREATE_SALE'))
      return `Issued Sales Invoice ${details.invoiceNumber ? `#${details.invoiceNumber}` : ''}`;
    if (action.includes('CREATE_PURCHASE'))
      return `Recorded Purchase Bill ${details.billNumber ? `#${details.billNumber}` : ''}`;
    if (action.includes('CREATE_ITEM')) return `Added new product "${details.name || 'Item'}"`;
    if (action.includes('UPDATE_ITEM')) return `Updated product details "${details.name || 'Item'}"`;
    if (action.includes('CREATE_STOCKMOVEMENT')) return `Stock movement logged (${details.type || 'Adjustment'})`;
    if (action.includes('CREATE_PAYMENT')) return `Recorded payment (${details.paymentMode || 'Cash'})`;
    if (action.includes('CREATE_EXPENSE')) return `Logged expense receipt`;
    if (action.includes('CREATE_PARTY')) return `Registered new party "${details.name || 'Contact'}"`;

    return action.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 sm:w-7 sm:h-7 text-purple-600" /> Business Activity Log
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              Audit
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Operational activity history for sales, purchases, inventory, and accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!logs.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all min-h-[38px]"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Overview Cards - Compact 2-Column Responsive Grid on Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-2.5 sm:gap-3.5 shadow-xs">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">Total Events</p>
            <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5 font-mono">{summary.totalEvents.toLocaleString()}</h3>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-2.5 sm:gap-3.5 shadow-xs">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">Sales &amp; Returns</p>
            <h3 className="text-base sm:text-xl font-bold text-emerald-600 mt-0.5 font-mono">{summary.salesCount.toLocaleString()}</h3>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-2.5 sm:gap-3.5 shadow-xs">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">Purchases</p>
            <h3 className="text-base sm:text-xl font-bold text-blue-600 mt-0.5 font-mono">{summary.purchasesCount.toLocaleString()}</h3>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-2.5 sm:gap-3.5 shadow-xs">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">Product Changes</p>
            <h3 className="text-base sm:text-xl font-bold text-amber-600 mt-0.5 font-mono">{summary.inventoryCount.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar - Clean Wrapping Without Horizontal Scroll */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Module Filter Tabs - Wrap cleanly */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'All Operations' },
              { id: 'Sale', label: 'Sales' },
              { id: 'Purchase', label: 'Purchases' },
              { id: 'Item', label: 'Products' },
              { id: 'Payment', label: 'Financials' },
              { id: 'Party', label: 'Parties' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedModule(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
                  selectedModule === tab.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by action, user..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all min-h-[38px]"
            />
          </div>
        </div>
      </div>

      {/* Main Activity Log Display */}
      {isLoading ? (
        <LoadingState message="Fetching real-time business audit trail..." />
      ) : isError ? (
        <ErrorState title="Failed to load activity logs" onRetry={refetch} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<History className="w-7 h-7 text-slate-400" />}
          title="No activity logs found"
          description={
            search
              ? `No activity events matching "${search}"`
              : 'Operations will automatically appear here as team members create sales, purchases, or products.'
          }
        />
      ) : (
        <div className="space-y-4">
          {/* MOBILE CARDS VIEW (< md) */}
          <div className="grid gap-2.5 md:hidden">
            {logs.map((log) => {
              const Icon = getModuleIcon(log.module);
              const formattedTime = new Date(log.createdAt).toLocaleString();

              return (
                <div key={log.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 w-max ${getModuleBadgeStyle(
                        log.module
                      )}`}
                    >
                      <Icon className="w-3 h-3" /> {log.module}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formattedTime}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 leading-snug">{formatActionDescription(log)}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Action: <span className="text-slate-700">{log.action}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                        {log.user?.name ? log.user.name.charAt(0).toUpperCase() : <User className="w-2.5 h-2.5" />}
                      </div>
                      <div className="truncate text-left">
                        <p className="text-xs font-semibold text-slate-800 truncate">{log.user?.name || 'System'}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectingItem(log)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (>= md) */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-xs">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Action &amp; Details</th>
                  <th className="px-6 py-4">Performed By</th>
                  <th className="px-6 py-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const Icon = getModuleIcon(log.module);
                  const formattedTime = new Date(log.createdAt).toLocaleString();

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
                          <p className="font-bold text-slate-900 flex items-center gap-2">{formatActionDescription(log)}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Action code: <span className="text-slate-700">{log.action}</span>
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {log.user?.name ? log.user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{log.user?.name || 'System Auto'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{log.user?.email || 'System'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectingItem(log)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-600">
              <p>
                Showing Page <strong className="text-slate-900">{page}</strong> of{' '}
                <strong className="text-slate-900">{meta.totalPages}</strong> ({meta.total} total logs)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 disabled:opacity-40 text-slate-700 hover:bg-slate-50 font-semibold shadow-xs transition-all"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 disabled:opacity-40 text-slate-700 hover:bg-slate-50 font-semibold shadow-xs transition-all"
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" /> Inspect Audit Event
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Event ID: {inspectingItem.id}</p>
                </div>
                <button
                  onClick={() => setInspectingItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 text-[11px] font-medium">Action Code</span>
                  <p className="font-mono font-bold text-slate-900 break-all">{inspectingItem.action}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 text-[11px] font-medium">Module</span>
                  <p className="font-mono font-bold text-purple-700">{inspectingItem.module}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 text-[11px] font-medium">User / Performer</span>
                  <p className="font-semibold text-slate-900">{inspectingItem.user?.name || 'System'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{inspectingItem.user?.email || 'N/A'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 text-[11px] font-medium">IP Address</span>
                  <p className="font-mono text-slate-700">{inspectingItem.ipAddress || 'Internal'}</p>
                </div>
              </div>

              {/* Raw JSON details */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">New Value / Mutation Data</label>
                <pre className="p-4 rounded-2xl bg-slate-900 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60 border border-slate-800">
                  {JSON.stringify(inspectingItem.newValue || inspectingItem.details || {}, null, 2)}
                </pre>
              </div>

              {inspectingItem.oldValue && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Previous Value (Before Edit)</label>
                  <pre className="p-4 rounded-2xl bg-slate-900 text-[11px] font-mono text-rose-400 overflow-x-auto max-h-60 border border-slate-800">
                    {JSON.stringify(inspectingItem.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all min-h-[40px]"
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
