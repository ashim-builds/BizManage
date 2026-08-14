'use client';

import { useState, useEffect } from 'react';
import { Users, Building2, Activity, ShieldBan } from 'lucide-react';
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-400 text-sm">Platform overview — BizManage admin portal</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
