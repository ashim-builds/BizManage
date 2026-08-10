'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useCurrentBusiness, useUpdateBusiness, useUpdateBusinessSettings } from '@/services/businessService';
import { useImportParties, useImportItems, useDownloadBackup, useChangePassword } from '@/services/utilityService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { BmsOnboardingWizard } from '@/components/dashboard/BmsOnboardingWizard';
import {
  Settings,
  Building2,
  User,
  Tags,
  Crown,
  Upload,
  Download,
  Calculator,
  HelpCircle,
  LogOut,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  BookOpen,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

type SettingsTab =
  | 'profile'
  | 'guide'
  | 'account'
  | 'categories'
  | 'subscription'
  | 'import'
  | 'backup'
  | 'calculators'
  | 'about';

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading settings..." />}>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent() {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  useEffect(() => {
    const tabParam = searchParams?.get('tab') as SettingsTab;
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Business Profile & Settings Queries
  const { data: business, isLoading: settingsLoading, refetch } = useCurrentBusiness();
  const updateSettings = useUpdateBusinessSettings();
  const updateBusiness = useUpdateBusiness();

  // Utilities Mutations
  const importParties = useImportParties();
  const importItems = useImportItems();
  const downloadBackup = useDownloadBackup();

  // Business Profile Form States
  const [name, setName] = useState(user?.memberships?.[0]?.business?.name || '');
  const [phone, setPhone] = useState(user?.memberships?.[0]?.business?.phone || '');
  const [email, setEmail] = useState(user?.memberships?.[0]?.business?.email || '');
  const [address, setAddress] = useState(user?.memberships?.[0]?.business?.address || '');
  const [taxNumber, setTaxNumber] = useState(user?.memberships?.[0]?.business?.taxNumber || '');
  const [logoUrl, setLogoUrl] = useState<string>(user?.memberships?.[0]?.business?.logoUrl || '');

  useEffect(() => {
    if (business) {
      setName(business.name || '');
      setPhone(business.phone || '');
      setEmail(business.email || '');
      setAddress(business.address || '');
      setTaxNumber(business.taxNumber || '');
      if (business.logoUrl) setLogoUrl(business.logoUrl);
      if (business.settings) {
        setEnableTax(business.settings.enableTax ?? false);
        setTaxRate(business.settings.taxRate ?? 13);
      }
    }
  }, [business]);

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('bizmanage_show_onboarding');
      return val !== 'false';
    }
    return true;
  });
  const [enableTax, setEnableTax] = useState(false);
  const [taxRate, setTaxRate] = useState(13);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Change Password States
  const changePassword = useChangePassword();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdPending, setPwdPending] = useState(false);

  // Import States
  const [importJsonText, setImportJsonText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Calculator States
  const [loanAmount, setLoanAmount] = useState(500000);
  const [interestRate, setInterestRate] = useState(12);
  const [loanMonths, setLoanMonths] = useState(24);
  const [emiResult, setEmiResult] = useState<number | null>(null);

  // Simple Interest State
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(10);
  const [timeYears, setTimeYears] = useState(1);
  const [interestResult, setInterestResult] = useState<number | null>(null);

  // Tax Calculator State
  const [netAmount, setNetAmount] = useState(10000);
  const [calcTaxRate, setCalcTaxRate] = useState(13);

  // Notebook Scratchpad State
  const [notebook, setNotebook] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('biz_notebook') || '';
    }
    return '';
  });

  const toggleOnboardingGuide = (val: boolean) => {
    setShowOnboarding(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizmanage_show_onboarding', val ? 'true' : 'false');
    }
    setProfileSuccess(`BMS Setup Guide on Dashboard set to ${val ? 'Visible' : 'Hidden'}.`);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Logo file size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setLogoUrl(canvas.toDataURL('image/png', 0.9));
        } else {
          setLogoUrl(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setProfileSuccess('');
    setProfileError('');
    try {
      await updateBusiness.mutateAsync({ name, phone, email, address, taxNumber, currency: 'NPR', logoUrl });
      await updateSettings.mutateAsync({
        invoicePrefix: 'INV-',
        purchasePrefix: 'PUR-',
        quotationPrefix: 'QT-',
        saleReturnPrefix: 'CN-',
        purchaseReturnPrefix: 'DN-',
        enableTax,
        taxRate,
        lowStockAlert: true,
      });
      if (typeof window !== 'undefined') {
        if (name && address && phone && taxNumber && logoUrl) {
          localStorage.setItem('bizmanage_profile_completed', 'true');
        } else {
          localStorage.removeItem('bizmanage_profile_completed');
        }
      }
      setProfileSuccess('Business profile & logo saved successfully!');
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || 'Failed to update settings.');
    }
  };

  const handleImportParties = async () => {
    try {
      const rows = JSON.parse(importJsonText);
      const res = await importParties.mutateAsync(rows);
      if (res.data?.errors?.length > 0) {
        setImportErrors(res.data.errors);
      } else {
        setImportErrors([]);
      }
      setImportSuccessMsg(`Successfully imported ${res.data.importedCount} parties!`);
    } catch (err: any) {
      setImportErrors([{ row: 0, name: 'Parse Error', error: 'Invalid JSON format. Please check your file.' }]);
    }
  };

  const handleImportItems = async () => {
    try {
      const rows = JSON.parse(importJsonText);
      const res = await importItems.mutateAsync(rows);
      if (res.data?.errors?.length > 0) {
        setImportErrors(res.data.errors);
      } else {
        setImportErrors([]);
      }
      setImportSuccessMsg(`Successfully imported ${res.data.importedCount} items!`);
    } catch (err: any) {
      setImportErrors([{ row: 0, name: 'Parse Error', error: 'Invalid JSON format. Please check your file.' }]);
    }
  };

  const handleChangePassword = async () => {
    setPwdSuccess('');
    setPwdError('');
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('All password fields are required.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('New password and confirmation do not match.');
      return;
    }
    if (newPwd.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    setPwdPending(true);
    try {
      await changePassword.mutateAsync({ currentPassword: currentPwd, newPassword: newPwd, confirmPassword: confirmPwd });
      setPwdSuccess('Password changed! You will be signed out in 2 seconds...');
      setTimeout(() => logout(), 2000);
    } catch (err: any) {
      setPwdError(err.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setPwdPending(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportJsonText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleBackupDownload = async () => {
    try {
      const dump = await downloadBackup.mutateAsync();
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizmanage_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err: any) {
      alert('Failed to generate backup dump.');
    }
  };

  const calculateEmi = () => {
    const r = interestRate / 12 / 100;
    const n = loanMonths;
    const emi = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setEmiResult(Math.round(emi));
  };

  const calculateSimpleInterest = () => {
    const si = (principal * rate * timeYears) / 100;
    setInterestResult(si);
  };

  const saveNotebook = (val: string) => {
    setNotebook(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('biz_notebook', val);
    }
  };

  if (settingsLoading) {
    return <LoadingState message="Loading business configuration..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Settings & Business Utilities <Settings className="w-6 h-6 text-blue-400" />
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage tenant profile, team accounts, data imports, secure backups, and business tools.
        </p>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> Business Profile
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'guide'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Setup Guide
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'account'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" /> My Account
        </button>

        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'subscription'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Crown className="w-3.5 h-3.5" /> Subscription Plan
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'import'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" /> Import Data
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5" /> Secure Backup
        </button>

        <button
          onClick={() => setActiveTab('calculators')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'calculators'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" /> Business Tools
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'about'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Help & About
        </button>
      </div>

      {/* TAB 1: BUSINESS PROFILE */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 max-w-2xl">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Business Profile</h3>

          {profileSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {profileError}
            </div>
          )}

          <div className="space-y-5 text-xs">
            {/* BUSINESS LOGO UPLOAD */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
              <label className="block text-slate-300 font-semibold">Business Logo (Upload from Computer)</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative group">
                    <img
                      src={logoUrl}
                      alt="Business Logo"
                      className="w-16 h-16 rounded-xl object-contain bg-slate-900 border border-slate-700 p-1"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md text-[10px]"
                      title="Remove Logo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs">
                    No Logo
                  </div>
                )}

                <div>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-blue-600/20">
                    <Upload className="w-3.5 h-3.5" /> Choose Photo
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">PNG, JPG or WEBP up to 2MB.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Business Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                placeholder="e.g. RB Hardware & Sanitary House"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Business Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                placeholder="e.g. New Road, Kathmandu, Nepal"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contact Number (Phone)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  placeholder="e.g. +977 9800000000"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Business Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  placeholder="e.g. contact@mybusiness.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">PAN / VAT Registration Number</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                placeholder="e.g. 601928374"
              />
            </div>

            {/* FIXED PREFIXES - Read-only */}
            <div>
              <label className="block text-slate-300 font-semibold mb-2">Document Number Prefixes</label>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-3">
                  <Lock className="w-3 h-3" /> These prefixes are system-fixed and cannot be changed.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <p className="text-[10px] text-slate-400 mb-1">Sales Invoice Prefix</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-400 text-sm">INV-</span>
                      <span className="text-[10px] text-slate-500">e.g. INV-000001</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <p className="text-[10px] text-slate-400 mb-1">Purchase Bill Prefix</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-400 text-sm">PUR-</span>
                      <span className="text-[10px] text-slate-500">e.g. PUR-000001</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={updateBusiness.isPending || updateSettings.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {updateBusiness.isPending ? 'Saving...' : 'Save Profile & Logo'}
            </button>
          </div>
        </div>
      )}

      {/* TAB: SETUP GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-6 max-w-4xl font-sans">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" /> BMS Setup & Onboarding Guide
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Revisit all 5 step-by-step setup guides to finish setting up your business management system.
                </p>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('bizmanage_setup_completed');
                    localStorage.setItem('bizmanage_show_onboarding', 'true');
                  }
                  setProfileSuccess('Setup Guide has been re-opened on your Dashboard!');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 shrink-0"
              >
                Re-open Guide on Dashboard
              </button>
            </div>

            {profileSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {profileSuccess}
              </div>
            )}

            <BmsOnboardingWizard
              userName={user?.name || 'Owner'}
              businessName={user?.memberships?.[0]?.business?.name || 'My Business'}
            />
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-6 max-w-2xl">
          {/* User Profile Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> User Profile
            </h3>
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {user?.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{user?.name}</h4>
                  <p className="text-slate-400 font-mono">{user?.email}</p>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold uppercase text-[10px] border border-blue-500/20 mt-1 inline-block">
                    Business Owner / Admin
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white font-semibold transition-all border border-red-500/30 text-xs"
                >
                  <LogOut className="w-4 h-4" /> Sign Out of All Devices
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" /> Change Password
            </h3>

            {pwdSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" /> {pwdSuccess}
              </div>
            )}
            {pwdError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {pwdError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Current Password */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPwd.length > 0 && newPwd.length < 8 && (
                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Must be at least 8 characters
                  </p>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPwd.length > 0 && newPwd !== confirmPwd && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
                {confirmPwd.length > 0 && newPwd === confirmPwd && newPwd.length >= 8 && (
                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              <button
                onClick={handleChangePassword}
                disabled={pwdPending || !!pwdSuccess}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 text-xs"
              >
                <KeyRound className="w-4 h-4" />
                {pwdPending ? 'Changing Password...' : 'Change Password'}
              </button>
              <p className="text-[10px] text-slate-500">
                🔒 All active sessions will be revoked after changing password.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION PLAN */}
      {activeTab === 'subscription' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 max-w-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> Subscription & SaaS Plan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Active multi-tenant SaaS workspace license.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
              Enterprise Active
            </span>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/20 space-y-3">
            <h4 className="text-sm font-bold text-white">Full Commercial ERP License</h4>
            <p className="text-xs text-slate-300">
              Includes unlimited transaction volume, multi-business isolation, real-time double-entry ledgers, and export-ready reporting.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: IMPORT DATA */}
      {activeTab === 'import' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 max-w-3xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" /> Data Importer (Parties & Products)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste JSON formatted row arrays for bulk party or product import. All records are validated before database transaction commit.
            </p>
          </div>

          {importSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {importSuccessMsg}
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Import Validation Errors:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
                {importErrors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.row} ({err.name}): {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Select JSON File *</label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
              {importFileName && (
                <p className="mt-2 text-xs text-blue-400 font-semibold">Ready to import: {importFileName}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleImportParties}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-600/20"
              >
                Import Parties
              </button>
              <button
                onClick={handleImportItems}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-lg shadow-purple-600/20"
              >
                Import Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURE BACKUP */}
      {activeTab === 'backup' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 max-w-2xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" /> Secure Business Data Backup
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Export a complete JSON data dump of your business account ledgers, party directory, inventory masters, and invoices.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-white">🔒 Security Protocol Guarantee:</p>
            <p className="text-[11px] text-slate-400">
              Backups contain strictly business-owned transactional records. Sensitive passwords, JWT secret tokens, and database server credentials are never exposed.
            </p>
          </div>

          <button
            onClick={handleBackupDownload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-600/20 text-xs"
          >
            <Download className="w-4 h-4" /> Download Complete JSON Backup Dump
          </button>
        </div>
      )}

      {/* TAB 6: BUSINESS TOOLS & CALCULATORS */}
      {activeTab === 'calculators' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* EMI CALCULATOR */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-400" /> Business EMI Calculator
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Loan Principal (Rs.)</label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    value={loanMonths}
                    onChange={(e) => setLoanMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>
              <button
                onClick={calculateEmi}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Calculate EMI
              </button>
              {emiResult !== null && (
                <div className="p-3 rounded-xl bg-slate-800 text-center font-mono">
                  <p className="text-slate-400 text-[10px]">Monthly EMI Payout:</p>
                  <p className="text-lg font-bold text-emerald-400">Rs. {emiResult.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* NOTEBOOK SCRATCHPAD */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" /> Business Scratchpad / Notebook
            </h3>
            <textarea
              rows={8}
              value={notebook}
              onChange={(e) => saveNotebook(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-sans focus:outline-none"
              placeholder="Keep quick business notes, supplier contacts, or reminder tasks..."
            />
            <p className="text-[10px] text-slate-500">Auto-saved to local browser storage.</p>
          </div>
        </div>
      )}

      {/* TAB 7: HELP & ABOUT */}
      {activeTab === 'about' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-2xl text-xs">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">About BizManage ERP Suite</h3>
          <p className="text-slate-300">
            BizManage is a multi-tenant business accounting and inventory management SaaS system built with Next.js, Fastify, Prisma, and PostgreSQL.
          </p>
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2 font-mono text-[11px]">
            <p className="text-white font-bold">System Specification:</p>
            <p className="text-slate-400">• Version: 1.0.0 Enterprise Release</p>
            <p className="text-slate-400">• Multi-Tenant Scoping: Enforced by businessId</p>
            <p className="text-slate-400">• Accounting Engine: Real-time Double-Entry Ledger</p>
          </div>
        </div>
      )}
    </div>
  );
}
