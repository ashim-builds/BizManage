'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Crown, Check, Lock, Sparkles, Zap, ShieldCheck, ArrowRight, Plus, Minus } from 'lucide-react';
import { api } from '@/lib/api';
import { useUpdateBusiness } from '@/services/businessService';
import { AVAILABLE_FEATURES } from '@/app/admin/packages/page';

interface SubscriptionPackage {
  id: string;
  name: string;
  price: string;
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  trialDays: number;
  features: string[];
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const updateBusiness = useUpdateBusiness();
  const currentBiz = user?.memberships?.[0]?.business;
  
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [esewaData, setEsewaData] = useState<any>(null);
  const [expandedPackages, setExpandedPackages] = useState<string[]>([]);

  const toggleExpand = (pkgId: string) => {
    setExpandedPackages(prev => 
      prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : [...prev, pkgId]
    );
  };

  useEffect(() => {
    if (currentBiz?.subscriptionPackage) {
      setSelectedPlanId(currentBiz.subscriptionPackage.id);
    }
  }, [currentBiz?.subscriptionPackage]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get('/packages');
        if (res.data.success) {
          const parsedPackages = res.data.data.map((pkg: any) => ({
            ...pkg,
            features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || []),
          }));
          setPackages(parsedPackages);
        }
      } catch (err) {
        console.error('Failed to fetch packages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    if (esewaData) {
      const form = document.createElement('form');
      form.setAttribute('method', 'POST');
      form.setAttribute('action', esewaData.paymentUrl);

      Object.keys(esewaData).forEach(key => {
        if (key !== 'paymentUrl') {
          const hiddenField = document.createElement('input');
          hiddenField.setAttribute('type', 'hidden');
          hiddenField.setAttribute('name', key);
          hiddenField.setAttribute('value', esewaData[key]);
          form.appendChild(hiddenField);
        }
      });

      document.body.appendChild(form);
      form.submit();
    }
  }, [esewaData]);

  const handleSelectPlan = async (pkg: SubscriptionPackage) => {
    try {
      if (Number(pkg.price) > 0 && !pkg.isDefault) {
        setMsg('Initializing eSewa payment...');
        const res = await api.post('/esewa/initiate', { packageId: pkg.id });
        setEsewaData(res.data.data);
      } else {
        setSelectedPlanId(pkg.id);
        await updateBusiness.mutateAsync({ 
          name: currentBiz?.name || 'My Business',
          currency: currentBiz?.currency || 'NPR',
          subscriptionPackageId: pkg.id 
        });
        await refreshUser();
        setMsg(`${pkg.name} activated! You now have full access to core features.`);
      }
    } catch (error) {
      setMsg('Failed to update subscription plan.');
    }
  };

  const activePackage = packages.find(p => p.id === selectedPlanId);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 mb-2">
            <Crown className="w-3.5 h-3.5" /> Plan & Licensing
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Business Subscription</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Select a plan to activate and unlock your BMS features.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Current Status</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              {activePackage ? activePackage.name : 'No Plan'}
              {activePackage ? (
                currentBiz?.subscriptionStatus === 'ACTIVE' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 font-semibold">Online</span>
                ) : currentBiz?.subscriptionStatus === 'EXPIRED' ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] border border-red-500/20 font-semibold">Expired</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20 font-semibold">Action Required</span>
                )
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {!activePackage && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
          <span>⚠️ Please select a plan below to activate your account and unlock features.</span>
        </div>
      )}

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Subscription Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {packages.map((pkg, idx) => {
          const isActive = selectedPlanId === pkg.id;
          const isPopular = idx === 1; // Highlight second plan as popular usually

          return (
            <div key={pkg.id} className={`relative p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all ${isActive ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl' : isPopular ? 'bg-slate-900/80 border-blue-500/50 shadow-lg' : 'bg-slate-900/50 border-slate-800'}`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-3 mt-1">
                  <div className="flex items-center gap-2">
                    {isPopular ? <Crown className="w-4 h-4 text-blue-400" /> : pkg.isDefault ? null : <Zap className="w-4 h-4 text-blue-400" />}
                    <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                  </div>
                  {isActive && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Active</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  {pkg.isDefault ? 'Essential billing & inventory tracking.' : 'Complete suite of features for your business.'}
                </p>

                <div className="mb-6">
                  <span className="text-3xl font-extrabold text-white font-mono">{pkg.currency} {pkg.price}</span>
                  <span className="text-xs text-slate-400"> / {pkg.billingPeriod.toLowerCase()}</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-300 border-t border-slate-800 pt-6">
                  {(expandedPackages.includes(pkg.id) ? pkg.features : pkg.features.slice(0, 5)).map(featId => {
                    const featObj = AVAILABLE_FEATURES.find(f => f.id === featId);
                    return (
                      <li key={featId} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{featObj ? featObj.label : featId}</span>
                      </li>
                    );
                  })}
                  {pkg.features.length > 5 && (
                    <li 
                      className="flex items-center gap-2 text-slate-400 hover:text-slate-200 font-medium pt-2 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(pkg.id)}
                    >
                      {expandedPackages.includes(pkg.id) ? (
                        <>
                          <Minus className="w-4 h-4 shrink-0" />
                          <span>Show less</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 shrink-0" />
                          <span>{pkg.features.length - 5} more features included</span>
                        </>
                      )}
                    </li>
                  )}
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan(pkg)}
                disabled={isActive}
                className={`w-full mt-8 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 cursor-default'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-1.5'
                }`}
              >
                {isActive ? 'Current Active Plan' : `Select ${pkg.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Licensing Matrix */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-1">Feature Licensing Matrix</h3>
        <p className="text-xs text-slate-400 mb-6">See which features are unlocked with your active subscription plan.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3 w-1/4">ERP Feature</th>
                {packages.map(pkg => (
                  <th key={pkg.id} className="pb-3 px-3 text-center w-1/4">{pkg.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {AVAILABLE_FEATURES.map(feat => (
                <tr key={feat.id}>
                  <td className="py-3 px-3 font-semibold">{feat.label}</td>
                  {packages.map(pkg => (
                    <td key={pkg.id} className="py-3 px-3 text-center">
                      {pkg.features.includes(feat.id) ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
