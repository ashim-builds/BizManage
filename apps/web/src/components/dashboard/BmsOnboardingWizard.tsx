'use client';

import { useState } from 'react';
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
      description: 'Pick a plan to unlock your full ERP features. Our team activates it after payment.',
      href: '/subscription',
      actionText: 'Choose Plan',
      isCompleted: hasSubscription,
      icon: Crown,
    },
    {
      id: 3,
      title: 'Set up inventory & items',
      description: 'Create the membership or product/service items you offer with initial stock levels.',
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
    <div className="w-full max-w-4xl mx-auto mb-8 space-y-4 font-sans">
      {/* Welcome Banner Card */}
      <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center font-black text-xl text-amber-300 shrink-0">
              {userInitial}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Welcome, {userName}! Let's set up your business.
              </h2>
              <p className="text-xs text-amber-200/80 mt-0.5">
                <span className="font-semibold text-amber-300">{completedCount} of 5 steps complete</span> — finish them to open your full dashboard features.
              </p>
            </div>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors shrink-0"
            title={collapsed ? 'Expand setup guide' : 'Collapse setup guide'}
          >
            {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full h-2 rounded-full bg-slate-900/60 overflow-hidden border border-amber-500/20">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 rounded-full"
            style={{ width: `${Math.max(8, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Step Cards List */}
      {!collapsed && (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCurrentStep = !step.isCompleted && (index === 0 || steps[index - 1]!.isCompleted);

            return (
              <div
                key={step.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  step.isCompleted
                    ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                    : isCurrentStep
                    ? 'bg-slate-900 border-amber-500/40 shadow-lg ring-1 ring-amber-500/20 text-white'
                    : 'bg-slate-900/60 border-slate-800/60 text-slate-500 opacity-80'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                      step.isCompleted
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : isCurrentStep
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                    }`}
                  >
                    {step.isCompleted ? <Check className="w-4 h-4 text-amber-400" /> : step.id}
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
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : (
                    <Link
                      href={step.href}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isCurrentStep
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25'
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

          <p className="text-center text-xs text-slate-500 pt-2">
            You can always revisit these setup guides from <Link href="/settings" className="text-amber-400 hover:underline font-semibold">Settings</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
