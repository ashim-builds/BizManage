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
import { ModalPortal } from '@/components/ui/ModalPortal';
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
  ChevronDown,
  Check,
  Search,
  Scale,
} from 'lucide-react';

const SERVICE_DEFAULT_UNITS = [
  { fullname: 'HOURS', shortname: 'Hur' },
  { fullname: 'DAYS', shortname: 'Day' },
  { fullname: 'MONTHS', shortname: 'Mon' },
  { fullname: 'JOBS/SERVICE', shortname: 'Job' },
  { fullname: 'VISIT/SESSION', shortname: 'Vst' },
  { fullname: 'TRIP', shortname: 'Trp' },
];

const PRODUCT_DEFAULT_UNITS = [
  { fullname: 'PIECES', shortname: 'Pcs' },
  { fullname: 'BAGS', shortname: 'Bag' },
  { fullname: 'BOXES', shortname: 'Box' },
  { fullname: 'KILOGRAMS', shortname: 'Kg' },
  { fullname: 'GRAMMES', shortname: 'Gm' },
  { fullname: 'METERS', shortname: 'Mtr' },
  { fullname: 'LITERS', shortname: 'Ltr' },
  { fullname: 'PACKS', shortname: 'Pac' },
  { fullname: 'NUMBERS', shortname: 'Nos' },
  { fullname: 'SETS', shortname: 'Set' },
  { fullname: 'ROLLS', shortname: 'Rol' },
  { fullname: 'BOTTLES', shortname: 'Btl' },
  { fullname: 'BUNDLES', shortname: 'Bdl' },
  { fullname: 'CANS', shortname: 'Can' },
  { fullname: 'CARTONS', shortname: 'Ctn' },
  { fullname: 'DOZENS', shortname: 'Dzn' },
  { fullname: 'SQUARE FEET', shortname: 'Sqf' },
  { fullname: 'SQUARE METERS', shortname: 'Sqm' },
  { fullname: 'TONNES', shortname: 'Ton' },
  { fullname: 'CUBIC METER', shortname: 'Mtq' },
];

const ALL_SYSTEM_UNITS = [
  ...PRODUCT_DEFAULT_UNITS,
  ...SERVICE_DEFAULT_UNITS,
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

  // Searchable Picker Bottom Sheets / Modals
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isUnitPickerOpen, setIsUnitPickerOpen] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');

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
      <div className="bg-white border-b border-slate-200 px-2 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2 sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
            title="Back to Inventory"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight truncate">
              Add New {createType === ItemType.SERVICE ? 'Service' : 'Product'}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {createType === ItemType.SERVICE
                ? 'Register billable services'
                : 'Add product with pricing & stock'}
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
          {currentStep === (createType === ItemType.SERVICE ? 3 : 4) && (
            <button
              type="button"
              onClick={handleSubmit((data) => handleSaveRequest(data, false))}
              disabled={createItem.isPending}
              className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          )}
        </div>
      </div>

      {/* ── PRODUCT/SERVICE TOGGLE ── */}
      <div className="px-1 sm:px-6 pt-2 sm:pt-4 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-1 max-w-xs shadow-2xs">
          <div className="flex p-0.5 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setCreateType(ItemType.PRODUCT);
                setValue('type', ItemType.PRODUCT);
                setValue('unit', 'Pcs');
                setCurrentStep(1);
              }}
              className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
              className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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

      {/* ── STEP INDICATOR (Dedicated Mobile & Desktop Designs) ── */}
      {/* Mobile Design (< sm) */}
      <div className="sm:hidden px-1 pt-2 pb-0.5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-black tracking-wide border border-blue-200">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-xs font-black text-slate-800">
                {visibleSteps.find((s) => s.id === currentStep)?.label || ''}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
              {visibleSteps.find((s) => s.id === currentStep)?.description || ''}
            </span>
          </div>

          {/* 4-segment progress bar */}
          <div className="grid grid-cols-4 gap-1.5">
            {visibleSteps.map((step) => {
              const stepNum = step.id;
              const isActive = currentStep === stepNum;
              const isDone = currentStep > stepNum || (createType === ItemType.SERVICE && stepNum === 3 && currentStep > 3);

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

      {/* Desktop Design (>= sm) */}
      <div className="hidden sm:block px-6 pt-4 pb-2">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs max-w-4xl mx-auto">
          <div className="flex items-center gap-0">
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
                      <p className="text-[10px] text-slate-400 leading-tight mt-1 truncate max-w-[120px]">
                        {step.description}
                      </p>
                    </div>
                  </button>

                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={`h-0.5 flex-1 rounded-full mx-2 transition-all ${
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

      {/* ── GLOBAL ERROR BANNER ── */}
      {createError && (
        <div className="mx-1 sm:mx-6 mt-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{createError}</span>
        </div>
      )}

      {/* ── STEP CONTENT ── */}
      <form onSubmit={(e) => e.preventDefault()} className="flex-1 px-1 sm:px-6 pt-2 sm:pt-5 pb-32 max-w-4xl mx-auto w-full">

        {/* ───────── STEP 1: BASIC INFO ───────── */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-3 sm:space-y-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-6 md:p-8 shadow-xs space-y-4 sm:space-y-5">
              
              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {createType === ItemType.SERVICE ? 'Service Name' : 'Item / Product Name'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    createType === ItemType.SERVICE
                      ? 'e.g. AC Installation, Plumbing Repair'
                      : 'e.g. CPVC Pipe 1 inch, UltraTech Cement'
                  }
                  {...register('name')}
                  className={`w-full px-3.5 sm:px-4 py-3 rounded-xl bg-slate-50/70 border text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
                    errors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {errors.name && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.name.message}
                  </p>
                )}
              </div>

              {/* Category & Unit Selector Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Category <span className="text-slate-400 font-normal">(वर्ग)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddCategoryOpen(true)}
                      className="text-xs text-blue-600 font-bold hover:text-blue-700 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>New Category</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCategorySearchQuery('');
                      setIsCategoryPickerOpen(true);
                    }}
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-50/70 border border-slate-200 text-left flex items-center justify-between hover:bg-slate-100/80 hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-sm truncate font-medium ${watch('categoryId') ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                        {categories.find((c: any) => c.id === watch('categoryId'))?.name || 'Select Category (None)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>
                </div>

                {/* Measuring Unit Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Measuring Unit <span className="text-rose-500">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setUnitSearchQuery('');
                      setIsUnitPickerOpen(true);
                    }}
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-50/70 border border-slate-200 text-left flex items-center justify-between hover:bg-slate-100/80 hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <Scale className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {ALL_SYSTEM_UNITS.find((u) => u.shortname === currentUnit)?.fullname || currentUnit || 'PIECES'} ({currentUnit || 'Pcs'})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>

              {/* SKU Code & HSN Code Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                {/* Item Code / SKU */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    {createType === ItemType.SERVICE ? 'SAC / Service Code' : 'SKU / Barcode'}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder={createType === ItemType.SERVICE ? 'e.g. SAC-9987' : 'e.g. SKU-100293'}
                      {...register('code')}
                      className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="absolute right-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                      <span>Auto</span>
                    </button>
                  </div>
                </div>

                {/* HSN Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    HSN Code <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7307, 8471"
                    {...register('hsnCode' as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ───────── STEP 2: PRICING ───────── */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-3 sm:space-y-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-6 md:p-8 shadow-xs space-y-4 sm:space-y-5">
              
              {/* Sale Price */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Sale Price <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">Rs.</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={onNumericKeyDown}
                    onFocus={onNumericFocus}
                    placeholder="0.00"
                    {...register('salePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50/70 border text-base font-black font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
                      errors.salePrice ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                </div>
                {errors.salePrice && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.salePrice.message}
                  </p>
                )}
              </div>

              {/* Purchase Price (Product only) */}
              {createType === ItemType.PRODUCT && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Purchase Cost <span className="text-slate-400 font-normal">(Cost per unit)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">Rs.</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      placeholder="0.00"
                      {...register('purchasePrice', { valueAsNumber: true, onBlur: onNumericBlur })}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50/70 border border-slate-200 text-base font-black font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Gross Margin Banner */}
              {createType === ItemType.PRODUCT && Number(watchedSalePrice) > 0 && Number(watchedPurchasePrice) > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-900 block">Gross Profit Margin</span>
                    <span className="text-[11px] text-emerald-700">Sale price minus cost</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-700 font-mono block">
                      Rs. {(Number(watchedSalePrice) - Number(watchedPurchasePrice)).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      ({(((Number(watchedSalePrice) - Number(watchedPurchasePrice)) / Number(watchedSalePrice)) * 100).toFixed(1)}% margin)
                    </span>
                  </div>
                </div>
              )}

              {/* Tax Rate Quick Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Tax / VAT Rate</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Exempt (0%)', value: 0 },
                    { label: 'Nepal VAT (13%)', value: 13 },
                    { label: 'Reduced (5%)', value: 5 },
                    { label: 'GST (18%)', value: 18 },
                  ].map((tax) => {
                    const isSelected = Number(watch('taxRate' as any) || 0) === tax.value;
                    return (
                      <button
                        key={tax.value}
                        type="button"
                        onClick={() => setValue('taxRate' as any, tax.value, { shouldDirty: true })}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {tax.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wholesale Price Option */}
              <div className="pt-2 border-t border-slate-100">
                {!showWholesale ? (
                  <button
                    type="button"
                    onClick={() => setShowWholesale(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Wholesale Price</span>
                  </button>
                ) : (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">Wholesale Price</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowWholesale(false);
                          setValue('wholesalePrice' as any, undefined);
                        }}
                        className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">Rs.</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        onKeyDown={onNumericKeyDown}
                        onFocus={onNumericFocus}
                        placeholder="0.00"
                        {...register('wholesalePrice' as any, { valueAsNumber: true, onBlur: onNumericBlur })}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-sm font-bold font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ───────── STEP 3: STOCK (PRODUCT ONLY) ───────── */}
        {currentStep === 3 && createType === ItemType.PRODUCT && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-3 sm:space-y-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-6 md:p-8 shadow-xs space-y-4 sm:space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opening Stock */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Opening Stock Quantity
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      placeholder="0"
                      {...register('openingStock', { valueAsNumber: true, onBlur: onNumericBlur })}
                      className="w-full px-3.5 sm:px-4 py-3 rounded-xl bg-slate-50/70 border border-slate-200 text-lg font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold uppercase">
                      {currentUnit || 'Units'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Initial stock physically available right now.</p>
                </div>

                {/* Min Stock Alert */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Low Stock Alert Level
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      placeholder="5"
                      {...register('minStockAlert', { valueAsNumber: true, onBlur: onNumericBlur })}
                      className="w-full px-3.5 sm:px-4 py-3 rounded-xl bg-slate-50/70 border border-slate-200 text-lg font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold uppercase">
                      {currentUnit || 'Units'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Get an alert when stock drops below this number.</p>
                </div>
              </div>

              {/* Stock summary card */}
              {Number(watchedOpeningStock) > 0 && (
                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-900 font-medium">
                    Starting inventory: <strong className="font-black text-blue-950">{watchedOpeningStock} {currentUnit}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ───────── STEP 4 (or 3 for Service): DESCRIPTION & IMAGE ───────── */}
        {((currentStep === 4 && createType === ItemType.PRODUCT) ||
          (currentStep === 3 && createType === ItemType.SERVICE)) && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-3 sm:space-y-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-6 md:p-8 shadow-xs space-y-4 sm:space-y-5">
              
              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Description / Item Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    createType === ItemType.SERVICE
                      ? 'Service scope, labor conditions, or warranty notes...'
                      : 'Item specifications, size, color, or notes for printed invoices...'
                  }
                  {...register('storeDescription')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Product Photo <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {imagePreview ? (
                  <div className="relative w-32 h-32 group">
                    <img
                      src={imagePreview}
                      alt="Item preview"
                      className="w-full h-full object-cover rounded-2xl border border-slate-200 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer group"
                  >
                    <ImagePlus className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600">Add Photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Final summary ── */}
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-300 mb-2.5">
                Ready to Save {createType === ItemType.SERVICE ? 'Service' : 'Product'}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Name</p>
                  <p className="font-bold truncate text-white mt-0.5">{watchedName || '—'}</p>
                </div>
                <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50">
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Sale Price</p>
                  <p className="font-black font-mono text-emerald-400 mt-0.5">Rs. {Number(watchedSalePrice || 0).toFixed(2)}</p>
                </div>
                {createType === ItemType.PRODUCT && (
                  <>
                    <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Opening Stock</p>
                      <p className="font-bold text-white mt-0.5">{watchedOpeningStock || 0} {currentUnit}</p>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Purchase Cost</p>
                      <p className="font-black font-mono text-slate-300 mt-0.5">Rs. {Number(watchedPurchasePrice || 0).toFixed(2)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* ── MOBILE STICKY BOTTOM BAR ── */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 pb-5 shadow-2xl">
        {currentStep === (createType === ItemType.SERVICE ? 3 : 4) ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevStep}
              className="py-3 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold active:scale-95 transition-all text-center border border-slate-200 flex items-center justify-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
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
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="py-3 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold active:scale-95 transition-all text-center border border-slate-200 flex items-center justify-center gap-1 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
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
      {/* Category Picker Modal */}
      {isCategoryPickerOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans"
            onClick={() => setIsCategoryPickerOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Select Category</h3>
                    <p className="text-[11px] text-slate-500">{categories.length} categories available</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryPickerOpen(false);
                      setIsAddCategoryOpen(true);
                    }}
                    className="text-xs text-blue-600 font-bold hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    autoFocus
                  />
                  {categorySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCategorySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto p-2 space-y-1 flex-1">
                {/* No Category option */}
                {!categorySearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue('categoryId', undefined, { shouldDirty: true });
                      setIsCategoryPickerOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                      !watch('categoryId')
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs">No Category (General)</span>
                    </div>
                    {!watch('categoryId') && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                )}

                {categories
                  .filter((cat: any) =>
                    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                  )
                  .map((cat: any) => {
                    const isSelected = watch('categoryId') === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setValue('categoryId', cat.id, { shouldDirty: true });
                          setIsCategoryPickerOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                            : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{cat.name}</p>
                          {cat.description && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{cat.description}</p>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}

                {categories.filter((cat: any) =>
                  cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="py-8 text-center px-4">
                    <p className="text-xs text-slate-500 mb-2">No category matches &quot;{categorySearchQuery}&quot;</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryPickerOpen(false);
                        setIsAddCategoryOpen(true);
                      }}
                      className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create &quot;{categorySearchQuery}&quot;</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Unit Picker Modal */}
      {isUnitPickerOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans"
            onClick={() => setIsUnitPickerOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Select Measuring Unit</h3>
                    <p className="text-[11px] text-slate-500">Choose physical or service unit</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUnitPickerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={unitSearchQuery}
                    onChange={(e) => setUnitSearchQuery(e.target.value)}
                    placeholder="Search units (e.g. Kg, Pcs, Box, Hours)..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all"
                    autoFocus
                  />
                  {unitSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUnitSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto p-2 space-y-1 flex-1">
                {(createType === ItemType.SERVICE ? SERVICE_DEFAULT_UNITS : ALL_SYSTEM_UNITS)
                  .filter(
                    (u) =>
                      u.fullname.toLowerCase().includes(unitSearchQuery.toLowerCase()) ||
                      u.shortname.toLowerCase().includes(unitSearchQuery.toLowerCase())
                  )
                  .map((u) => {
                    const isSelected = currentUnit?.toLowerCase() === u.shortname.toLowerCase();
                    return (
                      <button
                        key={u.shortname}
                        type="button"
                        onClick={() => {
                          setValue('unit', u.shortname, { shouldDirty: true });
                          setIsUnitPickerOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                            : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                            {u.shortname}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{u.fullname}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}

                {(createType === ItemType.SERVICE ? SERVICE_DEFAULT_UNITS : ALL_SYSTEM_UNITS).filter(
                  (u) =>
                    u.fullname.toLowerCase().includes(unitSearchQuery.toLowerCase()) ||
                    u.shortname.toLowerCase().includes(unitSearchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="py-8 text-center px-4">
                    <p className="text-xs text-slate-500 mb-2">
                      No standard unit matches &quot;{unitSearchQuery}&quot;
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('unit', unitSearchQuery.trim(), { shouldDirty: true });
                        setIsUnitPickerOpen(false);
                      }}
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Use custom unit &quot;{unitSearchQuery.trim()}&quot;</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

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
