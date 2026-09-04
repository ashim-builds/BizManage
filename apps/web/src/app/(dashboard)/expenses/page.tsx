'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';
import { useLongPress } from '@/hooks/useLongPress';
import { LongPressActionSheet } from '@/components/ui/LongPressActionSheet';

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
import { useExpenseCategories } from '@/services/categoryService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { AddCategoryModal } from '@/components/common/AddCategoryModal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { CustomDateRangePicker } from '@/components/common/CustomDateRangePicker';
import { DatePicker } from '@/components/ui/DatePicker';
import { ResponsiveDataTable, Column } from '@/components/common/ResponsiveDataTable';
import { toast } from 'react-hot-toast';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Wallet,
  Tag,
  X,
} from 'lucide-react';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
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

  const handleConfirmDelete = async () => {
    if (!deletingExpenseInfo) return;
    try {
      setDeleteError('');
      await deleteExpense.mutateAsync(deletingExpenseInfo.id);
      setDeletingExpenseInfo(null);
      toast.success('Expense deleted successfully');
    } catch (err: any) {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete expense.');
    }
  };

  const expenses = expensesResponse?.data || [];

  // Table columns
  const columns: Column<any>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (e) => (
        <span className="font-mono text-slate-700 font-semibold">
          {new Date(e.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      isPrimaryTitle: true,
      render: (e) => (
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <Tag className="w-3.5 h-3.5 text-rose-500" />
          {e.category}
        </div>
      ),
    },
    {
      key: 'paymentMode',
      header: 'Payment Mode',
      render: (e) => (
        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border border-slate-200">
          {e.paymentMode}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description / Notes',
      render: (e) => (
        <span className="text-slate-500">{e.description || '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount (Rs.)',
      align: 'right',
      isStatusBadge: true,
      render: (e) => (
        <span className="font-mono font-bold text-rose-600 text-sm">
          - Rs. {Number(e.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (e) => (
        <button
          onClick={() => handleDelete(e.id, e.category, Number(e.amount || 0))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Delete Expense"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-rose-600" />
            Expenses & Spending
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track day-to-day operating costs, utilities, rent, salaries, and office supplies.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Record Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-bold">Total Expenses Logged</p>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {summaryLoading ? '...' : (summary?.totalExpensesCount || 0).toLocaleString()}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-bold">Total Expense Amount</p>
          <p className="text-2xl font-bold text-rose-600 font-mono mt-1">
            {summaryLoading ? '...' : `Rs. ${(summary?.totalExpensesAmount || 0).toLocaleString()}`}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-bold">Today's Expenses</p>
          <p className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {summaryLoading ? '...' : `Rs. ${(summary?.todayExpensesAmount || 0).toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories?.map((cat: any) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          <CustomDateRangePicker
            startDate={startDate}
            endDate={endDate}
            preset={preset}
            onApply={(s, e, p) => {
              setStartDate(s);
              setEndDate(e);
              if (p) setPreset(p as any);
            }}
          />
        </div>

        {/* Payment Mode Filters */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setSelectedMode('')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === '' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.CASH)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.CASH ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.BANK)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.BANK ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bank
          </button>
          <button
            onClick={() => setSelectedMode(PaymentMode.ONLINE)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMode === PaymentMode.ONLINE ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Online
          </button>
        </div>
      </div>

      {/* Main Table */}
      <ResponsiveDataTable
        columns={columns}
        data={expenses}
        keyExtractor={(e) => e.id}
        isLoading={expensesLoading}
        emptyTitle="No Expense Logged"
        emptyDescription="Keep track of office rent, utilities, tea & snacks, salaries, and daily business spending."
        emptyAction={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Record First Expense
          </button>
        }
      />

      {/* Record Expense Modal */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-rose-600" /> Record Business Expense
                </h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Expense Category *</label>
                    <button
                      type="button"
                      onClick={() => setIsAddCategoryOpen(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Category
                    </button>
                  </div>
                  <select
                    {...form.register('category')}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.category && (
                    <p className="text-xs text-rose-500 mt-1">{form.formState.errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    {...form.register('amount', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-xl font-mono text-sm font-bold focus:outline-none"
                    placeholder="0.00"
                  />
                  {form.formState.errors.amount && (
                    <p className="text-xs text-rose-500 mt-1">{form.formState.errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <DatePicker
                    label="Expense Date"
                    required
                    value={form.watch('date')}
                    onChange={(d) => form.setValue('date', d)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    {...form.register('paymentMode')}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value={PaymentMode.CASH}>Cash</option>
                    <option value={PaymentMode.BANK}>Bank Account</option>
                    <option value={PaymentMode.ONLINE}>Online / Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes (Optional)</label>
                  <textarea
                    rows={2}
                    {...form.register('description')}
                    placeholder="e.g. Electricity bill for Baishakh month, Office stationery"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createExpense.isPending}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
                  >
                    {createExpense.isPending ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        type="expense"
      />

      {/* Delete Confirmation Modal */}
      {deletingExpenseInfo && (
        <ConfirmActionModal
          isOpen={true}
          title="Delete Expense Entry"
          description={`Are you sure you want to delete "${deletingExpenseInfo.name}"? This action cannot be undone.`}
          actionText="Yes, Delete Expense"
          variant="danger"
          isProcessing={deleteExpense.isPending}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingExpenseInfo(null)}
        />
      )}
    </div>
  );
}
