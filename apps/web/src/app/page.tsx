'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  CheckCircle2,
  Clock,
  Zap,
  Lock,
  MessageSquare,
  Package,
  Receipt,
  Smartphone,
  PhoneCall,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UnderConstructionPage() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSubscribed(true);
    toast.success('Thank you! We will notify you the moment BizManage v2 goes live.');
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-red-500 selection:text-white font-sans relative overflow-hidden">
      {/* Background Ambient Lights */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[42rem] h-[28rem] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 right-10 w-[30rem] h-[30rem] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-600/30">
            V
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white block">BizManage</span>
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Vyapar Edition v2</span>
          </div>
        </div>

        {/* Backdoor portal access for the owner/admin */}
        <Link
          href="/login"
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Client Sign In</span>
        </Link>
      </header>

      {/* Main Hero Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 text-center relative z-10 space-y-8 my-auto">
        {/* Under Construction Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider animate-pulse">
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>Under Scheduled Upgrade & Construction</span>
        </div>

        {/* Big Headline */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] text-white">
            We're Upgrading to{' '}
            <span className="bg-gradient-to-r from-red-500 via-rose-400 to-red-600 bg-clip-text text-transparent">
              BizManage v2
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Our engineers are currently rolling out the brand new <strong>Vyapar-style business accounting, POS billing, godown stock transfers</strong>, and mobile applications. We will be fully live shortly!
          </p>
        </div>

        {/* Deployment Progress Bar */}
        <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-red-400" /> System Upgrade Status
            </span>
            <span className="font-mono font-bold text-emerald-400">92% Complete</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-emerald-500 transition-all duration-1000" style={{ width: '92%' }} />
          </div>
          <p className="text-[11px] text-slate-400">
            Database migrated to MySQL • POS Engine updated • Android PWA ready
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4 text-left">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <Receipt className="w-5 h-5 text-red-400" />
            <h4 className="text-xs font-bold text-white">GST/VAT Billing</h4>
            <p className="text-[10px] text-slate-400">Thermal & A4 invoices</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <Package className="w-5 h-5 text-blue-400" />
            <h4 className="text-xs font-bold text-white">Godown Transfers</h4>
            <p className="text-[10px] text-slate-400">Multi-warehouse stock</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <h4 className="text-xs font-bold text-white">WhatsApp Bills</h4>
            <p className="text-[10px] text-slate-400">1-click payment alerts</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <h4 className="text-xs font-bold text-white">Mobile App</h4>
            <p className="text-[10px] text-slate-400">Full offline billing</p>
          </div>
        </div>

        {/* Email Notification & WhatsApp Action */}
        <div className="pt-4 flex flex-col items-center justify-center gap-4">
          <form onSubmit={handleNotify} className="w-full max-w-md flex flex-col sm:flex-row items-center gap-2">
            <input
              type="email"
              placeholder="Enter your email to get launch alert..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              required
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Notify Me</span>
            </button>
          </form>

          {/* Urgent WhatsApp Contact */}
          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs text-slate-400">Need urgent help?</span>
            <a
              href="https://wa.me/9779800000000?text=Hello%20BizManage%20Team%2C%20I%20need%20assistance."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold transition-all"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Contact WhatsApp Support</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full px-6 py-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 relative z-10">
        <p>© {new Date().getFullYear()} BizManage Technologies. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
          <Link href="/security" className="hover:text-slate-400 transition-colors">Security Architecture</Link>
        </div>
      </footer>
    </div>
  );
}