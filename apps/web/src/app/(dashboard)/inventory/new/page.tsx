'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemSchema, ItemInput } from '@bizmanage/validation';
import { ItemType } from '@bizmanage/types';
import { useCreateItem } from '@/services/itemService';
import { useItemCategories } from '@/services/categoryService';
import { AddCategoryModal } from '@/components/common/AddCategoryModal';
import { DiscardConfirmModal } from '@/components/common/DiscardConfirmModal';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import { toast } from 'react-hot-toast';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Wrench,
  AlertCircle,
  Save,
  Plus,
  Layers,
  DollarSign,
  Boxes,
  Barcode,
  Sparkles,
  CheckCircle2,
  FileText,
  ImagePlus,
  X,
  ChevronRight,
  Check,
} from 'lucide-react';

const SERVICE_DEFAULT_UNITS = [
  { fullname: 'HOURS', shortname: 'Hur' },
  { fullname: 'DAYS', shortname: 'Day' },
  { fullname: 'MONTHS', shortname: 'Mon' },
  { fullname: 'JOBS/SERVICE', shortname: 'Job' },
  { fullname: 'VISIT/SESSION', shortname: 'Vst' },
];

const PRODUCT_DEFAULT_UNITS = [
  { fullname: 'PIECES', shortname: 'Pcs' },
  { fullname: 'BAGS', shortname: 'Bag' },
  { fullname: 'BOXES', shortname: 'Box' },
  { fullname: 'KILOGRAMS', shortname: 'Kg' },
  { fullname: 'METERS', shortname: 'Mtr' },
  { fullname: 'LITERS', shortname: 'Ltr' },
  { fullname: 'PACKS', shortname: 'Pac' },
  { fullname: 'NUMBERS', shortname: 'Nos' },
  { fullname: 'SETS', shortname: 'Set' },
  { fullname: 'ROLLS', shortname: 'Rol' },
];

const STEPS = [
  { id: 1, label: 'Info', icon: Layers, description: 'Name, code & category' },
  { id: 2, label: 'Pricing', icon: DollarSign, description: 'Sale & purchase price' },
  { id: 3, label: 'Stock', icon: Boxes, description: 'Quantity & alerts' },
  { id: 4, label: 'Details', icon: FileText, description: 'Description & image' },
];

export default function AddItemPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [createType, setCreateType] = useState<ItemType>(ItemType.PRODUCT);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [pendingSaveAnother, setPendingSaveAnother] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<ItemInput | null>(null);
  const [createError, setCreateError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showWholesale, setShowWholesale] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useItemCategories();
  const createItem = useCreateItem();

  const form = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: ItemType.PRODUCT,
      unit: 'Pcs',
      salePrice: 0,
      purchasePrice: 0,
      openingStock: 0,
      minStockAlert: 5,
    },
    mode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const currentUnit = watch('unit');
  const watchedName = watch('name');
  const watchedSalePrice = watch('salePrice');
  const watchedPurchasePrice = watch('purchasePrice');
  const watchedOpeningStock = watch('openingStock');

  // Helper: allows only digits and a single decimal point; blocks letters, e, +, -
  const onNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allow = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight',
      'ArrowUp', 'ArrowDown', 'Home', 'End',
    ];
    if (allow.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return; // allow copy/paste/select-all
    if (e.key === '.' && !(e.currentTarget.value.includes('.'))) return; // one decimal
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setIsDiscardConfirmOpen(true);
    } else {
      router.push('/inventory');
    }
  };

  const handleConfirmDiscard = () => {
    setIsDiscardConfirmOpen(false);
    router.push('/inventory');
  };

  const handleGenerateCode = () => {
    const prefix = createType === ItemType.SERVICE ? 'SRV' : 'SKU';
    const rand = Math.floor(100000 + Math.random() * 900000);
    setValue('code', `${prefix}-${rand}`, { shouldDirty: true });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof ItemInput)[] = [];
    if (currentStep === 1) fieldsToValidate = ['name', 'unit'];
    if (currentStep === 2) fieldsToValidate = ['salePrice'];

    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handlePrevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  // Intercept save — show confirm modal first
  const handleSaveRequest = (data: ItemInput, createAnother = false) => {
    setPendingSaveData(data);
    setPendingSaveAnother(createAnother);
    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    setIsSaveConfirmOpen(false);
    if (pendingSaveData) onSave(pendingSaveData, pendingSaveAnother);
  };

  const onSave = async (data: ItemInput, createAnother = false) => {
    setCreateError('');
    try {
      const payload: ItemInput = {
        ...data,
        type: createType,
        purchasePrice: createType === ItemType.SERVICE ? 0 : Number(data.purchasePrice || 0),
        openingStock: createType === ItemType.SERVICE ? 0 : Number(data.openingStock || 0),
        minStockAlert: createType === ItemType.SERVICE ? 0 : Number(data.minStockAlert || 0),
        salePrice: Number(data.salePrice || 0),
        wholesalePrice: Number(data.wholesalePrice || 0),
      };

      await createItem.mutateAsync(payload);
      toast.success(
        `${createType === ItemType.SERVICE ? 'Service' : 'Product'} "${data.name}" added successfully!`
      );

      if (createAnother) {
        reset({
          name: '',
          code: '',
          type: createType,
          unit: createType === ItemType.SERVICE ? 'Hur' : 'Pcs',
          salePrice: 0,
          wholesalePrice: 0,
          purchasePrice: 0,
          openingStock: 0,
          minStockAlert: 5,
          categoryId: '',
          storeDescription: '',
        });
        setCurrentStep(1);
        setImagePreview(null);
        setShowWholesale(false);
      } else {
        router.push('/inventory');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to create item. Please verify all fields.';
      setCreateError(msg);
      toast.error(msg);
    }
  };

  const totalSteps = createType === ItemType.SERVICE ? 3 : STEPS.length;
  const visibleSteps = createType === ItemType.SERVICE ? STEPS.filter(s => s.id !== 3) : STEPS;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all active:scale-95 cursor-pointer"
            title="Back to Inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Add New {createType === ItemType.SERVICE ? 'Service' : 'Product'}
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {createType === ItemType.SERVICE
                ? 'Register billable services with flat-rate or hourly pricing.'
                : 'Add product with pricing, stock tracking, and details.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {currentStep === (createType === ItemType.SERVICE ? 3 : 4) && (
            <button
              type="button"
              onClick={handleSubmit((data) => handleSaveRequest(data, false))}
              disabled={createItem.isPending}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save {createType === ItemType.SERVICE ? 'Service' : 'Item'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── PRODUCT/SERVICE TOGGLE ── */}
      <div className="px-6 pt-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 max-w-xs shadow-xs">
          <div className="flex p-0.5 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setCreateType(ItemType.PRODUCT);
                setValue('type', ItemType.PRODUCT);
                setValue('unit', 'Pcs');
                setCurrentStep(1);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                createType === ItemType.PRODUCT
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Product (सामान)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateType(ItemType.SERVICE);
                setValue('type', ItemType.SERVICE);
                setValue('unit', 'Hur');
                setValue('purchasePrice', 0);
                setValue('openingStock', 0);
                setValue('minStockAlert', 0);
                setCurrentStep(1);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                createType === ItemType.SERVICE
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Service (सेवा)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── STEP INDICATOR (Mobile & Desktop - Pixel match Image 2 Screen 4) ── */}
      <div className="px-4 sm:px-6 pt-4 pb-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-0 min-w-[320px]">
          {visibleSteps.map((step, idx) => {
            const stepNum = step.id;
            const isActive = currentStep === stepNum;
            const isDone = currentStep > stepNum || (createType === ItemType.SERVICE && stepNum === 3 && currentStep > 3);
            const isLast = idx === visibleSteps.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step bubble */}
                <button
                  type="button"
                  onClick={() => {
                    if (isDone || isActive) setCurrentStep(stepNum);
                  }}
                  className={`flex flex-col items-center gap-1 cursor-pointer group flex-1 transition-all`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all shadow-2xs border ${
                    isDone
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span>{stepNum}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-[11px] font-bold leading-none ${isActive ? 'text-blue-600' : isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-1 max-w-[70px]">
                      {step.description}
                    </p>
                  </div>
                </button>

                {/* Connector line */}
                {!isLast && (
                  <div className={`h-0.5 flex-1 rounded-full mx-1 transition-all ${isDone ? 'bg-blue-600' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GLOBAL ERROR BANNER ── */}
      {createError && (
        <div className="mx-6 mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{createError}</span>
        </div>
      )}

      {/* ── STEP CONTENT ── */}
      <form onSubmit={(e) => e.preventDefault()} className="flex-1 px-6 pt-5 pb-32">

        {/* ───────── STEP 1: BASIC INFO ───────── */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">General Information</h2>
                  <p className="text-[11px] text-slate-500">Enter item name, code, category and unit</p>
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {createType === ItemType.SERVICE ? 'Service Name' : 'Item / Product Name'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    createType === ItemType.SERVICE
                      ? 'e.g. AC Installation & Servicing, Plumbing Repair'
                      : 'e.g. CPVC Pipe 1 inch, UltraTech Cement 50kg, Asian Paints White'
                  }
                  {...register('name')}
                  className={`w-full px-4 py-3 rounded-2xl bg-white border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
                    errors.name ? 'border-rose-400' : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {errors.name && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Category (वर्ग)</label>
                    <button
                      type="button"
                      onClick={() => setIsAddCategoryOpen(true)}
                      className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Category</span>
                    </button>
                  </div>
                  <select
                    {...register('categoryId')}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">-- No Category --</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Measuring Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Measuring Unit (इकाई) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register('unit')}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {createType === ItemType.SERVICE ? (
                      <optgroup label="Standard Service Units">
                        {SERVICE_DEFAULT_UNITS.map((u) => (
                          <option key={u.shortname} value={u.shortname}>{u.fullname} ({u.shortname})</option>
                        ))}
                      </optgroup>
                    ) : (
                      <optgroup label="Standard Product Units">
                        {PRODUCT_DEFAULT_UNITS.map((u) => (
                          <option key={u.shortname} value={u.shortname}>{u.fullname} ({u.shortname})</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Item Code / SKU */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {createType === ItemType.SERVICE ? 'SAC / Service Code' : 'Item Code / SKU / Barcode'}
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="text-[10px] text-slate-500 hover:text-blue-600 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Auto Generate</span>
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5" />
                    <input
                      type="text"
                      placeholder={createType === ItemType.SERVICE ? 'e.g. SAC-9987' : 'e.g. SKU-100293'}
                      {...register('code')}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* HSN Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    HSN / Customs Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7307, 8471"
                    {...register('hsnCode' as any)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────── STEP 2: PRICING ───────── */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-3">

            {/* ── Sale Price Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Sale Price</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                {/* Sale Price input */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      placeholder="Sale Price"
                      {...register('salePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                      className={`w-full px-4 py-2.5 rounded-lg bg-[#F8FAFC] border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
                        errors.salePrice ? 'border-rose-400' : 'border-slate-300 focus:border-blue-500'
                      }`}
                    />
                    {errors.salePrice && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.salePrice.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Wholesale Price toggle */}
                {!showWholesale ? (
                  <button
                    type="button"
                    onClick={() => setShowWholesale(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Wholesale Price</span>
                  </button>
                ) : (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Wholesale Price</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowWholesale(false);
                          setValue('wholesalePrice' as any, undefined);
                        }}
                        className="text-[11px] text-slate-400 hover:text-rose-500 font-medium cursor-pointer flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      placeholder="Wholesale Price"
                      {...register('wholesalePrice' as any, { valueAsNumber: true, onBlur: onNumericBlur })}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#F8FAFC] border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    />
                    <p className="text-[11px] text-slate-500">
                      Wholesale/bulk rate for distributors or bulk orders. Visible on invoices when selected.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Purchase Price Card (Product only) ── */}
            {createType === ItemType.PRODUCT && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Purchase Price</h3>
                </div>
                <div className="px-5 py-4">
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={onNumericKeyDown}
                    onFocus={onNumericFocus}
                    placeholder="Purchase Price"
                    {...register('purchasePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#F8FAFC] border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Cost price from supplier. Used to calculate your gross profit margin.
                  </p>
                </div>
              </div>
            )}

            {/* ── Tax Rate Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Tax Rate</h3>
              </div>
              <div className="px-5 py-4">
                <select
                  {...register('taxRate' as any, { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#F8FAFC] border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="0">Exempt / No Tax (0%)</option>
                  <option value="13">VAT (13%)</option>
                  <option value="5">Reduced Rate (5%)</option>
                  <option value="18">Standard GST (18%)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-2">Standard Nepal VAT is 13%. Select Exempt for tax-free goods.</p>
              </div>
            </div>

            {/* ── Profit margin preview ── */}
            {createType === ItemType.PRODUCT && Number(watchedSalePrice) > 0 && Number(watchedPurchasePrice) > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-xs font-bold text-slate-700">Estimated Gross Margin</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Sale price minus purchase cost</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-600 font-mono">
                    Rs. {(Number(watchedSalePrice) - Number(watchedPurchasePrice)).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold">
                    ({Number(watchedSalePrice) > 0
                      ? (((Number(watchedSalePrice) - Number(watchedPurchasePrice)) / Number(watchedSalePrice)) * 100).toFixed(1)
                      : 0}% margin)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───────── STEP 3: STOCK (PRODUCT ONLY) ───────── */}
        {currentStep === 3 && createType === ItemType.PRODUCT && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Boxes className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Stock Tracking & Reorder Alert</h2>
                  <p className="text-[11px] text-slate-500">Set opening quantity and low-stock alert threshold</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Opening Stock */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-200 space-y-2">
                  <label className="block text-xs font-bold text-blue-900">
                    Opening Stock Quantity ({currentUnit || 'Units'})
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      placeholder="0"
                      {...register('openingStock', { valueAsNumber: true, onBlur: onNumericBlur })}
                      className="w-full px-4 py-4 rounded-2xl bg-white border border-blue-300 text-slate-900 text-2xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-blue-400 font-bold">{currentUnit || 'Units'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Current stock available in your store right now.</p>
                </div>

                {/* Min Stock Alert */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-200 space-y-2">
                  <label className="block text-xs font-bold text-amber-900">
                    Low Stock Warning Alert Level ({currentUnit || 'Units'})
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      placeholder="5"
                      {...register('minStockAlert', { valueAsNumber: true, onBlur: onNumericBlur })}
                      className="w-full px-4 py-4 rounded-2xl bg-white border border-amber-300 text-slate-900 text-2xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-amber-400 font-bold">{currentUnit || 'Units'}</span>
                  </div>
                  <p className="text-[11px] text-amber-700">You will receive an alert when stock drops below this number.</p>
                </div>
              </div>

              {/* Stock summary card */}
              {Number(watchedOpeningStock) > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800">
                      Starting with {watchedOpeningStock} {currentUnit} in stock
                    </p>
                    <p className="text-[11px] text-emerald-600">You'll get an alert when stock drops below {watch('minStockAlert') || 5} {currentUnit}.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ───────── STEP 4 (or 3 for Service): DESCRIPTION & IMAGE ───────── */}
        {((currentStep === 4 && createType === ItemType.PRODUCT) ||
          (currentStep === 3 && createType === ItemType.SERVICE)) && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Description & Image</h2>
                  <p className="text-[11px] text-slate-500">Optional product notes and photo</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description / Item Notes{' '}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={5}
                  placeholder={
                    createType === ItemType.SERVICE
                      ? 'Details of service scope, inclusions, labor conditions, or warranty...'
                      : 'Enter item specifications, brand, size, color, or notes for printed invoices...'
                  }
                  {...register('storeDescription')}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Product Image{' '}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {imagePreview ? (
                  <div className="relative w-40 h-40 group">
                    <img
                      src={imagePreview}
                      alt="Item preview"
                      className="w-full h-full object-cover rounded-2xl border border-slate-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-white/90 text-[10px] font-bold text-slate-700 shadow cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-40 h-40 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <ImagePlus className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs text-slate-500 font-medium">Add Photo</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WebP</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Final summary ── */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20">
              <h3 className="font-bold text-sm mb-3 opacity-90">📦 Ready to Save</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="opacity-70 mb-0.5">Name</p>
                  <p className="font-bold truncate">{watchedName || '—'}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="opacity-70 mb-0.5">Sale Price</p>
                  <p className="font-black font-mono">Rs. {Number(watchedSalePrice || 0).toFixed(2)}</p>
                </div>
                {createType === ItemType.PRODUCT && (
                  <>
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="opacity-70 mb-0.5">Opening Stock</p>
                      <p className="font-bold">{watchedOpeningStock || 0} {currentUnit}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="opacity-70 mb-0.5">Cost Price</p>
                      <p className="font-black font-mono">Rs. {Number(watchedPurchasePrice || 0).toFixed(2)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* ── MOBILE STICKY BOTTOM BAR (Pixel match Image 2 Screen 4) ── */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 pb-5 shadow-2xl">
        {currentStep === (createType === ItemType.SERVICE ? 3 : 4) ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="flex-1 py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold active:scale-95 transition-all text-center border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit((data) => handleSaveRequest(data, false))}
              disabled={createItem.isPending}
              className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {createItem.isPending ? 'Saving...' : createType === ItemType.SERVICE ? 'Save Service' : 'Save Product'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleNextStep}
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── DESKTOP BOTTOM NAVIGATION BAR ── */}
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-4 z-30 items-center justify-between gap-3">
        <button
          type="button"
          onClick={currentStep === 1 ? handleAttemptClose : handlePrevStep}
          className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </button>

        {/* Step counter dots */}
        <div className="flex items-center gap-1.5">
          {visibleSteps.map((s) => (
            <div
              key={s.id}
              className={`rounded-full transition-all ${
                currentStep === s.id
                  ? 'w-5 h-2 bg-blue-600'
                  : currentStep > s.id
                  ? 'w-2 h-2 bg-blue-300'
                  : 'w-2 h-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Last step actions */}
          {(currentStep === 4 && createType === ItemType.PRODUCT) ||
          (currentStep === 3 && createType === ItemType.SERVICE) ? (
            <>
              <button
                type="button"
                onClick={handleSubmit((data) => handleSaveRequest(data, true))}
                disabled={createItem.isPending}
                className="px-4 py-2.5 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Save & Add Another
              </button>
              <button
                type="button"
                onClick={handleSubmit((data) => handleSaveRequest(data, false))}
                disabled={createItem.isPending}
                className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {createItem.isPending ? 'Saving...' : 'Save & Close'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        type="item"
        onCategoryCreated={(newCat) => {
          setValue('categoryId', newCat.id, { shouldDirty: true });
        }}
      />

      <DiscardConfirmModal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={handleConfirmDiscard}
        title="Discard unsaved item?"
        message="Are you sure you want to exit? Any information you typed into this item will be lost."
      />

      <SaveConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        isLoading={createItem.isPending}
        title={`Save ${createType === ItemType.SERVICE ? 'Service' : 'Product'}?`}
        message={`Are you sure you want to save "${pendingSaveData?.name || 'this item'}"? It will be added to your inventory.`}
        confirmText={pendingSaveAnother ? 'Save & Add Another' : 'Yes, Save'}
      />
    </div>
  );
}
