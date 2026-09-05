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
  Clock,
  TrendingDown,
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

  const renderMobileCard = (e: any) => (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
      {/* Top Header: Category/Title + Amount */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-900 text-sm truncate">
              {e.category || 'General Expense'}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{new Date(e.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono font-black text-sm text-rose-600 block">
            - Rs. {Number(e.amount || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Middle Metadata Badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100/80 text-xs">
        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold uppercase text-[10px]">
          {e.paymentMode || 'CASH'}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium truncate max-w-[150px]">
          {e.account?.accountName || 'Cash Drawer'}
        </span>
      </div>

      {e.description && (
        <p className="text-[11px] text-slate-500 italic bg-slate-50 rounded-xl p-2 border border-slate-100 truncate">
          {e.description}
        </p>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-end pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => handleDelete(e.id, e.category, Number(e.amount || 0))}
          className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[11px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );

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
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Record Expense
        </button>
      </div>

      {/* Summary Cards: 1+2 Layout on Mobile (Hero + 2 Grid), 3-Column on Desktop */}
      {/* Mobile View (< md): All 3 metrics cleanly presented without truncation */}
      <div className="space-y-2 md:hidden">
        {/* Top Hero: Total Expense Amount */}
        <div className="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Total Expense Amount</p>
            <p className="text-base font-black font-mono text-slate-900 mt-0.5 whitespace-nowrap">
              Rs. {summaryLoading ? '...' : (summary?.totalExpensesAmount || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              {summary?.totalExpensesCount || 0} Expenses recorded
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <TrendingDown className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Breakdown Row (2 Columns): Total Logged + Today's Expenses */}
        <div className="grid grid-cols-2 gap-2">
          {/* Total Logged */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 pr-1">
              <p className="text-[11px] font-bold text-blue-700 truncate">Total Logged</p>
              <p className="text-sm font-black font-mono text-slate-900 mt-0.5 whitespace-nowrap">
                {summaryLoading ? '...' : (summary?.totalExpensesCount || 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-blue-600/80 font-semibold mt-0.5 truncate">Entries</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Receipt className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          {/* Today's Expenses */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 pr-1">
              <p className="text-[11px] font-bold text-amber-700 truncate">Today's Expenses</p>
              <p className="text-sm font-black font-mono text-amber-700 mt-0.5 whitespace-nowrap">
                Rs. {summaryLoading ? '...' : (summary?.todayExpensesAmount || 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-amber-700/80 font-semibold mt-0.5 truncate">Today</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View (>= md): 3 Full Width Cards */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 lg:gap-6">
        <div className="p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expenses Logged</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {summaryLoading ? '...' : (summary?.totalExpensesCount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Operating expense vouchers</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expense Amount</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1 font-mono">
              Rs. {summaryLoading ? '...' : (summary?.totalExpensesAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Cumulative operational outflow</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-xs">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Expenses</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">
              Rs. {summaryLoading ? '...' : (summary?.todayExpensesAmount || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Expenses paid today</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
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
        renderMobileCard={renderMobileCard}
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
      />      {/* Record Expense Modal */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 animate-in fade-in">
            <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col bg-white overflow-hidden shadow-2xl animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="px-5 py-4 sm:px-6 sm:py-4.5 bg-rose-50/70 border-b border-rose-100/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 shrink-0">
                    <Receipt className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Record Business Expense</h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                        खर्च
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Record business expenses, utility bills & operations cost</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-rose-100/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <form id="expense-form" onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Expense Category <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddCategoryOpen(true)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Category
                      </button>
                    </div>
                    <select
                      {...form.register('category')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-2xs min-h-[44px] cursor-pointer"
                    >
                      <option value="">-- Choose Category --</option>
                      {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.category && (
                      <p className="text-xs font-semibold text-rose-600 mt-1">{form.formState.errors.category.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Amount (Rs.) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">Rs.</span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        {...form.register('amount', { valueAsNumber: true })}
                        onKeyDown={onNumericKeyDown}
                        onFocus={onNumericFocus}
                        onBlur={onNumericBlur}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-base font-black focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-2xs min-h-[44px]"
                        placeholder="0.00"
                      />
                    </div>
                    {form.formState.errors.amount && (
                      <p className="text-xs font-semibold text-rose-600 mt-1">{form.formState.errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <DatePicker
                      label="Expense Date"
                      required
                      value={form.watch('date')}
                      onChange={(d) => form.setValue('date', d)}
                    />
                    {form.formState.errors.date && (
                      <p className="text-xs font-semibold text-rose-600 mt-1">{form.formState.errors.date.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Payment Mode</label>
                    <select
                      {...form.register('paymentMode')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-2xs min-h-[44px] cursor-pointer"
                    >
                      <option value={PaymentMode.CASH}>Cash (नगद)</option>
                      <option value={PaymentMode.BANK}>Bank Account (बैंक)</option>
                      <option value={PaymentMode.ONLINE}>Online / Wallet (डिजिटल)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description / Notes (Optional)</label>
                    <textarea
                      rows={2}
                      {...form.register('description')}
                      placeholder="e.g. Electricity bill for Baishakh month, Office stationery"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-2xs resize-none"
                    />
                  </div>
                </form>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 min-h-[44px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="expense-form"
                  disabled={createExpense.isPending}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 min-h-[44px] transition-all cursor-pointer"
                >
                  {createExpense.isPending ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
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

      {/* Floating Bottom Center Action Button (Mobile) */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 lg:hidden pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-rose-600/40 border border-rose-500/40 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Expense (खर्च)</span>
        </button>
      </div>
    </div>
  );
}
