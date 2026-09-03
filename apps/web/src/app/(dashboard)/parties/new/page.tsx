'use client';
import { onNumericKeyDown } from '@/lib/numericInput';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { partySchema, PartyInput } from '@bizmanage/validation';
import { PartyType } from '@bizmanage/types';
import { useCreateParty } from '@/services/partyService';
import { usePartyCategories } from '@/services/categoryService';
import { AddCategoryModal } from '@/components/common/AddCategoryModal';
import { DiscardConfirmModal } from '@/components/common/DiscardConfirmModal';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  FileText,
  Save,
  CheckCircle2,
} from 'lucide-react';

type PartyTab = 'address' | 'credit-balance' | 'additional-fields';

export default function AddPartyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PartyTab>('address');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [pendingSaveAnother, setPendingSaveAnother] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<PartyInput | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');
  const [createError, setCreateError] = useState('');

  const { data: categories } = usePartyCategories();
  const createParty = useCreateParty();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PartyInput>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      type: PartyType.CUSTOMER,
      openingBalance: 0,
      openingBalanceType: 'RECEIVABLE',
    },
  });

  const watchType = watch('type');
  const watchBalanceType = watch('openingBalanceType');

  const handleSaveRequest = (data: PartyInput, createAnother = false) => {
    setPendingSaveData(data);
    setPendingSaveAnother(createAnother);
    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    setIsSaveConfirmOpen(false);
    if (pendingSaveData) {
      onSave(pendingSaveData, pendingSaveAnother);
    }
  };

  const onSave = async (data: PartyInput, createAnother = false) => {
    setCreateError('');
    try {
      let finalAddress = data.address || '';
      if (!sameAsBilling && shippingAddress.trim()) {
        finalAddress = `${finalAddress} | Shipping: ${shippingAddress.trim()}`;
      }

      await createParty.mutateAsync({
        ...data,
        address: finalAddress || null,
      });

      toast.success(`Party "${data.name}" registered successfully!`);

      if (createAnother) {
        reset({
          name: '',
          phone: '',
          email: '',
          address: '',
          taxNumber: '',
          openingBalance: 0,
          openingBalanceType: 'RECEIVABLE',
          type: PartyType.CUSTOMER,
          categoryId: '',
        });
        setShippingAddress('');
        setSameAsBilling(true);
        setActiveTab('address');
      } else {
        router.push('/parties');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to save party. Please check details.';
      setCreateError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {/* 1. Full-Page Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => {
              if (isDirty) {
                setIsDiscardConfirmOpen(true);
              } else {
                router.push('/parties');
              }
            }}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            title="Back to Parties Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Add New Party (नयाँ पार्टी)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Register customers, suppliers, and business partners with credit terms and tax details.
            </p>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {createError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3 shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{createError}</span>
        </div>
      )}

      {/* 2. Full-Page Master Content Card */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
        {/* Primary Identification Row (Always Visible) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-6 border-b border-slate-100">
          {/* Party Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Party / Business Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Kathmandu Traders Pvt. Ltd. or Ramesh Sharma"
              {...register('name')}
              className={`w-full px-4 py-3 rounded-2xl bg-white border text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
                errors.name ? 'border-rose-400 focus:border-rose-500' : 'border-blue-500 focus:border-blue-600'
              }`}
            />
            {errors.name && (
              <p className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.name.message}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mobile / Phone Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 font-mono text-xs">+977</span>
              <input
                type="tel"
                placeholder="98XXXXXXXX"
                {...register('phone')}
                className={`w-full pl-16 pr-4 py-3 rounded-2xl bg-white border text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
                  errors.phone ? 'border-rose-400' : 'border-slate-300 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.phone && (
              <p className="text-[10px] text-rose-600 font-medium mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Party Type Segmented Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Party Type (पार्टी प्रकार)
            </label>
            <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs font-semibold h-[46px]">
              <button
                type="button"
                onClick={() => setValue('type', PartyType.CUSTOMER)}
                className={`flex-1 h-full rounded-xl text-center transition-all flex items-center justify-center cursor-pointer ${
                  watchType === PartyType.CUSTOMER
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setValue('type', PartyType.SUPPLIER)}
                className={`flex-1 h-full rounded-xl text-center transition-all flex items-center justify-center cursor-pointer ${
                  watchType === PartyType.SUPPLIER
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Supplier
              </button>
              <button
                type="button"
                onClick={() => setValue('type', PartyType.BOTH)}
                className={`flex-1 h-full rounded-xl text-center transition-all flex items-center justify-center cursor-pointer ${
                  watchType === PartyType.BOTH
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Both
              </button>
            </div>
          </div>
        </div>

        {/* 3. Step-by-Step Tabs Navigation */}
        <div className="border-b border-slate-200 flex items-center gap-8 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'address'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Address (ठेगाना)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credit-balance')}
            className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'credit-balance'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Credit & Balance (बाँकी हिसाब)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('additional-fields')}
            className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'additional-fields'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Additional Fields (थप विवरण)</span>
          </button>
        </div>

        {/* 4. Tab Panels (Step by Step, Non-scrollable) */}
        <div className="min-h-[220px]">
          {/* TAB 1: ADDRESS */}
          {activeTab === 'address' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-150">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    placeholder="party@company.com"
                    {...register('email')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-[10px] text-rose-600 font-medium">{errors.email.message}</p>
                )}
                <p className="text-[11px] text-slate-400">Used for sending digital invoices and receipts.</p>
              </div>

              {/* Billing Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Billing Address</label>
                <textarea
                  rows={4}
                  placeholder="Street, City, Ward, District (e.g. New Road, Ward 4, Pokhara)"
                  {...register('address')}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                />
              </div>

              {/* Shipping Address */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Shipping Address</label>
                  <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Same as Billing
                  </label>
                </div>

                {sameAsBilling ? (
                  <div className="h-[102px] rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 flex items-center justify-center text-center">
                    <p className="text-xs text-slate-400 font-medium">
                      Shipping address will automatically mirror billing address.
                    </p>
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    placeholder="Enter distinct delivery or warehouse destination address"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CREDIT & BALANCE */}
          {activeTab === 'credit-balance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-150">
              {/* Opening Balance */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Opening Balance (Rs.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">Rs.</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                                            placeholder="0.00"
                      {...register('openingBalance', { valueAsNumber: true })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter initial outstanding balance prior to registering in BizManage.
                  </p>
                </div>

                {/* Credit Limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Credit Limit (Rs.)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      placeholder="e.g. 50000"
                      {...register('creditLimit' as any, { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Credit Period (Days)</label>
                    <input
                      type="text" inputMode="decimal" onKeyDown={onNumericKeyDown}
                      placeholder="30"
                      {...register('creditPeriodDays' as any, { valueAsNumber: true })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Balance Nature Radio Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Balance Nature (बाँकी प्रकार)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setValue('openingBalanceType', 'RECEIVABLE')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      watchBalanceType === 'RECEIVABLE'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-bold text-emerald-800">To Receive (लेन बाँकी)</span>
                      <span className="text-[11px] text-emerald-600 mt-0.5 block">Debit Balance (Dr)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 block">Customer owes you money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue('openingBalanceType', 'PAYABLE')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      watchBalanceType === 'PAYABLE'
                        ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-100 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-bold text-rose-800">To Pay (दिन बाँकी)</span>
                      <span className="text-[11px] text-rose-600 mt-0.5 block">Credit Balance (Cr)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 block">You owe money to supplier</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADDITIONAL FIELDS */}
          {activeTab === 'additional-fields' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
              {/* PAN / VAT */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">PAN / VAT Number</label>
                <input
                  type="text"
                  maxLength={9}
                  placeholder="e.g. 609283746"
                  {...register('taxNumber')}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <p className="text-[11px] text-slate-400">9-digit IRD Nepal tax registration number.</p>
              </div>

              {/* Category Group */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Party Category</label>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New
                  </button>
                </div>
                <select
                  {...register('categoryId')}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                >
                  <option value="">Select Category (Optional)</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">Group parties by region, retail, wholesale, etc.</p>
              </div>
            </div>
          )}
        </div>

        {/* 5. Full-Width Bottom Bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-medium">
            * Fields marked with an asterisk are required.
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isDirty) {
                  setIsDiscardConfirmOpen(true);
                } else {
                  router.push('/parties');
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit((data) => handleSaveRequest(data, true))}
              disabled={isSubmitting || createParty.isPending}
              className="px-5 py-2.5 rounded-xl border border-blue-600 bg-white hover:bg-blue-50 text-blue-600 font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
            >
              Save & New
            </button>

            <button
              type="button"
              onClick={handleSubmit((data) => handleSaveRequest(data, false))}
              disabled={isSubmitting || createParty.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting || createParty.isPending ? 'Saving...' : 'Save Party'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Category Add Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        type="party"
      />

      {/* Discard Confirmation Alert */}
      <DiscardConfirmModal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={() => {
          setIsDiscardConfirmOpen(false);
          router.push('/parties');
        }}
        title="Discard unsaved party?"
        message="Are you sure you want to exit? Any information you entered for this party will be lost."
      />

      {/* Save Confirmation Alert */}
      <SaveConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        isLoading={createParty.isPending}
        title="Save Party Details?"
        message={`Are you sure you want to register "${pendingSaveData?.name || 'this party'}"?`}
        confirmText={pendingSaveAnother ? 'Save & Add Another' : 'Yes, Save Party'}
      />
    </div>
  );
}
