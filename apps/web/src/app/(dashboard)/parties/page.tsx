'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { partySchema, partySchema as createPartySchema, PartyInput, UpdatePartyInput } from '@bizmanage/validation';
import { PartyType } from '@bizmanage/types';
import {
  useParties,
  usePartiesSummary,
  useCreateParty,
  useUpdateParty,
  useDeleteParty,
} from '@/services/partyService';
import { formatPartyBalance } from '@/lib/balance';
import { usePartyCategories, useCreatePartyCategory } from '@/services/categoryService';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ModalPortal } from '@/components/common/ModalPortal';
import { AddCategoryModal } from '@/components/common/AddCategoryModal';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  Eye,
  Plus,
  Tag,
  Wallet,
  AlertTriangle,
} from 'lucide-react';

export default function PartiesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<PartyType | ''>('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<any | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [deletingPartyInfo, setDeletingPartyInfo] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  // Queries
  const { data: summary, isLoading: summaryLoading } = usePartiesSummary();
  const { data: categories } = usePartyCategories();
  const {
    data: partiesResponse,
    isLoading: partiesLoading,
    isError,
    refetch,
  } = useParties({
    search,
    categoryId: selectedCategory || undefined,
    type: selectedType || undefined,
  });

  // Mutations
  const createParty = useCreateParty();
  const updateParty = useUpdateParty();
  const deleteParty = useDeleteParty();

  // Error state for modals
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');

  // Create Form
  const createForm = useForm<PartyInput>({
    resolver: zodResolver(createPartySchema),
    defaultValues: {
      type: PartyType.CUSTOMER,
      openingBalance: 0,
      openingBalanceType: 'RECEIVABLE',
    },
  });

  // Edit Form
  const editForm = useForm<UpdatePartyInput>({
    resolver: zodResolver(partySchema.partial()),
  });

  const handleCreateSubmit = async (data: PartyInput) => {
    setCreateError('');
    try {
      await createParty.mutateAsync(data);
      setIsCreateOpen(false);
      createForm.reset();
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create party.');
    }
  };

  const handleEditSubmit = async (data: UpdatePartyInput) => {
    if (!editingParty) return;
    setEditError('');
    try {
      await updateParty.mutateAsync({ id: editingParty.id, data });
      setEditingParty(null);
    } catch (err: any) {
      setEditError(err.response?.data?.error?.message || 'Failed to update party.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeletingPartyInfo({ id, name });
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

  const parties = partiesResponse?.data || [];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Parties (Customers & Suppliers)</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage customer & supplier master directory, balances, and contact details.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          <UserPlus className="w-4 h-4" /> Add New Party
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Receivables</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalReceivable || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Amount to receive from customers</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Payables</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1">
              Rs. {summaryLoading ? '...' : (summary?.totalPayable || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Amount to pay to suppliers</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active Parties</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {summaryLoading ? '...' : summary?.totalParties || 0}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.customerCount || 0} Customers | {summary?.supplierCount || 0} Suppliers
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Users className="w-6 h-6" />
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
              placeholder="Search by party name, phone, email, or PAN..."
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

        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold w-full md:w-auto">
          <button
            onClick={() => setSelectedType('')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedType === '' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedType(PartyType.CUSTOMER)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedType === PartyType.CUSTOMER ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Customers
          </button>
          <button
            onClick={() => setSelectedType(PartyType.SUPPLIER)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedType === PartyType.SUPPLIER ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Suppliers
          </button>
          <button
            onClick={() => setSelectedType(PartyType.BOTH)}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
              selectedType === PartyType.BOTH ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Both
          </button>
        </div>
      </div>

      {/* Main Content / Table */}
      {partiesLoading ? (
        <LoadingState message="Loading party directory..." />
      ) : isError ? (
        <ErrorState title="Failed to load parties" onRetry={refetch} />
      ) : parties.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7 text-blue-400" />}
          title="No Parties Found"
          description="Get started by registering customer and supplier accounts to track sales, purchases, and outstanding balances."
          actionLabel="Add New Party"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="grid gap-4 md:hidden">
            {parties.map((party: any) => {
              const balInfo = formatPartyBalance(party.currentBalance, party.type);

              return (
                <div key={party.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-800/60 pb-3">
                    <div>
                      <Link href={`/parties/${party.id}`} className="font-bold text-blue-400 hover:text-blue-300 text-sm">
                        {party.name}
                      </Link>
                      {party.taxNumber && <p className="text-[11px] text-slate-500 font-mono mt-0.5">PAN: {party.taxNumber}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                      party.type === PartyType.CUSTOMER ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : party.type === PartyType.SUPPLIER ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {party.type}
                    </span>
                  </div>
                  
                  {/* Body */}
                  <div className="flex justify-between items-center">
                     <div className="space-y-1">
                       {party.phone && (
                         <p className="flex items-center gap-1.5 text-xs text-slate-300">
                           <Phone className="w-3 h-3 text-slate-500" /> {party.phone}
                         </p>
                       )}
                       {party.email && (
                         <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                           <Mail className="w-3 h-3 text-slate-500" /> {party.email}
                         </p>
                       )}
                       {!party.phone && !party.email && <span className="text-[11px] text-slate-600">No contact info</span>}
                     </div>
                     <div className="text-right">
                       <span className={`font-mono font-bold text-sm ${balInfo.colorClass}`}>
                         {balInfo.text}
                       </span>
                     </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex justify-end items-center gap-1.5 pt-1">
                    <Link href={`/parties/${party.id}`} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700">
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button onClick={() => openEditModal(party)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(party.id, party.name)} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20">
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
                  <th className="px-6 py-4">Party Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4 text-right">Current Balance</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-800/60">
              {parties.map((party: any) => {
                const balInfo = formatPartyBalance(party.currentBalance, party.type);

                return (
                  <tr key={party.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-white">
                      <Link
                        href={`/parties/${party.id}`}
                        className="hover:text-blue-400 transition-colors flex items-center gap-2"
                      >
                        {party.name}
                      </Link>
                      {party.taxNumber && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">PAN: {party.taxNumber}</p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          party.type === PartyType.CUSTOMER
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : party.type === PartyType.SUPPLIER
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {party.type}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-400">
                      {party.category ? (
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <Tag className="w-3 h-3 text-slate-500" />
                          {party.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-400 space-y-0.5">
                      {party.phone && (
                        <p className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500" /> {party.phone}
                        </p>
                      )}
                      {party.email && (
                        <p className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-500" /> {party.email}
                        </p>
                      )}
                      {!party.phone && !party.email && <span className="text-slate-600">-</span>}
                    </td>

                    <td className="px-6 py-4 text-right font-mono font-bold">
                      <span className={balInfo.colorClass}>
                        {balInfo.text}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-1.5">
                      <Link
                        href={`/parties/${party.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 inline-block"
                        title="View Ledger Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => openEditModal(party)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Edit Party"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(party.id, party.name)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                        title="Delete Party"
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

      {/* CREATE PARTY MODAL */}
      {isCreateOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" /> Add New Party
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Register a customer, supplier, or vendor partner.</p>
            </div>

            <form onSubmit={createForm.handleSubmit(handleCreateSubmit, () => setCreateError('Please resolve highlighted form errors.'))} className="space-y-4">
              {(createError || Object.keys(createForm.formState.errors).length > 0) && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{createError || 'Please correct the invalid inputs highlighted below.'}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Party / Business Name *</label>
                <input
                  type="text"
                  {...createForm.register('name')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Kathmandu Traders"
                />
                {createForm.formState.errors.name && (
                  <p className="text-xs text-red-400 mt-1">{createForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Party Type</label>
                  <select
                    {...createForm.register('type')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={PartyType.CUSTOMER}>Customer</option>
                    <option value={PartyType.SUPPLIER}>Supplier</option>
                    <option value={PartyType.BOTH}>Both (Customer & Supplier)</option>
                  </select>
                </div>

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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    {...createForm.register('phone')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="+977 9800000000"
                  />
                  {createForm.formState.errors.phone && (
                    <p className="text-xs text-red-400 mt-1">{createForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PAN / VAT Number</label>
                  <input
                    type="text"
                    {...createForm.register('taxNumber')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. 609283746"
                  />
                  {createForm.formState.errors.taxNumber && (
                    <p className="text-xs text-red-400 mt-1">{createForm.formState.errors.taxNumber.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  {...createForm.register('email')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="party@email.com"
                />
                {createForm.formState.errors.email && (
                  <p className="text-xs text-red-400 mt-1">{createForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  {...createForm.register('address')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Street, City"
                />
                {createForm.formState.errors.address && (
                  <p className="text-xs text-red-400 mt-1">{createForm.formState.errors.address.message}</p>
                )}
              </div>

              {/* Opening Balance */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
                <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-blue-400" /> Opening Balance
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Amount (Rs.)</label>
                    <input
                      type="number"
                      step="any"
                      {...createForm.register('openingBalance', { valueAsNumber: true })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Balance Type</label>
                    <select
                      {...createForm.register('openingBalanceType')}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="RECEIVABLE">To Receive (Debit)</option>
                      <option value="PAYABLE">To Give (Credit)</option>
                    </select>
                  </div>
                </div>
              </div>

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
                  disabled={createParty.isPending}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {createParty.isPending ? 'Saving...' : 'Create Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* EDIT PARTY MODAL */}
      {editingParty && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" /> Edit Party Profile
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Update party contact information and classification.</p>
            </div>

            <form onSubmit={editForm.handleSubmit(handleEditSubmit, () => setEditError('Please resolve highlighted form errors.'))} className="space-y-4">
              {(editError || Object.keys(editForm.formState.errors).length > 0) && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{editError || 'Please correct the invalid inputs highlighted below.'}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Party / Business Name *</label>
                <input
                  type="text"
                  {...editForm.register('name')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {editForm.formState.errors.name && (
                  <p className="text-xs text-red-400 mt-1">{editForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Party Type</label>
                  <select
                    {...editForm.register('type')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={PartyType.CUSTOMER}>Customer</option>
                    <option value={PartyType.SUPPLIER}>Supplier</option>
                    <option value={PartyType.BOTH}>Both (Customer & Supplier)</option>
                  </select>
                </div>

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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    {...editForm.register('phone')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {editForm.formState.errors.phone && (
                    <p className="text-xs text-red-400 mt-1">{editForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PAN / VAT Number</label>
                  <input
                    type="text"
                    {...editForm.register('taxNumber')}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {editForm.formState.errors.taxNumber && (
                    <p className="text-xs text-red-400 mt-1">{editForm.formState.errors.taxNumber.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  {...editForm.register('email')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {editForm.formState.errors.email && (
                  <p className="text-xs text-red-400 mt-1">{editForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  {...editForm.register('address')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {editForm.formState.errors.address && (
                  <p className="text-xs text-red-400 mt-1">{editForm.formState.errors.address.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingParty(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateParty.isPending}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {updateParty.isPending ? 'Saving...' : 'Save Changes'}
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
        type="party"
        onCategoryCreated={(cat) => {
          createForm.setValue('categoryId', cat.id);
          if (editingParty) editForm.setValue('categoryId', cat.id);
        }}
      />

      <ConfirmActionModal
        isOpen={!!deletingPartyInfo}
        onClose={() => { setDeletingPartyInfo(null); setDeleteError(''); }}
        title="Delete Party"
        itemName={deletingPartyInfo?.name}
        actionText="Delete Party"
        error={deleteError}
        isProcessing={deleteParty.isPending}
        onConfirm={async () => {
          if (!deletingPartyInfo) return;
          setDeleteError('');
          try {
            await deleteParty.mutateAsync(deletingPartyInfo.id);
            setDeletingPartyInfo(null);
          } catch (err: any) {
            setDeleteError(err.response?.data?.error?.message || 'Failed to delete party.');
          }
        }}
      />
    </div>
  );
}
