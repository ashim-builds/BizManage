'use client';

import React, { useState, useMemo } from 'react';
import {
  Factory,
  Layers,
  Plus,
  Play,
  Trash2,
  Boxes,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
  TrendingUp,
  Warehouse,
  FileText,
} from 'lucide-react';
import { useItems } from '@/services/itemService';
import { useGodowns } from '@/services/godownService';
import {
  useBOMs,
  useCreateBOM,
  useDeleteBOM,
  useProductionRuns,
  useExecuteProductionRun,
  BillOfMaterialRecord,
  ProductionRunRecord,
} from '@/services/manufacturingService';
import { ResponsiveDataTable, Column } from '@/components/common/ResponsiveDataTable';
import toast from 'react-hot-toast';

export default function ManufacturingPage() {
  const [activeTab, setActiveTab] = useState<'boms' | 'runs'>('boms');

  const { data: itemsResponse, isLoading: itemsLoading } = useItems({ limit: 300 });
  const items = itemsResponse?.data || [];

  const { data: godownsData } = useGodowns();
  const godowns = godownsData?.data || [];

  const { data: bomsData, isLoading: bomsLoading } = useBOMs();
  const boms = bomsData?.data || [];

  const [runsPage, setRunsPage] = useState(1);
  const { data: runsData, isLoading: runsLoading } = useProductionRuns({ page: runsPage, limit: 15 });
  const runs = runsData?.data || [];
  const runsPagination = runsData?.pagination;

  // Mutations
  const createBOMMutation = useCreateBOM();
  const deleteBOMMutation = useDeleteBOM();
  const executeRunMutation = useExecuteProductionRun();

  // Modals
  const [bomModalOpen, setBomModalOpen] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);

  // New BOM Form State
  const [bomName, setBomName] = useState('');
  const [finishedItemId, setFinishedItemId] = useState('');
  const [outputQuantity, setOutputQuantity] = useState('1');
  const [targetGodownId, setTargetGodownId] = useState('');
  const [bomNotes, setBomNotes] = useState('');
  const [components, setComponents] = useState<{ itemId: string; quantity: string; unitCost: string }[]>([
    { itemId: '', quantity: '1', unitCost: '0' },
  ]);

  // Production Run Form State
  const [selectedBOMId, setSelectedBOMId] = useState('');
  const [runQty, setRunQty] = useState('1');
  const [runSourceGodownId, setRunSourceGodownId] = useState('');
  const [runDestGodownId, setRunDestGodownId] = useState('');
  const [runNotes, setRunNotes] = useState('');

  // Add / remove component lines in BOM
  const handleAddComponentLine = () => {
    setComponents((prev) => [...prev, { itemId: '', quantity: '1', unitCost: '0' }]);
  };

  const handleRemoveComponentLine = (index: number) => {
    if (components.length <= 1) {
      toast.error('BOM must contain at least one raw material');
      return;
    }
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComponentChange = (index: number, field: string, value: string) => {
    setComponents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Auto populate unitCost from item purchasePrice when selecting item
      if (field === 'itemId') {
        const itm = items.find((i: any) => i.id === value);
        if (itm && itm.purchasePrice) {
          next[index].unitCost = String(Number(itm.purchasePrice));
        }
      }
      return next;
    });
  };

  // Estimated BOM total cost calculation
  const calculatedBomCost = useMemo(() => {
    return components.reduce((sum, c) => {
      const q = parseFloat(c.quantity) || 0;
      const u = parseFloat(c.unitCost) || 0;
      return sum + q * u;
    }, 0);
  }, [components]);

  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomName.trim() || !finishedItemId) {
      toast.error('Please enter BOM name and finished product');
      return;
    }

    const validComponents = components.filter((c) => c.itemId && parseFloat(c.quantity) > 0);
    if (validComponents.length === 0) {
      toast.error('Please add at least one valid raw material component with quantity > 0');
      return;
    }

    try {
      await createBOMMutation.mutateAsync({
        name: bomName.trim(),
        finishedItemId,
        outputQuantity: parseFloat(outputQuantity) || 1,
        targetGodownId: targetGodownId || null,
        estimatedCost: calculatedBomCost,
        notes: bomNotes.trim() || null,
        components: validComponents.map((c) => ({
          itemId: c.itemId,
          quantity: parseFloat(c.quantity),
          unitCost: parseFloat(c.unitCost) || 0,
        })),
      });

      toast.success(`BOM "${bomName}" created!`);
      setBomName('');
      setFinishedItemId('');
      setOutputQuantity('1');
      setTargetGodownId('');
      setBomNotes('');
      setComponents([{ itemId: '', quantity: '1', unitCost: '0' }]);
      setBomModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create BOM');
    }
  };

  const handleExecuteRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBOMId) {
      toast.error('Please select a Bill of Material recipe');
      return;
    }
    const q = parseFloat(runQty);
    if (isNaN(q) || q <= 0) {
      toast.error('Please enter a valid quantity produced');
      return;
    }

    try {
      await executeRunMutation.mutateAsync({
        bomId: selectedBOMId,
        quantityProduced: q,
        sourceGodownId: runSourceGodownId || null,
        destinationGodownId: runDestGodownId || null,
        notes: runNotes.trim() || null,
      });

      toast.success('Production run executed & inventory updated!');
      setSelectedBOMId('');
      setRunQty('1');
      setRunSourceGodownId('');
      setRunDestGodownId('');
      setRunNotes('');
      setRunModalOpen(false);
      setActiveTab('runs');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Production run execution failed');
    }
  };

  const handleDeleteBOM = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete BOM "${name}"?`)) return;
    try {
      await deleteBOMMutation.mutateAsync(id);
      toast.success('BOM deleted successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete BOM');
    }
  };

  // Selected BOM for preview in Run modal
  const activeBOMForRun = useMemo(() => {
    return boms.find((b) => b.id === selectedBOMId);
  }, [boms, selectedBOMId]);

  // BOM Columns
  const bomColumns: Column<BillOfMaterialRecord>[] = [
    {
      key: 'name',
      header: 'BOM / Formula Name',
      isPrimaryTitle: true,
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900">{b.name}</div>
          <div className="text-[11px] text-slate-400">
            Produces: <span className="font-semibold text-slate-700">{Number(b.outputQuantity)} {b.finishedItem.unit}</span> of{' '}
            <span className="font-bold text-blue-600">{b.finishedItem.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'components',
      header: 'Raw Materials Required',
      render: (b) => (
        <div className="space-y-1 max-w-sm">
          {b.components.map((c, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              <span className="font-medium text-slate-700 truncate">{c.item?.name || 'Item'}</span>
              <span className="font-mono font-bold text-slate-900 ml-2">
                {Number(c.quantity)} {c.item?.unit}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'estimatedCost',
      header: 'Estimated Unit Cost',
      align: 'right',
      render: (b) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          Rs. {Number(b.estimatedCost).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'runs',
      header: 'Production Runs',
      align: 'center',
      render: (b) => (
        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 text-xs">
          {b._count?.productionRuns || 0} Runs
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedBOMId(b.id);
              setRunQty(String(Number(b.outputQuantity)));
              setRunModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs"
          >
            <Play className="w-3.5 h-3.5" />
            Produce
          </button>
          <button
            type="button"
            onClick={() => handleDeleteBOM(b.id, b.name)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Production Run Columns
  const runColumns: Column<ProductionRunRecord>[] = [
    {
      key: 'runNumber',
      header: 'Run #',
      isPrimaryTitle: true,
      render: (r) => (
        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
          {r.runNumber}
        </span>
      ),
    },
    {
      key: 'runDate',
      header: 'Date',
      render: (r) => (
        <span className="text-slate-600">
          {new Date(r.runDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'bom',
      header: 'BOM Recipe',
      render: (r) => (
        <div>
          <div className="font-bold text-slate-900">{r.bom?.name || 'Recipe'}</div>
          <div className="text-[11px] text-slate-400">Produced: {r.finishedItem.name}</div>
        </div>
      ),
    },
    {
      key: 'quantityProduced',
      header: 'Output Produced',
      align: 'right',
      isStatusBadge: true,
      render: (r) => (
        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
          +{Number(r.quantityProduced)} {r.finishedItem.unit}
        </span>
      ),
    },
    {
      key: 'totalCost',
      header: 'Batch Raw Cost',
      align: 'right',
      render: (r) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          Rs. {Number(r.totalCost).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Factory className="w-6 h-6 text-blue-600" />
            Manufacturing & Bill of Materials (BOM)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Define assembly recipes, auto-deduct raw materials, and increment manufactured inventory seamlessly.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setBomModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            New BOM Recipe
          </button>
          <button
            type="button"
            onClick={() => {
              if (boms.length === 0) {
                toast.error('Please create at least one BOM recipe first.');
                return;
              }
              if (boms[0]) setSelectedBOMId(boms[0].id);
              setRunModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
          >
            <Play className="w-4 h-4" />
            Execute Production Run
          </button>
        </div>
      </div>

      {/* ── TAB SWITCHER ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('boms')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'boms'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          BOM Recipes ({boms.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('runs')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'runs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Production Run History ({runsPagination?.total || runs.length})
        </button>
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
      {activeTab === 'boms' ? (
        <div className="space-y-3">
          <ResponsiveDataTable
            columns={bomColumns}
            data={boms}
            keyExtractor={(b) => b.id}
            isLoading={bomsLoading}
            emptyTitle="No Bill of Materials configured"
            emptyDescription="Create a formula recipe that defines the raw ingredients required to produce a finished product."
            emptyAction={
              <button
                onClick={() => setBomModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Create First BOM
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          <ResponsiveDataTable
            columns={runColumns}
            data={runs}
            keyExtractor={(r) => r.id}
            isLoading={runsLoading}
            emptyTitle="No production runs executed"
            emptyDescription="When you run an assembly batch, raw ingredients are deducted and finished goods are added to stock."
            emptyAction={
              <button
                onClick={() => {
                  if (boms.length === 0) {
                    toast.error('Create a BOM recipe first');
                    return;
                  }
                  setRunModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                <Play className="w-4 h-4" /> Run Production
              </button>
            }
            pagination={
              runsPagination
                ? {
                    currentPage: runsPagination.page,
                    totalPages: runsPagination.totalPages,
                    totalItems: runsPagination.total,
                    onPageChange: (p) => setRunsPage(p),
                  }
                : undefined
            }
          />
        </div>
      )}

      {/* ── CREATE BOM MODAL ────────────────────────────────────────────── */}
      {bomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Create Bill of Materials (BOM) Formula
              </h3>
              <button
                type="button"
                onClick={() => setBomModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBOM} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recipe / BOM Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Wooden Chair Assembly"
                    value={bomName}
                    onChange={(e) => setBomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Finished Product Output *</label>
                  <select
                    required
                    value={finishedItemId}
                    onChange={(e) => setFinishedItemId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value="">-- Choose Output Product --</option>
                    {items.map((it: any) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Output Batch Units *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={outputQuantity}
                    onChange={(e) => setOutputQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Finished Goods Godown</label>
                  <select
                    value={targetGodownId}
                    onChange={(e) => setTargetGodownId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value="">-- Any / General Inventory --</option>
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Components section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Raw Material Components Required
                  </span>
                  <button
                    type="button"
                    onClick={handleAddComponentLine}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Raw Material
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {components.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <div className="flex-1 min-w-0">
                        <select
                          required
                          value={comp.itemId}
                          onChange={(e) => handleComponentChange(idx, 'itemId', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none bg-white border border-slate-200"
                        >
                          <option value="">-- Raw Material Item --</option>
                          {items.map((it: any) => (
                            <option key={it.id} value={it.id}>
                              {it.name} ({it.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          required
                          placeholder="Qty"
                          value={comp.quantity}
                          onChange={(e) => handleComponentChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold focus:outline-none bg-white border border-slate-200"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Unit Cost"
                          value={comp.unitCost}
                          onChange={(e) => handleComponentChange(idx, 'unitCost', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono focus:outline-none bg-white border border-slate-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveComponentLine(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-2 text-slate-700">
                  <span>Estimated Total Batch Cost:</span>
                  <span className="font-mono text-blue-600 text-sm">Rs. {calculatedBomCost.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipe Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Standard workshop process instructions"
                  value={bomNotes}
                  onChange={(e) => setBomNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBomModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBOMMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {createBOMMutation.isPending ? 'Saving...' : 'Save BOM Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EXECUTE PRODUCTION RUN MODAL ────────────────────────────────── */}
      {runModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600" />
                Execute Production Assembly Run
              </h3>
              <button
                type="button"
                onClick={() => setRunModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteRun} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select BOM Recipe *</label>
                <select
                  required
                  value={selectedBOMId}
                  onChange={(e) => {
                    setSelectedBOMId(e.target.value);
                    const b = boms.find((x) => x.id === e.target.value);
                    if (b) setRunQty(String(Number(b.outputQuantity)));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                >
                  <option value="">-- Choose Recipe --</option>
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Produces: {b.finishedItem.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Output Units to Produce *</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={runQty}
                  onChange={(e) => setRunQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source Raw Godown</label>
                  <select
                    value={runSourceGodownId}
                    onChange={(e) => setRunSourceGodownId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value="">-- General Stock --</option>
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Finished Goods Godown</label>
                  <select
                    value={runDestGodownId}
                    onChange={(e) => setRunDestGodownId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value="">-- General Stock --</option>
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live materials calculation preview */}
              {activeBOMForRun && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-1.5">
                  <span className="font-bold text-blue-900 block">Required Raw Materials to Deduct:</span>
                  {activeBOMForRun.components.map((c, i) => {
                    const mult = (parseFloat(runQty) || 0) / Number(activeBOMForRun.outputQuantity);
                    const needed = (Number(c.quantity) * mult).toFixed(2);
                    return (
                      <div key={i} className="flex justify-between text-blue-800">
                        <span>{c.item?.name || 'Raw Material'}</span>
                        <span className="font-mono font-bold">
                          {needed} {c.item?.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Batch #42 morning shift run"
                  value={runNotes}
                  onChange={(e) => setRunNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRunModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={executeRunMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {executeRunMutation.isPending ? 'Executing Run...' : 'Confirm Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
