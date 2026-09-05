'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useCurrentBusiness, useUpdateBusiness, useUpdateBusinessSettings } from '@/services/businessService';
import { useImportParties, useImportItems, useDownloadBackup, useChangePassword, useRestoreBackup } from '@/services/utilityService';
import { useDashboardMetrics } from '@/services/dashboardService';
import { useSessions, useDeleteSession, useDeleteOtherSessions } from '@/services/sessionService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { UserGuide } from '@/components/guide/UserGuide';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { ModalPortal } from '@/components/common/ModalPortal';
import {
  Settings,
  Building2,
  User,
  Crown,
  Upload,
  Download,
  Calculator,
  HelpCircle,
  LogOut,
  Save,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  KeyRound,
  ShieldCheck,
  Monitor,
  Smartphone,
  Trash2,
  Database,
  ChevronRight,
  ArrowLeft,
  FileText,
  Percent,
  Receipt,
  FileCode2,
  Sliders,
  Sparkles,
  Check,
  Zap,
  X,
  QrCode,
  ArrowRight,
} from 'lucide-react';

type SettingsTab =
  | 'profile'
  | 'guide'
  | 'account'
  | 'subscription'
  | 'import'
  | 'backup'
  | 'calculators'
  | 'about';

interface SectionItem {
  id: SettingsTab;
  label: string;
  shortLabel: string;
  category: 'business' | 'security' | 'billing' | 'data' | 'tools';
  description: string;
  icon: any;
}

const SETTINGS_SECTIONS: SectionItem[] = [
  {
    id: 'profile',
    label: 'GENERAL & PROFILE',
    shortLabel: 'Business Profile',
    category: 'business',
    description: 'Business identity, VAT/PAN, logo & prefixes',
    icon: Building2,
  },
  {
    id: 'account',
    label: 'SECURITY & SESSIONS',
    shortLabel: 'Security & Logins',
    category: 'security',
    description: 'Password, active devices & logins',
    icon: User,
  },
  {
    id: 'subscription',
    label: 'SUBSCRIPTION',
    shortLabel: 'Billing & Plan',
    category: 'billing',
    description: 'Plans, features & package upgrade',
    icon: Crown,
  },
  {
    id: 'import',
    label: 'IMPORT DATA',
    shortLabel: 'Import Data',
    category: 'data',
    description: 'Bulk upload items, parties & backup restore',
    icon: Upload,
  },
  {
    id: 'backup',
    label: 'BACKUP & RESTORE',
    shortLabel: 'Backup Snapshot',
    category: 'data',
    description: 'Download encrypted database dump',
    icon: Download,
  },
  {
    id: 'calculators',
    label: 'TOOLS & EMI',
    shortLabel: 'Tools & EMI',
    category: 'tools',
    description: 'Loan EMI, interest calculators & scratchpad',
    icon: Calculator,
  },
  {
    id: 'guide',
    label: 'GUIDE / निर्देशिका',
    shortLabel: 'User Guide',
    category: 'tools',
    description: 'Step-by-step user handbook & manual',
    icon: BookOpen,
  },
  {
    id: 'about',
    label: 'ABOUT ERP',
    shortLabel: 'About BizManage',
    category: 'tools',
    description: 'System info, security & versioning',
    icon: HelpCircle,
  },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading settings..." />}>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent() {
  const { user, refreshUser, logout } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [mobileSubScreen, setMobileSubScreen] = useState<SettingsTab | null>(null);
  const [isSaveProfileConfirmOpen, setIsSaveProfileConfirmOpen] = useState(false);

  useEffect(() => {
    const tabParam = searchParams?.get('tab') as SettingsTab;
    if (tabParam) {
      setActiveTab(tabParam);
      setMobileSubScreen(tabParam);
    }
  }, [searchParams]);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPlanDetailModal, setSelectedPlanDetailModal] = useState<any | null>(null);

  useEffect(() => {
    api.get('/packages').then((res) => {
      if (res.data?.success && res.data?.data) {
        const parsed = res.data.data.map((pkg: any) => ({
          ...pkg,
          features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features || [],
        }));
        setPackages(parsed);
      }
    }).catch(() => {});
  }, []);

  // Business Profile & Settings Queries
  const { data: business, isLoading: settingsLoading, refetch } = useCurrentBusiness();
  const updateSettings = useUpdateBusinessSettings();
  const updateBusiness = useUpdateBusiness();

  useEffect(() => {
    if (business?.subscriptionPackage?.name) {
      setSelectedPlan(business.subscriptionPackage.name);
    }
  }, [business?.subscriptionPackage?.name]);

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

  const { data: metrics, refetch: refetchMetrics } = useDashboardMetrics();

  useEffect(() => {
    refetchMetrics();
  }, [refetchMetrics, activeTab]);

  const [taxRegistrationType, setTaxRegistrationType] = useState<'PAN' | 'VAT'>('PAN');
  const [showTaxOnBills, setShowTaxOnBills] = useState<boolean>(true);
  const [termsAndConditions, setTermsAndConditions] = useState<string>('');
  const [invoicePrefix, setInvoicePrefix] = useState<string>('INV-');
  const [purchasePrefix, setPurchasePrefix] = useState<string>('PUR-');
  const [quotationPrefix, setQuotationPrefix] = useState<string>('QT-');
  const [saleReturnPrefix, setSaleReturnPrefix] = useState<string>('CN-');

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
        setTaxRegistrationType(((business.settings as any).taxRegistrationType as 'PAN' | 'VAT') || 'PAN');
        setShowTaxOnBills((business.settings as any).showTaxOnBills ?? true);
        setTermsAndConditions((business.settings as any).termsAndConditions || '');
        if (business.settings.invoicePrefix) setInvoicePrefix(business.settings.invoicePrefix);
        if (business.settings.purchasePrefix) setPurchasePrefix(business.settings.purchasePrefix);
        if (business.settings.quotationPrefix) setQuotationPrefix(business.settings.quotationPrefix);
        if (business.settings.saleReturnPrefix) setSaleReturnPrefix(business.settings.saleReturnPrefix);
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
  const [taxRate, setTaxRate] = useState<number | string>(13);

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

  // Session States
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const deleteSession = useDeleteSession();
  const deleteOtherSessions = useDeleteOtherSessions();

  // Import & Restore States
  const restoreBackup = useRestoreBackup();
  const [importJsonText, setImportJsonText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [importingFull, setImportingFull] = useState(false);

  // Calculator States
  const [loanAmount, setLoanAmount] = useState(500000);
  const [interestRate, setInterestRate] = useState(12);
  const [loanMonths, setLoanMonths] = useState(24);
  const [emiResult, setEmiResult] = useState<number | null>(null);

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
      const cleanTaxNumber = taxNumber ? taxNumber.trim() : '';
      const isProfileCompleted = Boolean(name && address && phone && cleanTaxNumber);
      await updateBusiness.mutateAsync({
        name,
        phone,
        email,
        address,
        taxNumber: cleanTaxNumber,
        currency: 'NPR',
        logoUrl,
        profileCompleted: isProfileCompleted,
      });
      await refreshUser();
      await updateSettings.mutateAsync({
        invoicePrefix: invoicePrefix || 'INV-',
        purchasePrefix: purchasePrefix || 'PUR-',
        quotationPrefix: quotationPrefix || 'QT-',
        saleReturnPrefix: saleReturnPrefix || 'CN-',
        purchaseReturnPrefix: 'DN-',
        enableTax,
        taxRate: Number(taxRate) || 0,
        lowStockAlert: true,
        taxRegistrationType,
        showTaxOnBills,
        termsAndConditions: termsAndConditions.trim(),
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bizmanage_profile_completed');
      }
      setProfileSuccess('Business profile & settings saved successfully!');
      toast.success('Settings updated successfully!');
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || 'Failed to update settings.');
      toast.error('Failed to save settings.');
    }
  };

  const handleImportParties = async () => {
    if (!importJsonText) {
      toast.error('Please choose a JSON file first');
      return;
    }
    setImportErrors([]);
    setImportSuccessMsg('');
    try {
      const json = JSON.parse(importJsonText);
      const rows = Array.isArray(json) ? json : json.data?.parties || json.parties || json.rows || [];
      if (!Array.isArray(rows) || rows.length === 0) {
        setImportErrors([{ row: 0, name: 'Data Missing', error: 'No parties found in the selected JSON file.' }]);
        return;
      }
      const res = await importParties.mutateAsync(rows);
      if (res.data?.errors?.length > 0) {
        setImportErrors(res.data.errors);
      } else {
        setImportErrors([]);
      }
      const count = res.data?.importedCount || rows.length;
      setImportSuccessMsg(`Successfully imported ${count} parties!`);
      toast.success(`Imported ${count} parties successfully!`);
    } catch (err: any) {
      setImportErrors([{ row: 0, name: 'Parse Error', error: err.response?.data?.error?.message || 'Invalid JSON format.' }]);
    }
  };

  const handleImportItems = async () => {
    if (!importJsonText) {
      toast.error('Please choose a JSON file first');
      return;
    }
    setImportErrors([]);
    setImportSuccessMsg('');
    try {
      const json = JSON.parse(importJsonText);
      const rows = Array.isArray(json) ? json : json.data?.items || json.items || json.rows || [];
      if (!Array.isArray(rows) || rows.length === 0) {
        setImportErrors([{ row: 0, name: 'Data Missing', error: 'No items/products found in the selected JSON file.' }]);
        return;
      }
      const res = await importItems.mutateAsync(rows);
      if (res.data?.errors?.length > 0) {
        setImportErrors(res.data.errors);
      } else {
        setImportErrors([]);
      }
      const count = res.data?.importedCount || rows.length;
      setImportSuccessMsg(`Successfully imported ${count} items!`);
      toast.success(`Imported ${count} items successfully!`);
    } catch (err: any) {
      setImportErrors([{ row: 0, name: 'Parse Error', error: err.response?.data?.error?.message || 'Invalid JSON format.' }]);
    }
  };

  const handleImportFullBackup = async () => {
    if (!importJsonText) {
      toast.error('Please choose a JSON backup file first');
      return;
    }
    setImportingFull(true);
    setImportErrors([]);
    setImportSuccessMsg('');
    try {
      const json = JSON.parse(importJsonText);
      const res = await restoreBackup.mutateAsync(json);
      if (res.success) {
        setImportSuccessMsg(res.message || 'Full database backup restored successfully!');
        toast.success(res.message || 'Full database restored successfully!');
      } else {
        toast.error(res.error?.message || 'Restore failed');
      }
    } catch (err: any) {
      setImportErrors([{ row: 0, name: 'Restore Error', error: err.response?.data?.error?.message || 'Invalid backup file structure.' }]);
      toast.error('Failed to restore backup');
    } finally {
      setImportingFull(false);
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
    setImportErrors([]);
    setImportSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
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
      toast.success('Backup downloaded successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Failed to generate backup dump.');
    }
  };

  const calculateEmi = () => {
    const r = interestRate / 12 / 100;
    const n = loanMonths;
    const emi = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setEmiResult(Math.round(emi));
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

  // RENDER TAB CONTENT
  const renderTabContent = (tab: SettingsTab, isMobileSub: boolean = false) => {
    switch (tab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" /> {profileError}
              </div>
            )}

            {/* 6 Modular Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* CARD 1: Business Identity */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">1. Business Identity</h3>
                    <p className="text-[11px] text-slate-500">Legal name, contact & location</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Business Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-300 text-slate-900 font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                      placeholder="e.g. RB Hardware & Sanitary House"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Business Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-300 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                      placeholder="e.g. New Road, Pokhara, Nepal"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-300 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                        placeholder="e.g. 9841234567"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Business Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-300 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                        placeholder="e.g. contact@business.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: Logo Uploader */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">2. Business Logo</h3>
                    <p className="text-[11px] text-slate-500">Printed on top of sales bills and reports</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {logoUrl ? (
                    <div className="relative group shrink-0">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-20 h-20 rounded-2xl object-contain bg-slate-50 border border-slate-200 p-1.5 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm text-[10px] hover:bg-rose-700 cursor-pointer"
                        title="Remove Logo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 font-bold text-[11px] shrink-0">
                      <span>No Logo</span>
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer min-h-[44px]"
                    />
                    <p className="text-[11px] text-slate-500">Recommended: Square PNG/JPG, under 5MB.</p>
                  </div>
                </div>
              </div>

              {/* CARD 3: Dynamic PAN / VAT Registration */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">3. Tax & Legal Registration</h3>
                    <p className="text-[11px] text-slate-500">Dynamic PAN vs VAT configuration</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Tax Registration Type</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTaxRegistrationType('PAN')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border min-h-[44px] cursor-pointer ${
                          taxRegistrationType === 'PAN'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border-2 ${taxRegistrationType === 'PAN' ? 'bg-white border-white' : 'border-slate-400'}`} />
                        PAN Registered
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxRegistrationType('VAT')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border min-h-[44px] cursor-pointer ${
                          taxRegistrationType === 'VAT'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border-2 ${taxRegistrationType === 'VAT' ? 'bg-white border-white' : 'border-slate-400'}`} />
                        VAT Registered
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {taxRegistrationType} Registration Number
                    </label>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-300 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                      placeholder="e.g. 601928374"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showTaxOnBills}
                        onChange={(e) => setShowTaxOnBills(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700 select-none">
                        Show {taxRegistrationType} number on printable bills
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1 ml-6.5">
                      {showTaxOnBills && taxNumber.trim()
                        ? `Live badge: "${taxRegistrationType}: ${taxNumber.trim()}" on all invoices.`
                        : 'Registration number will be completely hidden from bills.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 4: Document Prefixes & Sequences */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">4. Document Prefixes</h3>
                    <p className="text-[11px] text-slate-500">Custom sequential bill number codes</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Sales Invoices</label>
                    <input
                      type="text"
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-xs min-h-[44px]"
                      placeholder="INV-"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Purchase Bills</label>
                    <input
                      type="text"
                      value={purchasePrefix}
                      onChange={(e) => setPurchasePrefix(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-xs min-h-[44px]"
                      placeholder="PUR-"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Quotations</label>
                    <input
                      type="text"
                      value={quotationPrefix}
                      onChange={(e) => setQuotationPrefix(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-xs min-h-[44px]"
                      placeholder="QT-"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Credit Notes</label>
                    <input
                      type="text"
                      value={saleReturnPrefix}
                      onChange={(e) => setSaleReturnPrefix(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-xs min-h-[44px]"
                      placeholder="CN-"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 5: Default Terms & Conditions */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">5. Default Terms & Notes</h3>
                    <p className="text-[11px] text-slate-500">Printed at the bottom of all sales bills</p>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={4}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-300 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-600 resize-none font-sans"
                    placeholder="e.g. 1. Goods once sold will not be taken back without original bill.&#10;2. Interest @18% p.a. charged on overdue bills."
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Leave blank if no standard terms are required.</p>
                </div>
              </div>

              {/* CARD 6: Workspace Preferences & Behavior */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">6. Preferences & Tax Mode</h3>
                    <p className="text-[11px] text-slate-500">Default currency, tax computation & alerts</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-900 block">Workspace Currency</span>
                      <span className="text-[11px] text-slate-500">Nepalese Rupee (NPR / Rs.)</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-mono font-bold text-xs">
                      NPR (Rs.)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-900 block">Setup Guide on Dashboard</span>
                      <span className="text-[11px] text-slate-500">Show step-by-step checklist on home</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showOnboarding}
                      onChange={(e) => toggleOnboardingGuide(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Bottom Sticky / Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSaveProfileConfirmOpen(true)}
                disabled={updateBusiness.isPending || updateSettings.isPending}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                <Save className="w-4 h-4" /> {updateBusiness.isPending ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                    {user?.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{user?.name}</h4>
                    <p className="text-xs text-slate-500 font-mono truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold text-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" /> Change Account Password
              </h3>

              {pwdSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" /> {pwdSuccess}
                </div>
              )}
              {pwdError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" /> {pwdError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Password *</label>
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="Current password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={pwdPending || !newPwd || newPwd !== confirmPwd}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {pwdPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>

            {/* Active Sessions */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-indigo-600" /> Active Devices & Sessions
                </h3>
                <button
                  onClick={() => {
                    toast.promise(deleteOtherSessions.mutateAsync(), {
                      loading: 'Logging out other devices...',
                      success: 'All other devices logged out!',
                      error: 'Failed to log out other devices.',
                    });
                  }}
                  disabled={deleteOtherSessions.isPending || sessions?.length === 1}
                  className="text-xs px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all disabled:opacity-50 cursor-pointer min-h-[36px] w-full sm:w-auto text-center"
                >
                  Log out other devices
                </button>
              </div>

              <div className="space-y-2.5">
                {sessions?.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs shrink-0">
                        {session.device?.toLowerCase().includes('mobile') ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">{session.device || 'Browser Device'}</span>
                          {session.isCurrent && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 font-mono font-medium truncate">
                          {session.browser || 'Web'} • {session.ipAddress || 'Local IP'}
                        </p>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <button
                        onClick={() => deleteSession.mutateAsync(session.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Revoke session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'subscription':
        return (
          <div className="space-y-6">
            {/* Active Plan Overview Banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="w-fit px-3 py-1 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                  {selectedPlan || 'Free Starter / 14-Day Trial'}
                </span>
                <Link
                  href="/subscription"
                  className="w-fit sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all min-h-[40px] flex items-center justify-center cursor-pointer"
                >
                  Manage Invoices & Billing &rarr;
                </Link>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {selectedPlan ? `${selectedPlan} Plan Active` : '14-Day Full Free Trial Active'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enjoy complete access to ERP invoicing, inventory management, party ledgers, barcode printing, and analytics.
              </p>
            </div>

            {/* Available Plans Div List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" /> Available Subscription Plans
                  </h4>
                  <p className="text-xs text-slate-500">Tap any plan to inspect complete features and upgrade instantly.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg) => {
                  const isCurrent = business?.subscriptionPackage?.id === pkg.id || (pkg.isDefault && !business?.subscriptionPackage);
                  const isPopular = pkg.name.toLowerCase().includes('gold') || pkg.name.toLowerCase().includes('popular') || pkg.name.toLowerCase().includes('retail');

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPlanDetailModal(pkg)}
                      className={`p-5 rounded-2xl bg-white border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between space-y-4 group relative ${
                        isCurrent
                          ? 'border-2 border-blue-600 ring-2 ring-blue-50'
                          : isPopular
                          ? 'border-amber-300 hover:border-amber-400'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isPopular ? (
                              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                              <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                            <h5 className="font-black text-sm text-slate-900">{pkg.name}</h5>
                          </div>
                          {isCurrent ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : isPopular ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Popular
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900 font-mono">
                              Rs. {Number(pkg.price).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">/{pkg.billingPeriod === 'YEARLY' ? 'year' : 'mo'}</span>
                          </div>
                        </div>

                        <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                          {(pkg.features || []).slice(0, 4).map((f: string, idx: number) => (
                            <li key={idx} className="flex items-center gap-2 truncate">
                              <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[3]" />
                              <span className="truncate">{f.replace(/_/g, ' ')}</span>
                            </li>
                          ))}
                          {(pkg.features || []).length > 4 && (
                            <li className="text-[11px] text-blue-600 font-bold pl-5">
                              + {(pkg.features || []).length - 4} more features
                            </li>
                          )}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlanDetailModal(pkg);
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                        }`}
                      >
                        <span>{isCurrent ? 'View Details' : 'View & Buy Plan'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan Details & Buy Option Modal */}
            {selectedPlanDetailModal && (
              <ModalPortal>
                <div
                  className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[120] flex items-center justify-center p-4 font-sans"
                  onClick={() => setSelectedPlanDetailModal(null)}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                          <Crown className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-slate-900">{selectedPlanDetailModal.name} Plan</h3>
                          <p className="text-xs text-slate-500">Complete plan details and features breakdown</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedPlanDetailModal(null)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-500 block font-medium">Subscription Price</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900 font-mono">
                            Rs. {Number(selectedPlanDetailModal.price).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500">/{selectedPlanDetailModal.billingPeriod === 'YEARLY' ? 'year' : 'month'}</span>
                        </div>
                      </div>
                      {business?.subscriptionPackage?.id === selectedPlanDetailModal.id ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Current Active Plan
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Available to Upgrade
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Included Features</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 max-h-60 overflow-y-auto p-1">
                        {(selectedPlanDetailModal.features || []).map((f: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                            <span className="font-semibold text-slate-800 text-[11px] truncate">{f.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedPlanDetailModal(null)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Close
                      </button>
                      <Link
                        href="/subscription"
                        onClick={() => setSelectedPlanDetailModal(null)}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>{business?.subscriptionPackage?.id === selectedPlanDetailModal.id ? 'Manage Subscription' : 'Buy & Upgrade Now'}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </ModalPortal>
            )}
          </div>
        );

      case 'import':
        return (
          <div className="space-y-6">
            {importSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
              <label className="block text-xs font-bold text-slate-800">Choose JSON / Data File</label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-600 font-mono file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer min-h-[44px]"
              />

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleImportFullBackup}
                  disabled={!importJsonText || importingFull}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <Database className="w-4 h-4" />
                  <span>{importingFull ? 'Restoring...' : 'Restore Full Backup'}</span>
                </button>

                <button
                  onClick={handleImportParties}
                  disabled={!importJsonText}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <span>Import Parties Only</span>
                </button>

                <button
                  onClick={handleImportItems}
                  disabled={!importJsonText}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <span>Import Items Only</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
              <p className="text-xs text-slate-600 leading-relaxed">
                Export a complete snapshot containing all parties, products, transactions, invoices, and accounting ledgers.
              </p>
              <button
                onClick={handleBackupDownload}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer min-h-[44px]"
              >
                <Download className="w-4 h-4" /> Download Complete JSON Backup
              </button>
            </div>
          </div>
        );

      case 'calculators':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EMI Calculator */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" /> Business Loan EMI Calculator
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Principal Amount (Rs.)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={onNumericKeyDown}
                    onFocus={onNumericFocus}
                    onBlur={onNumericBlur}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold min-h-[44px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Annual Rate (%)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      onBlur={onNumericBlur}
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Tenure (Months)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      onBlur={onNumericBlur}
                      value={loanMonths}
                      onChange={(e) => setLoanMonths(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold min-h-[44px]"
                    />
                  </div>
                </div>
                <button
                  onClick={calculateEmi}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs min-h-[44px] cursor-pointer"
                >
                  Calculate EMI
                </button>
                {emiResult !== null && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono">
                    <p className="text-slate-500 text-[10px] font-bold uppercase">Monthly Payment:</p>
                    <p className="text-lg font-black text-emerald-600">Rs. {emiResult.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notebook */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" /> Business Scratchpad
              </h3>
              <textarea
                rows={8}
                value={notebook}
                onChange={(e) => saveNotebook(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-sans focus:outline-none focus:bg-white focus:border-blue-600 transition-all resize-none"
                placeholder="Notes, reminder tasks, or supplier quotes..."
              />
            </div>
          </div>
        );

      case 'guide':
        return (
          <div className="max-w-5xl">
            <UserGuide initialLanguage="np" showLanguageSelector={true} />
          </div>
        );

      case 'about':
        return (
          <div className="space-y-4 max-w-3xl text-xs">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
              <p className="font-black text-slate-900 text-sm">BizManage 1.0.0 Enterprise Suite</p>
              <p className="text-slate-600 leading-relaxed">
                Complete double-entry accounting, POS billing, multi-store sync, smart product search, and secure audit trails.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 font-sans pb-16 md:pb-12">
      {/* ========================================================================= */}
      {/* MOBILE EXPERIENCE (< md): Native Settings Hub & Dedicated Sub-Screens     */}
      {/* ========================================================================= */}
      <div className="md:hidden">
        {mobileSubScreen === null ? (
          /* Mobile Settings Hub List */
          <div className="space-y-4">
            {/* Header */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                  {business?.name?.charAt(0) || 'B'}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-black text-slate-900 truncate">{business?.name || 'BizManage'}</h1>
                  <p className="text-xs text-slate-500 truncate">{user?.email || 'Settings & Configuration'}</p>
                </div>
              </div>
            </div>

            {/* Categorized Sections */}
            {(['business', 'security', 'billing', 'data', 'tools'] as const).map((catKey) => {
              const items = SETTINGS_SECTIONS.filter((s) => s.category === catKey);
              if (items.length === 0) return null;

              const catTitles: Record<string, string> = {
                business: 'Business Identity & Legal',
                security: 'Account & Security',
                billing: 'Billing & Workspace',
                data: 'Data & Backups',
                tools: 'Utilities & Guide',
              };

              return (
                <div key={catKey} className="space-y-1.5">
                  <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">
                    {catTitles[catKey]}
                  </h2>
                  <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileSubScreen(item.id);
                          }}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer min-h-[52px]"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">{item.shortLabel}</p>
                              <p className="text-[11px] text-slate-500 truncate">{item.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Mobile Sub-Screen View */
          <div className="space-y-4">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMobileSubScreen(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer min-h-[44px] px-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Settings</span>
              </button>
              <h2 className="text-xs font-black uppercase text-slate-900 truncate max-w-[180px]">
                {SETTINGS_SECTIONS.find((s) => s.id === mobileSubScreen)?.shortLabel || 'Settings'}
              </h2>
              {mobileSubScreen === 'profile' ? (
                <button
                  type="button"
                  onClick={() => setIsSaveProfileConfirmOpen(true)}
                  disabled={updateBusiness.isPending || updateSettings.isPending}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs active:scale-95 disabled:opacity-50"
                >
                  Save
                </button>
              ) : (
                <div className="w-10" />
              )}
            </div>

            {/* Sub-Screen Form Content */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              {renderTabContent(mobileSubScreen, true)}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP EXPERIENCE (>= md): Fixed Navy Sidebar + 6-Card Modular Workspace */}
      {/* ========================================================================= */}
      <div className="hidden md:flex bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden h-[calc(100vh-130px)] max-h-[calc(100vh-130px)]">
        {/* Fixed Navy Sidebar */}
        <div className="w-64 lg:w-72 shrink-0 bg-[#16192E] text-slate-300 border-r border-slate-800 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" /> Settings
            </span>
            <span className="text-[10px] font-bold text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/60">
              {SETTINGS_SECTIONS.length} Sections
            </span>
          </div>

          {/* Navigation List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1 overscroll-contain">
            {SETTINGS_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveTab(sec.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-800/80 shrink-0 bg-[#121426]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 font-bold text-xs">
                {business?.name?.charAt(0) || 'B'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{business?.name || 'BizManage'}</p>
                <p className="text-[10px] text-slate-300 truncate">{business?.subscriptionPackage?.name || 'Free Tier'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Workspace Content */}
        <div className="flex-1 p-6 lg:p-8 bg-slate-50/50 overflow-y-auto h-full overscroll-contain">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {SETTINGS_SECTIONS.find((s) => s.id === activeTab)?.label || 'Settings'}
                </h1>
                <p className="text-xs text-slate-500">
                  {SETTINGS_SECTIONS.find((s) => s.id === activeTab)?.description || ''}
                </p>
              </div>

              {activeTab === 'profile' && (
                <button
                  type="button"
                  onClick={() => setIsSaveProfileConfirmOpen(true)}
                  disabled={updateBusiness.isPending || updateSettings.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50 min-h-[40px]"
                >
                  <Save className="w-4 h-4" /> {updateBusiness.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              )}
            </div>

            {/* Main Tab Content */}
            {renderTabContent(activeTab, false)}
          </div>
        </div>
      </div>

      {/* Save Settings Confirmation Modal */}
      <SaveConfirmModal
        isOpen={isSaveProfileConfirmOpen}
        onClose={() => setIsSaveProfileConfirmOpen(false)}
        onConfirm={() => {
          setIsSaveProfileConfirmOpen(false);
          handleSaveProfile();
        }}
        isLoading={updateBusiness.isPending || updateSettings.isPending}
        title="Save Settings & Business Profile?"
        message="Are you sure you want to save these changes to your business profile and invoice settings?"
        confirmText="Yes, Save Settings"
      />
    </div>
  );
}
