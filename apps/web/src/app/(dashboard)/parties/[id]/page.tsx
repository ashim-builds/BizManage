'use client';

import { useState } from 'react';
import { useParty } from '@/services/partyService';
import { useCurrentBusiness } from '@/services/businessService';
import { formatPartyBalance } from '@/lib/balance';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { WhatsAppShareModal } from '@/components/common/WhatsAppShareModal';
import { generateCustomerDueReminderMessage } from '@/lib/whatsapp';
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
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { PartyType } from '@bizmanage/types';

export default function PartyDetailsPage({ params }: { params: { id: string } }) {
  const { data: party, isLoading, isError, refetch } = useParty(params.id);
  const { data: business } = useCurrentBusiness();
  const [isReminderOpen, setIsReminderOpen] = useState(false);

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
    <div className="space-y-8">
      {/* Top Header & Back Link */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/parties"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{party.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  party.type === PartyType.CUSTOMER
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : party.type === PartyType.SUPPLIER
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {party.type}
              </span>
            </div>
            {party.category && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-400" /> {party.category.name}
              </p>
            )}
          </div>
        </div>

        {currentBal > 0 && (
          <button
            type="button"
            onClick={() => setIsReminderOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
          >
            <MessageSquare className="w-4 h-4" /> Send WhatsApp Due Reminder
          </button>
        )}
      </div>

      {/* Grid: Left Contact Info / Right Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Party Information
          </h3>

          <div className="space-y-3 text-xs text-slate-300">
            {party.phone && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Phone</p>
                  <p className="font-semibold">{party.phone}</p>
                </div>
              </div>
            )}

            {party.email && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Email</p>
                  <p className="font-semibold">{party.email}</p>
                </div>
              </div>
            )}

            {party.address && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Address</p>
                  <p className="font-semibold">{party.address}</p>
                </div>
              </div>
            )}

            {party.taxNumber && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">PAN / VAT Number</p>
                  <p className="font-semibold font-mono">{party.taxNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial Balance Summary */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opening Balance</p>
              <h3 className={`text-2xl font-bold font-mono mt-2 ${openingBalInfo.colorClass}`}>
                {openingBalInfo.text}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 border-t border-slate-800/80 pt-3">
              Initial ledger balance at registration.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Balance</p>
              <h3 className={`text-3xl font-bold font-mono mt-2 ${balInfo.colorClass}`}>
                {balInfo.text}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-400" /> Transaction Ledger
        </h3>

        {allTransactions.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-7 h-7 text-slate-400" />}
            title="No Transactions Logged"
            description="Sales invoices, purchase bills, and payment entries for this party will appear here."
          />
        ) : (
          <div className="border border-slate-800 rounded-2xl overflow-x-auto overflow-y-hidden bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Transaction Type</th>
                  <th className="px-6 py-4">Reference No.</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allTransactions.map((tx: any) => (
                  <tr key={`${tx.type}-${tx.id}`} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-300 font-mono">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.type === 'SALE INVOICE'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : tx.type === 'PURCHASE BILL'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : tx.type === 'PAYMENT IN'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-300 font-mono">{tx.reference}</td>

                    <td className="px-6 py-4 text-slate-400 uppercase text-[11px] font-semibold">{tx.status}</td>

                    <td className="px-6 py-4 text-right font-mono font-bold text-white">
                      Rs. {tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WhatsApp Payment Due Reminder Modal */}
      {isReminderOpen && (
        <WhatsAppShareModal
          isOpen={isReminderOpen}
          onClose={() => setIsReminderOpen(false)}
          title={`Send Payment Reminder to ${party.name}`}
          defaultPhone={party.phone}
          message={generateCustomerDueReminderMessage({
            businessName: business?.name || 'BizManage Store',
            businessPhone: business?.phone,
            customerName: party.name,
            totalDue: currentBal,
          })}
        />
      )}
    </div>
  );
}
