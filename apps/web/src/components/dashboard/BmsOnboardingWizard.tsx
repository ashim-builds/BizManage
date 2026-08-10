'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ChevronUp, Lock, Sparkles, Building2, Crown, Package, Users, Receipt } from 'lucide-react';

interface OnboardingWizardProps {
  userName: string;
  businessName: string;
  hasProfileComplete?: boolean;
  hasSubscription?: boolean;
  hasItems?: boolean;
  hasParties?: boolean;
  hasTransactions?: boolean;
}

export function BmsOnboardingWizard({
  userName,
  businessName,
  hasProfileComplete = false,
  hasSubscription = false,
  hasItems = false,
  hasParties = false,
  hasTransactions = false,
}: OnboardingWizardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [subscriptionSelected, setSubscriptionSelected] = useState(hasSubscription);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const selected = localStorage.getItem('bizmanage_selected_plan');
      if (selected) {
        setSubscriptionSelected(true);
      }
    }
  }, [hasSubscription]);

  const steps = [
    {
      id: 1,
      title: 'Complete your business profile',
      description: 'Add your business name, address, contact number, tax ID, and logo.',
      href: '/settings',
      actionText: 'Go to Settings',
      isCompleted: hasProfileComplete,
      icon: Building2,
    },
    {
      id: 2,
      title: 'Choose a subscription',
      description: 'Pick a plan (Free, Pro, or Enterprise) to unlock your full ERP features.',
      href: '/subscription',
      actionText: 'Choose Plan',
      isCompleted: subscriptionSelected,
      icon: Crown,
    },
    {
      id: 3,
      title: 'Set up inventory & items',
      description: 'Create the product or service items you offer with initial stock levels.',
      href: '/inventory',
      actionText: 'Add Items',
      isCompleted: hasItems,
      icon: Package,
    },
    {
      id: 4,
      title: 'Add parties (Customers & Suppliers)',
      description: 'Create contacts for customers and suppliers to manage balances and auto-ledgers.',
      href: '/parties',
      actionText: 'Add Party',
      isCompleted: hasParties,
      icon: Users,
    },
    {
      id: 5,
      title: 'Record your first transaction',
      description: 'Create your first sales invoice or payment entry to start tracking real-time cashflow.',
      href: '/transactions/sales',
      actionText: 'Create Invoice',
      isCompleted: hasTransactions,
      icon: Receipt,
    },
  ];

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const userInitial = (userName || 'U').substring(0, 1).toUpperCase();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 font-sans">
      {/* Welcome Banner Card - Blue/White/Dark Theme */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-blue-500/30 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-black text-xl text-blue-400 shrink-0">
              {userInitial}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Welcome, {userName}! Let's set up your business.
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                <span className="font-semibold text-blue-400">{completedCount} of 5 steps complete</span> — finish them to open your full Executive Dashboard.
              </p>
            </div>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition-colors shrink-0"
            title={collapsed ? 'Expand setup guide' : 'Collapse setup guide'}
          >
            {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full h-2.5 rounded-full bg-slate-950/80 overflow-hidden border border-slate-800 relative z-10">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500 rounded-full"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Step Cards List */}
      {!collapsed && (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCurrentStep = !step.isCompleted && (index === 0 || steps[index - 1]!.isCompleted);

            return (
              <div
                key={step.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  step.isCompleted
                    ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                    : isCurrentStep
                    ? 'bg-slate-900 border-blue-500/50 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/20 text-white'
                    : 'bg-slate-900/60 border-slate-800/60 text-slate-500 opacity-80'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                      step.isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : isCurrentStep
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}
                  >
                    {step.isCompleted ? <Check className="w-4 h-4 text-emerald-400" /> : step.id}
                  </div>

                  <div>
                    <h3 className={`text-sm font-bold flex items-center gap-2 ${step.isCompleted ? 'text-slate-300 line-through' : 'text-white'}`}>
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-center shrink-0">
                  {step.isCompleted ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : (
                    <Link
                      href={step.href}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isCurrentStep
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {step.actionText} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          <p className="text-center text-xs text-slate-400 pt-2">
            You can always revisit these setup guides from <Link href="/settings?tab=guide" className="text-blue-400 hover:underline font-semibold">Settings</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
