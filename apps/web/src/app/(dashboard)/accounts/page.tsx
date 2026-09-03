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
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  BANK: {
    label: 'Bank',
    icon: Building2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  MOBILE_WALLET: {
    label: 'Mobile Wallet',
    icon: Smartphone,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-400" /> Cash &amp; Bank Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your cash registers, bank accounts, and mobile wallets. All balances update automatically.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" /> + Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Balance</p>
            <h3 className="text-2xl font-bold text-white mt-1">Rs. {totalBalance.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-500 mt-1">All accounts combined</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/5 text-white flex items-center justify-center border border-white/10">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cash in Hand</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">Rs. {cashTotal.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-500 mt-1">{accounts.filter(a => a.accountType === 'CASH').length} account(s)</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bank Balance</p>
            <h3 className="text-2xl font-bold text-blue-400 mt-1">Rs. {bankTotal.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-500 mt-1">{accounts.filter(a => a.accountType === 'BANK').length} account(s)</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mobile Wallet</p>
            <h3 className="text-2xl font-bold text-purple-400 mt-1">Rs. {walletTotal.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-500 mt-1">{accounts.filter(a => a.accountType === 'MOBILE_WALLET').length} account(s)</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Accounts Yet</h3>
          <p className="text-sm text-slate-400 mt-1 mb-5">Add your Cash Register, Bank Account, or Mobile Wallet to track balances.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all"
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
                className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group"
              >
                <button
                  onClick={() => handleDelete(acc.id, acc.accountName)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${config.bg} ${config.color} flex items-center justify-center border ${config.border} flex-shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{config.label}</p>
                    <h3 className="text-base font-bold text-white mt-0.5 truncate">{acc.accountName}</h3>
                    {acc.bankName && <p className="text-[11px] text-slate-500">{acc.bankName}</p>}
                    {acc.accountNumber && (
                      <p className="text-[11px] text-slate-500 font-mono">A/C: {acc.accountNumber}</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Balance</p>
                  <h4 className={`text-2xl font-bold ${bal >= 0 ? config.color : 'text-rose-400'}`}>
                    Rs. {Math.abs(bal).toLocaleString()}
                    {bal < 0 && <span className="text-xs ml-1 text-rose-400">(overdrawn)</span>}
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
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" /> Add New Account
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Cash, Bank, or Mobile Wallet</p>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setError(''); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAccountSaveRequest} className="space-y-4">
              {/* Account Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Account Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'BANK', 'MOBILE_WALLET'] as const).map((type) => {
                    const cfg = ACCOUNT_TYPE_CONFIG[type];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, accountType: type }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                          form.accountType === type
                            ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={form.accountName}
                  onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}
                  placeholder={
                    form.accountType === 'CASH' ? 'e.g. Shop Cash Register'
                    : form.accountType === 'BANK' ? 'e.g. NIC Asia Current A/C'
                    : 'e.g. Mobile Wallet A/C'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              {/* Bank-specific fields */}
              {form.accountType === 'BANK' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                      placeholder="e.g. NIC Asia Bank, Nabil Bank"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Number</label>
                    <input
                      type="text"
                      value={form.accountNumber}
                      onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                      placeholder="e.g. 1234567890123"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                    />
                  </div>
                </>
              )}

              {/* Opening Balance */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1">Enter current balance if account already exists</p>
              </div>

              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setError(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccount.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {createAccount.isPending ? 'Creating...' : 'Create Account'}
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
