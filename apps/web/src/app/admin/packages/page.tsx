'use client';

import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Package, Plus, Edit2, Trash2, CheckCircle2, XCircle, RotateCcw, Crown, Zap, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { AVAILABLE_FEATURES } from '@/lib/constants';

interface SubscriptionPackage {
  id: string;
  name: string;
  price: string;
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  trialDays: number;
  features: string[];
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    currency: 'NPR',
    billingPeriod: 'MONTHLY' as 'MONTHLY' | 'YEARLY',
    trialDays: 0,
    features: [] as string[],
    isActive: true,
    displayOrder: 0,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/packages');
      if (res.data.success) {
        const parsedPackages = res.data.data.map((pkg: any) => ({
          ...pkg,
          features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || []),
        }));
        setPackages(parsedPackages);
      }
    } catch (err) {
      toast.error('Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    if (
      !confirm(
        'This will remove legacy old packages and reset the database to the 3 official plans: Free Starter, Gold Edition, and Platinum ERP. Continue?'
      )
    )
      return;
    try {
      const res = await api.post('/admin/packages/reset-defaults');
      if (res.data.success) {
        toast.success(res.data.message || 'Packages synchronized successfully');
        fetchPackages();
      }
    } catch (err: any) {
      toast.error('Failed to reset packages');
    }
  };

  const openModal = (pkg?: SubscriptionPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        price: parseFloat(pkg.price),
        currency: pkg.currency || 'NPR',
        billingPeriod: pkg.billingPeriod,
        trialDays: pkg.trialDays || 0,
        features: pkg.features || [],
        isActive: pkg.isActive,
        displayOrder: pkg.displayOrder,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: '',
        price: 0,
        currency: 'NPR',
        billingPeriod: 'MONTHLY',
        trialDays: 0,
        features: [],
        isActive: true,
        displayOrder: packages.length,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };

      if (editingPackage) {
        await api.put(`/admin/packages/${editingPackage.id}`, payload);
        toast.success('Package updated successfully');
      } else {
        await api.post('/admin/packages', payload);
        toast.success('Package created successfully');
      }
      setIsModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save package');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      await api.delete(`/admin/packages/${id}`);
      toast.success('Package deleted successfully');
      fetchPackages();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete package');
    }
  };

  const toggleFeature = (featId: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featId)
        ? prev.features.filter((f) => f !== featId)
        : [...prev.features, featId],
    }));
  };

  const selectAllFeatures = () => {
    setFormData((prev) => ({
      ...prev,
      features: AVAILABLE_FEATURES.map((f) => f.id),
    }));
  };

  const deselectAllFeatures = () => {
    setFormData((prev) => ({
      ...prev,
      features: [],
    }));
  };

  const applyFreeStarterPreset = () => {
    setFormData((prev) => ({
      ...prev,
      name: prev.name || 'Free Starter',
      price: 0,
      billingPeriod: 'MONTHLY',
      trialDays: 0,
      features: [
        'COMPLETE_ACCOUNTING',
        'INVENTORY_TRACKING',
        'AUTO_LEDGER',
        'WALLET_SYNC',
        'E2E_ENCRYPTION',
      ],
    }));
  };

  const applyGoldPreset = () => {
    setFormData((prev) => ({
      ...prev,
      name: prev.name || 'Gold Edition',
      price: 2499,
      billingPeriod: 'YEARLY',
      trialDays: 14,
      features: [
        'COMPLETE_ACCOUNTING',
        'INVENTORY_TRACKING',
        'AUTO_LEDGER',
        'WALLET_SYNC',
        'E2E_ENCRYPTION',
        'POS_BILLING',
        'BARCODE_PRINTING',
        'WHATSAPP_MARKETING',
        'CUSTOM_BRANDING',
        'CUSTOM_LOGO',
        'ADVANCED_REPORTS',
        'MULTI_USER_ROLES',
      ],
    }));
  };

  const applyPlatinumPreset = () => {
    setFormData((prev) => ({
      ...prev,
      name: prev.name || 'Platinum ERP',
      price: 3999,
      billingPeriod: 'YEARLY',
      trialDays: 14,
      features: AVAILABLE_FEATURES.map((f) => f.id),
    }));
  };

  if (loading && packages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscription Packages</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Manage tiers, pricing, features, and billing cycles</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" /> Clean & Sync 3 Official Plans
          </button>
          <button
            onClick={() => openModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-xs shadow-sm shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Package
          </button>
        </div>
      </div>

      {/* Grid of Packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const isGold = pkg.name.toLowerCase().includes('gold');
          const isFree = Number(pkg.price) === 0;

          return (
            <div
              key={pkg.id}
              className={`rounded-3xl border-2 flex flex-col justify-between overflow-hidden transition-all shadow-md ${
                isGold
                  ? 'bg-black text-white border-black ring-2 ring-blue-500/20'
                  : 'bg-white text-slate-900 border-slate-200'
              }`}
            >
              <div className={`p-6 border-b ${isGold ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isGold ? (
                      <Crown className="w-5 h-5 text-amber-400" />
                    ) : isFree ? (
                      <Zap className="w-5 h-5 text-slate-800" />
                    ) : (
                      <Crown className="w-5 h-5 text-purple-600" />
                    )}
                    <h3 className="text-lg font-black">{pkg.name}</h3>
                  </div>
                  {!pkg.isActive ? (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-full">
                      INACTIVE
                    </span>
                  ) : pkg.isDefault ? (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-extrabold rounded-full">
                      DEFAULT
                    </span>
                  ) : null}
                </div>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-3xl font-black font-mono">
                    Rs. {Number(pkg.price).toLocaleString()}
                  </span>
                  <span className={`text-xs ${isGold ? 'text-slate-400' : 'text-slate-500'}`}>
                    / {pkg.billingPeriod.toLowerCase()}
                  </span>
                </div>
                <p className={`text-xs mt-1 font-medium ${isGold ? 'text-blue-300' : 'text-blue-600'}`}>
                  {pkg.trialDays > 0 ? `${pkg.trialDays}-Day Free Trial Included` : 'No Trial (Instant Free)'}
                </p>
              </div>

              <div className="p-6 flex-1">
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${isGold ? 'text-slate-400' : 'text-slate-400'}`}>
                  Included Features ({pkg.features.length})
                </p>
                <ul className="space-y-2.5 text-xs">
                  {pkg.features.map((featureKey, idx) => {
                    const featObj = AVAILABLE_FEATURES.find((f) => f.id === featureKey);
                    return (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isGold ? 'text-blue-400' : 'text-emerald-600'
                          }`}
                        />
                        <span className={isGold ? 'text-slate-200' : 'text-slate-700'}>
                          {featObj ? featObj.label : featureKey}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div
                className={`p-4 border-t flex gap-2 ${
                  isGold ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <button
                  onClick={() => openModal(pkg)}
                  className={`flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs shadow-xs ${
                    isGold
                      ? 'bg-slate-800 hover:bg-slate-700 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Plan
                </button>
                {!pkg.isDefault && (
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="flex justify-center items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all font-bold text-xs border border-red-200"
                    title="Delete Package"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {packages.length === 0 && !loading && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white border-2 border-slate-200 border-dashed rounded-3xl">
            <Package className="w-12 h-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No packages found</h3>
            <p className="text-slate-500 text-xs max-w-sm mb-6">Synchronize with official defaults or create a new plan.</p>
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-xs font-bold shadow-md"
            >
              <RotateCcw className="w-4 h-4" /> Clean & Sync 3 Official Plans
            </button>
          </div>
        )}
      </div>

      {/* Package Edit/Create Modal */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    <Package className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-black text-slate-900">
                    {editingPackage ? `Edit Plan: ${editingPackage.name}` : 'Create New Package'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 flex-1 space-y-6 scrollbar-thin">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Package Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Free Starter, Gold Edition, Platinum ERP"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Price (NPR) *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        onKeyDown={onNumericKeyDown}
                        onFocus={onNumericFocus}
                        onBlur={onNumericBlur}
                        required
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Billing Cycle</label>
                      <select
                        value={formData.billingPeriod}
                        onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value as any })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Trial Period (days)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        onKeyDown={onNumericKeyDown}
                        onFocus={onNumericFocus}
                        onBlur={onNumericBlur}
                        required
                        min="0"
                        value={formData.trialDays}
                        onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        onKeyDown={onNumericKeyDown}
                        onFocus={onNumericFocus}
                        onBlur={onNumericBlur}
                        required
                        min="0"
                        value={formData.displayOrder}
                        onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Feature Selection & Presets */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Module Access ({formData.features.length} / {AVAILABLE_FEATURES.length} enabled)
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={applyFreeStarterPreset}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-all"
                      >
                        Free Preset
                      </button>
                      <button
                        type="button"
                        onClick={applyGoldPreset}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-all border border-blue-200"
                      >
                        Gold Preset
                      </button>
                      <button
                        type="button"
                        onClick={applyPlatinumPreset}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold transition-all border border-purple-200"
                      >
                        Platinum (All)
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllFeatures}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold transition-all border border-red-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-2xl scrollbar-thin">
                    {AVAILABLE_FEATURES.map((feat) => {
                      const isChecked = formData.features.includes(feat.id);

                      return (
                        <div
                          key={feat.id}
                          onClick={() => toggleFeature(feat.id)}
                          className={`p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                            isChecked
                              ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold leading-tight">{feat.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{feat.category}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Active Package</p>
                    <p className="text-[11px] text-slate-500">Visible for users to purchase and select</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
                  >
                    {editingPackage ? 'Save Changes' : 'Create Package'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
