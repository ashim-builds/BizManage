'use client';

import { useState, useEffect } from 'react';
import { ModalPortal } from '@/components/common/ModalPortal';
import {
  openWhatsAppChat,
  generateSmartPartyWhatsAppMessage,
  generatePaymentInReminderMessage,
  generatePaymentOutNoticeMessage,
  generateSettledAccountMessage,
} from '@/lib/whatsapp';
import { Send, Copy, Check, X, Phone, MessageSquare, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export type PartySituation = 'payment-in' | 'payment-out' | 'settled';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  defaultPhone?: string | null;
  phoneNumber?: string | null;
  recipientName?: string;
  balance?: number;
  businessName?: string;
  businessPhone?: string | null;
  message?: string;
  defaultMessage?: string;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  title = 'WhatsApp Statement & Reminder',
  defaultPhone,
  phoneNumber,
  recipientName = 'Valued Partner',
  balance = 0,
  businessName = 'Our Business',
  businessPhone,
  message,
  defaultMessage,
}: WhatsAppShareModalProps) {
  // Determine initial situation
  const rawBalance = Number(balance || 0);
  const defaultSituation: PartySituation =
    rawBalance > 0 ? 'payment-in' : rawBalance < 0 ? 'payment-out' : 'settled';

  const [situation, setSituation] = useState<PartySituation>(defaultSituation);
  const [phone, setPhone] = useState(phoneNumber || defaultPhone || '');
  const [currentMessage, setCurrentMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync situation & phone when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      const activeSit: PartySituation =
        rawBalance > 0 ? 'payment-in' : rawBalance < 0 ? 'payment-out' : 'settled';
      setSituation(activeSit);
      setPhone(phoneNumber || defaultPhone || '');

      if (message || defaultMessage) {
        setCurrentMessage(message || defaultMessage || '');
      } else {
        const generated = generateSmartPartyWhatsAppMessage({
          businessName,
          businessPhone,
          partyName: recipientName,
          balance: rawBalance,
          situation: activeSit,
        });
        setCurrentMessage(generated);
      }
    }
  }, [isOpen, rawBalance, phoneNumber, defaultPhone, recipientName, businessName, businessPhone, message, defaultMessage]);

  if (!isOpen) return null;

  // Handle switching situation tabs
  const handleSituationChange = (newSit: PartySituation) => {
    setSituation(newSit);
    let newMsg = '';
    if (newSit === 'payment-in') {
      newMsg = generatePaymentInReminderMessage({
        businessName,
        businessPhone,
        customerName: recipientName,
        dueAmount: Math.abs(rawBalance),
      });
    } else if (newSit === 'payment-out') {
      newMsg = generatePaymentOutNoticeMessage({
        businessName,
        businessPhone,
        vendorName: recipientName,
        payableAmount: Math.abs(rawBalance),
      });
    } else {
      newMsg = generateSettledAccountMessage({
        businessName,
        businessPhone,
        partyName: recipientName,
      });
    }
    setCurrentMessage(newMsg);
  };

  const handleSend = () => {
    openWhatsAppChat(phone, currentMessage);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[120] flex items-center justify-center p-4 font-sans"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-slate-500">
                  Party: <strong className="text-slate-800 font-bold">{recipientName}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Situation Switcher Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Message Situation (अवस्था छनोट):
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleSituationChange('payment-in')}
                className={`py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  situation === 'payment-in'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-1 text-[11px]">
                  <ArrowDownLeft className="w-3 h-3" /> Payment In
                </span>
                <span className="text-[9px] opacity-85">Customer Owes (लिन)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSituationChange('payment-out')}
                className={`py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  situation === 'payment-out'
                    ? 'bg-rose-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-1 text-[11px]">
                  <ArrowUpRight className="w-3 h-3" /> Payment Out
                </span>
                <span className="text-[9px] opacity-85">We Owe Vendor (दिन)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSituationChange('settled')}
                className={`py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  situation === 'settled'
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> Settled
                </span>
                <span className="text-[9px] opacity-85">Zero Due (चुक्ता)</span>
              </button>
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Mobile Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 font-mono text-xs">+977</span>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="98XXXXXXXX"
                className="w-full pl-16 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Editable Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Message Content (Edit as needed):
              </label>
              <span className="text-[11px] text-slate-400">
                {situation === 'payment-in'
                  ? 'Payment In Template'
                  : situation === 'payment-out'
                  ? 'Payment Out Template'
                  : 'Settled Ledger Template'}
              </span>
            </div>
            <textarea
              rows={6}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all shadow-xs resize-none"
            />
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all border border-slate-200 shadow-xs cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy Message
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" /> Open in WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
