'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, Building2, User, ShieldBan, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface Business {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  subscriptionPlan?: string;
  subscriptionPackage?: { 
    name: string;
    trialDays: number;
    billingPeriod: string;
  } | null;
  createdAt: string;
  userCount: number;
  owner: { name: string; email: string } | null;
  pendingPayment?: {
    id: string;
    packageName: string;
    amount: number;
    referenceId: string;
  } | null;
}

function getExpiryDisplay(business: Business) {
  if (business.subscriptionStatus === 'EXPIRED') {
    return <div className="text-xs text-red-400 mt-0.5">Expired</div>;
  }
  
  if (business.currentPeriodEnd) {
    if (business.subscriptionPackage && business.subscriptionPackage.trialDays > 0) {
      const periodDays = business.subscriptionPackage.billingPeriod === 'YEARLY' ? 365 : 30;
      const trialEndDate = new Date(business.currentPeriodEnd);
      trialEndDate.setDate(trialEndDate.getDate() - periodDays);
      const now = new Date();
      
      if (now < trialEndDate) {
        const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return <div className="text-[10px] text-amber-400 mt-0.5">Trial ({daysLeft} days left)</div>;
      }
    }
    return <div className="text-[10px] text-slate-400 mt-0.5">Expires: {new Date(business.currentPeriodEnd).toLocaleDateString()}</div>;
  }
  
  return null;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    business: Business | null;
    action: 'suspend' | 'activate' | null;
  }>({
    isOpen: false,
    business: null,
    action: null,
  });

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/businesses`, {
        params: { page, limit: 15, search, status: statusFilter }
      });
      if (res.data.success) {
        setBusinesses(res.data.data.businesses);
        setTotalPages(res.data.data.pagination.totalPages || 1);
        setTotalRecords(res.data.data.pagination.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchBusinesses();
  };

  const handleStatusChange = async () => {
    if (!confirmModal.business || !confirmModal.action) return;
    
    const newStatus = confirmModal.action === 'activate';
    
    try {
      const res = await api.patch(`/admin/businesses/${confirmModal.business.id}/status`, {
        isActive: newStatus
      });
      
      if (res.data.success) {
        toast.success(`Business ${newStatus ? 'activated' : 'suspended'} successfully`);
        setConfirmModal({ isOpen: false, business: null, action: null });
        fetchBusinesses();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update business status');
      setConfirmModal({ isOpen: false, business: null, action: null });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Businesses</h1>
          <p className="text-slate-400 text-sm">Manage tenants and organizations</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading && businesses.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Building2 className="w-12 h-12 mb-4 text-slate-700" />
            <p>No businesses found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table (Hidden on small screens) */}
            <table className="w-full text-left text-sm text-slate-300 hidden md:table">
              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Business / Owner</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Created Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right rounded-tr-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {businesses.map((business) => (
                  <tr key={business.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {business.logoUrl ? (
                          <img src={business.logoUrl} alt={business.name} className="w-8 h-8 rounded-lg object-cover bg-slate-800 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                            {business.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">{business.name}</div>
                      {business.owner ? (
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" /> {business.owner.name}
                        </div>
                      ) : (
                          <div className="text-xs text-slate-500 mt-1">No owner linked</div>
                        )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {business.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{business.subscriptionPlan || 'No Plan'}</div>
                      {business.pendingPayment ? (
                        <Link
                          href="/admin/payments"
                          className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold hover:bg-amber-500/30 transition-all"
                          title={`Payment of Rs. ${business.pendingPayment.amount} submitted (Ref: ${business.pendingPayment.referenceId})`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-0.5" />
                          ⏳ Verification Pending: {business.pendingPayment.packageName}
                        </Link>
                      ) : (
                        getExpiryDisplay(business)
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(business.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {business.isActive ? (
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, business, action: 'suspend' })}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-medium border border-amber-500/20 transition-colors"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, business, action: 'activate' })}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium border border-emerald-500/20 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        <Link
                          href={`/admin/businesses/${business.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards (Visible only on small screens) */}
            <div className="md:hidden divide-y divide-slate-800">
              {businesses.map((business) => (
                <div key={business.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      {business.logoUrl ? (
                        <img src={business.logoUrl} alt={business.name} className="w-8 h-8 rounded-lg object-cover bg-slate-800 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {business.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-white text-base">{business.name}</h3>
                        {business.owner && (
                          <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                            <User className="w-3.5 h-3.5" /> {business.owner.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {business.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 shrink-0">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20 shrink-0">
                        Suspended
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500 mb-0.5">Plan</p>
                      <p className="font-medium text-slate-300">{business.subscriptionPlan || 'No Plan'}</p>
                      {business.pendingPayment && (
                        <Link
                          href="/admin/payments"
                          className="mt-1 block text-[10px] text-amber-400 font-bold hover:underline"
                        >
                          ⏳ Review Payment (Rs. {business.pendingPayment.amount})
                        </Link>
                      )}
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500 mb-0.5">Users</p>
                      <p className="font-medium text-slate-300">{business.userCount}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                    <span className="text-xs text-slate-500">
                      Joined {new Date(business.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      {business.isActive ? (
                        <button
                          onClick={() => setConfirmModal({ isOpen: true, business, action: 'suspend' })}
                          className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-medium"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmModal({ isOpen: true, business, action: 'activate' })}
                          className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium"
                        >
                          Activate
                        </button>
                      )}
                      <Link
                        href={`/admin/businesses/${business.id}`}
                        className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-sm text-slate-400">
              Showing page {page} of {totalPages} <span className="text-slate-600">({totalRecords} total)</span>
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.business && (
        <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className={`p-6 border-b ${confirmModal.action === 'suspend' ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmModal.action === 'suspend' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {confirmModal.action === 'suspend' ? <ShieldBan className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {confirmModal.action === 'suspend' ? 'Suspend Business?' : 'Activate Business?'}
                </h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-slate-300 font-medium mb-2">{confirmModal.business.name}</p>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                {confirmModal.action === 'suspend' 
                  ? 'Suspending this business will immediately prevent its users from accessing the application and their business data. No data will be deleted.' 
                  : 'Activating this business will immediately restore access to the application for all its users.'}
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, business: null, action: null })}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                    confirmModal.action === 'suspend' 
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  {confirmModal.action === 'suspend' ? 'Suspend Business' : 'Activate Business'}
                </button>
              </div>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}
