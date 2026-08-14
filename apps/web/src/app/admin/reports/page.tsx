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
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
          <p className="text-slate-400 text-sm">Real-time platform analytics</p>
        </div>
      </div>

      {data.note && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-3 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{data.note}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Building className="w-24 h-24" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Total Businesses</p>
          <h2 className="text-3xl font-bold text-white">{data.totalBusinesses}</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Building className="w-24 h-24" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Active Businesses</p>
          <h2 className="text-3xl font-bold text-emerald-400">{data.activeBusinesses}</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Building className="w-24 h-24" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">New (Last 30 Days)</p>
          <h2 className="text-3xl font-bold text-blue-400">+{data.newBusinesses}</h2>
        </div>


      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <FileBarChart className="w-16 h-16 text-slate-800 mb-4" />
          <h3 className="text-lg font-bold text-slate-400 mb-2">Financial Reports</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Revenue tracking, MRR, and Churn reports will be available here once the global billing architecture is implemented.
          </p>
        </div>
      </div>
    </div>
  );
}
