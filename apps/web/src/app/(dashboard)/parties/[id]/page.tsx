'use client';

import { useState } from 'react';
import { useParty } from '@/services/partyService';
import { useCurrentBusiness } from '@/services/businessService';
import { formatPartyBalance } from '@/lib/balance';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  ArrowLeft,
  Tag,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { PartyType } from '@bizmanage/types';

export default function PartyDetailsPage({ params }: { params: { id: string } }) {
  const { data: party, isLoading, isError, refetch } = useParty(params.id);
  const { data: business } = useCurrentBusiness();

  if (isLoading) return <LoadingState message="Loading party statement & details..." />;
  if (isError || !party) return <ErrorState title="Failed to load party profile" onRetry={refetch} />;

  const currentBal = Number(party.currentBalance || 0);
  const openingBal = Number(party.openingBalance || 0);
  const balInfo = formatPartyBalance(party.currentBalance, party.type);
  const openingBalInfo = formatPartyBalance(party.openingBalance, party.type);

  // Combine transactions for chronological ledger
  const salesTx = (party.sales || []).map((s: any) => ({
    id: s.id,
    type: 'SALE INVOICE',
    reference: s.invoiceNumber,
    date: s.date,
    amount: Number(s.totalAmount),
    status: s.status,
    rawDate: new Date(s.date).getTime(),
  }));

  const purchaseTx = (party.purchases || []).map((p: any) => ({
    id: p.id,
    type: 'PURCHASE BILL',
    reference: p.billNumber,
    date: p.date,
    amount: Number(p.totalAmount),
    status: p.status,
    rawDate: new Date(p.date).getTime(),
  }));

  const paymentInTx = (party.paymentsIn || []).map((pay: any) => ({
    id: pay.id,
    type: 'PAYMENT IN',
    reference: pay.referenceNumber || 'Payment Received',
    date: pay.date,
    amount: Number(pay.amount),
    status: 'PAID',
    rawDate: new Date(pay.date).getTime(),
  }));

  const paymentOutTx = (party.paymentsOut || []).map((pay: any) => ({
    id: pay.id,
    type: 'PAYMENT OUT',
    reference: pay.referenceNumber || 'Payment Made',
    date: pay.date,
    amount: Number(pay.amount),
    status: 'PAID',
    rawDate: new Date(pay.date).getTime(),
  }));

  const allTransactions = [...salesTx, ...purchaseTx, ...paymentInTx, ...paymentOutTx].sort(
    (a, b) => b.rawDate - a.rawDate
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4">
      {/* Top Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/parties"
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{party.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  party.type === PartyType.CUSTOMER
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : party.type === PartyType.SUPPLIER
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {party.type}
              </span>
            </div>
            {party.category && (
              <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" /> {party.category.name}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Grid: Left Contact Info / Right Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Contact Info Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Party Information
          </h3>

          <div className="space-y-3 text-xs text-slate-700">
            {party.phone && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                  <p className="font-bold text-slate-900 font-mono mt-0.5">{party.phone}</p>
                </div>
              </div>
            )}

            {party.email && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{party.email}</p>
                </div>
              </div>
            )}

            {party.address && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{party.address}</p>
                </div>
              </div>
            )}

            {party.taxNumber && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PAN / VAT Number</p>
                  <p className="font-bold font-mono text-slate-900 mt-0.5">{party.taxNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial Balance Summary */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opening Balance</p>
              <h3 className={`text-2xl sm:text-3xl font-black font-mono mt-2 ${openingBalInfo.colorClass}`}>
                {openingBalInfo.text}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-4 border-t border-slate-100 pt-3">
              Initial ledger balance at party registration.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Balance</p>
              <h3 className={`text-2xl sm:text-3xl font-black font-mono mt-2 ${balInfo.colorClass}`}>
                {balInfo.text}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-4 border-t border-slate-100 pt-3">
              Live computed ledger balance from all transactions.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" /> Transaction Ledger
        </h3>

        {allTransactions.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-7 h-7 text-slate-400" />}
            title="No Transactions Logged"
            description="Sales invoices, purchase bills, and payment entries for this party will appear here."
          />
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-xs">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Transaction Type</th>
                  <th className="px-5 py-3.5">Reference No.</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allTransactions.map((tx: any) => (
                  <tr key={`${tx.type}-${tx.id}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-slate-700 font-mono font-semibold">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3.5 font-semibold">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          tx.type === 'SALE INVOICE'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : tx.type === 'PURCHASE BILL'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : tx.type === 'PAYMENT IN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-900 font-mono font-bold">{tx.reference}</td>

                    <td className="px-5 py-3.5 text-slate-500 uppercase text-[10px] font-bold tracking-wider">{tx.status}</td>

                    <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900 text-sm">
                      Rs. {tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
