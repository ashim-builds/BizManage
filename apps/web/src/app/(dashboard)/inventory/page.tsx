'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  itemSchema,
  stockAdjustmentSchema,
  ItemInput,
  UpdateItemInput,
  StockAdjustmentInput,
} from '@bizmanage/validation';
import { ItemType } from '@bizmanage/types';
import {
  useItems,
  useItemsSummary,
  useCreateItem,
  useUpdateItem,
  useAdjustStock,
  useDeleteItem,
} from '@/services/itemService';
import { useItemCategories, useCreateItemCategory } from '@/services/categoryService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { AddCategoryModal } from '@/components/common/AddCategoryModal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import {
  Package,
  Plus,
  Search,
  Tag,
  AlertTriangle,
  Boxes,
  DollarSign,
  TrendingUp,
  Eye,
  Edit2,
  Trash2,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ItemType | ''>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<any | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [deletingItemInfo, setDeletingItemInfo] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  // Queries
  const { data: summary, isLoading: summaryLoading } = useItemsSummary();
  const { data: categories } = useItemCategories();
  const {
    data: itemsResponse,
    isLoading: itemsLoading,
    isError,
    refetch,
  } = useItems({
    search,
    categoryId: selectedCategory || undefined,
    type: selectedType || undefined,
    lowStock: lowStockOnly,
  });

  // Mutations
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const adjustStock = useAdjustStock();
  const deleteItem = useDeleteItem();

  // Error states for modals
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  const [adjustError, setAdjustError] = useState('');

  // Create Form
  const createForm = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: ItemType.PRODUCT,
      unit: 'Pcs',
      salePrice: 0,
      purchasePrice: 0,
      minStockAlert: 5,
      openingStock: 0,
    },
  });

  // Edit Form
  const editForm = useForm<UpdateItemInput>({
    resolver: zodResolver(itemSchema.partial()),
  });

  // Adjust Form
  const adjustForm = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      adjustmentType: 'ADD',
      quantity: 1,
    },
  });

  const handleCreateSubmit = async (data: ItemInput) => {
    setCreateError('');
    try {
      await createItem.mutateAsync(data);
      setIsCreateOpen(false);
      createForm.reset();
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create item.');
    }
  };

  const handleEditSubmit = async (data: UpdateItemInput) => {
    if (!editingItem) return;
    setEditError('');
    try {
      await updateItem.mutateAsync({ id: editingItem.id, data });
      setEditingItem(null);
    } catch (err: any) {
      setEditError(err.response?.data?.error?.message || 'Failed to update item.');
    }
  };

  const handleAdjustSubmit = async (data: StockAdjustmentInput) => {
    if (!adjustingItem) return;
    setAdjustError('');
    try {
      await adjustStock.mutateAsync({ id: adjustingItem.id, data });
      setAdjustingItem(null);
      adjustForm.reset();
    } catch (err: any) {
      setAdjustError(err.response?.data?.error?.message || 'Failed to adjust stock.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeletingItemInfo({ id, name });
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    editForm.reset({
      name: item.name,
      code: item.code || '',
      type: item.type,
      categoryId: item.categoryId || '',
      unit: item.unit,
      salePrice: Number(item.salePrice),
      purchasePrice: Number(item.purchasePrice),
      minStockAlert: Number(item.minStockAlert),
    });
  };

  const items = itemsResponse?.data || [];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory & Items</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track product SKUs, stock levels, unit cost/selling prices, and transaction movement logs.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Add Inventory Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inventory Value (Cost)</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalCostValuation || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Total valuation at purchase cost</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retail Value (Sales)</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalSaleValuation || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Potential gross sales valuation</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            lowStockOnly
              ? 'bg-amber-500/10 border-amber-500/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">
              {summaryLoading ? '...' : summary?.lowStockCount || 0} Items
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {lowStockOnly ? 'Showing low stock items only (Click to clear)' : 'Click to filter low stock items'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by item name or SKU code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content / Table */}
      {itemsLoading ? (
        <LoadingState message="Loading inventory master..." />
      ) : isError ? (
        <ErrorState title="Failed to load items" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="w-7 h-7 text-purple-400" />}
          title="No Inventory Items Found"
          description="Build your product and service catalog to start issuing sales invoices and tracking stock movements."
          actionLabel="Add Inventory Item"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="grid gap-4 md:hidden">
            {items.map((item: any) => {
              const stock = Number(item.currentStock || 0);
              const minAlert = Number(item.minStockAlert || 0);
              const isProduct = item.type === ItemType.PRODUCT;
              const isOut = isProduct && stock <= 0;
              const isLow = isProduct && stock > 0 && stock <= minAlert;

              return (
                <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-800/60 pb-3">
                    <div>
                      <Link href={`/inventory/${item.id}`} className="font-bold text-blue-400 hover:text-blue-300 text-sm">
                        {item.name}
                      </Link>
                      {item.code && <p className="text-[11px] text-slate-500 font-mono mt-0.5">SKU: {item.code}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                      isProduct ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                  
                  {/* Body */}
                  <div className="flex justify-between items-center">
                     <div>
                       <p className="text-xs text-slate-400">
                         {item.category ? item.category.name : 'Uncategorized'}
                       </p>
                       <p className="text-sm font-bold text-white mt-0.5">Rs. {Number(item.salePrice || 0).toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                       {isProduct ? (
                         <>
                           <p className={`font-bold text-base ${isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                             {stock} {item.unit}
                           </p>
                           {isOut && <p className="text-[10px] text-rose-400 uppercase mt-0.5">Out of stock</p>}
                           {isLow && <p className="text-[10px] text-amber-400 uppercase mt-0.5">Low stock</p>}
                         </>
                       ) : (
                         <p className="text-[11px] text-slate-500">N/A (Service)</p>
                       )}
                     </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex justify-end items-center gap-1.5 pt-1">
                    <Link href={`/inventory/${item.id}`} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700">
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    {isProduct && (
                      <button onClick={() => setAdjustingItem(item)} className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20">
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => openEditModal(item)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id, item.name)} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20">
                      <Trash2 className="w-3.5 h-3.5" />
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
                  <th className="px-6 py-4">Item Name / Code</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Purchase Cost</th>
                  <th className="px-6 py-4 text-right">Sale Price</th>
                  <th className="px-6 py-4 text-right">Stock Level</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item: any) => {
                const stock = Number(item.currentStock || 0);
                const minAlert = Number(item.minStockAlert || 0);
                const isProduct = item.type === ItemType.PRODUCT;
                const isOut = isProduct && stock <= 0;
                const isLow = isProduct && stock > 0 && stock <= minAlert;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-white">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="hover:text-blue-400 transition-colors flex items-center gap-2"
                      >
                        {item.name}
                      </Link>
                      {item.code && <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {item.code}</p>}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isProduct
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-400">
                      {item.category ? (
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <Tag className="w-3 h-3 text-slate-500" />
                          {item.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-300">
                      Rs. {Number(item.purchasePrice || 0).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right font-mono font-semibold text-white">
                      Rs. {Number(item.salePrice || 0).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                      {isProduct ? (
                        <div className="inline-flex flex-col items-end">
                          <span
                            className={`font-bold ${
                              isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {stock} {item.unit}
                          </span>
                          {isOut && <span className="text-[9px] text-rose-400 font-sans uppercase">Out of stock</span>}
                          {isLow && <span className="text-[9px] text-amber-400 font-sans uppercase">Low stock</span>}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-sans text-[11px]">N/A (Service)</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right space-x-1.5">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 inline-block"
                        title="View Movement History"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {isProduct && (
                        <button
                          onClick={() => setAdjustingItem(item)}
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10"
                          title="Manual Stock Adjustment"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Edit Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                        title="Delete Item"
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

      {/* CREATE ITEM MODAL */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" /> Add Inventory Item
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Register a product SKU or service catalog item.</p>
            </div>

            <form onSubmit={createForm.handleSubmit(handleCreateSubmit, () => setCreateError('Please resolve highlighted form errors.'))} className="space-y-4">
              {(createError || Object.keys(createForm.formState.errors).length > 0) && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{createError || 'Please correct the invalid inputs highlighted below.'}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  {...createForm.register('name')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Copper Wire 2.5mm"
                />
                {createForm.formState.errors.name && (
                  <p className="text-xs text-red-400 mt-1">{createForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsAddCategoryOpen(true)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add New
                    </button>
                  </div>
                  <select
                    {...createForm.register('categoryId')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Category (Optional)</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Item Code / SKU</label>
                  <input
                    type="text"
                    {...createForm.register('code')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. ELEC-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Measurement Unit</label>
                  <input
                    type="text"
                    {...createForm.register('unit')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Pcs, Kg, Ltr, Mtr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Purchase Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...createForm.register('purchasePrice', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Selling Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...createForm.register('salePrice', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {createForm.watch('type') === ItemType.PRODUCT && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
                  <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-blue-400" /> Stock Configuration
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Opening Stock Qty</label>
                      <input
                        type="number"
                        step="any"
                        {...createForm.register('openingStock', { valueAsNumber: true })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Min Stock Alert Level</label>
                      <input
                        type="number"
                        step="any"
                        {...createForm.register('minStockAlert', { valueAsNumber: true })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  disabled={createItem.isPending}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {createItem.isPending ? 'Saving...' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" /> Edit Item Master
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Update product prices, unit, and alert thresholds.</p>
            </div>

            <form onSubmit={editForm.handleSubmit(handleEditSubmit, () => setEditError('Please resolve highlighted form errors.'))} className="space-y-4">
              {(editError || Object.keys(editForm.formState.errors).length > 0) && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{editError || 'Please correct the invalid inputs highlighted below.'}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  {...editForm.register('name')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsAddCategoryOpen(true)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add New
                    </button>
                  </div>
                  <select
                    {...editForm.register('categoryId')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Category (Optional)</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Item Code / SKU</label>
                  <input
                    type="text"
                    {...editForm.register('code')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Purchase Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...editForm.register('purchasePrice', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Selling Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    {...editForm.register('salePrice', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Measurement Unit</label>
                  <input
                    type="text"
                    {...editForm.register('unit')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Min Stock Alert Level</label>
                  <input
                    type="number"
                    step="any"
                    {...editForm.register('minStockAlert', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateItem.isPending}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {updateItem.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* MANUAL STOCK ADJUSTMENT MODAL */}
      {adjustingItem && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-amber-400" /> Manual Stock Adjustment
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Adjust stock level for <span className="text-white font-semibold">{adjustingItem.name}</span>. Current stock:{' '}
                <span className="font-mono text-blue-400 font-bold">{Number(adjustingItem.currentStock)} {adjustingItem.unit}</span>
              </p>
            </div>

            <form onSubmit={adjustForm.handleSubmit(handleAdjustSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Action Type</label>
                  <select
                    {...adjustForm.register('adjustmentType')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ADD">Add Stock (+)</option>
                    <option value="REDUCE">Reduce Stock (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity ({adjustingItem.unit})</label>
                  <input
                    type="number"
                    step="any"
                    {...adjustForm.register('quantity', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Audit Notes</label>
                <textarea
                  rows={2}
                  {...adjustForm.register('notes')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="e.g. Physical inventory count correction, damaged goods disposal..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustStock.isPending}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50"
                >
                  {adjustStock.isPending ? 'Adjusting...' : 'Save Stock Adjustment'}
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
        type="item"
        onCategoryCreated={(cat) => {
          createForm.setValue('categoryId', cat.id);
          if (editingItem) editForm.setValue('categoryId', cat.id);
        }}
      />

      <ConfirmActionModal
        isOpen={!!deletingItemInfo}
        onClose={() => { setDeletingItemInfo(null); setDeleteError(''); }}
        title="Delete Item"
        itemName={deletingItemInfo?.name}
        actionText="Delete Item"
        error={deleteError}
        isProcessing={deleteItem.isPending}
        onConfirm={async () => {
          if (!deletingItemInfo) return;
          setDeleteError('');
          try {
            await deleteItem.mutateAsync(deletingItemInfo.id);
            setDeletingItemInfo(null);
          } catch (err: any) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete item.');
          }
        }}
      />
    </div>
  );
}
