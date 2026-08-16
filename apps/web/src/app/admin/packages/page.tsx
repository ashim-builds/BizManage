'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Package, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
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
    billingPeriod: 'MONTHLY',
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
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(featId) 
        ? prev.features.filter(f => f !== featId)
        : [...prev.features, featId]
    }));
  };

  if (loading && packages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Packages</h1>
          <p className="text-slate-400 text-sm">Manage subscription tiers and limits</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col relative group">
            {!pkg.isActive && (
              <div className="absolute top-4 right-4 px-2 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded">
                INACTIVE
              </div>
            )}
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{pkg.currency} {pkg.price}</span>
                <span className="text-slate-400 text-sm">/ {pkg.billingPeriod.toLowerCase()}</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Trial: {pkg.trialDays} days</p>
            </div>
            
            <div className="p-6 flex-1 bg-slate-900/50">

              <ul className="space-y-3 mb-6 border-t border-slate-800/50 pt-4">
                {pkg.features.map((featureKey, idx) => {
                  const featObj = AVAILABLE_FEATURES.find(f => f.id === featureKey);
                  return (
                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>{featObj ? featObj.label : featureKey}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex gap-2">
              <button
                onClick={() => openModal(pkg)}
                className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                <Edit2 className="w-4 h-4" /> Edit Package
              </button>
              {!pkg.isDefault && (
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="flex justify-center items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-500 hover:text-red-400 rounded-lg transition-colors font-medium text-sm border border-red-900/50"
                  title="Delete Package"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {packages.length === 0 && !loading && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-slate-900 border border-slate-800 border-dashed rounded-2xl">
            <Package className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No packages found</h3>
            <p className="text-slate-400 text-sm max-w-sm mb-6">Create your first subscription tier to get started.</p>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> New Package
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
              <h2 className="text-xl font-bold text-white">
                {editingPackage ? 'Edit Package' : 'New Package'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 flex-1 space-y-8">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Basic Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Package Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Basic, Premium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Price</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Currency</label>
                    <input
                      type="text"
                      required
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="NPR, USD"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Billing Cycle</label>
                    <select
                      value={formData.billingPeriod}
                      onChange={e => setFormData({ ...formData, billingPeriod: e.target.value as any })}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Free Trial (days)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.trialDays}
                      onChange={e => setFormData({ ...formData, trialDays: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>



              {/* Features & Status */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Features & Status</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Available Features</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 bg-slate-950 border border-slate-800 rounded-lg">
                      {AVAILABLE_FEATURES.map(feat => (
                        <label key={feat.id} className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={formData.features.includes(feat.id)}
                            onChange={() => toggleFeature(feat.id)}
                            className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="group-hover:text-white transition-colors leading-snug">{feat.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">Active Package</p>
                        <p className="text-xs text-slate-500">Visible for purchase</p>
                      </div>
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Display Order</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.displayOrder}
                        onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Save Package
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}
