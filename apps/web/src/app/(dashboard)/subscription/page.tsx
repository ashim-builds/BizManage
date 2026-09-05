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
  Clock,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useUpdateBusiness } from '@/services/businessService';
import { AVAILABLE_FEATURES } from '@/lib/constants';
import { toast } from 'react-hot-toast';
import { ModalPortal } from '@/components/common/ModalPortal';

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

interface PaymentRequestItem {
  id: string;
  amount: string | number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  referenceId: string;
  failureReason?: string;
  createdAt: string;
  subscriptionPackage: {
    id: string;
    name: string;
  };
}

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const updateBusiness = useUpdateBusiness();
  const currentBiz = user?.memberships?.[0]?.business;

  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [myRequests, setMyRequests] = useState<PaymentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<string[]>([]);
  
  // Payment & Downgrade Modal State
  const [qrModalPackage, setQrModalPackage] = useState<SubscriptionPackage | null>(null);
  const [confirmUpgradePackage, setConfirmUpgradePackage] = useState<SubscriptionPackage | null>(null);
  const [confirmDowngradePackage, setConfirmDowngradePackage] = useState<SubscriptionPackage | null>(null);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [matrixTabId, setMatrixTabId] = useState<string>('');

  // Block background scroll when modal is open
  useEffect(() => {
    if (qrModalPackage || confirmUpgradePackage || confirmDowngradePackage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [qrModalPackage, confirmUpgradePackage, confirmDowngradePackage]);

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

  const fetchPackagesAndRequests = async () => {
    try {
      const [pkgRes, reqRes] = await Promise.all([
        api.get('/packages'),
        api.get('/packages/my-payment-requests').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (pkgRes.data.success) {
        const parsedPackages = pkgRes.data.data.map((pkg: any) => ({
          ...pkg,
          features:
            typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features || [],
        }));
        setPackages(parsedPackages);
        if (parsedPackages.length > 0 && !matrixTabId) {
          setMatrixTabId(parsedPackages[0].id);
        }
      }

      if (reqRes.data.success) {
        setMyRequests(reqRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackagesAndRequests();
  }, []);

  const handleExecuteFreePlan = async (pkg: SubscriptionPackage) => {
    try {
      setIsDowngrading(true);
      setSelectedPlanId(pkg.id);
      await updateBusiness.mutateAsync({
        name: currentBiz?.name || 'My Business',
        currency: currentBiz?.currency || 'NPR',
        subscriptionPackageId: pkg.id,
      });
      await refreshUser();
      setConfirmDowngradePackage(null);
      toast.success(`${pkg.name} activated. Switched to Free tier.`);
      setMsg(`${pkg.name} activated! You are now on the Free tier.`);
    } catch (error) {
      toast.error('Failed to update subscription plan.');
    } finally {
      setIsDowngrading(false);
    }
  };

  const handleSelectPlan = async (pkg: SubscriptionPackage) => {
    if (Number(pkg.price) > 0 && !pkg.isDefault) {
      const hasPendingPayment = myRequests.some((r) => r.status === 'PENDING');
      const hasActivePaidPlan =
        currentBiz?.subscriptionStatus === 'ACTIVE' &&
        Boolean(currentBiz?.subscriptionPackage) &&
        currentBiz?.subscriptionPackage?.name?.toLowerCase() !== 'free' &&
        Number(currentBiz?.subscriptionPackage?.price || 0) > 0;

      // If user has pending verification or already has an active paid plan, show warning first
      if (hasPendingPayment || hasActivePaidPlan) {
        setConfirmUpgradePackage(pkg);
        return;
      }

      // Otherwise open QR Code Payment Modal directly
      setQrModalPackage(pkg);
      setReferenceId('');
      setSenderName(user?.name || '');
      setNotes('');
    } else {
      // Free or Default Plan: Check if user is currently on an active paid plan
      const isCurrentPaidPlan =
        currentBiz?.subscriptionStatus === 'ACTIVE' &&
        Boolean(currentBiz?.subscriptionPackage) &&
        currentBiz?.subscriptionPackage?.name?.toLowerCase() !== 'free' &&
        Number(currentBiz?.subscriptionPackage?.price || 0) > 0;

      if (isCurrentPaidPlan) {
        // Show Downgrade Warning Modal first!
        setConfirmDowngradePackage(pkg);
        return;
      }

      // Otherwise activate Free plan directly
      await handleExecuteFreePlan(pkg);
    }
  };

  const handleProceedToPayment = () => {
    if (!confirmUpgradePackage) return;
    const pkg = confirmUpgradePackage;
    setConfirmUpgradePackage(null);
    setQrModalPackage(pkg);
    setReferenceId('');
    setSenderName(user?.name || '');
    setNotes('');
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrModalPackage) return;

    if (!referenceId.trim()) {
      toast.error('Please enter the Transaction Reference ID or payment proof.');
      return;
    }
    if (!senderName.trim()) {
      toast.error('Please enter the sender name or mobile number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/packages/subscribe-request', {
        packageId: qrModalPackage.id,
        referenceId: referenceId.trim(),
        senderName: senderName.trim(),
        notes: notes.trim(),
      });

      if (res.data.success) {
        toast.success('Payment request submitted! Superadmin will verify and activate your plan shortly.');
        setQrModalPackage(null);
        await fetchPackagesAndRequests();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit payment request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAccountNumber = () => {
    navigator.clipboard.writeText('08510900873121000001');
    setCopied(true);
    toast.success('Account number copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const activePackage = packages.find((p) => p.id === selectedPlanId);
  const pendingPayment = myRequests.find((r) => r.status === 'PENDING');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
            <Crown className="w-3.5 h-3.5 text-blue-600" /> Plan & Licensing
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Business Subscription</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Choose your plan to activate and unlock all business features.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Current Status</p>
            <div className="flex flex-col">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                {activePackage ? activePackage.name : 'No Plan'}
                {activePackage ? (
                  currentBiz?.subscriptionStatus === 'ACTIVE' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200 font-bold">
                      Active
                    </span>
                  ) : currentBiz?.subscriptionStatus === 'EXPIRED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] border border-red-200 font-bold">
                      Expired
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] border border-amber-200 font-bold">
                      Trial Active
                    </span>
                  )
                ) : null}
              </p>
              {currentBiz?.currentPeriodEnd && (
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Valid until: <span className="text-slate-800 font-semibold">{new Date(currentBiz.currentPeriodEnd).toLocaleDateString()}</span>
                  {new Date(currentBiz.currentPeriodEnd).getTime() > Date.now() && (
                    <span className="text-blue-600 ml-1 font-semibold">
                      ({Math.max(1, Math.ceil((new Date(currentBiz.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PENDING VERIFICATION BANNER */}
      {pendingPayment && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-sm flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-amber-900 text-sm">
              Payment Verification Pending (प्रमाणीकरण प्रक्रियामा छ)
            </h4>
            <p className="mt-1 text-amber-800 leading-relaxed">
              Your payment for <span className="font-bold text-slate-900">{pendingPayment.subscriptionPackage.name}</span> (Amount: <span className="font-mono font-bold text-slate-900">Rs. {Number(pendingPayment.amount).toLocaleString()}</span>, Ref ID: <span className="font-mono font-bold text-slate-900">{pendingPayment.referenceId}</span>) has been submitted.
            </p>
            <p className="text-[11px] text-amber-700 mt-1">
              Our superadmin is verifying the transfer in Garima Bikas Bank and will activate your plan shortly.
            </p>
          </div>
        </div>
      )}

      {!activePackage && !pendingPayment && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
          <span>⚠️ Please select a plan below to activate your account and unlock features.</span>
        </div>
      )}

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-500 hover:text-slate-900 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Subscription Cards - 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
        {packages
          .filter((pkg) => {
            const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            if (pkg.name.toLowerCase().includes('developer testing') || pkg.name.toLowerCase().includes('localhost')) {
              return isLocalhost;
            }
            return true;
          })
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map((pkg) => {
            const isActive = selectedPlanId === pkg.id;
            const isPopular = pkg.name.toLowerCase().includes('gold') || pkg.name.toLowerCase().includes('popular');
            const isFree = Number(pkg.price) === 0;

            if (isPopular) {
              return (
                <div
                  key={pkg.id}
                  className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-blue-600 shadow-xl ring-4 ring-blue-50 space-y-6 flex flex-col justify-between relative md:-translate-y-2 transition-all"
                >
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-md shadow-blue-600/30 whitespace-nowrap">
                    Most Popular
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-500" />
                        <h3 className="text-xl font-black text-slate-900">{pkg.name}</h3>
                      </div>
                      {isActive ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Plan
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Retail Pro
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500">Complete POS billing & inventory for retail.</p>

                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-400 line-through font-mono">Rs. 4,999</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Save 50%
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight whitespace-nowrap">
                          Rs. {Number(pkg.price).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">/ year</span>
                      </div>
                      <p className="text-xs text-blue-600 font-bold mt-1.5">Only Rs. 208 / month</p>
                    </div>

                    <ul className="space-y-3 text-xs sm:text-sm text-slate-700 pt-4 border-t border-slate-100">
                      <li className="flex items-center gap-2 font-bold text-slate-900">
                        <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[3]" /> 14-Day Full Free Trial
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[3]" /> Unlimited GST / PAN Bills
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[3]" /> High-Speed POS Billing
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[3]" /> Custom Barcode Printing
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[3]" /> Digital Invoicing & SMS Alerts
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[3]" /> Up to 5 Staff Users
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPlan(pkg)}
                    disabled={isActive}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm text-center transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 min-h-[44px] ${
                      isActive
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default shadow-none'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                    }`}
                  >
                    {isActive ? (
                      'Current Active Plan'
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" /> Start 14 Days Free Trial
                      </>
                    )}
                  </button>
                </div>
              );
            }

            return (
              <div
                key={pkg.id}
                className={`p-6 sm:p-8 rounded-3xl bg-white border shadow-sm space-y-6 flex flex-col justify-between hover:shadow-md transition-all ${
                  isActive ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isFree ? (
                        <Zap className="w-5 h-5 text-slate-700" />
                      ) : (
                        <Crown className="w-5 h-5 text-purple-600" />
                      )}
                      <h3 className="text-xl font-black text-slate-900">{pkg.name}</h3>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Plan
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {isFree ? 'Forever Free' : 'Enterprise'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {isFree
                      ? 'For new businesses and freelancers.'
                      : 'Multi-godown & manufacturing operations.'}
                  </p>

                  <div className="pt-2">
                    {!isFree && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-400 line-through font-mono">Rs. 7,999</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Save 50%
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight whitespace-nowrap">
                        Rs. {Number(pkg.price).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {isFree ? '/ forever' : '/ year'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-bold mt-1.5">
                      {isFree ? 'Free Base Accounting' : 'Only Rs. 333 / month'}
                    </p>
                  </div>

                  <ul className="space-y-3 text-xs sm:text-sm text-slate-600 pt-4 border-t border-slate-100">
                    {isFree ? (
                      <>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" /> Up to 50 Sale Invoices
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" /> Basic Inventory & Stock
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" /> Thermal Print Support
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" /> Single User / Device
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" /> Cash & Bank Ledgers
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center gap-2 font-semibold text-slate-900">
                          <Check className="w-4 h-4 text-purple-600 shrink-0 stroke-[3]" /> Everything in Gold Edition
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-purple-600 shrink-0 stroke-[3]" /> Multi-Godowns & Transfers
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-purple-600 shrink-0 stroke-[3]" /> Manufacturing & BOM Assembly
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-purple-600 shrink-0 stroke-[3]" /> Export to Tally ERP & Excel
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-purple-600 shrink-0 stroke-[3]" /> Online E-commerce Storefront
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-purple-600 shrink-0 stroke-[3]" /> Unlimited Staff & Priority Support
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(pkg)}
                  disabled={isActive}
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-sm text-center transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[44px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                      : isFree
                      ? 'bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-800 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                  }`}
                >
                  {isActive ? (
                    'Current Active Plan'
                  ) : isFree ? (
                    `Switch to ${pkg.name}`
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" /> Start Platinum Trial
                    </>
                  )}
                </button>
              </div>
            );
          })}
      </div>

      {/* Feature Licensing Matrix */}
      <div className="p-5 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">Feature Licensing Matrix</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Tier Comparison
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Detailed breakdown of features and capabilities unlocked in each tier.
          </p>
        </div>

        {/* Mobile View: Responsive Plan Tabs & Feature Cards */}
        <div className="block md:hidden space-y-3">
          {/* Plan Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {packages.map((pkg) => {
              const isSelected = (matrixTabId || packages[0]?.id) === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setMatrixTabId(pkg.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 min-h-[38px] ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {pkg.name} (Rs. {Number(pkg.price).toLocaleString()})
                </button>
              );
            })}
          </div>

          {/* Active Mobile Plan Features List */}
          {(() => {
            const currentMatrixPkg = packages.find((p) => p.id === (matrixTabId || packages[0]?.id)) || packages[0];
            if (!currentMatrixPkg) return null;

            return (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{currentMatrixPkg.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      {currentMatrixPkg.features.length} of {AVAILABLE_FEATURES.length} feature modules included
                    </p>
                  </div>
                  <span className="font-mono font-black text-slate-900 text-xs">
                    Rs. {Number(currentMatrixPkg.price).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {AVAILABLE_FEATURES.map((feat) => {
                    const isUnlocked = currentMatrixPkg.features.includes(feat.id);

                    return (
                      <div
                        key={feat.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isUnlocked
                            ? 'bg-white border-slate-200 text-slate-800 shadow-xs'
                            : 'bg-slate-100/60 border-slate-200/60 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {isUnlocked ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className={`truncate font-medium ${isUnlocked ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                            {feat.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Desktop View: Full Grid Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="pb-3 px-3 w-2/5">ERP Module Feature</th>
                {packages.map((pkg) => (
                  <th key={pkg.id} className="pb-3 px-3 text-center">
                    <span className="font-extrabold text-slate-900">{pkg.name}</span>
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Rs. {Number(pkg.price).toLocaleString()}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {AVAILABLE_FEATURES.map((feat) => (
                <tr key={feat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span>{feat.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({feat.category})</span>
                  </td>
                  {packages.map((pkg) => (
                    <td key={pkg.id} className="py-3.5 px-3 text-center">
                      {pkg.features.includes(feat.id) ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
                          <Lock className="w-3 h-3 text-slate-400" />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRE-UPGRADE CONFIRMATION WARNING MODAL */}
      {confirmUpgradePackage && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden font-sans text-slate-800 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 bg-rose-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Plan Re-Selection Notice (प्लान छनोट जरुरी सूचना)
                    </h3>
                    <p className="text-[11px] text-rose-600 font-medium">
                      Selecting: <span className="text-slate-900 font-bold">{confirmUpgradePackage.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmUpgradePackage(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-4">
                {/* Condition 1: Pending Payment Warning */}
                {myRequests.some((r) => r.status === 'PENDING') && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
                    <p className="font-bold text-rose-800 flex items-center gap-1.5 text-xs sm:text-sm">
                      <Clock className="w-4 h-4 text-rose-600" /> Payment Verification In Progress (भुक्तानी रुजु बाँकी)
                    </p>
                    <div className="text-[11px] text-slate-700 space-y-1 leading-relaxed">
                      <p>
                        🇳🇵 <strong>नेपाली:</strong> तपाईंको अघिल्लो भुक्तानी अनुरोध (
                        <span className="font-mono text-rose-700 font-bold">
                          {myRequests.find((r) => r.status === 'PENDING')?.subscriptionPackage?.name}
                        </span>
                        ) हाल Superadmin बाट रुजु हुन बाँकी छ। अगाडि बढेमा अर्को नयाँ भुक्तानी अनुरोध पेश हुनेछ।
                      </p>
                      <p className="text-slate-500">
                        🇬🇧 <strong>English:</strong> You already have a pending verification request. Proceeding will create an additional payment request for{' '}
                        <strong className="text-slate-900">{confirmUpgradePackage.name}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Condition 2: Active Paid Plan Notice */}
                {currentBiz?.subscriptionStatus === 'ACTIVE' &&
                  Boolean(currentBiz?.subscriptionPackage) &&
                  currentBiz?.subscriptionPackage?.name?.toLowerCase() !== 'free' && (
                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-2">
                      <p className="font-bold text-blue-800 flex items-center gap-1.5 text-xs sm:text-sm">
                        <ShieldCheck className="w-4 h-4 text-blue-600" /> Active Plan Running (चालु सक्रिय प्लान)
                      </p>
                      <div className="text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
                        <p>
                          🇳🇵 <strong>नेपाली:</strong> तपाईंसँग हाल <strong className="text-slate-900">{currentBiz.subscriptionPackage?.name}</strong> प्लान सक्रिय छ। नयाँ प्लान खरिद गर्दा तपाईंको कुनै पनि दिन खेर जाँदैन (०% दिन नष्ट)। तपाईंका बाँकी सबै दिनहरू १००% सुरक्षित रहन्छन् र नयाँ प्लान अहिलेको अवधि समाप्त भएपछि स्वतः पालो (Queue) मा रहनेछ र सुरु हुनेछ।
                        </p>
                        <p className="text-slate-500">
                          🇬🇧 <strong>English:</strong> Zero days lost: Your remaining active days are 100% preserved. The new plan will be queued and will start automatically once your current period expires.
                        </p>
                      </div>
                    </div>
                  )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <p className="text-slate-900 font-semibold">
                    Proceed to Bank QR Payment for <strong className="text-blue-600">{confirmUpgradePackage.name} (Rs. {confirmUpgradePackage.price})</strong>?
                  </p>
                  <p className="text-[11px] text-slate-500">
                    के तपाईं क्युआर कोड भुक्तानी स्क्रिनमा अगाडि बढ्न निश्चित हुनुहुन्छ?
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setConfirmUpgradePackage(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors min-h-[40px]"
                  >
                    Cancel (रद्द)
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToPayment}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm min-h-[40px]"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Continue to Payment (अगाडि बढ्नुहोस्)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DOWNGRADE TO FREE PLAN CONFIRMATION WARNING MODAL */}
      {confirmDowngradePackage && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden font-sans text-slate-800 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 bg-rose-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Downgrade to Free Plan (निःशुल्क प्लानमा झर्ने चेतावनी)
                    </h3>
                    <p className="text-[11px] text-rose-600 font-medium">
                      Current Plan: <span className="text-slate-900 font-bold">{currentBiz?.subscriptionPackage?.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDowngradePackage(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2.5">
                  <p className="font-bold text-rose-800 flex items-center gap-1.5 text-xs sm:text-sm">
                    ⚠️ Paid Days Will Be Forfeited & Lost (बाँकी दिन खेर जानेछ)
                  </p>
                  
                  <div className="text-[11px] text-slate-700 space-y-2 leading-relaxed">
                    <p className="p-2.5 rounded-xl bg-white border border-rose-200">
                      🇳🇵 <strong>नेपाली:</strong> तपाईं हाल <strong className="text-slate-900">{currentBiz?.subscriptionPackage?.name}</strong> सशुल्क (Paid) प्लानमा हुनुहुन्छ। यदि तपाईं अहिले Free प्लानमा जानुभयो भने, <strong>तपाईंका बाँकी सबै दिनहरू तुरुन्तै खारेज (नष्ट) हुनेछन् र बाँकी दिनको कुनै पनि रकम फिर्ता (No Refund) हुने छैन</strong>।
                    </p>
                    <p className="p-2.5 rounded-xl bg-white border border-rose-200 text-slate-600">
                      🇬🇧 <strong>English:</strong> Switching to the Free plan will immediately cancel your active paid plan. <strong>All remaining paid days are forfeited with ZERO cash refund</strong>, and premium BMS features/limits will be downgraded immediately.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  के तपाईं बाँकी दिन त्यागेर <strong className="text-slate-900">{confirmDowngradePackage.name}</strong> प्लानमा स्विच गर्न निश्चित हुनुहुन्छ?
                </p>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={isDowngrading}
                    onClick={() => setConfirmDowngradePackage(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50 min-h-[40px]"
                  >
                    Cancel / Keep Paid Plan (रद्द गर्नुहोस्)
                  </button>
                  <button
                    type="button"
                    disabled={isDowngrading}
                    onClick={() => handleExecuteFreePlan(confirmDowngradePackage)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 min-h-[40px]"
                  >
                    {isDowngrading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Downgrading...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" /> Confirm Downgrade (Free मा जानुहोस्)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* BANKING QR CODE PAYMENT & VERIFICATION REQUEST MODAL */}
      {qrModalPackage && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden font-sans text-slate-800 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Modal Header (Sticky) */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    Scan & Pay (क्युआर कोडबाट भुक्तानी)
                  </h3>
                  <p className="text-[10.5px] sm:text-[11px] text-slate-500">
                    Plan: <span className="text-blue-600 font-bold">{qrModalPackage.name}</span> •{' '}
                    <span className="text-emerald-600 font-mono font-bold">
                      Rs. {qrModalPackage.price} / {qrModalPackage.billingPeriod.toLowerCase()}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrModalPackage(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleManualPaymentSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* QR Image Card */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50 text-slate-900 border border-slate-200 shadow-xs">
                <div className="relative w-48 h-52 sm:w-56 sm:h-60">
                  <Image
                    src="/payment-qr.jpg"
                    alt="Garima Bikas Bank Payment QR"
                    fill
                    className="object-contain rounded-lg"
                    priority
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-600 mt-2 text-center">
                  Scan using Fonepay, eSewa, Khalti, or any Mobile Banking App
                </p>
              </div>

              {/* Bank Details Card */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1.5 text-[11px] sm:text-xs">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Bank Name:
                  </span>
                  <span className="font-bold text-slate-900 text-[11px] sm:text-xs text-right">Garima Bikas Bank Ltd.</span>
                </div>

                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1.5 text-[11px] sm:text-xs">
                    <User className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Account Holder:
                  </span>
                  <span className="font-bold text-slate-900 tracking-wide text-[11px] sm:text-xs">ASHIM ADHIKARI</span>
                </div>

                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1.5 text-[11px] sm:text-xs">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Account Type:
                  </span>
                  <span className="font-semibold text-slate-700 text-[10.5px] sm:text-xs">MERO SHARE BACHAT KHATA</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-slate-500 block text-[9.5px] sm:text-[10px]">Account Number:</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-blue-600 tracking-wider">
                      08510900873121000001
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy A/C
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* RULE OPTION 3: NO REFUND / PLAN QUEUEING */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 text-slate-800 text-xs space-y-3 shadow-xs">
                {/* 1. Headline */}
                <div className="flex items-start gap-2.5 text-rose-700 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <h4 className="text-rose-900 font-bold leading-tight">
                      Upgrading to {qrModalPackage.billingPeriod === 'YEARLY' ? 'Yearly' : 'Premium'} Plan? Please Read
                    </h4>
                    <span className="text-[10.5px] sm:text-[11px] text-rose-700 font-normal">
                      (मासिकबाट वार्षिक वा नयाँ प्लानमा अपग्रेड गर्दा ध्यान दिनुपर्ने जरुरी नियमहरू)
                    </span>
                  </div>
                </div>

                {/* 2. Key Bullets */}
                <div className="space-y-2 text-[10.5px] sm:text-xs leading-relaxed">
                  <div className="p-2.5 rounded-xl bg-white border border-rose-200 space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> 1. No Cash Refunds (नगद फिर्ता नहुने):
                    </p>
                    <p className="text-slate-700 pl-3">
                      🇳🇵 चालु मासिक प्लानका बाँकी दिनहरूको नगद फिर्ता हुने छैन।<br />
                      <span className="text-slate-500">🇬🇧 Unused days left on your active monthly plan are not refunded in cash.</span>
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-rose-200 space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> 2. Zero Days Lost & Plan Queueing (दिन खेर नजाने र पालोमा रहने):
                    </p>
                    <p className="text-slate-700 pl-3">
                      🇳🇵 तपाईंका बाँकी दिनहरू १००% सुरक्षित रहन्छन्। नयाँ {qrModalPackage.name} प्लान अहिलेको अवधि सकिएपछि स्वतः पालो (Queue) बाट सुरु हुनेछ।<br />
                      <span className="text-slate-500">🇬🇧 Zero days lost: Your remaining monthly days are 100% preserved. The new plan starts automatically right after your current plan expires.</span>
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-rose-200 space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> 3. Accurate Verification Details Required (सहि विवरण अनिवार्य):
                    </p>
                    <p className="text-slate-700 pl-3">
                      🇳🇵 यदि गलत Business Name, गलत Transaction Ref ID वा गलत पठाउनेको नाम पेश गर्नुभयो भने बैंक दाखिला रुजु गर्न सकिने छैन र प्लान सुरु हुने छैन।<br />
                      <span className="text-slate-500">🇬🇧 If you enter a wrong Business Name, incorrect Transaction ID, or wrong Sender Name, we cannot verify your deposit and cannot activate your plan.</span>
                    </p>
                  </div>
                </div>

                {/* 3. CTA & Instructions */}
                <div className="pt-2 border-t border-rose-200 text-[10.5px] sm:text-[11px] text-rose-800 flex items-start gap-1.5">
                  <span className="text-sm leading-none">📸</span>
                  <span>
                    <strong>Next Step (अर्को चरण):</strong> After transferring funds, enter your <strong>Transaction ID</strong> and <strong>Sender Name/Mobile</strong> below to submit for instant Superadmin review.<br />
                    <span className="text-slate-600">रकम ट्रान्सफर गरेपछि तल कारोबार नम्बर र पठाउनेको नाम भरेर प्रमाणीकरण अनुरोध पठाउनुहोस्।</span>
                  </span>
                </div>
              </div>

              {/* Transaction Verification Inputs */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction ID / Reference Number (रकम ट्रान्सफर नम्बर / Ref ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FT26082212345 or Trans No."
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sender Name / Mobile (पठाउनेको नाम / मोबाइल) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 98XXXXXXXX / Ram"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Remarks / Notes (वैकल्पिक टिप्पणी)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Transferred via Mobile Banking"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setQrModalPackage(null)}
                  className="px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors min-h-[40px]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex-1 sm:flex-none text-center min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Submit for Verification (अनुरोध पठाउनुहोस्)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    )}
    </div>
  );
}
