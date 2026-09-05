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
import { ModalPortal } from '@/components/ui/ModalPortal';
import { toast } from 'react-hot-toast';
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
  Monitor,
  Smartphone,
  MapPin,
  Clock,
  Trash2,
  Database,
  FileCheck,
  Layers,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  X,
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

const SETTINGS_SECTIONS: {
  id: SettingsTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
}[] = [
  {
    id: 'profile',
    label: 'GENERAL & PROFILE',
    shortLabel: 'General',
    description: 'Business identity, VAT/PAN & prefixes',
    icon: Building2,
  },
  {
    id: 'account',
    label: 'SECURITY & SESSIONS',
    shortLabel: 'Security',
    description: 'Password, active devices & logins',
    icon: User,
  },
  {
    id: 'subscription',
    label: 'SUBSCRIPTION',
    shortLabel: 'Billing',
    description: 'Plans, features & package upgrade',
    icon: Crown,
  },
  {
    id: 'import',
    label: 'IMPORT DATA',
    shortLabel: 'Import',
    description: 'Bulk upload items & party data',
    icon: Upload,
  },
  {
    id: 'backup',
    label: 'BACKUP & RESTORE',
    shortLabel: 'Backup',
    description: 'Download encrypted database dump',
    icon: Download,
  },
  {
    id: 'calculators',
    label: 'TOOLS & EMI',
    shortLabel: 'Tools & EMI',
    description: 'Loan EMI, interest & tax calculators',
    icon: Calculator,
  },
  {
    id: 'guide',
    label: 'GUIDE / निर्देशिका',
    shortLabel: 'User Guide',
    description: 'Step-by-step user handbook & manual',
    icon: BookOpen,
  },
  {
    id: 'about',
    label: 'ABOUT',
    shortLabel: 'About',
    description: 'System info, E2EE security & version',
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
  const [isMobileSectionDrawerOpen, setIsMobileSectionDrawerOpen] = useState(false);
  const [isSaveProfileConfirmOpen, setIsSaveProfileConfirmOpen] = useState(false);

  useEffect(() => {
    const tabParam = searchParams?.get('tab') as SettingsTab;
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

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

  const hasItems = (metrics?.totalItemsCount || 0) > 0;
  const hasParties = (metrics?.totalPartiesCount || 0) > 0;
  const hasTransactions = (metrics?.totalSales || 0) > 0 || (metrics?.totalPurchases || 0) > 0 || (metrics?.totalExpenses || 0) > 0;
  const savedProfileDone = typeof window !== 'undefined' && localStorage.getItem('bizmanage_profile_completed') === 'true';
  const hasProfileComplete = savedProfileDone || !!(
    business?.name &&
    business?.address &&
    business?.phone &&
    business?.taxNumber
  );

  const [taxRegistrationType, setTaxRegistrationType] = useState<'PAN' | 'VAT'>('PAN');
  const [showTaxOnBills, setShowTaxOnBills] = useState<boolean>(true);
  const [termsAndConditions, setTermsAndConditions] = useState<string>('');

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

  const rawFeatures = business?.subscriptionPackage?.features;
  const userFeatures = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : (rawFeatures || []);
  const pkgName = (business?.subscriptionPackage?.name || '').toLowerCase();
  const createdAt = business?.createdAt ? new Date(business.createdAt) : new Date();
  const trialEndsAt = (business as any)?.trialEndsAt
    ? new Date((business as any).trialEndsAt)
    : new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
  const isTrialActive = new Date() < trialEndsAt;

  const canCustomBranding =
    isTrialActive ||
    userFeatures.includes('CUSTOM_BRANDING') ||
    userFeatures.includes('CUSTOM_LOGO') ||
    pkgName.includes('gold') ||
    pkgName.includes('platinum') ||
    pkgName.includes('pro') ||
    pkgName.includes('premium') ||
    pkgName.includes('enterprise') ||
    userFeatures.some((f: string) => f.toLowerCase().includes('logo') || f.toLowerCase().includes('branding'));
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
  const [parsedBackupMeta, setParsedBackupMeta] = useState<{
    isFullBackup?: boolean;
    businessName?: string;
    exportedAt?: string;
    totalParties?: number;
    totalItems?: number;
    totalAccounts?: number;
    totalInvoices?: number;
  } | null>(null);

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
      const cleanTaxNumber = taxNumber ? taxNumber.trim() : '';
      const isProfileCompleted = Boolean(name && address && phone && cleanTaxNumber);
      await updateBusiness.mutateAsync({ name, phone, email, address, taxNumber: cleanTaxNumber, currency: 'NPR', logoUrl, profileCompleted: isProfileCompleted });
      await refreshUser();
      await updateSettings.mutateAsync({
        invoicePrefix: 'INV-',
        purchasePrefix: 'PUR-',
        quotationPrefix: 'QT-',
        saleReturnPrefix: 'CN-',
        purchaseReturnPrefix: 'DN-',
        enableTax,
        taxRate: Number(taxRate) || 0,
        lowStockAlert: true,
        taxRegistrationType,
        showTaxOnBills,
        termsAndConditions: termsAndConditions.trim(),
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bizmanage_profile_completed'); // cleanup old item
      }
      setProfileSuccess('Business profile & invoice settings saved successfully!');
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || 'Failed to update settings.');
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
      setImportErrors([{ row: 0, name: 'Parse Error', error: err.response?.data?.error?.message || 'Invalid JSON format. Please check your file.' }]);
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
      setImportErrors([{ row: 0, name: 'Parse Error', error: err.response?.data?.error?.message || 'Invalid JSON format. Please check your file.' }]);
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
      setImportErrors([{ row: 0, name: 'Restore Error', error: err.response?.data?.error?.message || 'Invalid backup JSON file or corrupted structure.' }]);
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
      try {
        const json = JSON.parse(content);
        const data = json.data || json;
        const metadata = data.metadata || json.metadata;
        const partiesCount = Array.isArray(data.parties) ? data.parties.length : Array.isArray(json) ? json.length : 0;
        const itemsCount = Array.isArray(data.items) ? data.items.length : 0;
        const accountsCount = Array.isArray(data.accounts) ? data.accounts.length : 0;
        const invoicesCount = (Array.isArray(data.sales) ? data.sales.length : 0) + (Array.isArray(data.purchases) ? data.purchases.length : 0);

        setParsedBackupMeta({
          isFullBackup: Boolean(data.parties || data.items || metadata),
          businessName: metadata?.businessName,
          exportedAt: metadata?.exportedAt ? new Date(metadata.exportedAt).toLocaleString() : undefined,
          totalParties: partiesCount,
          totalItems: itemsCount,
          totalAccounts: accountsCount,
          totalInvoices: invoicesCount,
        });
      } catch (err) {
        setParsedBackupMeta(null);
      }
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
    <div className="space-y-4 font-sans pb-12">
      {/* Main Settings Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col md:flex-row h-auto md:h-[calc(100vh-130px)] md:max-h-[calc(100vh-130px)]">
        
        {/* MOBILE NAVIGATION HUB (< md): Clean, Scroll-Free Modern Hub */}
        <div className="md:hidden bg-slate-900 text-white p-3 border-b border-slate-800 space-y-2.5 shrink-0">
          {/* Active Section Header & Dropdown Trigger */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                {(() => {
                  const curr = SETTINGS_SECTIONS.find((s) => s.id === activeTab) || SETTINGS_SECTIONS[0];
                  const Icon = curr.icon;
                  return <Icon className="w-4 h-4" />;
                })()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-white truncate">
                  {SETTINGS_SECTIONS.find((s) => s.id === activeTab)?.shortLabel || 'Settings'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {SETTINGS_SECTIONS.find((s) => s.id === activeTab)?.description || ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileSectionDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 border border-slate-700 transition-all shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>All ({SETTINGS_SECTIONS.length})</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Quick-Switch 4x2 Grid (100% Scroll-Free, Perfectly Responsive) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800/80">
            {SETTINGS_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveTab(sec.id)}
                  className={`py-1.5 px-1 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                  title={sec.label}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[9px] font-bold leading-tight truncate max-w-full">
                    {sec.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DESKTOP SIDEBAR (>= md): Fixed Height with Independent Dedicated Scrollbar */}
        <div className="hidden md:flex w-60 lg:w-68 shrink-0 bg-[#16192E] text-slate-300 border-r border-slate-800 flex-col h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" /> Settings
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/60">
              {SETTINGS_SECTIONS.length} Sections
            </span>
          </div>

          {/* Independent Scrollable Nav List */}
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
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800/80 shrink-0 bg-[#121426]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 font-bold text-xs">
                {business?.name?.charAt(0) || 'B'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{business?.name || 'BizManage'}</p>
                <p className="text-[10px] text-slate-400 truncate">{business?.subscriptionPackage?.name || 'Free Tier'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area: Independent Vertical Scroll (Clean White ERP Paper Theme) */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-white overflow-y-auto h-auto md:h-full overscroll-contain">
          {/* TAB 1: GENERAL SETTINGS */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-4xl">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                    General & Business Profile
                  </h2>
                  <p className="text-xs text-slate-500">Configure business identity, currency, tax rates, and document prefixes.</p>
                </div>
              </div>

              {profileSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> {profileSuccess}
                </div>
              )}
              {profileError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" /> {profileError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Business Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Business Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs focus:outline-none focus:border-blue-500"
                      placeholder="e.g. RB Hardware & Sanitary House"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Business Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
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
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500"
                        placeholder="e.g. 9841234567"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Business Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500"
                        placeholder="e.g. contact@business.com"
                      />
                    </div>
                  </div>

                  {/* Dynamic PAN / VAT Registration Settings */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">Business Tax Registration</label>
                      <span className="text-[10px] text-slate-500 font-medium">Applied to all printable bills</span>
                    </div>

                    {/* Tax Registration Type (PAN vs VAT) */}
                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Tax Registration Type</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTaxRegistrationType('PAN')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                            taxRegistrationType === 'PAN'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full border-2 ${taxRegistrationType === 'PAN' ? 'bg-white border-white' : 'border-slate-400'}`} />
                          PAN
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaxRegistrationType('VAT')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                            taxRegistrationType === 'VAT'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full border-2 ${taxRegistrationType === 'VAT' ? 'bg-white border-white' : 'border-slate-400'}`} />
                          VAT
                        </button>
                      </div>
                    </div>

                    {/* Registration Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {taxRegistrationType} Registration Number
                      </label>
                      <input
                        type="text"
                        value={taxNumber}
                        onChange={(e) => setTaxNumber(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-slate-800"
                        placeholder={`e.g. 601928374`}
                      />
                    </div>

                    {/* Show on Bills Toggle */}
                    <div className="pt-2 border-t border-slate-200/80">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showTaxOnBills}
                          onChange={(e) => setShowTaxOnBills(e.target.checked)}
                          className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700 select-none">
                          Show {taxRegistrationType} number on bills and printable documents
                        </span>
                      </label>
                      <p className="text-[10px] text-slate-400 mt-0.5 ml-6.5">
                        {showTaxOnBills && taxNumber.trim()
                          ? `Will display as "${taxRegistrationType}: ${taxNumber.trim()}" on all invoices.`
                          : 'Registration number will be completely hidden from bills.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Logo & System Options */}
                <div className="space-y-4">
                  {/* LOGO UPLOAD */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <label className="block text-xs font-bold text-slate-800">Business Logo for Invoices</label>
                    <div className="flex items-center gap-3">
                      {logoUrl ? (
                        <div className="relative group">
                          <img
                            src={logoUrl}
                            alt="Logo"
                            className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-200 p-1 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => setLogoUrl('')}
                            className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm text-[10px]"
                            title="Remove Logo"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold text-xs">
                          No Logo
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Square image (PNG/JPG).</p>
                      </div>
                    </div>
                  </div>

                  {/* Standard Terms & Conditions for Invoices */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Default Terms & Conditions / Notes for Bills
                    </label>
                    <textarea
                      rows={3}
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-slate-800 resize-none"
                      placeholder="e.g. 1. Goods once sold will not be taken back without original bill.&#10;2. Interest @18% p.a. charged on overdue bills."
                    />
                    <p className="text-[10px] text-slate-400">
                      Printed at the footer of all sales invoices and credit notes.
                    </p>
                  </div>

                  {/* Document Prefixes */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-800">Standard Document Prefixes</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-500 block">Sales Invoices</span>
                        <span className="font-mono font-black text-slate-900 text-sm">INV-</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-500 block">Purchase Bills</span>
                        <span className="font-mono font-black text-slate-900 text-sm">PUR-</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSaveProfileConfirmOpen(true)}
                  disabled={updateBusiness.isPending || updateSettings.isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {updateBusiness.isPending ? 'Saving...' : 'Save General Settings'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & SESSIONS */}
          {activeTab === 'account' && (
            <div className="space-y-6 max-w-4xl">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Security & Active Sessions
                </h2>
                <p className="text-xs text-slate-500">Manage account password, two-factor authentication, and connected devices.</p>
              </div>

              {/* User Profile Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                      {user?.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{user?.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>

              {/* Change Password Form */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" /> Change Account Password
                </h3>

                {pwdSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" /> {pwdSuccess}
                  </div>
                )}
                {pwdError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
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
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={pwdPending || !newPwd || newPwd !== confirmPwd}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50"
                >
                  {pwdPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>

              {/* Active Sessions */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-indigo-600" /> Active Devices & Sessions
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      toast.promise(deleteOtherSessions.mutateAsync(), {
                        loading: 'Logging out other devices...',
                        success: 'All other devices logged out!',
                        error: 'Failed to log out other devices.',
                      });
                    }}
                    disabled={deleteOtherSessions.isPending || sessions?.length === 1}
                    className="text-xs px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all disabled:opacity-50"
                  >
                    Log out other devices
                  </button>
                </div>

                <div className="space-y-2.5">
                  {sessions?.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                          {session.device?.toLowerCase().includes('mobile') ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Monitor className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{session.device || 'Browser Device'}</span>
                            {session.isCurrent && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {session.browser || 'Web'} • {session.ipAddress || 'Local IP'}
                          </p>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <button
                          onClick={() => deleteSession.mutateAsync(session.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
          )}

          {/* TAB 3: SUBSCRIPTION PLAN */}
          {activeTab === 'subscription' && (
            <div className="space-y-6 max-w-4xl">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Subscription & Workspace Plan
                </h2>
                <p className="text-xs text-slate-500">View license details, trial status, and upgrade packages.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-wider">
                    {selectedPlan || 'Free Starter / 14-Day Trial'}
                  </span>
                  <Link
                    href="/subscription"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
                  >
                    Manage Plans &rarr;
                  </Link>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedPlan ? `${selectedPlan} Plan Active` : '14-Day Full Free Trial Active'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enjoy all ERP tools, WhatsApp marketing, POS billing, unlimited invoices, barcode printing, and reports.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: IMPORT DATA */}
          {activeTab === 'import' && (
            <div className="space-y-6 max-w-4xl">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Import Data & Full Backup Restore
                </h2>
                <p className="text-xs text-slate-500">Upload JSON or Excel data files to import parties and inventory items in bulk.</p>
              </div>

              {importSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <label className="block text-xs font-bold text-slate-800">Choose JSON / Excel Data File</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-600 font-mono file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleImportFullBackup}
                    disabled={!importJsonText || importingFull}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Database className="w-4 h-4" />
                    <span>{importingFull ? 'Restoring...' : 'Restore Full Backup'}</span>
                  </button>

                  <button
                    onClick={handleImportParties}
                    disabled={!importJsonText}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Import Parties Only</span>
                  </button>

                  <button
                    onClick={handleImportItems}
                    disabled={!importJsonText}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Import Items Only</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-4xl">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Secure Data Backup
                </h2>
                <p className="text-xs text-slate-500">Download a complete backup archive of your business records.</p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Export a complete JSON data snapshot containing all parties, products, transactions, invoices, and accounting ledgers.
                </p>
                <button
                  onClick={handleBackupDownload}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Complete JSON Backup
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: CALCULATORS */}
          {activeTab === 'calculators' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              {/* EMI Calculator */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" /> Business Loan EMI Calculator
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Principal Amount (Rs.)</label>
                    <input
                      type="text" inputMode="decimal" onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      onBlur={onNumericBlur}
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Annual Rate (%)</label>
                      <input
                        type="text" inputMode="decimal" onKeyDown={onNumericKeyDown}
                        onFocus={onNumericFocus}
                        onBlur={onNumericBlur}
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Tenure (Months)</label>
                      <input
                        type="text" inputMode="decimal" onKeyDown={onNumericKeyDown}
                        onFocus={onNumericFocus}
                        onBlur={onNumericBlur}
                        value={loanMonths}
                        onChange={(e) => setLoanMonths(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold"
                      />
                    </div>
                  </div>
                  <button
                    onClick={calculateEmi}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                  >
                    Calculate EMI
                  </button>
                  {emiResult !== null && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono">
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
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-sans focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                  placeholder="Notes, reminder tasks, or supplier quotes..."
                />
              </div>
            </div>
          )}

          {/* TAB 7: GUIDE */}
          {activeTab === 'guide' && (
            <div className="max-w-5xl">
              <UserGuide initialLanguage="np" showLanguageSelector={true} />
            </div>
          )}

          {/* TAB 8: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-4 max-w-3xl text-xs">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  About BizManage ERP Platform
                </h2>
                <p className="text-xs text-slate-500">Enterprise accounting and inventory software platform.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="font-bold text-slate-900">BizManage 1.0.0 Enterprise Suite</p>
                <p className="text-slate-600 leading-relaxed">
                  Real-time double-entry bookkeeping, POS billing, warehouse godowns, multi-store sync, and audit trails.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Settings Section Sheet Modal */}
      {isMobileSectionDrawerOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-end justify-center p-0 md:hidden font-sans animate-in fade-in duration-150"
            onClick={() => setIsMobileSectionDrawerOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200"
            >
              {/* Sheet Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Settings Sections</h3>
                    <p className="text-[11px] text-slate-500">Choose configuration module</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSectionDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet List */}
              <div className="p-3 space-y-1.5 overflow-y-auto max-h-[60vh]">
                {SETTINGS_SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  const isSelected = activeTab === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(sec.id);
                        setIsMobileSectionDrawerOpen(false);
                      }}
                      className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border border-blue-200 text-blue-900 shadow-2xs font-bold'
                          : 'bg-slate-50/50 hover:bg-slate-100 border border-transparent text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 truncate">{sec.label}</p>
                          <p className="text-[11px] text-slate-400 truncate">{sec.description}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

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
