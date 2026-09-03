'use client';

import { useState } from 'react';
import { Tag, Plus, X, AlertCircle, Loader2 } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import {
  useCreateItemCategory,
  useCreatePartyCategory,
  useCreateExpenseCategory,
  useCreateIncomeCategory,
} from '@/services/categoryService';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'item' | 'party' | 'expense' | 'income';
  onCategoryCreated?: (category: { id: string; name: string }) => void;
}

export function AddCategoryModal({
  isOpen,
  onClose,
  type,
  onCategoryCreated,
}: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const createItemCat = useCreateItemCategory();
  const createPartyCat = useCreatePartyCategory();
  const createExpenseCat = useCreateExpenseCategory();
  const createIncomeCat = useCreateIncomeCategory();

  const isPending =
    createItemCat.isPending ||
    createPartyCat.isPending ||
    createExpenseCat.isPending ||
    createIncomeCat.isPending;

  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case 'item': return 'New Item Category';
      case 'party': return 'New Party Category';
      case 'expense': return 'New Expense Category';
      case 'income': return 'New Income Category';
      default: return 'New Category';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }
    setError('');

    try {
      let res;
      if (type === 'item') {
        res = await createItemCat.mutateAsync({ name: name.trim(), description: description.trim() });
      } else if (type === 'party') {
        res = await createPartyCat.mutateAsync({ name: name.trim(), description: description.trim() });
      } else if (type === 'expense') {
        res = await createExpenseCat.mutateAsync({ name: name.trim(), description: description.trim() });
      } else if (type === 'income') {
        res = await createIncomeCat.mutateAsync({ name: name.trim(), description: description.trim() });
      }

      if (onCategoryCreated) {
        onCategoryCreated(res || { id: '', name: name.trim() });
      }
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create category.');
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[120] flex items-center justify-center p-4 font-sans"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shadow-xs">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">{getTitle()}</h3>
                <p className="text-xs text-slate-500">Organize and classify your records</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Category Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Electronics, Raw Materials, Wholesale..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-xs"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief notes or description..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-xs"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Save Category
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
