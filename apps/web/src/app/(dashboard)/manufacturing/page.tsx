'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  PackageCheck,
  PackagePlus,
  Coins,
  Cpu,
  X,
} from 'lucide-react';
import { useItems } from '@/services/itemService';
import toast from 'react-hot-toast';

interface RawMaterialRow {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

interface ManufacturingOrder {
  id: string;
  orderNumber: string;
  date: string;
  finishedItemName: string;
  producedQuantity: number;
  unit: string;
  totalCost: number;
  unitCost: number;
  rawMaterialsCount: number;
  additionalCost: number;
}

export default function ManufacturingPage() {
  const { data: itemsResponse } = useItems({ limit: 200 });
  const items = itemsResponse?.data || [];

  const [orders, setOrders] = useState<ManufacturingOrder[]>([
    {
      id: 'mfg-1',
      orderNumber: 'MFG-2001',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      finishedItemName: 'Assembled Desktop PC (Core i5)',
      producedQuantity: 5,
      unit: 'Pcs',
      totalCost: 195000,
      unitCost: 39000,
      rawMaterialsCount: 4,
      additionalCost: 5000,
    },
    {
      id: 'mfg-2',
      orderNumber: 'MFG-2002',
      date: new Date().toISOString().split('T')[0],
      finishedItemName: 'Custom Wooden Study Desk',
      producedQuantity: 10,
      unit: 'Pcs',
      totalCost: 85000,
      unitCost: 8500,
      rawMaterialsCount: 3,
      additionalCost: 7000,
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [finishedItemId, setFinishedItemId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('1');
  const [additionalCost, setAdditionalCost] = useState('0');
  const [rawMaterials, setRawMaterials] = useState<RawMaterialRow[]>([]);

  // Selected row for adding
  const [selectedRawId, setSelectedRawId] = useState('');
  const [selectedRawQty, setSelectedRawQty] = useState('1');

  const handleAddRawMaterial = () => {
    if (!selectedRawId) {
      toast.error('Select a raw material item');
      return;
    }
    const itm = items.find((i: any) => i.id === selectedRawId);
    if (!itm) return;

    const qty = parseFloat(selectedRawQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    setRawMaterials([
      ...rawMaterials,
      {
        itemId: itm.id,
        name: itm.name,
        quantity: qty,
        unit: itm.unit || 'Pcs',
        unitCost: Number(itm.purchasePrice || 0),
      },
    ]);
    setSelectedRawId('');
    setSelectedRawQty('1');
  };

  const handleRemoveRaw = (index: number) => {
    setRawMaterials(rawMaterials.filter((_, idx) => idx !== index));
  };

  // Calculations
  const rawMaterialsCost = rawMaterials.reduce((acc, row) => acc + row.quantity * row.unitCost, 0);
  const additionalCostNum = parseFloat(additionalCost) || 0;
  const totalCost = rawMaterialsCost + additionalCostNum;
  const targetQtyNum = parseFloat(targetQuantity) || 1;
  const unitCost = targetQtyNum > 0 ? totalCost / targetQtyNum : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishedItemId) {
      toast.error('Please select the finished product to produce');
      return;
    }
    if (rawMaterials.length === 0) {
      toast.error('Add at least one raw material input to the Bill of Materials');
      return;
    }

    const finishedItemObj = items.find((i: any) => i.id === finishedItemId);
    const order: ManufacturingOrder = {
      id: `mfg-${Date.now()}`,
      orderNumber: `MFG-${Math.floor(2000 + Math.random() * 8000)}`,
      date: new Date().toISOString().split('T')[0],
      finishedItemName: finishedItemObj?.name || 'Manufactured Item',
      producedQuantity: targetQtyNum,
      unit: finishedItemObj?.unit || 'Pcs',
      totalCost,
      unitCost,
      rawMaterialsCount: rawMaterials.length,
      additionalCost: additionalCostNum,
    };

    setOrders([order, ...orders]);
    setModalOpen(false);
    setFinishedItemId('');
    setTargetQuantity('1');
    setAdditionalCost('0');
    setRawMaterials([]);
    toast.success(`Production Run "${order.orderNumber}" recorded successfully!`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Manufacturing & Assembly Transactions (उत्पादन तथा प्रशोधन)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Build Bill of Materials (BOM), consume raw materials, and record finished products with cost-of-production analysis.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all flex items-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Production Run</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Production Runs</span>
          <h3 className="text-xl font-black text-white font-mono mt-1">{orders.length} Batches</h3>
          <p className="text-[10px] text-zinc-500">Manufactured in this period</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Production Value</span>
          <h3 className="text-xl font-black text-emerald-400 font-mono mt-1">
            Rs. {orders.reduce((acc, o) => acc + o.totalCost, 0).toLocaleString()}
          </h3>
          <p className="text-[10px] text-zinc-500">Includes materials & labor</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Average Batch Cost</span>
          <h3 className="text-xl font-black text-white font-mono mt-1">
            Rs. {(orders.length ? orders.reduce((acc, o) => acc + o.totalCost, 0) / orders.length : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] text-zinc-500">Per manufacturing run</p>
        </div>
      </div>

      {/* Production Runs Ledger Table */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              Completed Production Orders
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Audit log of finished goods assembly.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Order #</th>
                <th className="py-2.5 px-3">Finished Product</th>
                <th className="py-2.5 px-3">Produced Qty</th>
                <th className="py-2.5 px-3">Raw Inputs</th>
                <th className="py-2.5 px-3 text-right">Unit Cost</th>
                <th className="py-2.5 px-3 text-right">Total Batch Cost</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">{ord.date}</td>
                  <td className="py-3 px-3 font-mono font-bold text-white">{ord.orderNumber}</td>
                  <td className="py-3 px-3 font-bold text-white max-w-[200px] truncate">
                    {ord.finishedItemName}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-400 font-bold whitespace-nowrap">
                    {ord.producedQuantity} {ord.unit}
                  </td>
                  <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                    {ord.rawMaterialsCount} Materials
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300 whitespace-nowrap">
                    Rs. {ord.unitCost.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                    Rs. {ord.totalCost.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NEW PRODUCTION RUN */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-red-500" />
                Record Manufacturing & Assembly Run
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Finished Good Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Finished Product Output <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={finishedItemId}
                    onChange={(e) => setFinishedItemId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                    required
                  >
                    <option value="">-- Choose Finished Product --</option>
                    {items.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Current Stock: {Number(i.currentStock)} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Quantity to Produce <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Bill of Materials (BOM) Raw Materials Section */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Bill of Materials (Raw Materials Inputs)
                  </h4>
                  <span className="text-[11px] text-zinc-500">{rawMaterials.length} items added</span>
                </div>

                {/* Add Raw Row Input */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedRawId}
                      onChange={(e) => setSelectedRawId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="">-- Select Raw Material --</option>
                      {items.map((i: any) => (
                        <option key={i.id} value={i.id}>
                          {i.name} (Cost: Rs. {Number(i.purchasePrice).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      placeholder="Qty"
                      value={selectedRawQty}
                      onChange={(e) => setSelectedRawQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddRawMaterial}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Raw Materials Table */}
                {rawMaterials.length > 0 && (
                  <div className="divide-y divide-zinc-800/80 pt-2">
                    {rawMaterials.map((row, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">{row.name}</p>
                          <p className="text-[10px] text-zinc-500">
                            {row.quantity} {row.unit} × Rs. {row.unitCost.toLocaleString()} = Rs. {(row.quantity * row.unitCost).toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRaw(idx)}
                          className="p-1 text-zinc-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Production & Labor Costs */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Additional Labor, Electricity & Processing Charges (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={additionalCost}
                  onChange={(e) => setAdditionalCost(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500 font-mono font-bold"
                />
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-zinc-500">Calculated Unit Cost</span>
                  <p className="text-lg font-bold font-mono text-emerald-400">
                    Rs. {unitCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} / unit
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-zinc-500">Total Batch Cost</span>
                  <p className="text-lg font-bold font-mono text-white">
                    Rs. {totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25"
                >
                  Confirm & Produce Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
