'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Building, Mail, Phone, MapPin, User, Save, ShieldAlert, CheckCircle2, Globe, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface BusinessDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logoUrl?: string | null;
  address: string | null;
  taxNumber: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  subscriptionPackageId: string | null;
  settings?: {
    enableStorefront: boolean;
    storeSlug: string | null;
    storeTitle: string | null;
    storeDescription: string | null;
    whatsappNumber: string | null;
  } | null;
  subscriptionPackage?: {
    id: string;
    name: string;
    price: number;
    billingPeriod: string;
    currency: string;
    trialDays?: number;
  } | null;
  memberships: {
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
  }[];
}

export default function BusinessDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [busRes, pkgRes] = await Promise.all([
        api.get(`/admin/businesses/${params.id}`),
        api.get('/admin/packages'),
      ]);

      if (busRes.data.success) {
        const b = busRes.data.data;
        setBusiness(b);
        setSelectedPackageId(b.subscriptionPackageId || '');
      }

      if (pkgRes.data.success) {
        setPackages(pkgRes.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch business details');
      router.push('/admin/businesses');
    } finally {
      setLoading(false);
    }
  };

  const handlePackageAssign = async () => {
    try {
      await api.put(`/admin/businesses/${params.id}/subscription`, {
        subscriptionPackageId: selectedPackageId || null
      });
      toast.success('Subscription plan updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update subscription');
    }
  };



  const handleSuspendToggle = async () => {
    if (!business) return;
    try {
      await api.patch(`/admin/businesses/${params.id}/status`, {
        isActive: !business.isActive
      });
      toast.success(business.isActive ? 'Business suspended' : 'Business activated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };



  if (loading || !business) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const owner = business.memberships.find(m => m.role === 'OWNER')?.user;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-12">
      <button 
        onClick={() => router.push('/admin/businesses')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to businesses
      </button>

      <div className="flex items-center gap-4">
        {business.logoUrl ? (
          <img src={business.logoUrl} alt={business.name} className="w-14 h-14 rounded-xl object-cover shadow-lg shrink-0" />
        ) : (
          <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0">
            {business.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{business.name}</h1>
            {business.isActive ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                Suspended
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Left Column - Business Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#121316] border border-slate-800/60 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact & Location</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-300 text-sm">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                {business.email || 'No email provided'}
              </div>
              <div className="flex items-center gap-3 text-slate-300 text-sm">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                {business.phone || 'No phone provided'}
              </div>
              <div className="flex items-center gap-3 text-slate-300 text-sm">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                {business.address || 'No address provided'}
              </div>
            </div>
          </div>

          <div className="bg-[#121316] border border-slate-800/60 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/60">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Owner</h3>
            </div>
            {owner ? (
              <div className="p-6 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold">
                  {owner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{owner.name}</p>
                  <p className="text-sm text-slate-400">{owner.email}</p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-slate-400 text-sm">No owner found.</div>
            )}
          </div>

          {/* Online Storefront & Website Card */}
          <div className="bg-[#121316] border border-slate-800/60 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" /> Online Storefront & Website
              </h3>
              {business.settings?.enableStorefront && business.settings?.storeSlug ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Published Live
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                  Disabled
                </span>
              )}
            </div>
            <div className="p-6 space-y-3">
              {business.settings?.enableStorefront && business.settings?.storeSlug ? (
                <>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Public Web Address</span>
                    <a
                      href={`/store/${business.settings.storeSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-sm border border-emerald-500/30 transition-all"
                    >
                      <Globe className="w-4 h-4" />
                      <span>/store/{business.settings.storeSlug}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  {business.settings.storeTitle && (
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-500">Store Title: </span>
                      <strong className="text-white">{business.settings.storeTitle}</strong>
                    </div>
                  )}
                  {business.settings.whatsappNumber && (
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-500">WhatsApp Contact: </span>
                      <strong className="text-white">{business.settings.whatsappNumber}</strong>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  This business has not enabled or configured an online storefront handle yet.
                </p>
              )}
            </div>
          </div>

          <div className="bg-[#121316] border border-slate-800/60 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/60">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscription</h3>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-white mb-1">
                  {business.subscriptionPackage ? business.subscriptionPackage.name : 'No Plan'}
                </p>
                <div className="text-sm text-slate-400 space-y-1">
                  <p>
                    {business.subscriptionPackage 
                      ? `${business.subscriptionPackage.currency} ${business.subscriptionPackage.price}/${business.subscriptionPackage.billingPeriod.toLowerCase()}` 
                      : 'Assign a plan to unlock features'}
                  </p>
                  {(() => {
                    if (!business.currentPeriodEnd) return null;
                    if (business.subscriptionPackage && (business.subscriptionPackage.trialDays || 0) > 0) {
                      const periodDays = business.subscriptionPackage.billingPeriod === 'YEARLY' ? 365 : 30;
                      const trialEndDate = new Date(business.currentPeriodEnd);
                      trialEndDate.setDate(trialEndDate.getDate() - periodDays);
                      const now = new Date();
                      
                      if (now < trialEndDate) {
                        const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        return <p className="text-amber-400 font-medium">Trial: {daysLeft} days remaining</p>;
                      }
                    }
                    return <p>Expires on: {new Date(business.currentPeriodEnd).toLocaleDateString()}</p>;
                  })()}
                </div>
              </div>
              
              {business.subscriptionPackage ? (
                business.subscriptionStatus === 'EXPIRED' ? (
                  <span className="text-red-500 font-bold text-xs uppercase bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Expired</span>
                ) : business.subscriptionStatus === 'ACTIVE' ? (
                  <span className="text-emerald-500 font-bold text-xs uppercase bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Online</span>
                ) : (
                  <span className="text-amber-500 font-bold text-xs uppercase bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    {business.subscriptionStatus}
                  </span>
                )
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Column - Admin Actions */}
        <div className="space-y-6">
          <div className="bg-[#121316] border border-slate-800/60 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/60">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Actions</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Assign subscription plan</label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 mb-2 text-sm"
                >
                  <option value="">-- No Plan --</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.currency} {p.price}/{p.billingPeriod.toLowerCase()}
                    </option>
                  ))}
                </select>
                {selectedPackageId && (() => {
                  const pkg = packages.find(p => p.id === selectedPackageId);
                  if (pkg) {
                    const addDays = pkg.billingPeriod === 'YEARLY' ? 365 : 30;
                    const trialDays = pkg.trialDays || 0;
                    const expectedExpiry = new Date();
                    expectedExpiry.setDate(expectedExpiry.getDate() + addDays + trialDays);
                    return (
                      <div className="text-xs text-amber-500 mb-3 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        <strong>Expected Expiry:</strong> {expectedExpiry.toLocaleDateString()} 
                        {trialDays > 0 ? ` (includes ${trialDays} trial days)` : ''}
                      </div>
                    );
                  }
                  return null;
                })()}
                <p className="text-xs text-slate-500 mb-3">The business can be activated without a plan and assigned one later.</p>
                <button 
                  onClick={handlePackageAssign}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Save plan change only
                </button>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <button 
                  onClick={handleSuspendToggle}
                  className={`w-full py-2.5 flex justify-center items-center gap-2 rounded-xl text-sm font-medium transition-colors ${
                    business.isActive 
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                    : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  {business.isActive ? 'Suspend business' : 'Activate business'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
