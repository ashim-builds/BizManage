'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Building2, Activity, ShieldBan, CreditCard, ArrowRight, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardStats {
  businesses: {
    total: number;
    active: number;
    suspended: number;
    recent: {
      id: string;
      name: string;
      email: string | null;
      isActive: boolean;
      createdAt: string;
    }[];
  };
  users: {
    total: number;
  };
  payments?: {
    pendingCount: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
        <h3 className="text-lg font-bold mb-2">Error Loading Dashboard</h3>
        <p>{error}</p>
      </div>
    );
  }

  const pendingPayments = stats?.payments?.pendingCount || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-400 text-sm">Platform overview — BizManage admin portal</p>
      </div>

      {/* PENDING PAYMENTS ALERT BANNER */}
      {pendingPayments > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <span>{pendingPayments} Payment Request{pendingPayments > 1 ? 's' : ''} Awaiting Verification</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase">Action Required</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Customers have transferred funds via Garima Bikas Bank QR and submitted proof.
              </p>
            </div>
          </div>

          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all whitespace-nowrap self-start sm:self-auto"
          >
            Verify & Activate <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pending Payments Widget */}
        <Link
          href="/admin/payments"
          className={`rounded-2xl p-6 flex items-center gap-4 transition-all border ${
            pendingPayments > 0
              ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50 ring-1 ring-amber-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-400 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white font-mono">{pendingPayments}</h3>
            <p className="text-sm font-medium text-slate-400">Pending Payments</p>
          </div>
        </Link>
        {/* Total Businesses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 text-blue-500 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white font-mono">{stats?.businesses.total || 0}</h3>
            <p className="text-sm font-medium text-slate-400">Total Businesses</p>
          </div>
        </div>

        {/* Active Businesses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-500 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white font-mono">{stats?.businesses.active || 0}</h3>
            <p className="text-sm font-medium text-slate-400">Active Businesses</p>
          </div>
        </div>
        
        {/* Suspended Businesses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-500 shrink-0">
            <ShieldBan className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white font-mono">{stats?.businesses.suspended || 0}</h3>
            <p className="text-sm font-medium text-slate-400">Suspended Businesses</p>
          </div>
        </div>


      </div>

      {/* Recent Businesses Table */}
      <div className="pt-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Recently Registered Businesses</h2>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Business Name</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Email</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Date Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stats?.businesses.recent.map((business) => (
                  <tr key={business.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      {business.name}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell text-slate-400">
                      {business.email || '—'}
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
                    <td className="px-6 py-4 text-right text-slate-400 whitespace-nowrap">
                      {new Date(business.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                
                {(!stats?.businesses.recent || stats.businesses.recent.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No businesses registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
