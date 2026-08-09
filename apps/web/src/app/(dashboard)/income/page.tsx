'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createIncomeSchema, CreateIncomeInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';
import {
  useIncomes,
  useIncomeSummary,
  useCreateIncome,
  useDeleteIncome,
} from '@/services/incomeService';
import { useIncomeCategories, useCreateIncomeCategory } from '@/services/categoryService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { AddCategoryModal } from '@/components/common/AddCategoryModal';
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal';
import {
  TrendingUp,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Wallet,
  Tag,
  DollarSign,
} from 'lucide-react';

export default function IncomePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [deletingIncomeInfo, setDeletingIncomeInfo] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  // Queries
  const { data: summary, isLoading: summaryLoading } = useIncomeSummary();
  const { data: categories } = useIncomeCategories();
  const {
    data: incomeResponse,
    isLoading: incomeLoading,
    isError,
    refetch,
  } = useIncomes({
    search,
    category: selectedCategory || undefined,
    paymentMode: selectedMode || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Mutations
  const createIncome = useCreateIncome();
  const deleteIncome = useDeleteIncome();

  const form = useForm<CreateIncomeInput>({
    resolver: zodResolver(createIncomeSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentMode: PaymentMode.CASH,
      category: '',
    },
  });

  const handleCreateSubmit = async (data: CreateIncomeInput) => {
    try {
      await createIncome.mutateAsync(data);
      setIsCreateOpen(false);
      form.reset({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMode: PaymentMode.CASH,
        category: '',
      });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to record other income.');
    }
  };

  const handleDelete = (id: string, category: string, amount: number) => {
    setDeletingIncomeInfo({ id, name: `${category} (Rs. ${amount.toLocaleString()})` });
  };

  const incomes = incomeResponse?.data || [];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Other Income</h1>
          <p className="text-sm text-slate-400 mt-1">
            Record non-sale revenue such as scrap disposal, commission, interest earnings, and investments.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" /> + Record Other Income
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Other Income</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalIncomeAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.totalIncomeCount || 0} Income entries logged
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Received Today</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              Rs. {summaryLoading ? '...' : (summary?.todayIncomeAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Real-time daily income ledger</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cashflow Inflow</p>
            <h3 className="text-2xl font-bold text-slate-300 mt-1">Audit Logged</h3>
            <p className="text-[11px] text-slate-500 mt-1">Automatically adds to cash/bank</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search category or description notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="w-44">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none"
            title="Start Date"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none"
            title="End Date"
          />
        </div>

        {/* Payment Mode Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setSelectedMode('')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === '' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.CASH)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.CASH ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.BANK)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.BANK ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bank
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.ONLINE)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.ONLINE ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Online
          </button>
        </div>
      </div>

      {/* Main Table */}
      {incomeLoading ? (
        <LoadingState message="Loading income entries..." />
      ) : isError ? (
        <ErrorState title="Failed to load income entries" onRetry={refetch} />
      ) : incomes.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="w-7 h-7 text-emerald-400" />}
          title="No Other Income Logged"
          description="Track non-sale revenues like scrap disposal, investments, and interest income."
          actionLabel="Record Other Income"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Payment Mode</th>
                <th className="px-6 py-4">Description / Notes</th>
                <th className="px-6 py-4 text-right">Amount (Rs.)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {incomes.map((inc: any) => {
                const amt = Number(inc.amount || 0);

                return (
                  <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white font-mono">
                      {new Date(inc.date).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-slate-200 font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      {inc.category}
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[10px] border border-emerald-500/20">
                        {inc.paymentMode}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-400">{inc.description || '-'}</td>

                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      + Rs. {amt.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(inc.id, inc.category, amt)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                        title="Delete Income Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* RECORD INCOME MODAL */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" /> Record Other Income
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Adds revenue amount to cash/bank account and logs a transaction entry.
              </p>
            </div>

            <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Income Category *</label>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(true)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add New
                  </button>
                </div>
                {categories && categories.length > 0 ? (
                  <select
                    {...form.register('category')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    {...form.register('category')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Scrap Sale, Commission, Rental Income..."
                  />
                )}
                {form.formState.errors.category && (
                  <p className="text-xs text-red-400 mt-1">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Income Date *</label>
                  <input
                    type="date"
                    {...form.register('date')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                  <select
                    {...form.register('paymentMode')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={PaymentMode.CASH}>Cash</option>
                    <option value={PaymentMode.BANK}>Bank Transfer</option>
                    <option value={PaymentMode.ONLINE}>Mobile Wallet / Online</option>
                    <option value={PaymentMode.CHEQUE}>Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Received (Rs.) *</label>
                <input
                  type="number"
                  step="any"
                  {...form.register('amount', { valueAsNumber: true })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. 15000"
                />
                {form.formState.errors.amount && (
                  <p className="text-xs text-red-400 mt-1">{form.formState.errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  {...form.register('description')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Sold unused packaging boxes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createIncome.isPending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {createIncome.isPending ? 'Saving...' : 'Record Other Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        type="income"
        onCategoryCreated={(cat) => {
          form.setValue('category', cat.name);
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingIncomeInfo}
        onClose={() => { setDeletingIncomeInfo(null); setDeleteError(''); }}
        itemName={deletingIncomeInfo?.name}
        error={deleteError}
        isDeleting={deleteIncome.isPending}
        onConfirm={async () => {
          if (!deletingIncomeInfo) return;
          setDeleteError('');
          try {
            await deleteIncome.mutateAsync(deletingIncomeInfo.id);
            setDeletingIncomeInfo(null);
          } catch (err: any) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete income entry.');
          }
        }}
      />
    </div>
  );
}
