'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/providers/AuthProvider';
import {
  Crown,
  Check,
  Lock,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  Plus,
  Minus,
  QrCode,
  Copy,
  CheckCheck,
  X,
  Building2,
  User,
  CreditCard,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useUpdateBusiness } from '@/services/businessService';
import { AVAILABLE_FEATURES } from '@/lib/constants';
import { toast } from 'react-hot-toast';

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
  const [expandedPackages, setExpandedPackages] = useState<string[]>([]);
  const [qrModalPackage, setQrModalPackage] = useState<SubscriptionPackage | null>(null);
  const [copied, setCopied] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const toggleExpand = (pkgId: string) => {
    setExpandedPackages((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
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
            features:
              typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features || [],
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

  const handleSelectPlan = async (pkg: SubscriptionPackage) => {
    if (Number(pkg.price) > 0 && !pkg.isDefault) {
      // Open QR Code Payment Modal
      setQrModalPackage(pkg);
    } else {
      // Free or Default Plan: Activate directly
      await activateSubscriptionPlan(pkg);
    }
  };

  const activateSubscriptionPlan = async (pkg: SubscriptionPackage) => {
    try {
      setIsActivating(true);
      setSelectedPlanId(pkg.id);
      await updateBusiness.mutateAsync({
        name: currentBiz?.name || 'My Business',
        currency: currentBiz?.currency || 'NPR',
        subscriptionPackageId: pkg.id,
      });
      await refreshUser();
      setQrModalPackage(null);
      toast.success(`${pkg.name} activated successfully!`);
      setMsg(`${pkg.name} activated! You now have access to all included features.`);
    } catch (error) {
      toast.error('Failed to update subscription plan.');
      setMsg('Failed to update subscription plan.');
    } finally {
      setIsActivating(false);
    }
  };

  const copyAccountNumber = () => {
    navigator.clipboard.writeText('08510900873121000001');
    setCopied(true);
    toast.success('Account number copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const activePackage = packages.find((p) => p.id === selectedPlanId);

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
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 font-semibold">
                    Online
                  </span>
                ) : currentBiz?.subscriptionStatus === 'EXPIRED' ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] border border-red-500/20 font-semibold">
                    Expired
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20 font-semibold">
                    Active
                  </span>
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
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Subscription Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:items-center">
        {/* Sort: Free Starter first, Pro in center, others last */}
        {[...packages]
          .sort((a, b) => {
            const getOrder = (pkg: SubscriptionPackage) => {
              if (pkg.isDefault) return 0; // Free → slot 0
              if (pkg.name.toLowerCase().includes('pro')) return 1; // Pro → slot 1 (center)
              return 2; // Rest → slot 2
            };
            return getOrder(a) - getOrder(b);
          })
          .map((pkg) => {
            const isActive = selectedPlanId === pkg.id;
            const isPopular = pkg.name.toLowerCase().includes('pro');

            return (
              <div
                key={pkg.id}
                className={`relative p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all ${
                  isActive
                    ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl'
                    : isPopular
                    ? 'bg-gradient-to-b from-blue-950/80 to-slate-900 border-blue-500 ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10 md:scale-105 md:z-10'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[11px] font-extrabold uppercase tracking-widest shadow-lg shadow-blue-600/40 flex items-center gap-1.5 whitespace-nowrap">
                    <span>⭐</span> Most Popular
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-3 mt-1">
                    <div className="flex items-center gap-2">
                      {isPopular ? (
                        <Crown className="w-4 h-4 text-blue-400" />
                      ) : pkg.isDefault ? null : (
                        <Zap className="w-4 h-4 text-blue-400" />
                      )}
                      <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                    </div>
                    {isActive && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-6">
                    {pkg.isDefault
                      ? 'Essential billing & inventory tracking.'
                      : 'Complete suite of features for your business.'}
                  </p>

                  <div className="mb-6">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {pkg.currency} {pkg.price}
                    </span>
                    <span className="text-xs text-slate-400"> / {pkg.billingPeriod.toLowerCase()}</span>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-300 border-t border-slate-800 pt-6">
                    {(expandedPackages.includes(pkg.id) ? pkg.features : pkg.features.slice(0, 5)).map(
                      (featId) => {
                        const featObj = AVAILABLE_FEATURES.find((f) => f.id === featId);
                        return (
                          <li key={featId} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{featObj ? featObj.label : featId}</span>
                          </li>
                        );
                      }
                    )}
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
                  className={`w-full mt-8 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : isPopular
                      ? 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-1.5'
                  }`}
                >
                  {isActive ? (
                    'Current Active Plan'
                  ) : Number(pkg.price) > 0 ? (
                    <>
                      <QrCode className="w-4 h-4" /> Pay & Upgrade to {pkg.name}
                    </>
                  ) : (
                    `Select ${pkg.name}`
                  )}
                </button>
              </div>
            );
          })}
      </div>

      {/* Feature Licensing Matrix */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-1">Feature Licensing Matrix</h3>
        <p className="text-xs text-slate-400 mb-6">
          See which features are unlocked with your active subscription plan.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3 w-1/4">ERP Feature</th>
                {packages.map((pkg) => (
                  <th key={pkg.id} className="pb-3 px-3 text-center w-1/4">
                    {pkg.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {AVAILABLE_FEATURES.map((feat) => (
                <tr key={feat.id}>
                  <td className="py-3 px-3 font-semibold">{feat.label}</td>
                  {packages.map((pkg) => (
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

      {/* BANKING QR CODE PAYMENT MODAL */}
      {qrModalPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden font-sans text-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Scan & Pay (क्युआर कोडबाट भुक्तानी)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Plan: <span className="text-blue-400 font-bold">{qrModalPackage.name}</span> •{' '}
                    <span className="text-emerald-400 font-mono font-bold">
                      Rs. {qrModalPackage.price}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrModalPackage(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* QR Image Card */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-md">
                <div className="relative w-64 h-72">
                  <Image
                    src="/payment-qr.jpg"
                    alt="Garima Bikas Bank Payment QR"
                    fill
                    className="object-contain rounded-lg"
                    priority
                  />
                </div>
                <p className="text-[11px] font-bold text-slate-600 mt-2">
                  Scan using Fonepay, eSewa, Khalti, or any Mobile Banking App
                </p>
              </div>

              {/* Bank Details Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" /> Bank Name:
                  </span>
                  <span className="font-bold text-white">Garima Bikas Bank Ltd. (गरिमा विकास बैंक)</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-400" /> Account Holder:
                  </span>
                  <span className="font-bold text-white tracking-wide">ASHIM ADHIKARI</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Account Type:
                  </span>
                  <span className="font-semibold text-slate-300">MERO SHARE BACHAT KHATA</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Account Number:</span>
                    <span className="font-mono font-bold text-sm text-blue-400 tracking-wider">
                      08510900873121000001
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> भुक्तानी गर्ने तरिका:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-blue-200/90 leading-relaxed">
                  <li>माथिको QR कोड स्क्यान गर्नुहोस् वा खाता नम्बरमा रकम ट्रान्सफर गर्नुहोस्।</li>
                  <li>रिमार्क्स (Remarks) मा आफ्नो Business Name लेख्नुहोस्।</li>
                  <li>भुक्तानी गरिसकेपछि तलको <b>Confirm & Activate</b> बटन थिच्नुहोस्।</li>
                </ol>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/80">
              <button
                type="button"
                onClick={() => setQrModalPackage(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isActivating}
                onClick={() => activateSubscriptionPlan(qrModalPackage)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {isActivating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Confirm & Activate Plan (लागू गर्नुहोस्)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
