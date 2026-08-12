'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Crown, Check, Lock, Sparkles, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

import { useUpdateBusiness } from '@/services/businessService';

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const updateBusiness = useUpdateBusiness();
  const currentBiz = user?.memberships?.[0]?.business;
  const [selectedPlan, setSelectedPlan] = useState<string | null>(currentBiz?.subscriptionPlan || null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentBiz?.subscriptionPlan) {
      setSelectedPlan(currentBiz.subscriptionPlan);
    }
  }, [currentBiz?.subscriptionPlan]);

  const handleSelectPlan = async (plan: 'FREE' | 'PRO' | 'ENTERPRISE') => {
    try {
      setSelectedPlan(plan);
      // We must provide the required fields for updateBusiness (name) 
      // but since they are already set we can just pass them back, or API needs to handle partial updates.
      // Wait, updateBusinessSchema requires name.
      await updateBusiness.mutateAsync({ 
        name: currentBiz?.name || 'My Business',
        subscriptionPlan: plan 
      });
      await refreshUser();
    if (plan === 'FREE') {
      setMsg('Free Starter Plan activated! You now have full access to core BMS features.');
    } else if (plan === 'PRO') {
      setMsg('Pro Business Plan selected! Our team will verify and activate all premium features shortly.');
    } else {
      setMsg('Enterprise Growth Plan selected! Our team will contact you to configure multi-branch features.');
    }
    } catch (error) {
      setMsg('Failed to update subscription plan.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-12">
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
              {selectedPlan === 'FREE' ? 'Free Starter' : selectedPlan === 'PRO' ? 'Pro Business' : selectedPlan === 'ENTERPRISE' ? 'Enterprise Growth' : 'No Active Plan'}
              {selectedPlan ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 font-semibold">Active</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20 font-semibold">Action Required</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {!selectedPlan && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
          <span>⚠️ Please select a plan below (including the Free Starter plan) to activate your account and unlock features.</span>
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
        {/* FREE STARTER */}
        <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all ${selectedPlan === 'FREE' ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl' : 'bg-slate-900/50 border-slate-800'}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Free Starter</h3>
              {selectedPlan === 'FREE' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Active</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-6">Essential94-billing & inventory tracking.</p>

            <div className="mb-6">
              <span className="text-3xl font-extrabold text-white font-mono">Rs. 0</span>
              <span className="text-xs text-slate-400"> / forever free</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-300 border-t border-slate-800 pt-6">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unlimited Sales Invoices & Purchases</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Inventory & Stock Movement Log</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Customer & Supplier Auto-Ledger</span>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="line-through">Custom Invoice Logo & Branding</span>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="line-through">Advanced Profit & Loss & Daybook Reports</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSelectPlan('FREE')}
            disabled={selectedPlan === 'FREE'}
            className={`w-full mt-8 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              selectedPlan === 'FREE'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 cursor-default'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
            }`}
          >
            {selectedPlan === 'FREE' ? 'Current Active Plan' : 'Select Free Plan'}
          </button>
        </div>

        {/* PRO BUSINESS */}
        <div className={`relative p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all ${selectedPlan === 'PRO' ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl' : 'bg-slate-900/80 border-blue-500/50 shadow-lg'}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
            Most Popular
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 mt-1">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Pro Business</h3>
              </div>
              {selectedPlan === 'PRO' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Active</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-6">Complete ERP suite with custom094-branding.</p>

            <div className="mb-6">
              <span className="text-3xl font-extrabold text-white font-mono">Rs. 999</span>
              <span className="text-xs text-slate-400"> / month</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-300 border-t border-slate-800 pt-6">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Everything in Free Starter</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Custom Business Logo & PDF Branding</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Advanced Profit & Loss & Daybook Reports</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-Account Cash & Bank Manager</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Priority Technical Support</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSelectPlan('PRO')}
            disabled={selectedPlan === 'PRO'}
            className={`w-full mt-8 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              selectedPlan === 'PRO'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 cursor-default'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-1.5'
            }`}
          >
            {selectedPlan === 'PRO' ? 'Current Active Plan' : 'Select Pro Plan'}
          </button>
        </div>

        {/* ENTERPRISE GROWTH */}
        <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all ${selectedPlan === 'ENTERPRISE' ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl' : 'bg-slate-900/50 border-slate-800'}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Enterprise Growth</h3>
              </div>
              {selectedPlan === 'ENTERPRISE' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Active</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-6">Multi-branch & staff roles.</p>

            <div className="mb-6">
              <span className="text-3xl font-extrabold text-white font-mono">Rs. 2,499</span>
              <span className="text-xs text-slate-400"> / month</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-300 border-t border-slate-800 pt-6">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Everything in Pro Business</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-Branch & Multi-Tenant Setup</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unlimited Staff Permissions</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dedicated Account Manager</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSelectPlan('ENTERPRISE')}
            disabled={selectedPlan === 'ENTERPRISE'}
            className={`w-full mt-8 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              selectedPlan === 'ENTERPRISE'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 cursor-default'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
            }`}
          >
            {selectedPlan === 'ENTERPRISE' ? 'Current Active Plan' : 'Select Enterprise Plan'}
          </button>
        </div>
      </div>

      {/* Feature Licensing Matrix */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-1">Feature Licensing Matrix</h3>
        <p className="text-xs text-slate-400 mb-6">See which features are unlocked with your active subscription plan.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">ERP Feature</th>
                <th className="pb-3 px-3 text-center">Free Starter</th>
                <th className="pb-3 px-3 text-center">Pro Business</th>
                <th className="pb-3 px-3 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-3 px-3 font-semibold">Sales Invoices & Purchase Bills</td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold">Inventory & Stock Tracking</td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold">Custom Logo & Invoice Branding</td>
                <td className="py-3 px-3 text-center text-slate-600"><Lock className="w-4 h-4 mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold">Advanced Profit & Loss Reports</td>
                <td className="py-3 px-3 text-center text-slate-600"><Lock className="w-4 h-4 mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold">Multi-Branch & Staff Roles</td>
                <td className="py-3 px-3 text-center text-slate-600"><Lock className="w-4 h-4 mx-auto" /></td>
                <td className="py-3 px-3 text-center text-slate-600"><Lock className="w-4 h-4 mx-auto" /></td>
                <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
