'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Activity, ShieldAlert, User, Building, Settings, Search, AlertCircle, Eye, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface SystemLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: any;
  createdAt: string;
  admin: {
    name: string;
    email: string;
  };
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/logs?page=${p}&limit=20`);
      if (res.data.success) {
        setLogs(res.data.data.logs);
        setTotalPages(res.data.data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to fetch system logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('PAYMENT')) return <CreditCard className="w-4 h-4 text-amber-400" />;
    if (action.includes('BUSINESS')) return <Building className="w-4 h-4 text-blue-400" />;
    if (action.includes('USER')) return <User className="w-4 h-4 text-purple-400" />;
    if (action.includes('SETTING')) return <Settings className="w-4 h-4 text-emerald-400" />;
    if (action.includes('LOGIN')) return <Activity className="w-4 h-4 text-emerald-400" />;
    return <ShieldAlert className="w-4 h-4 text-rose-400" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('PAYMENT_SUBMIT')) return 'text-amber-400 bg-amber-400/10';
    if (action.includes('PAYMENT_APPROVE')) return 'text-emerald-400 bg-emerald-400/10';
    if (action.includes('PAYMENT_REJECT')) return 'text-rose-400 bg-rose-400/10';
    if (action.includes('SUSPEND') || action.includes('DELETE')) return 'text-rose-400 bg-rose-400/10';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-amber-400 bg-amber-400/10';
    if (action.includes('CREATE') || action.includes('ACTIVATE') || action.includes('IMPORT')) return 'text-emerald-400 bg-emerald-400/10';
    return 'text-blue-400 bg-blue-400/10';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Logs</h1>
          <p className="text-slate-400 text-sm">Immutable audit trail of administrator and payment actions</p>
        </div>
        
        {/* Placeholder for future search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search logs (soon)..."
            disabled
            className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 w-64 focus:outline-none opacity-50 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Performed by</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-3">
                      <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    No system logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {log.admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{log.admin.name}</p>
                          <p className="text-xs text-slate-500">{log.admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wide ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.targetType ? (
                        <div>
                          <span className="text-xs text-slate-500 font-mono">{log.targetType}</span>
                          <p className="text-sm text-slate-300 font-mono truncate max-w-[150px]" title={log.targetId}>
                            {log.targetId?.slice(0, 8)}...
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {log.details ? (
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors inline-flex"
                          title="View Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-600 text-sm pr-4">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Page <span className="font-medium text-white">{page}</span> of <span className="font-medium text-white">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Audit Log Payload</h3>
                <p className="text-sm text-slate-400 font-mono">{selectedLog.id}</p>
              </div>
              <div className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide ${getActionColor(selectedLog.action)}`}>
                {selectedLog.action}
              </div>
            </div>
            
            <div className="p-6 bg-[#0a0a0b] overflow-x-auto">
              <pre className="text-sm font-mono text-emerald-400">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
            
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}
