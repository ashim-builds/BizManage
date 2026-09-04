'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLongPress } from '@/hooks/useLongPress';
import { LongPressActionSheet } from '@/components/ui/LongPressActionSheet';
import { partySchema, UpdatePartyInput } from '@bizmanage/validation';
import { PartyType } from '@bizmanage/types';
import {
  useParties,
  usePartiesSummary,
  useParty,
  useUpdateParty,
  useDeleteParty,
} from '@/services/partyService';
import { usePartyCategories } from '@/services/categoryService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { AddCategoryModal } from '@/components/common/AddCategoryModal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { WhatsAppShareModal } from '@/components/common/WhatsAppShareModal';
import { ExportConfirmModal } from '@/components/common/ExportConfirmModal';
import { ImportPartiesModal } from '@/components/common/ImportPartiesModal';
import { DiscardConfirmModal } from '@/components/common/DiscardConfirmModal';
import { SaveConfirmModal } from '@/components/common/SaveConfirmModal';
import { downloadCsv, downloadJson } from '@/lib/exportUtils';
import { useCurrentBusiness } from '@/services/businessService';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Printer,
  MessageSquare,
  Receipt,
  X,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';

export default function PartiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<PartyType | ''>('');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  // Debounce search input to avoid typing interruption and losing focus
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Modals
  const [editingParty, setEditingParty] = useState<any | null>(null);
  const [isEditSaveConfirmOpen, setIsEditSaveConfirmOpen] = useState(false);
  const [pendingPartyEditData, setPendingPartyEditData] = useState<UpdatePartyInput | null>(null);
  const [deletingPartyInfo, setDeletingPartyInfo] = useState<{ id: string; name: string } | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [isImportPartiesOpen, setIsImportPartiesOpen] = useState(false);
  const [exportModalConfig, setExportModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    recordCount: number;
    onConfirm: (format: 'csv' | 'json') => void;
  } | null>(null);
  const [longPressParty, setLongPressParty] = useState<any | null>(null);

  // Discard changes confirmation modal state
  const [discardModalConfig, setDiscardModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    onConfirm: () => void;
  } | null>(null);

  const promptDiscardConfirmation = (onConfirm: () => void, title?: string, message?: string) => {
    setDiscardModalConfig({
      isOpen: true,
      title: title || 'Discard unsaved changes?',
      message: message || 'Are you sure you want to close? Any information you have entered will not be saved.',
      onConfirm,
    });
  };

  const { data: business } = useCurrentBusiness();
  const { data: summary } = usePartiesSummary();
  const { data: categories } = usePartyCategories();

  const {
    data: partiesResponse,
    isLoading: partiesLoading,
    isError,
    refetch,
  } = useParties({
    search: debouncedSearch,
    categoryId: selectedCategory || undefined,
    type: selectedType || undefined,
  });

  const parties: any[] = partiesResponse?.data || [];

  // Auto-select first party if none selected
  useEffect(() => {
    if (parties.length > 0) {
      if (!selectedPartyId || !parties.some((p) => p.id === selectedPartyId)) {
        setSelectedPartyId(parties[0].id);
      }
    }
  }, [parties, selectedPartyId]);

  // Selected party from list
  const activePartyInList = parties.find((p) => p.id === selectedPartyId) || parties[0] || null;

  // Selected party full details & ledger
  const {
    data: partyDetails,
    refetch: refetchDetails,
  } = useParty(activePartyInList?.id || '');

  // Mutations
  const updateParty = useUpdateParty();
  const deleteParty = useDeleteParty();

  // Edit Form
  const editForm = useForm<UpdatePartyInput>({
    resolver: zodResolver(partySchema.partial()),
  });

  const handleEditSaveRequest = (data: UpdatePartyInput) => {
    setPendingPartyEditData(data);
    setIsEditSaveConfirmOpen(true);
  };

  const handleConfirmEditSave = () => {
    setIsEditSaveConfirmOpen(false);
    if (pendingPartyEditData) {
      handleEditSubmit(pendingPartyEditData);
    }
  };

  const handleEditSubmit = async (data: UpdatePartyInput) => {
    if (!editingParty) return;
    setEditError('');
    try {
      await updateParty.mutateAsync({ id: editingParty.id, data });
      toast.success(`Party "${data.name || editingParty.name}" updated successfully!`);
      setEditingParty(null);
      refetch();
      refetchDetails();
    } catch (err: any) {
      setEditError(err.response?.data?.error?.message || 'Failed to update party.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPartyInfo) return;
    try {
      await deleteParty.mutateAsync(deletingPartyInfo.id);
      toast.success(`Party "${deletingPartyInfo.name}" deleted.`);
      setDeletingPartyInfo(null);
      setSelectedPartyId(null);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete party.');
    }
  };

  const openEditModal = (party: any) => {
    setEditingParty(party);
    editForm.reset({
      name: party.name,
      type: party.type,
      categoryId: party.categoryId || '',
      phone: party.phone || '',
      email: party.email || '',
      address: party.address || '',
      taxNumber: party.taxNumber || '',
    });
  };

  // Compile transactions for active party
  const transactions = useMemo(() => {
    if (!partyDetails) return [];

    const list: any[] = [];

    // Sales
    (partyDetails.sales || []).forEach((s: any) => {
      list.push({
        id: s.id,
        type: 'Sale Invoice',
        number: s.invoiceNumber,
        date: s.date,
        total: Number(s.totalAmount),
        balance: s.status,
        flow: 'out', // Goods sent out / receivable
      });
    });

    // Purchases
    (partyDetails.purchases || []).forEach((p: any) => {
      list.push({
        id: p.id,
        type: 'Purchase Bill',
        number: p.billNumber,
        date: p.date,
        total: Number(p.totalAmount),
        balance: p.status,
        flow: 'in', // Goods received in / payable
      });
    });

    // Payments In
    (partyDetails.paymentsIn || []).forEach((pay: any) => {
      list.push({
        id: pay.id,
        type: 'Payment In',
        number: pay.referenceNumber || 'PAY-IN',
        date: pay.date,
        total: Number(pay.amount),
        balance: 'Received',
        flow: 'in', // Money received
      });
    });

    // Payments Out
    (partyDetails.paymentsOut || []).forEach((pay: any) => {
      list.push({
        id: pay.id,
        type: 'Payment Out',
        number: pay.referenceNumber || 'PAY-OUT',
        date: pay.date,
        total: Number(pay.amount),
        balance: 'Paid',
        flow: 'out', // Money paid
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [partyDetails]);

  const currentBal = Number(activePartyInList?.currentBalance || 0);

  const totalDebit = transactions
    .filter((t) => t.flow === 'in')
    .reduce((acc, t) => acc + t.total, 0);

  const totalCredit = transactions
    .filter((t) => t.flow === 'out')
    .reduce((acc, t) => acc + t.total, 0);

  // Export All Parties
  const handleTriggerExportParties = () => {
    if (parties.length === 0) {
      toast.error('No parties to export.');
      return;
    }
    setExportModalConfig({
      isOpen: true,
      title: 'Parties Directory',
      description: 'Export all customer and supplier records with contact details and balances.',
      recordCount: parties.length,
      onConfirm: (format) => {
        const dateStr = new Date().toISOString().split('T')[0];
        if (format === 'csv') {
          const headers = [
            'Party Name',
            'Type',
            'Phone',
            'Email',
            'Address',
            'PAN / VAT Number',
            'Opening Balance',
            'Current Balance',
            'Category',
          ];
          const rows = parties.map((p) => [
            p.name,
            p.type,
            p.phone || '',
            p.email || '',
            p.address || '',
            p.taxNumber || '',
            p.openingBalance || 0,
            p.currentBalance || 0,
            p.category?.name || 'Uncategorized',
          ]);
          downloadCsv(`bizmanage_parties_${dateStr}.csv`, headers, rows);
        } else {
          downloadJson(`bizmanage_parties_${dateStr}.json`, parties);
        }
        toast.success(`Exported ${parties.length} parties to ${format.toUpperCase()}!`);
      },
    });
  };

  // Export Active Party Ledger
  const handleTriggerExportLedger = () => {
    if (transactions.length === 0) {
      toast.error('No transactions to export for this party.');
      return;
    }
    const partyName = activePartyInList?.name || 'Party';
    setExportModalConfig({
      isOpen: true,
      title: `Party Ledger - ${partyName}`,
      description: `Export statement of transactions and payments for ${partyName}.`,
      recordCount: transactions.length,
      onConfirm: (format) => {
        const dateStr = new Date().toISOString().split('T')[0];
        const safeName = partyName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        if (format === 'csv') {
          const headers = [
            'Type',
            'Reference / Invoice #',
            'Date',
            'Debit (In)',
            'Credit (Out)',
            'Total Amount',
            'Status / Note',
          ];
          const rows = transactions.map((t) => [
            t.type,
            t.number,
            t.date ? new Date(t.date).toLocaleDateString() : '-',
            t.flow === 'in' ? t.total : 0,
            t.flow === 'out' ? t.total : 0,
            t.total,
            t.balance,
          ]);
          downloadCsv(`ledger_${safeName}_${dateStr}.csv`, headers, rows);
        } else {
          downloadJson(`ledger_${safeName}_${dateStr}.json`, {
            party: activePartyInList,
            transactions,
          });
        }
        toast.success(`Exported ${transactions.length} ledger transactions to ${format.toUpperCase()}!`);
      },
    });
  };

  // Initial full page loading (only when no data is in memory yet)
  if (partiesLoading && !partiesResponse) {
    return <LoadingState message="Loading party directory..." />;
  }

  if (isError && !partiesResponse) {
    return <ErrorState title="Failed to load parties" onRetry={refetch} />;
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. ON-SCREEN UI (Hidden during print) */}
      {/* ========================================================================= */}
      <div className="space-y-3 font-sans pb-4 print:hidden">
        {/* Top Header & Summary Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Parties Directory</h1>
            {/* Quick Receivables / Payables Stats */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold">
                To Receive: <strong className="font-mono">Rs. {(summary?.totalReceivable || 0).toLocaleString()}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold">
                To Pay: <strong className="font-mono">Rs. {(summary?.totalPayable || 0).toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportPartiesOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Import Parties from Excel, CSV, or JSON"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerExportParties}
              className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Export Parties to Excel, CSV, or JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            <Link
              href="/parties/new"
              className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Party
            </Link>
          </div>
        </div>

        {/* Master-Detail Split Container with Independent Smooth Scrolling */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row overflow-hidden h-[calc(100vh-140px)] max-h-[calc(100vh-140px)]">
          {/* LEFT PANE: Parties Directory & Filters */}
          <div className={`w-full md:w-80 lg:w-88 shrink-0 border-r border-slate-200 flex flex-col bg-white h-full overflow-hidden ${showMobileDetails ? 'hidden md:flex' : 'flex'}`}>
            {/* Search Input */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search Party Name, phone, PAN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Type & Category Filter Strip */}
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/50">
              {/* Type Pills */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-200/70 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedType('')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    selectedType === '' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType(PartyType.CUSTOMER)}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    selectedType === PartyType.CUSTOMER ? 'bg-blue-600 text-white shadow-2xs font-black' : 'text-slate-600'
                  }`}
                >
                  Customers
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType(PartyType.SUPPLIER)}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    selectedType === PartyType.SUPPLIER ? 'bg-blue-600 text-white shadow-2xs font-black' : 'text-slate-600'
                  }`}
                >
                  Suppliers
                </button>
              </div>

              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-2 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">Categories</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Header: Party Name & Amount */}
            <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600 select-none">
              <div className="flex items-center gap-1.5">
                <span>Party Name</span>
                <Filter className="w-3 h-3 text-red-500 fill-red-500" />
              </div>
              <span>Amount / Balance</span>
            </div>

            {/* Party List Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {parties.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-xs text-slate-400">No parties found.</p>
                  <Link
                    href="/parties/new"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Party
                  </Link>
                </div>
              ) : (
                parties.map((party) => (
                  <PartyRowItem
                    key={party.id}
                    party={party}
                    isSelected={activePartyInList?.id === party.id}
                    onSelect={() => {
                      setSelectedPartyId(party.id);
                      setShowMobileDetails(true);
                    }}
                    onLongPress={() => setLongPressParty(party)}
                  />
                ))
              )}
            </div>
          </div>

          {/* RIGHT PANE: Selected Party Details & Transactions */}
          <div className={`flex-1 flex flex-col bg-white overflow-hidden h-full ${showMobileDetails ? 'flex' : 'hidden md:flex'}`}>
            {activePartyInList ? (
              <>
                {/* Mobile Back Button */}
                <div className="md:hidden px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowMobileDetails(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                    <span>Back to Directory</span>
                  </button>
                  <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">
                    {activePartyInList.name}
                  </span>
                </div>

                {/* Header: Party Name, In/Out Balance Block & WhatsApp */}
                <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white">
                  {/* Left: Party Details */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {activePartyInList.name}
                      </h2>
                      <button
                        type="button"
                        onClick={() => openEditModal(activePartyInList)}
                        className="p-1 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Edit Party Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPartyInfo({ id: activePartyInList.id, name: activePartyInList.name })}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                        title="Delete Party"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      {activePartyInList.phone ? (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" /> {activePartyInList.phone}
                        </span>
                      ) : (
                        <span>No phone</span>
                      )}
                      {activePartyInList.taxNumber && (
                        <span className="font-mono">PAN: {activePartyInList.taxNumber}</span>
                      )}
                      {activePartyInList.category && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                          {activePartyInList.category.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Party Balance Block & WhatsApp Button */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Net Party Balance
                      </span>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span
                          className={`text-base font-black font-mono ${
                            currentBal > 0
                              ? 'text-emerald-600'
                              : currentBal < 0
                              ? 'text-rose-600'
                              : 'text-slate-700'
                          }`}
                        >
                          Rs. {Math.abs(currentBal).toLocaleString()}
                        </span>

                        {/* In vs Out Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            currentBal > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : currentBal < 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {currentBal > 0 ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> In (To Receive)
                            </>
                          ) : currentBal < 0 ? (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-rose-600" /> Out (To Pay)
                            </>
                          ) : (
                            'Settled'
                          )}
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp Action */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!activePartyInList.phone) {
                          toast.error('Please add a phone number for this party first.');
                          openEditModal(activePartyInList);
                        } else {
                          setIsWhatsAppOpen(true);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Send WhatsApp Statement / Reminder"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Transactions Bar (Print & Export) */}
                <div className="px-6 py-2.5 border-b border-slate-100 flex items-center justify-between bg-white">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Transactions</h3>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerExportLedger}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Export Statement / Ledger"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Export</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Print Official Statement / Ledger"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Transactions Table / Empty State */}
                <div className="flex-1 overflow-auto flex flex-col bg-white">
                  {transactions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto">
                      <div className="w-20 h-20 rounded-full bg-blue-50/80 border border-blue-100 flex items-center justify-center mb-3 shadow-2xs">
                        <Receipt className="w-9 h-9 text-blue-400 stroke-[1.5]" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No Transactions to show</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        You haven't added any transactions yet.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                      <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 select-none">
                        <tr>
                          <th className="px-4 py-2.5 border-r border-slate-200 min-w-[140px]">
                            <div className="flex items-center gap-1">
                              <span>TYPE</span>
                              <Filter className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 border-r border-slate-200 w-[120px]">
                            <div className="flex items-center gap-1">
                              <span>NUMBER</span>
                              <Filter className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 border-r border-slate-200 w-[110px]">
                            <div className="flex items-center gap-1">
                              <span>DATE</span>
                              <Filter className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 border-r border-slate-200 w-[100px] text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span>STATUS</span>
                              <Filter className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 w-[130px] text-right">
                            TOTAL
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {transactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-2.5 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.flow === 'in' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {tx.type}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                              {tx.number}
                            </td>
                            <td className="px-4 py-2.5 border-r border-slate-200 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {tx.date ? new Date(tx.date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-2.5 border-r border-slate-200 text-center whitespace-nowrap">
                              {tx.balance === 'PAID' || tx.balance === 'Paid' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 inline-block">Paid</span>
                              ) : tx.balance === 'UNPAID' || tx.balance === 'Unpaid' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 inline-block">Unpaid</span>
                              ) : tx.balance === 'PARTIAL' || tx.balance === 'Partial' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 inline-block">Partial</span>
                              ) : tx.balance === 'Received' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 inline-block">Received</span>
                              ) : tx.balance === 'Paid' || tx.balance === 'Paid Out' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300 inline-block">Paid</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-block">{tx.balance || '-'}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              Rs. {Number(tx.total || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <h3 className="text-sm font-bold text-slate-800">No Party Selected</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select a party from the left directory or add a new party.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Party Modal */}
        {editingParty && (
          <ModalPortal>
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[120] flex items-center justify-center p-4 font-sans"
              onClick={() => promptDiscardConfirmation(() => setEditingParty(null), 'Discard party edits?', 'Are you sure you want to exit without saving party details?')}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900">Edit Party Details</h3>
                  <button
                    type="button"
                    onClick={() => promptDiscardConfirmation(() => setEditingParty(null), 'Discard party edits?', 'Are you sure you want to exit without saving party details?')}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {editError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {editError}
                  </div>
                )}

                <form onSubmit={editForm.handleSubmit(handleEditSaveRequest)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Party Name *</label>
                    <input
                      type="text"
                      {...editForm.register('name')}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        {...editForm.register('phone')}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">PAN / VAT</label>
                      <input
                        type="text"
                        {...editForm.register('taxNumber')}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        {...editForm.register('email')}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">Category</label>
                        <button
                          type="button"
                          onClick={() => setIsAddCategoryOpen(true)}
                          className="text-[10px] text-blue-600 font-bold hover:underline"
                        >
                          + New
                        </button>
                      </div>
                      <select
                        {...editForm.register('categoryId')}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none cursor-pointer"
                      >
                        <option value="">No Category</option>
                        {categories?.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                    <textarea
                      rows={2}
                      {...editForm.register('address')}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => promptDiscardConfirmation(() => setEditingParty(null), 'Discard party edits?', 'Are you sure you want to exit without saving party details?')}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateParty.isPending}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {updateParty.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* Category Add Modal */}
        <AddCategoryModal
          isOpen={isAddCategoryOpen}
          onClose={() => setIsAddCategoryOpen(false)}
          type="party"
          onCategoryCreated={(cat) => {
            if (editingParty) editForm.setValue('categoryId', cat.id);
          }}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmActionModal
          isOpen={!!deletingPartyInfo}
          onClose={() => setDeletingPartyInfo(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Party"
          itemName={deletingPartyInfo?.name}
          actionText="Delete Party"
          isProcessing={deleteParty.isPending}
        />

        {/* WhatsApp Share Reminder Modal */}
        {activePartyInList && (
          <WhatsAppShareModal
            isOpen={isWhatsAppOpen}
            onClose={() => setIsWhatsAppOpen(false)}
            phoneNumber={activePartyInList.phone}
            recipientName={activePartyInList.name}
            balance={Number(activePartyInList.currentBalance || 0)}
            businessName={business?.name || 'Our Business'}
            businessPhone={business?.phone}
            title="WhatsApp Statement & Reminder"
          />
        )}

        {/* Import Parties Modal (Supports Excel, CSV, and JSON) */}
        <ImportPartiesModal
          isOpen={isImportPartiesOpen}
          onClose={() => promptDiscardConfirmation(() => setIsImportPartiesOpen(false), 'Close import wizard?', 'Are you sure you want to cancel the party import process?')}
          existingParties={parties}
          onSuccess={() => {
            refetch();
            toast.success('Parties imported successfully!');
          }}
        />

        {/* Export Confirmation Modal */}
        {exportModalConfig && (
          <ExportConfirmModal
            isOpen={exportModalConfig.isOpen}
            onClose={() => setExportModalConfig(null)}
            title={exportModalConfig.title}
            description={exportModalConfig.description}
            recordCount={exportModalConfig.recordCount}
            onConfirm={exportModalConfig.onConfirm}
          />
        )}

        {/* Discard Confirmation Modal */}
        {discardModalConfig && (
          <DiscardConfirmModal
            isOpen={discardModalConfig.isOpen}
            onClose={() => setDiscardModalConfig(null)}
            onConfirm={() => {
              const cb = discardModalConfig.onConfirm;
              setDiscardModalConfig(null);
              cb();
            }}
            title={discardModalConfig.title}
            message={discardModalConfig.message}
          />
        )}

        {/* Save Confirmation Modal */}
        {isEditSaveConfirmOpen && (
          <SaveConfirmModal
            isOpen={isEditSaveConfirmOpen}
            onClose={() => setIsEditSaveConfirmOpen(false)}
            onConfirm={handleConfirmEditSave}
            isLoading={updateParty.isPending}
            title="Save Changes to Party?"
            message={`Are you sure you want to save changes for "${pendingPartyEditData?.name || editingParty?.name || 'this party'}"?`}
            confirmText="Yes, Save Changes"
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. FORMAL A4 PRINTABLE STATEMENT / LEDGER (Visible ONLY during print) */}
      {/* ========================================================================= */}
      {activePartyInList && (
        <div className="hidden print:block w-full text-black font-sans bg-white" style={{ padding: '12mm 15mm' }}>
          {/* Letterhead Header */}
          <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider">{business?.name || 'BizManage ERP'}</h1>
              {business?.address && <p className="text-xs text-gray-700 mt-0.5">{business.address}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-700 mt-0.5">
                {business?.phone && <span>Phone: {business.phone}</span>}
                {business?.taxNumber && <span className="font-mono font-bold">PAN / VAT: {business.taxNumber}</span>}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-400 font-black text-xs uppercase tracking-wider rounded">
                Party Statement / Ledger
              </span>
              <p className="text-[11px] text-gray-600 mt-1">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Party Details & Account Summary */}
          <div className="grid grid-cols-2 gap-4 p-3.5 bg-gray-50 border border-gray-300 rounded-lg mb-4 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-black block mb-0.5">Party Information:</span>
              <h2 className="text-sm font-black text-black">{activePartyInList.name}</h2>
              {activePartyInList.phone && <p className="text-gray-700 mt-0.5">Contact: {activePartyInList.phone}</p>}
              {activePartyInList.taxNumber && <p className="text-gray-700 font-mono mt-0.5">PAN / VAT: {activePartyInList.taxNumber}</p>}
              {activePartyInList.address && <p className="text-gray-700 mt-0.5">Address: {activePartyInList.address}</p>}
            </div>

            <div className="text-right space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-black block">Account Position:</span>
              <p className="text-xs">
                Opening Balance: <strong className="font-mono">Rs. {Number(activePartyInList.openingBalance || 0).toLocaleString()}</strong>
              </p>
              <p className="text-sm font-black mt-1">
                Net Closing Balance:{' '}
                <span className="font-mono underline">
                  Rs. {Math.abs(currentBal).toLocaleString()}{' '}
                  {currentBal > 0 ? '(Receivable / लिन बाँकी)' : currentBal < 0 ? '(Payable / दिन बाँकी)' : '(Settled)'}
                </span>
              </p>
            </div>
          </div>

          {/* Ledger Statement Table */}
          <table className="w-full border-collapse border border-gray-400 text-xs mb-6">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-400 font-bold text-gray-800">
                <th className="border border-gray-400 p-2 text-center w-10">SN</th>
                <th className="border border-gray-400 p-2 text-left">Date</th>
                <th className="border border-gray-400 p-2 text-left">Particulars / Type</th>
                <th className="border border-gray-400 p-2 text-left">Voucher #</th>
                <th className="border border-gray-400 p-2 text-right">Debit (Rs.)</th>
                <th className="border border-gray-400 p-2 text-right">Credit (Rs.)</th>
                <th className="border border-gray-400 p-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-400 p-6 text-center text-gray-500">
                    No transactions recorded for this party.
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => (
                  <tr key={tx.id} className="border-b border-gray-300">
                    <td className="border border-gray-400 p-2 text-center">{idx + 1}</td>
                    <td className="border border-gray-400 p-2">{tx.date ? new Date(tx.date).toLocaleDateString() : '-'}</td>
                    <td className="border border-gray-400 p-2 font-semibold">{tx.type}</td>
                    <td className="border border-gray-400 p-2 font-mono">{tx.number}</td>
                    <td className="border border-gray-400 p-2 text-right font-mono font-semibold">
                      {tx.flow === 'in' ? `Rs. ${tx.total.toLocaleString()}` : '-'}
                    </td>
                    <td className="border border-gray-400 p-2 text-right font-mono font-semibold">
                      {tx.flow === 'out' ? `Rs. ${tx.total.toLocaleString()}` : '-'}
                    </td>
                    <td className="border border-gray-400 p-2 text-right">{tx.balance}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-500">
                <td colSpan={4} className="border border-gray-400 p-2 text-right uppercase">Total:</td>
                <td className="border border-gray-400 p-2 text-right font-mono">
                  Rs. {totalDebit.toLocaleString()}
                </td>
                <td className="border border-gray-400 p-2 text-right font-mono">
                  Rs. {totalCredit.toLocaleString()}
                </td>
                <td className="border border-gray-400 p-2 text-right font-mono">
                  Rs. {Math.abs(currentBal).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="flex justify-end items-end pt-14 border-t border-gray-300 text-xs">
            <div className="text-center w-52 border-t border-black pt-1.5">
              <p className="font-bold text-xs uppercase tracking-wider">Authorized Signatory</p>
            </div>
          </div>
        </div>
      )}
      {/* Long-Press Action Sheet (Mobile) */}
      <LongPressActionSheet
        open={!!longPressParty}
        onClose={() => setLongPressParty(null)}
        title={longPressParty?.name || 'Party'}
        subtitle={longPressParty ? `${longPressParty.type} · ${longPressParty.phone || 'No phone'}` : ''}
        actions={[
          {
            label: 'View Statement & Details',
            icon: <Receipt className="w-5 h-5" />,
            onClick: () => {
              if (longPressParty) {
                setSelectedPartyId(longPressParty.id);
                setShowMobileDetails(true);
              }
              setLongPressParty(null);
            },
          },
          {
            label: 'Edit Party',
            icon: <Edit2 className="w-5 h-5" />,
            onClick: () => {
              if (longPressParty) {
                setEditingParty(longPressParty);
              }
              setLongPressParty(null);
            },
          },
          ...(longPressParty?.phone
            ? [
                {
                  label: 'Send WhatsApp Reminder',
                  icon: <MessageSquare className="w-5 h-5 text-emerald-500" />,
                  onClick: () => {
                    if (longPressParty) {
                      setSelectedPartyId(longPressParty.id);
                      setIsWhatsAppOpen(true);
                    }
                    setLongPressParty(null);
                  },
                },
              ]
            : []),
          {
            label: 'Delete Party',
            icon: <Trash2 className="w-5 h-5" />,
            onClick: () => {
              if (longPressParty) {
                setDeletingPartyInfo({ id: longPressParty.id, name: longPressParty.name });
              }
              setLongPressParty(null);
            },
            variant: 'danger' as const,
          },
        ]}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Party Row Item with Long-Press
// ---------------------------------------------------------------------------

interface PartyRowItemProps {
  party: any;
  isSelected: boolean;
  onSelect: () => void;
  onLongPress: () => void;
}

function PartyRowItem({ party, isSelected, onSelect, onLongPress }: PartyRowItemProps) {
  const longPressHandlers = useLongPress(onLongPress, { delay: 600 });
  const rawBalance = Number(party.currentBalance || 0);

  return (
    <div
      {...longPressHandlers}
      onClick={onSelect}
      className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors select-none active:scale-[0.99] ${
        isSelected
          ? 'bg-sky-50/90 text-blue-900 font-bold border-l-4 border-blue-600'
          : 'hover:bg-slate-50/80 text-slate-800'
      }`}
    >
      <div className="min-w-0 pr-2">
        <span className="text-xs truncate block font-medium">
          {party.name}
        </span>
        {party.phone && (
          <span className="text-[10px] text-slate-400 font-mono block">
            {party.phone}
          </span>
        )}
      </div>

      <div className="text-right shrink-0 flex items-center gap-1.5">
        <span
          className={`text-xs font-mono font-bold ${
            rawBalance > 0
              ? 'text-emerald-600'
              : rawBalance < 0
              ? 'text-rose-600'
              : 'text-slate-500'
          }`}
        >
          {Math.abs(rawBalance).toFixed(2)}
        </span>

        {rawBalance > 0 ? (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300/80 uppercase">
            In
          </span>
        ) : rawBalance < 0 ? (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-300/80 uppercase">
            Out
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500">
            -
          </span>
        )}
      </div>
    </div>
  );
}

