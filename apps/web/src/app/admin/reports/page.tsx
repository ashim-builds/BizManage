'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FileBarChart, Users, Building, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportData {
  totalBusinesses: number;
  newBusinesses: number;
  activeBusinesses: number;
  totalUsers: number;
  packagesDistribution: { plan: string; count: number }[];
  payments?: {
    total: number;
    pending: number;
    completed: number;
    totalRevenue: number;
  };
  note: string;
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reports');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm">Platform metrics & Garima Bikas Bank verified subscription revenue</p>
        </div>
      </div>

      {data.note && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-3 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{data.note}</p>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Businesses</p>
          <h2 className="text-3xl font-bold text-white font-mono">{data.totalBusinesses}</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <p className="text-slate-400 text-sm font-medium mb-1">Active Businesses</p>
          <h2 className="text-3xl font-bold text-emerald-400 font-mono">{data.activeBusinesses}</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <p className="text-slate-400 text-sm font-medium mb-1">Verified Revenue</p>
          <h2 className="text-3xl font-bold text-emerald-400 font-mono">
            Rs. {(data.payments?.totalRevenue || 0).toLocaleString()}
          </h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <p className="text-slate-400 text-sm font-medium mb-1">Pending Verifications</p>
          <h2 className="text-3xl font-bold text-amber-400 font-mono">{data.payments?.pending || 0}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Plan Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">Subscription Distribution</h3>
          </div>
          <div className="p-6">
            {data.packagesDistribution.length > 0 ? (
              <div className="space-y-4">
                {data.packagesDistribution.map(pkg => (
                  <div key={pkg.plan} className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">{pkg.plan}</span>
                    <span className="text-white font-bold bg-slate-800 px-3 py-1 rounded-full text-sm">
                      {pkg.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No businesses have selected a plan yet.</p>
            )}
          </div>
        </div>

        {/* Bank QR Payment Verification Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
          <h3 className="font-semibold text-white">Bank QR Verification Summary</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Total Verification Requests Submitted:</span>
              <span className="font-mono font-bold text-white text-sm">{data.payments?.total || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Approved & Activated Plans:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{data.payments?.completed || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Pending Review:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">{data.payments?.pending || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
