'use client';

import React, { useState } from 'react';
import {
  Building2,
  ArrowLeftRight,
  Plus,
  Boxes,
  Warehouse,
  ChevronRight,
  X,
  Package,
  Layers,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useItems } from '@/services/itemService';
import {
  useGodowns,
  useCreateGodown,
  useStockTransfers,
  useExecuteStockTransfer,
  useGodownStocks,
  Godown,
  StockTransferRecord,
} from '@/services/godownService';
import { ResponsiveDataTable, Column } from '@/components/common/ResponsiveDataTable';
import toast from 'react-hot-toast';

export default function GodownsPage() {
  const { data: itemsResponse, isLoading: itemsLoading } = useItems({ limit: 300 });
  const items = itemsResponse?.data || [];

  const { data: godownsData, isLoading: godownsLoading } = useGodowns();
  const godowns = godownsData?.data || [];

  const [page, setPage] = useState(1);
  const { data: transfersData, isLoading: transfersLoading } = useStockTransfers({ page, limit: 15 });
  const transfers = transfersData?.data || [];
  const pagination = transfersData?.pagination;

  // Selected godown to inspect stock
  const [selectedGodownId, setSelectedGodownId] = useState<string | null>(null);
  const { data: godownStockData, isLoading: stockLoading } = useGodownStocks(selectedGodownId || undefined);

  // Modals state
  const [addGodownOpen, setAddGodownOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Add Godown Form
  const [newGodownName, setNewGodownName] = useState('');
  const [newGodownLocation, setNewGodownLocation] = useState('');
  const [newGodownCapacity, setNewGodownCapacity] = useState('');
  const [newGodownDefault, setNewGodownDefault] = useState(false);

  // Transfer Form
  const [transferItem, setTransferItem] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState('1');
  const [transferNotes, setTransferNotes] = useState('');

  const createGodownMutation = useCreateGodown();
  const executeTransferMutation = useExecuteStockTransfer();

  const handleCreateGodown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGodownName.trim()) {
      toast.error('Please enter a godown name');
      return;
    }

    try {
      await createGodownMutation.mutateAsync({
        name: newGodownName.trim(),
        location: newGodownLocation.trim() || undefined,
        capacity: newGodownCapacity.trim() || undefined,
        isDefault: newGodownDefault,
      });
      toast.success(`Godown "${newGodownName}" created!`);
      setNewGodownName('');
      setNewGodownLocation('');
      setNewGodownCapacity('');
      setNewGodownDefault(false);
      setAddGodownOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create godown');
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItem || !transferFrom || !transferTo) {
      toast.error('Please select item and both godowns');
      return;
    }
    if (transferFrom === transferTo) {
      toast.error('Source and destination godowns must be different');
      return;
    }
    const qty = parseFloat(transferQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity greater than 0');
      return;
    }

    try {
      await executeTransferMutation.mutateAsync({
        sourceGodownId: transferFrom,
        destinationGodownId: transferTo,
        itemId: transferItem,
        quantity: qty,
        notes: transferNotes.trim() || undefined,
      });
      toast.success('Stock transfer executed successfully!');
      setTransferItem('');
      setTransferQty('1');
      setTransferNotes('');
      setTransferModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Stock transfer failed');
    }
  };

  // Transfer history columns
  const transferColumns: Column<StockTransferRecord>[] = [
    {
      key: 'transferNumber',
      header: 'Transfer #',
      isPrimaryTitle: true,
      render: (r) => (
        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
          {r.transferNumber}
        </span>
      ),
    },
    {
      key: 'transferDate',
      header: 'Date',
      render: (r) => (
        <span className="text-slate-600">
          {new Date(r.transferDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'item',
      header: 'Item Transferred',
      render: (r) => (
        <div>
          <div className="font-bold text-slate-900">{r.item.name}</div>
          {r.item.code && <div className="text-[11px] text-slate-400 font-mono">Code: {r.item.code}</div>}
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Route (From -> To)',
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
            {r.sourceGodown.name}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            {r.destinationGodown.name}
          </span>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      isStatusBadge: true,
      render: (r) => (
        <span className="font-bold font-mono text-slate-900 text-sm">
          {Number(r.quantity)} {r.item.unit}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      mobileHidden: true,
      render: (r) => (
        <span className="text-slate-500 italic max-w-xs truncate block">{r.notes || '—'}</span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4">
      {/* ── HEADER & ACTIONS ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Warehouse className="w-6 h-6 text-blue-600" />
            Godowns & Warehouse Storage
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage multi-location inventory, storehouses, and seamless internal stock transfers.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setAddGodownOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            Add Godown
          </button>
          <button
            type="button"
            onClick={() => {
              if (godowns.length < 2) {
                toast.error('You need at least 2 godowns to perform internal stock transfers.');
                return;
              }
              if (godowns[0] && godowns[1]) {
                setTransferFrom(godowns[0].id);
                setTransferTo(godowns[1].id);
              }
              setTransferModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transfer Stock
          </button>
        </div>
      </div>

      {/* ── GODOWNS LIST GRID ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Active Locations & Warehouses ({godowns.length})
          </h2>
        </div>

        {godownsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : godowns.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-xs">
            <Warehouse className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No godowns configured yet.</p>
            <p className="text-xs text-slate-400 mt-1">Create your primary store or warehouse to begin tracking location-based inventory.</p>
            <button
              onClick={() => setAddGodownOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Create First Godown
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {godowns.map((g) => {
              const isSelected = selectedGodownId === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGodownId(isSelected ? null : g.id)}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{g.name}</h3>
                        {g.isDefault && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-md uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      {g.location && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {g.location}
                        </p>
                      )}
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Warehouse className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Item Types</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{g.totalItemsCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Units</span>
                      <span className="font-mono font-bold text-blue-600 text-sm">{g.totalUnits.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 text-[11px] font-bold text-blue-600 flex items-center justify-between">
                    <span>{isSelected ? 'Viewing Stock Items' : 'Click to View Items'}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SELECTED GODOWN STOCK BREAKDOWN ─────────────────────────────── */}
      {selectedGodownId && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                Inventory in: {godownStockData?.godown?.name || 'Selected Godown'}
              </h3>
              <p className="text-xs text-slate-500">Live breakdown of individual items stocked at this location</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGodownId(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {stockLoading ? (
            <div className="h-24 bg-slate-50 rounded-xl animate-pulse" />
          ) : !godownStockData?.stocks || godownStockData.stocks.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No inventory records present in this godown yet. Transfer items in to view balances.
            </div>
          ) : (
            <div>
              {/* Mobile Card Layout */}
              <div className="grid gap-2.5 sm:hidden">
                {godownStockData.stocks.map((st) => (
                  <div key={st.id} className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{st.itemName}</h4>
                        {st.itemCode && <p className="text-[10px] text-slate-500 font-mono">Code: {st.itemCode}</p>}
                      </div>
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100">
                        {st.quantity} {st.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200 text-slate-600">
                      <span>Total Stock: <strong className="text-slate-900 font-mono">{st.totalItemStock} {st.unit}</strong></span>
                      <span>Value: <strong className="text-slate-900 font-mono">Rs. {st.stockValue.toLocaleString()}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="px-3.5 py-2.5">Item Name</th>
                      <th className="px-3.5 py-2.5">Code</th>
                      <th className="px-3.5 py-2.5 text-right">In-Godown Qty</th>
                      <th className="px-3.5 py-2.5 text-right">Total Business Stock</th>
                      <th className="px-3.5 py-2.5 text-right">Estimated Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {godownStockData.stocks.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60">
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">{st.itemName}</td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-500">{st.itemCode || '—'}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-blue-600">
                          {st.quantity} {st.unit}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                          {st.totalItemStock} {st.unit}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-slate-800">
                          Rs. {st.stockValue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STOCK TRANSFER HISTORY (Responsive Table) ────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Warehouse Transfer History
        </h2>

        <ResponsiveDataTable
          columns={transferColumns}
          data={transfers}
          keyExtractor={(t) => t.id}
          isLoading={transfersLoading}
          emptyTitle="No stock transfers recorded"
          emptyDescription="When you move items between godowns, complete audit trails will appear here."
          emptyAction={
            <button
              onClick={() => {
                if (godowns.length < 2) {
                  toast.error('Add at least 2 godowns to perform transfers.');
                  return;
                }
                setTransferModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              <ArrowLeftRight className="w-4 h-4" /> Transfer Items Now
            </button>
          }
          pagination={
            pagination
              ? {
                  currentPage: pagination.page,
                  totalPages: pagination.totalPages,
                  totalItems: pagination.total,
                  onPageChange: (p) => setPage(p),
                }
              : undefined
          }
        />
      </div>

      {/* ── ADD GODOWN MODAL ────────────────────────────────────────────── */}
      {addGodownOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Add New Godown / Warehouse
              </h3>
              <button
                type="button"
                onClick={() => setAddGodownOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGodown} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Godown Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Warehouse, Basement 1"
                  value={newGodownName}
                  onChange={(e) => setNewGodownName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Area, Plot 4"
                  value={newGodownLocation}
                  onChange={(e) => setNewGodownLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Storage Capacity / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 5000 sq ft, Rack 1-10"
                  value={newGodownCapacity}
                  onChange={(e) => setNewGodownCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={newGodownDefault}
                  onChange={(e) => setNewGodownDefault(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Set as default storage location
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddGodownOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGodownMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {createGodownMutation.isPending ? 'Creating...' : 'Save Godown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TRANSFER STOCK MODAL ────────────────────────────────────────── */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                Internal Stock Transfer
              </h3>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferStock} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Item to Transfer *</label>
                <select
                  required
                  value={transferItem}
                  onChange={(e) => setTransferItem(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
                >
                  <option value="">-- Choose Product / Item --</option>
                  {items.map((it: any) => (
                    <option key={it.id} value={it.id}>
                      {it.name} (Stock: {Number(it.currentStock)} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">From (Source) *</label>
                  <select
                    required
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
                  >
                    <option value="">-- Source Godown --</option>
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">To (Destination) *</label>
                  <select
                    required
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
                  >
                    <option value="">-- Destination Godown --</option>
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity to Move *</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Replenishing storefront counter, rack reorganization"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={executeTransferMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {executeTransferMutation.isPending ? 'Executing Transfer...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
