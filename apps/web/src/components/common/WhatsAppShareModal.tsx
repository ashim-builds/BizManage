'use client';

import { useState } from 'react';
import { ModalPortal } from '@/components/common/ModalPortal';
import { openWhatsAppChat } from '@/lib/whatsapp';
import { Send, Copy, Check, X, Phone, MessageSquare } from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  defaultPhone?: string | null;
  message: string;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  title,
  defaultPhone,
  message,
}: WhatsAppShareModalProps) {
  const [phone, setPhone] = useState(defaultPhone || '');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    openWhatsAppChat(phone, message);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{title}</h3>
                <p className="text-xs text-slate-400">Send directly to customer via WhatsApp</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> Customer Phone / WhatsApp Number
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="e.g. 9841234567"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Enter 10-digit numeric mobile number.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Message Preview
              </label>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed selection:bg-emerald-500/30">
                {message}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy Text
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all"
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
