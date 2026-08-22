'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExpenseSchema, CreateExpenseInput } from '@bizmanage/validation';
import { PaymentMode } from '@bizmanage/types';
import {
  useExpenses,
  useExpensesSummary,
  useCreateExpense,
  useDeleteExpense,
} from '@/services/expenseService';
import { useExpenseCategories, useCreateExpenseCategory } from '@/services/categoryService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { AddCategoryModal } from '@/components/common/AddCategoryModal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { CustomDateRangePicker } from '@/components/common/CustomDateRangePicker';
import { DatePicker } from '@/components/ui/DatePicker';
import { toast } from 'react-hot-toast';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Wallet,
  Tag,
  DollarSign,
} from 'lucide-react';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [deletingExpenseInfo, setDeletingExpenseInfo] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  // Queries
  const { data: summary, isLoading: summaryLoading } = useExpensesSummary();
  const { data: categories } = useExpenseCategories();
  const {
    data: expensesResponse,
    isLoading: expensesLoading,
    isError,
    refetch,
  } = useExpenses({
    search,
    category: selectedCategory || undefined,
    paymentMode: selectedMode || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Mutations
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentMode: PaymentMode.CASH,
      category: '',
    },
  });

  const handleCreateSubmit = async (data: CreateExpenseInput) => {
    try {
      await createExpense.mutateAsync(data);
      setIsCreateOpen(false);
      form.reset({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMode: PaymentMode.CASH,
        category: '',
      });
      toast.success('Expense recorded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to record expense.');
    }
  };

  const handleDelete = (id: string, category: string, amount: number) => {
    setDeletingExpenseInfo({ id, name: `${category} (Rs. ${amount.toLocaleString()})` });
  };

  const expenses = expensesResponse?.data || [];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Business Expenses</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track operational spending, office rent, utilities, staff salaries, and cash payouts.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> + Record Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Business Expenses</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalExpensesAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.totalExpensesCount || 0} Expense entries logged
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spent Today</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              Rs. {summaryLoading ? '...' : (summary?.todayExpensesAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Real-time daily spending ledger</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expense Control</p>
            <h3 className="text-2xl font-bold text-slate-300 mt-1">Audit Logged</h3>
            <p className="text-[11px] text-slate-500 mt-1">Automatically deducts cash/bank</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search category or description notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:w-44">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories?.map((cat: any, i: number) => (
                <option key={cat.name || i} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <CustomDateRangePicker
              startDate={startDate}
              endDate={endDate}
              preset={startDate || endDate ? 'custom' : 'all'}
              onApply={(s, e, p) => {
                setStartDate(s);
                setEndDate(e);
              }}
            />
          </div>
        </div>

        {/* Payment Mode Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold w-full md:w-auto">
          <button
            onClick={() => setSelectedMode('')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === '' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.CASH)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.CASH ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.BANK)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.BANK ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bank
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.ONLINE)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.ONLINE ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Online
          </button>
        </div>
      </div>

      {/* Main Table */}
      {expensesLoading ? (
        <LoadingState message="Loading expense entries..." />
      ) : isError ? (
        <ErrorState title="Failed to load expenses" onRetry={refetch} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-7 h-7 text-rose-400" />}
          title="No Expense Logged"
          description="Keep track of office rent, utilities, tea & snacks, salaries, and daily business spending."
          actionLabel="Record Expense"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="grid gap-4 md:hidden">
            {expenses.map((e: any) => {
              const amt = Number(e.amount || 0);
              return (
                <div key={e.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-800/60 pb-3">
                    <div className="font-semibold text-white font-mono text-sm">
                      {new Date(e.date).toLocaleDateString()}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold uppercase text-[10px] border border-slate-700">
                      {e.paymentMode}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-rose-400" />
                        {e.category}
                      </p>
                      {e.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {e.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-base text-rose-400">
                        - Rs. {amt.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDelete(e.id, e.category, amt)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[11px] font-bold uppercase transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block border border-slate-800 rounded-2xl overflow-x-auto overflow-y-hidden bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs min-w-[800px]">
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
              {expenses.map((e: any) => {
                const amt = Number(e.amount || 0);

                return (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white font-mono">
                      {new Date(e.date).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-slate-200 font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-rose-400" />
                      {e.category}
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold uppercase text-[10px] border border-slate-700">
                        {e.paymentMode}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-400">{e.description || '-'}</td>

                    <td className="px-6 py-4 text-right font-mono font-bold text-rose-400 text-sm">
                      - Rs. {amt.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(e.id, e.category, amt)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 inline-block"
                        title="Delete Expense"
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
        </>
      )}

      {/* RECORD EXPENSE MODAL */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-400" /> Record Business Expense
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Deducts spending amount from cash/bank account and logs a transaction entry.
              </p>
            </div>

            <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Expense Category *</label>
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c: any, i: number) => (
                      <option key={c.name || i} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    {...form.register('category')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Office Rent, Utilities, Tea & Refreshment..."
                  />
                )}
                {form.formState.errors.category && (
                  <p className="text-xs text-red-400 mt-1">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <DatePicker
                    label="Expense Date"
                    required
                    value={form.watch('date')}
                    onChange={(d) => form.setValue('date', d as any)}
                  />
                  {form.formState.errors.date && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                  <select
                    {...form.register('paymentMode')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={PaymentMode.CASH}>Cash</option>
                    <option value={PaymentMode.BANK}>Bank Transfer</option>
                    <option value={PaymentMode.ONLINE}>Mobile Wallet / Online</option>
                    <option value={PaymentMode.CHEQUE}>Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Spent (Rs.) *</label>
                <input
                  type="number"
                  step="any"
                  {...form.register('amount', { valueAsNumber: true })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono text-rose-400 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. 2500"
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
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Monthly internet bill payment..."
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
                  disabled={createExpense.isPending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {createExpense.isPending ? 'Saving...' : 'Record Expense'}
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
        type="expense"
        onCategoryCreated={(cat) => {
          form.setValue('category', cat.name);
        }}
      />

      <ConfirmActionModal
        isOpen={!!deletingExpenseInfo}
        onClose={() => { setDeletingExpenseInfo(null); setDeleteError(''); }}
        title="Delete Expense Record"
        itemName={deletingExpenseInfo?.name}
        actionText="Delete Record"
        error={deleteError}
        isProcessing={deleteExpense.isPending}
        onConfirm={async () => {
          if (!deletingExpenseInfo) return;
          setDeleteError('');
          try {
            await deleteExpense.mutateAsync(deletingExpenseInfo.id);
            setDeletingExpenseInfo(null);
            toast.success('Expense record deleted successfully');
          } catch (err: any) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete expense.');
          }
        }}
      />
    </div>
  );
}
