'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Share2,
  MessageSquare,
  Gift,
  BellRing,
  Send,
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Copy,
  Percent,
} from 'lucide-react';
import { useParties } from '@/services/partyService';
import { useAuth } from '@/providers/AuthProvider';
import toast from 'react-hot-toast';

export default function MarketingPage() {
  const { user } = useAuth();
  const currentBiz = user?.memberships?.[0]?.business;
  const { data: partiesResponse } = useParties({ limit: 100 });
  const parties = partiesResponse?.data || [];

  const [activeTab, setActiveTab] = useState<'reminders' | 'greetings' | 'service'>('reminders');

  // WhatsApp Message composer state
  const [customOfferText, setCustomOfferText] = useState(
    `Special Offer from ${currentBiz?.name || 'Our Store'}! Get 10% FLAT discount on your next purchase this week. Visit us or order on WhatsApp! 🎉`
  );
  const [selectedDiscount, setSelectedDiscount] = useState('10%');

  // Customer filter for reminders
  const [onlyDueBalance, setOnlyDueBalance] = useState(true);

  const dueParties = parties.filter((p: any) => {
    if (!onlyDueBalance) return true;
    return Number(p.currentBalance || 0) > 0;
  });

  const generatePaymentReminderUrl = (party: any) => {
    const balance = Number(party.currentBalance || 0);
    const text = `Namaste ${party.name} ji,\n\nGreetings from *${currentBiz?.name || 'our store'}*.\nThis is a gentle reminder that your pending ledger balance is *Rs. ${balance.toLocaleString()}*.\n\nKindly clear this payment or share payment screenshot. Thank you for your business! 🙏`;
    const cleanPhone = (party.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.startsWith('977') || cleanPhone.startsWith('91') ? cleanPhone : `977${cleanPhone}`;
    return `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`;
  };

  const generateGreetingUrl = (party: any, greetingTitle: string) => {
    const text = `Namaste ${party.name} ji! 🌟\n\n*${greetingTitle}* from the entire team at *${currentBiz?.name || 'BizManage'}*.\n\n${customOfferText}\n\nWe look forward to serving you!`;
    const cleanPhone = (party.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.startsWith('977') || cleanPhone.startsWith('91') ? cleanPhone : `977${cleanPhone}`;
    return `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Marketing & WhatsApp Hub (व्हाट्सएप मार्केटिङ)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Send bulk WhatsApp payment reminders, share festive greetings & discount offers, and track customer engagement.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'reminders' ? 'bg-red-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Payment Reminders
          </button>
          <button
            onClick={() => setActiveTab('greetings')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'greetings' ? 'bg-red-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Greetings & Offers
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'service' ? 'bg-red-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Service Reminders
          </button>
        </div>
      </div>

      {/* TAB 1: PAYMENT REMINDERS ON WHATSAPP */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dueOnly"
                checked={onlyDueBalance}
                onChange={(e) => setOnlyDueBalance(e.target.checked)}
                className="rounded text-red-600"
              />
              <label htmlFor="dueOnly" className="text-xs font-semibold text-zinc-200 cursor-pointer">
                Show only parties with outstanding balance (तिर्न/उठाउन बाँकी भएका)
              </label>
            </div>

            <span className="text-xs text-zinc-400">
              Eligible Customers: <strong className="text-white font-mono">{dueParties.length}</strong>
            </span>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              1-Click WhatsApp Payment Reminder
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="py-2.5 px-3">Party Name</th>
                    <th className="py-2.5 px-3">Mobile Number</th>
                    <th className="py-2.5 px-3 text-right">Balance Due</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {dueParties.length ? (
                    dueParties.map((p: any) => (
                      <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">{p.name}</td>
                        <td className="py-3 px-3 text-zinc-400 font-mono">{p.phone || 'No Phone'}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          Rs. {Number(p.currentBalance || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {p.phone ? (
                            <a
                              href={generatePaymentReminderUrl(p)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95"
                            >
                              <Send className="w-3 h-3" />
                              <span>Send WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-zinc-600 text-[10px]">Add Phone Number</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-zinc-500 text-xs">
                        No parties with outstanding balances found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GREETINGS & FESTIVE OFFERS */}
      {activeTab === 'greetings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-red-400" />
              Festive Greeting Cards & Promotional Offers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Dashain / Tihar */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-red-950/40 via-zinc-900 to-zinc-900 border border-red-500/30 space-y-3">
                <span className="text-2xl">🪔</span>
                <h4 className="text-sm font-bold text-white">Dashain & Tihar Festive Dhamaka</h4>
                <p className="text-xs text-zinc-400">
                  Wish your customers on Vijaya Dashami & Deepawali with special festive shopping discounts.
                </p>
                <div className="pt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-300">
                    Template: Festival Greeting
                  </span>
                </div>
              </div>

              {/* Card 2: New Year Offer */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 space-y-3">
                <span className="text-2xl">🎉</span>
                <h4 className="text-sm font-bold text-white">Happy New Year Clearance Sale</h4>
                <p className="text-xs text-zinc-400">
                  Send greetings and offer flat 15% discount for the first 50 shoppers of the month.
                </p>
                <div className="pt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                    Template: New Year
                  </span>
                </div>
              </div>
            </div>

            {/* Customer List to Send */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Broadcast to Customers on WhatsApp
              </h4>

              <div className="divide-y divide-zinc-800/80 max-h-[300px] overflow-y-auto">
                {parties.slice(0, 15).map((p: any) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{p.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{p.phone || 'No Phone'}</p>
                    </div>
                    {p.phone ? (
                      <a
                        href={generateGreetingUrl(p, 'Happy Festive Season!')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send Offer</span>
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 1 Col: Customize Offer Message */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-400" />
              Customize Promotional Text
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Promotional Message Body</label>
              <textarea
                rows={5}
                value={customOfferText}
                onChange={(e) => setCustomOfferText(e.target.value)}
                className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 leading-relaxed"
              />
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Live Preview:</span>
              <p className="text-zinc-300 italic text-[11px]">"{customOfferText}"</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICE REMINDERS */}
      {activeTab === 'service' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <BellRing className="w-4 h-4 text-blue-400" />
                Service, Maintenance & Warranty Follow-ups
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Automated reminders for periodic service renewals.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 uppercase">
                Warranty Check
              </span>
              <h4 className="text-sm font-bold text-white">Annual Product Maintenance Follow-up</h4>
              <p className="text-xs text-zinc-400">
                Notify customer when their product or vehicle completes 6 months or 1 year from invoice date.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase">
                Contract Renewal
              </span>
              <h4 className="text-sm font-bold text-white">Subscription & AMC Renewal Alert</h4>
              <p className="text-xs text-zinc-400">
                Automatically remind client 7 days prior to their contract or warranty expiration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
