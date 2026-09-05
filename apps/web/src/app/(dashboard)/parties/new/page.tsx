'use client';

import { useState } from 'react';
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
import { onNumericKeyDown } from '@/lib/numericInput';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  FileText,
  Save,
  Check,
  CheckCircle2,
  Users,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

const PARTY_STEPS = [
  { id: 1, label: 'Basic Info', icon: Building2, description: 'Name, phone & type' },
  { id: 2, label: 'Address', icon: MapPin, description: 'Billing & shipping' },
  { id: 3, label: 'Credit & Balance', icon: Wallet, description: 'Opening balance & limits' },
  { id: 4, label: 'Tax & More', icon: ShieldCheck, description: 'PAN / VAT & category' },
];

export default function AddPartyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [pendingSaveAnother, setPendingSaveAnother] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<PartyInput | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');
  const [createError, setCreateError] = useState('');

  const { data: categories = [] } = usePartyCategories();
  const createParty = useCreateParty();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PartyInput>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      type: PartyType.CUSTOMER,
      openingBalance: 0,
      openingBalanceType: 'RECEIVABLE',
    },
    mode: 'onChange',
  });

  const watchType = watch('type');
  const watchBalanceType = watch('openingBalanceType');
  const totalSteps = PARTY_STEPS.length;

  const handleAttemptClose = () => {
    if (isDirty) {
      setIsDiscardConfirmOpen(true);
    } else {
      router.push('/parties');
    }
  };

  const handleNextStep = async () => {
    let isValid = true;
    if (currentStep === 1) {
      isValid = await trigger(['name', 'phone']);
    } else if (currentStep === 2) {
      isValid = await trigger(['email']);
    } else if (currentStep === 3) {
      isValid = await trigger(['openingBalance']);
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

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
        setCurrentStep(1);
      } else {
        router.push('/parties');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to save party. Please check details.';
      setCreateError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* ── PAGE TOP HEADER ── */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2 sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
            title="Back to Parties Directory"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight truncate">
              Add New Party (नयाँ पार्टी)
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              Register customer, supplier, or business partner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {currentStep === totalSteps && (
            <button
              type="button"
              onClick={handleSubmit((data) => handleSaveRequest(data, false))}
              disabled={isSubmitting || createParty.isPending}
              className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting || createParty.isPending ? 'Saving...' : 'Save'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── STEP INDICATOR (Dedicated Mobile & Desktop Views) ── */}
      {/* Mobile Indicator (< sm) */}
      <div className="sm:hidden px-2 pt-2.5 pb-1">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-black tracking-wide border border-blue-200">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-xs font-black text-slate-800">
                {PARTY_STEPS.find((s) => s.id === currentStep)?.label || ''}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
              {PARTY_STEPS.find((s) => s.id === currentStep)?.description || ''}
            </span>
          </div>

          {/* 4-segment progress bar */}
          <div className="grid grid-cols-4 gap-1.5">
            {PARTY_STEPS.map((step) => {
              const stepNum = step.id;
              const isActive = currentStep === stepNum;
              const isDone = currentStep > stepNum;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (isDone || isActive) setCurrentStep(stepNum);
                  }}
                  className="group flex flex-col gap-1 text-left cursor-pointer"
                  title={`${step.label}: ${step.description}`}
                >
                  <div
                    className={`h-1.5 w-full rounded-full transition-all ${
                      isDone
                        ? 'bg-blue-600'
                        : isActive
                        ? 'bg-blue-600'
                        : 'bg-slate-200 group-hover:bg-slate-300'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold truncate block text-center ${
                      isActive ? 'text-blue-600 font-black' : isDone ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Indicator (>= sm) */}
      <div className="hidden sm:block px-6 pt-4 pb-2">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs max-w-4xl mx-auto">
          <div className="flex items-center gap-0">
            {PARTY_STEPS.map((step, idx) => {
              const stepNum = step.id;
              const isActive = currentStep === stepNum;
              const isDone = currentStep > stepNum;
              const isLast = idx === PARTY_STEPS.length - 1;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Step Bubble */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isDone || isActive) setCurrentStep(stepNum);
                    }}
                    className="flex flex-col items-center gap-1 cursor-pointer group flex-1 transition-all"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all shadow-2xs border ${
                        isDone
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200 ring-4 ring-blue-50'
                          : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300'
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span>{stepNum}</span>}
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-xs font-bold leading-none ${
                          isActive ? 'text-blue-600' : isDone ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-1 truncate max-w-[130px]">
                        {step.description}
                      </p>
                    </div>
                  </button>

                  {/* Connector Line */}
                  {!isLast && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition-all ${
                        isDone ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="px-2 sm:px-6 py-2 sm:py-4 max-w-4xl mx-auto w-full flex-1">
        {/* Global Error Banner */}
        {createError && (
          <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3 shadow-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-500" />
            <span>{createError}</span>
          </div>
        )}

        {/* Master Step Form Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-7 space-y-6">
          {/* STEP 1: BASIC INFO */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Basic Information (आधारभूत विवरण)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter party identity, contact details, and account classification.
                </p>
              </div>

              {/* Party Type 3-Card Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Party Type (पार्टी प्रकार) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {/* Customer Card */}
                  <button
                    type="button"
                    onClick={() => setValue('type', PartyType.CUSTOMER)}
                    className={`p-2.5 sm:p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      watchType === PartyType.CUSTOMER
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-100 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        watchType === PartyType.CUSTOMER
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 w-full text-center">
                      <p className="text-xs font-black truncate">Customer</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">ग्राहक (बिक्री)</p>
                    </div>
                  </button>

                  {/* Supplier Card */}
                  <button
                    type="button"
                    onClick={() => setValue('type', PartyType.SUPPLIER)}
                    className={`p-2.5 sm:p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      watchType === PartyType.SUPPLIER
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-100 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        watchType === PartyType.SUPPLIER
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 w-full text-center">
                      <p className="text-xs font-black truncate">Supplier</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">सप्लायर (खरिद)</p>
                    </div>
                  </button>

                  {/* Both Card */}
                  <button
                    type="button"
                    onClick={() => setValue('type', PartyType.BOTH)}
                    className={`p-2.5 sm:p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      watchType === PartyType.BOTH
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-100 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        watchType === PartyType.BOTH
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 w-full text-center">
                      <p className="text-xs font-black truncate">Both</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">दुवै (Customer+Vendor)</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Party Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Party / Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kathmandu Traders Pvt. Ltd. or Ramesh Sharma"
                    {...register('name')}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
                      errors.name ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-500'
                    }`}
                    autoFocus
                  />
                  {errors.name && (
                    <p className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Mobile / Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400 font-mono text-xs">+977</span>
                    <input
                      type="tel"
                      placeholder="98XXXXXXXX"
                      {...register('phone')}
                      className={`w-full pl-16 pr-4 py-2.5 rounded-xl bg-white border text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
                        errors.phone ? 'border-rose-400' : 'border-slate-300 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ADDRESS & CONTACT */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Address & Contact Details (ठेगाना तथा सम्पर्क)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Provide billing, delivery, and email coordinates for invoicing.
                </p>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    placeholder="party@company.com"
                    {...register('email')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-[10px] text-rose-600 font-medium">{errors.email.message}</p>
                )}
                <p className="text-[11px] text-slate-400">Used for sending digital invoices and receipts.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Billing Address */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Billing Address</label>
                  <textarea
                    rows={4}
                    placeholder="Street, City, Ward, District (e.g. New Road, Ward 4, Pokhara)"
                    {...register('address')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
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
                    <div className="h-[96px] rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 flex items-center justify-center text-center">
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CREDIT & BALANCE */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  Credit & Balance Settings (बाँकी हिसाब तथा क्रेडिट)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set starting balances, credit limits, and payment window allowances.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Opening Balance */}
                <div className="space-y-3">
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Enter initial outstanding balance prior to registering in BizManage.
                    </p>
                  </div>

                  {/* Credit Limits */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Credit Limit (Rs.)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        onKeyDown={onNumericKeyDown}
                        placeholder="e.g. 50000"
                        {...register('creditLimit' as any, { valueAsNumber: true })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Credit Period (Days)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        onKeyDown={onNumericKeyDown}
                        placeholder="30"
                        {...register('creditPeriodDays' as any, { valueAsNumber: true })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Balance Nature Radio Cards */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Balance Nature (बाँकी प्रकार)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setValue('openingBalanceType', 'RECEIVABLE')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        watchBalanceType === 'RECEIVABLE'
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold text-emerald-800">To Receive (लेन बाँकी)</span>
                        <span className="text-[11px] text-emerald-600 mt-0.5 block font-mono font-semibold">Debit Balance (Dr)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2 block">Customer owes you money</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setValue('openingBalanceType', 'PAYABLE')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        watchBalanceType === 'PAYABLE'
                          ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-100 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold text-rose-800">To Pay (दिन बाँकी)</span>
                        <span className="text-[11px] text-rose-600 mt-0.5 block font-mono font-semibold">Credit Balance (Cr)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2 block">You owe money to supplier</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: TAX & CATEGORY */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Tax Registration & Categorization (कर तथा समूह)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  PAN/VAT tax identification number and party classification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PAN / VAT */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">PAN / VAT Number</label>
                  <input
                    type="text"
                    maxLength={9}
                    placeholder="e.g. 609283746"
                    {...register('taxNumber')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                  >
                    <option value="">Select Category (Optional)</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">Group parties by region, retail, wholesale, etc.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── CARD FOOTER / STEP ACTIONS ── */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 sm:px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSubmit((data) => handleSaveRequest(data, true))}
                    disabled={isSubmitting || createParty.isPending}
                    className="py-2.5 px-3 sm:px-4 rounded-xl border border-blue-600 bg-white hover:bg-blue-50 text-blue-600 font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    Save & Add Another
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit((data) => handleSaveRequest(data, false))}
                    disabled={isSubmitting || createParty.isPending}
                    className="py-2.5 px-4 sm:px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSubmitting || createParty.isPending ? 'Saving...' : 'Save Party'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
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
