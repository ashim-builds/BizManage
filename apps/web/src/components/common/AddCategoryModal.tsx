'use client';

import { useState } from 'react';
import { Tag, Plus, X, AlertTriangle, Loader2 } from 'lucide-react';
import { ModalPortal } from '@/components/ui/ModalPortal';
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
  onCategoryCreated: (category: { id: string; name: string }) => void;
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
      case 'item': return 'New Product / Item Category';
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

      onCategoryCreated(res || { id: '', name: name.trim() });
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
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto scrollbar-thin"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{getTitle()}</h3>
                <p className="text-xs text-slate-400">Organize and classify your records</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Electronics, Raw Materials, Office Supplies..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Description <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief notes or description..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
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
