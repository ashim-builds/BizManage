'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';

import { useState } from 'react';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/services/accountService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import {
  Wallet,
  Building2,
  Smartphone,
  Plus,
  Trash2,
  CreditCard,
  TrendingUp,
  X,
} from 'lucide-react';

type AccountTypeKey = 'CASH' | 'BANK' | 'MOBILE_WALLET';

const ACCOUNT_TYPE_CONFIG: Record<AccountTypeKey, { label: string; icon: any; color: string; bg: string; border: string }> = {
  CASH: {
    label: 'Cash',
    icon: Wallet,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  BANK: {
    label: 'Bank',
    icon: Building2,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  MOBILE_WALLET: {
    label: 'Mobile Wallet',
    icon: Smartphone,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
};

export default function AccountsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [deletingAccountInfo, setDeletingAccountInfo] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [form, setForm] = useState({
    accountName: '',
    accountType: 'CASH' as 'CASH' | 'BANK' | 'MOBILE_WALLET',
    accountNumber: '',
    bankName: '',
    openingBalance: '',
  });
  const [error, setError] = useState('');

  const { data, isLoading, isError, refetch } = useAccounts();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();

  const accounts = data?.data || [];
  const totalBalance = data?.meta?.totalBalance || 0;

  const cashTotal = accounts.filter(a => a.accountType === 'CASH').reduce((s, a) => s + Number(a.balance), 0);
  const bankTotal = accounts.filter(a => a.accountType === 'BANK').reduce((s, a) => s + Number(a.balance), 0);
  const walletTotal = accounts.filter(a => a.accountType === 'MOBILE_WALLET').reduce((s, a) => s + Number(a.balance), 0);

  const handleAccountSaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.accountName.trim()) { setError('Account name is required'); return; }
    setIsSaveConfirmOpen(true);
  };

  const handleConfirmAccountSave = () => {
    setIsSaveConfirmOpen(false);
    executeAccountCreate();
  };

  const executeAccountCreate = async () => {
    try {
      await createAccount.mutateAsync({
        accountName: form.accountName.trim(),
        accountType: form.accountType,
        accountNumber: form.accountNumber.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
        openingBalance: form.openingBalance ? Number(form.openingBalance) : 0,
      });
      setIsModalOpen(false);
      setForm({ accountName: '', accountType: 'CASH', accountNumber: '', bankName: '', openingBalance: '' });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create account');
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeletingAccountInfo({ id, name });
  };

  if (isLoading) return <LoadingState message="Loading cash & bank accounts..." />;
  if (isError) return <ErrorState title="Failed to load accounts" onRetry={refetch} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-emerald-600" /> Cash &amp; Bank Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your cash registers, bank accounts, and mobile wallets. All balances update automatically.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {/* Summary Cards: 1+3 Layout on Mobile, 4-Column on Desktop */}
      <div className="space-y-2 md:hidden">
        {/* Top Hero: Total Balance */}
        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Total Combined Balance</p>
            <p className="text-base font-black font-mono text-slate-900 mt-0.5 whitespace-nowrap">
              Rs. {totalBalance.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Across all {accounts.length} accounts
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Breakdown Row (3 Columns) */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
            <p className="text-[10px] font-bold text-emerald-700 truncate">Cash in Hand</p>
            <p className="text-xs font-black font-mono text-slate-900 mt-0.5 truncate">
              Rs. {cashTotal.toLocaleString()}
            </p>
          </div>
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
            <p className="text-[10px] font-bold text-blue-700 truncate">Bank Balance</p>
            <p className="text-xs font-black font-mono text-slate-900 mt-0.5 truncate">
              Rs. {bankTotal.toLocaleString()}
            </p>
          </div>
          <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
            <p className="text-[10px] font-bold text-purple-700 truncate">Wallets</p>
            <p className="text-xs font-black font-mono text-slate-900 mt-0.5 truncate">
              Rs. {walletTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop View (>= md): 4 Full Width Cards */}
      <div className="hidden md:grid md:grid-cols-4 gap-4 lg:gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Balance</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">Rs. {totalBalance.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-1">All accounts combined</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash in Hand</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">Rs. {cashTotal.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-1">{accounts.filter(a => a.accountType === 'CASH').length} cash drawer(s)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Balance</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1 font-mono">Rs. {bankTotal.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-1">{accounts.filter(a => a.accountType === 'BANK').length} bank account(s)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Wallet</p>
            <h3 className="text-2xl font-black text-purple-600 mt-1 font-mono">Rs. {walletTotal.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-1">{accounts.filter(a => a.accountType === 'MOBILE_WALLET').length} wallet account(s)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-xs">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xs">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Accounts Yet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-5">Add your Cash Register, Bank Account, or Mobile Wallet to track balances.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const config = ACCOUNT_TYPE_CONFIG[acc.accountType as AccountTypeKey] ?? ACCOUNT_TYPE_CONFIG.CASH;
            const Icon = config.icon;
            const bal = Number(acc.balance);
            return (
              <div
                key={acc.id}
                className="relative p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all group shadow-xs hover:shadow-md"
              >
                <button
                  onClick={() => handleDelete(acc.id, acc.accountName)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Delete account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${config.bg} ${config.color} flex items-center justify-center border ${config.border} shrink-0 shadow-2xs`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${config.bg} ${config.color} border ${config.border} inline-block mb-1`}>
                      {config.label}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 truncate">{acc.accountName}</h3>
                    {acc.bankName && <p className="text-xs text-slate-500 font-medium">{acc.bankName}</p>}
                    {acc.accountNumber && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">A/C: {acc.accountNumber}</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Balance</p>
                  <h4 className={`text-2xl font-black font-mono ${bal >= 0 ? config.color : 'text-rose-600'}`}>
                    Rs. {Math.abs(bal).toLocaleString()}
                    {bal < 0 && <span className="text-xs ml-1 text-rose-600 font-bold">(overdrawn)</span>}
                  </h4>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD ACCOUNT MODAL */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" /> Add New Account
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Cash Register, Bank Account, or Mobile Wallet</p>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setError(''); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAccountSaveRequest} className="space-y-4">
              {/* Account Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Account Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'BANK', 'MOBILE_WALLET'] as const).map((type) => {
                    const cfg = ACCOUNT_TYPE_CONFIG[type];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, accountType: type }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          form.accountType === type
                            ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-2xs font-black ring-2 ring-emerald-500/20`
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={form.accountName}
                  onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}
                  placeholder={
                    form.accountType === 'CASH' ? 'e.g. Counter Cash Drawer'
                    : form.accountType === 'BANK' ? 'e.g. NIC Asia Current A/C'
                    : 'e.g. eSewa Business Wallet'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              {/* Bank-specific fields */}
              {form.accountType === 'BANK' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                      placeholder="e.g. NIC Asia Bank, Global IME Bank"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Number</label>
                    <input
                      type="text"
                      value={form.accountNumber}
                      onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                      placeholder="e.g. 1234567890123"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </>
              )}

              {/* Opening Balance */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Opening Balance (Rs.)
                </label>
                <input
                  type="text" inputMode="decimal" onKeyDown={onNumericKeyDown}
                  onFocus={onNumericFocus}
                  onBlur={onNumericBlur}
                  min="0"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">Starting balance when configuring this account</p>
              </div>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg font-semibold">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setError(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccount.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {createAccount.isPending ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    )}

      <ConfirmActionModal
        isOpen={!!deletingAccountInfo}
        onClose={() => { setDeletingAccountInfo(null); setDeleteError(''); }}
        title="Delete Account"
        itemName={deletingAccountInfo?.name}
        actionText="Delete Account"
        error={deleteError}
        isProcessing={deleteAccount.isPending}
        onConfirm={async () => {
          if (!deletingAccountInfo) return;
          setDeleteError('');
          try {
            await deleteAccount.mutateAsync(deletingAccountInfo.id);
            setDeletingAccountInfo(null);
          } catch (err: any) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete account.');
          }
        }}
      />

      {/* Save Confirmation Modal */}
      <SaveConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={handleConfirmAccountSave}
        isLoading={createAccount.isPending}
        title="Create Account?"
        message={`Are you sure you want to create "${form.accountName}" (${form.accountType.replace('_', ' ')})?`}
        confirmText="Yes, Create Account"
      />
    </div>
  );
}
