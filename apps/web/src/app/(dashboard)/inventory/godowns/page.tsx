'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowLeftRight,
  Plus,
  Package,
  Boxes,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Warehouse,
  ChevronRight,
  X,
} from 'lucide-react';
import { useItems } from '@/services/itemService';
import toast from 'react-hot-toast';

interface Godown {
  id: string;
  name: string;
  location: string;
  contactPerson: string;
  phone: string;
  isDefault?: boolean;
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  date: string;
  fromGodown: string;
  toGodown: string;
  itemName: string;
  quantity: number;
  unit: string;
  notes?: string;
  createdAt: string;
}

export default function GodownsPage() {
  const { data: itemsResponse, isLoading: itemsLoading } = useItems({ limit: 200 });
  const items = itemsResponse?.data || [];

  const [godowns, setGodowns] = useState<Godown[]>([
    { id: 'g-1', name: 'Main Shop & Counter', location: 'Ground Floor, Main Road', contactPerson: 'Cashier Counter', phone: '9801234567', isDefault: true },
    { id: 'g-2', name: 'Central Warehouse', location: 'Building B, Industrial Zone', contactPerson: 'Warehouse Manager', phone: '9812345678' },
    { id: 'g-3', name: 'Godown 2 (Basement)', location: 'Basement Storage Area', contactPerson: 'Inventory In-Charge', phone: '9823456789' },
  ]);

  const [transfers, setTransfers] = useState<StockTransfer[]>([
    {
      id: 'st-1',
      transferNumber: 'TRF-1001',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      fromGodown: 'Central Warehouse',
      toGodown: 'Main Shop & Counter',
      itemName: 'Wireless Optical Mouse',
      quantity: 25,
      unit: 'Pcs',
      notes: 'Replenishing counter shelf stock',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'st-2',
      transferNumber: 'TRF-1002',
      date: new Date().toISOString().split('T')[0],
      fromGodown: 'Godown 2 (Basement)',
      toGodown: 'Main Shop & Counter',
      itemName: 'USB-C Fast Charging Cable',
      quantity: 50,
      unit: 'Pcs',
      notes: 'Daily counter refill',
      createdAt: new Date().toISOString(),
    },
  ]);

  // Modals state
  const [addGodownOpen, setAddGodownOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Form states
  const [newGodownName, setNewGodownName] = useState('');
  const [newGodownLocation, setNewGodownLocation] = useState('');
  const [newGodownPhone, setNewGodownPhone] = useState('');

  const [transferItem, setTransferItem] = useState('');
  const [transferFrom, setTransferFrom] = useState('Central Warehouse');
  const [transferTo, setTransferTo] = useState('Main Shop & Counter');
  const [transferQty, setTransferQty] = useState('1');
  const [transferNotes, setTransferNotes] = useState('');

  // Handle Add Godown
  const handleCreateGodown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGodownName.trim()) {
      toast.error('Please enter godown / warehouse name');
      return;
    }
    const created: Godown = {
      id: `g-${Date.now()}`,
      name: newGodownName,
      location: newGodownLocation || 'Primary Premises',
      contactPerson: 'Manager',
      phone: newGodownPhone || '',
    };
    setGodowns([...godowns, created]);
    setNewGodownName('');
    setNewGodownLocation('');
    setNewGodownPhone('');
    setAddGodownOpen(false);
    toast.success(`Godown "${created.name}" created successfully!`);
  };

  // Handle Record Stock Transfer
  const handleRecordTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItem) {
      toast.error('Please select an item to transfer');
      return;
    }
    if (transferFrom === transferTo) {
      toast.error('Source and destination godowns cannot be identical');
      return;
    }
    const qtyNum = parseFloat(transferQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error('Please enter a valid transfer quantity');
      return;
    }

    const selectedItemObj = items.find((i: any) => i.id === transferItem);
    const itemNameStr = selectedItemObj?.name || 'Selected Item';
    const itemUnitStr = selectedItemObj?.unit || 'Pcs';

    const newTransfer: StockTransfer = {
      id: `st-${Date.now()}`,
      transferNumber: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      fromGodown: transferFrom,
      toGodown: transferTo,
      itemName: itemNameStr,
      quantity: qtyNum,
      unit: itemUnitStr,
      notes: transferNotes,
      createdAt: new Date().toISOString(),
    };

    setTransfers([newTransfer, ...transfers]);
    setTransferModalOpen(false);
    setTransferQty('1');
    setTransferNotes('');
    toast.success(`Transferred ${qtyNum} ${itemUnitStr} of ${itemNameStr} from ${transferFrom} to ${transferTo}!`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Manage Godowns & Transfer Stock (गोदाम तथा स्टक स्थानान्तरण)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Track multi-warehouse inventory, godown storage capacities, and inter-godown transfer vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAddGodownOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Godown</span>
          </button>

          <button
            onClick={() => setTransferModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transfer Stock</span>
          </button>
        </div>
      </div>

      {/* Godowns Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {godowns.map((g) => (
          <div
            key={g.id}
            className={`p-5 rounded-2xl border transition-all ${
              g.isDefault
                ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-red-500/40 shadow-md'
                : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {g.name}
                    {g.isDefault && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-600 text-white">
                        Primary
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-zinc-400">{g.location}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
              <span>Contact: <strong className="text-white font-medium">{g.contactPerson}</strong></span>
              <span className="font-mono text-[11px]">{g.phone || 'N/A'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer History Table */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-red-400" />
              Stock Transfer Vouchers & Audit Log
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Recorded inter-godown stock movements.</p>
          </div>

          <div className="text-xs text-zinc-400">
            Total Transfers: <strong className="text-white font-mono">{transfers.length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">From Godown</th>
                <th className="py-2.5 px-3">To Godown</th>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">{t.date}</td>
                  <td className="py-3 px-3 font-mono font-bold text-white">{t.transferNumber}</td>
                  <td className="py-3 px-3 text-zinc-300 font-medium">{t.fromGodown}</td>
                  <td className="py-3 px-3 text-emerald-400 font-medium">→ {t.toGodown}</td>
                  <td className="py-3 px-3 font-bold text-white max-w-[180px] truncate">{t.itemName}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                    {t.quantity} {t.unit}
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

      {/* MODAL: ADD GODOWN */}
      {addGodownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-red-500" />
                Add New Godown / Warehouse
              </h3>
              <button
                onClick={() => setAddGodownOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGodown} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Godown Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Birgunj Regional Godown"
                  value={newGodownName}
                  onChange={(e) => setNewGodownName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Ward 4, Bypass Road"
                  value={newGodownLocation}
                  onChange={(e) => setNewGodownLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. 9801234567"
                  value={newGodownPhone}
                  onChange={(e) => setNewGodownPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddGodownOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25"
                >
                  Save Godown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK TRANSFER VOUCHER */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-red-500" />
                Record Stock Transfer (स्टक स्थानान्तरण)
              </h3>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordTransfer} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    From Godown (Source) <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    {godowns.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    To Godown (Destination) <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    {godowns.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Select Item to Transfer <span className="text-red-400">*</span>
                </label>
                <select
                  value={transferItem}
                  onChange={(e) => setTransferItem(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                  required
                >
                  <option value="">-- Choose Item from Stock --</option>
                  {items.map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Stock: {Number(i.currentStock)} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Transfer Quantity <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Transfer Note / Remark</label>
                <input
                  type="text"
                  placeholder="e.g. Counter shelf refilling"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25"
                >
                  Transfer Stock Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
