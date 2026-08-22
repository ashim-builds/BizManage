'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building2,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface PaymentRequest {
  id: string;
  businessId: string;
  subscriptionPackageId: string;
  amount: string | number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  gateway: string;
  referenceId: string;
  failureReason?: string;
  verificationResponse?: any;
  createdAt: string;
  business: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    taxNumber?: string;
    currency: string;
    subscriptionStatus: string;
    subscriptionPackage?: {
      id: string;
      name: string;
    };
  };
  subscriptionPackage: {
    id: string;
    name: string;
    price: string;
    currency: string;
    billingPeriod: string;
  };
}

export default function AdminPaymentRequestsPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED'>('PENDING');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/payment-requests', {
        params: { status: filterStatus },
      });
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const handleApprove = async (payment: PaymentRequest) => {
    if (!confirm(`Are you sure you verified the payment for ${payment.business.name} (Rs. ${payment.amount}) in your Garima Bikas Bank account?`)) {
      return;
    }

    try {
      setActionLoadingId(payment.id);
      const res = await api.post(`/admin/payment-requests/${payment.id}/approve`);
      if (res.data.success) {
        toast.success(`Approved! ${payment.business.name} activated on ${payment.subscriptionPackage.name}.`);
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve payment request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (payment: PaymentRequest) => {
    const reason = prompt(`Enter rejection reason for ${payment.business.name}:`, 'Payment not found in Garima Bikas Bank statement.');
    if (reason === null) return;

    try {
      setActionLoadingId(payment.id);
      const res = await api.post(`/admin/payment-requests/${payment.id}/reject`, { reason });
      if (res.data.success) {
        toast.success(`Payment request for ${payment.business.name} rejected.`);
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject payment request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.business.name?.toLowerCase().includes(q) ||
      r.referenceId?.toLowerCase().includes(q) ||
      r.verificationResponse?.senderName?.toLowerCase().includes(q) ||
      r.business.phone?.includes(q) ||
      r.business.email?.toLowerCase().includes(q)
    );
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto font-sans text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 mb-2">
            <CreditCard className="w-3.5 h-3.5" /> Garima Bank QR Verifications
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Manual Payment Requests</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Verify bank deposits and activate customer subscription packages with 1 click.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search business, Ref ID, sender..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold self-stretch sm:self-auto">
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterStatus === 'PENDING'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('COMPLETED')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterStatus === 'COMPLETED'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterStatus === 'REJECTED'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </button>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              filterStatus === 'ALL'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            Loading payment verification requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center p-12 text-slate-500 text-sm">
            No payment requests found matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Business Details</th>
                  <th className="px-5 py-4">Requested Plan</th>
                  <th className="px-5 py-4">Transfer Ref / ID</th>
                  <th className="px-5 py-4">Sender Info</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredRequests.map((r) => {
                  const isPending = r.status === 'PENDING';
                  const isApproved = r.status === 'COMPLETED';
                  const isRejected = r.status === 'REJECTED';
                  const isActioning = actionLoadingId === r.id;

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Business */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-sm">{r.business.name}</div>
                        {r.business.phone && (
                          <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" /> {r.business.phone}
                          </div>
                        )}
                        {r.business.email && (
                          <div className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" /> {r.business.email}
                          </div>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 inline-block">
                          {r.subscriptionPackage.name}
                        </span>
                        <div className="font-mono font-bold text-emerald-400 text-xs mt-1">
                          Rs. {Number(r.amount).toLocaleString()}
                        </div>
                      </td>

                      {/* Ref ID */}
                      <td className="px-5 py-4 font-mono">
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-blue-300 font-bold text-xs inline-block">
                          {r.referenceId}
                        </div>
                        {r.verificationResponse?.notes && (
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[160px] truncate">
                            Note: {r.verificationResponse.notes}
                          </p>
                        )}
                      </td>

                      {/* Sender Info */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">
                          {r.verificationResponse?.senderName || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Garima Bikas Bank QR
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approved & Active
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                        {r.failureReason && (
                          <p className="text-[10px] text-rose-400/80 mt-1 max-w-[140px] truncate" title={r.failureReason}>
                            {r.failureReason}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleReject(r)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition-all disabled:opacity-50"
                              title="Reject Request"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleApprove(r)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve & Activate
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
