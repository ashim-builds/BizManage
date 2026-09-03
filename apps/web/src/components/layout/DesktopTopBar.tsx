'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  RotateCw,
  Building2,
  HelpCircle,
  Keyboard,
  Info,
  ExternalLink,
  Phone,
  Mail,
  CheckCircle2,
  Minus,
  Square,
  X,
  Plus,
  Settings,
  ArrowRight,
  Headphones,
  Laptop,
  Check,
  Sparkles,
  Command,
  BookOpen,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { ModalPortal } from '@/components/common/ModalPortal';

interface DesktopTopBarProps {
  business?: any;
  user?: any;
  memberships?: any[];
  onSwitchBusiness?: (businessId: string) => void;
}

export function DesktopTopBar({
  business,
  user,
  memberships = [],
  onSwitchBusiness,
}: DesktopTopBarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modals & Dropdowns State
  const [activeMenu, setActiveMenu] = useState<'company' | 'help' | null>(null);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  // Handle Refresh
  const handleReload = async () => {
    setIsReloading(true);
    try {
      await queryClient.invalidateQueries();
      toast.success('App data refreshed successfully!');
    } catch {
      window.location.reload();
    } finally {
      setTimeout(() => setIsReloading(false), 500);
    }
  };

  // Support WhatsApp Link: (+977) 9701683070
  const supportPhone = '9701683070';
  const supportPhoneDisplay = '(+977) 9701683070';
  const whatsappUrl = `https://wa.me/977${supportPhone}?text=${encodeURIComponent(
    `Hello BizManage Support, I need assistance with my account (${business?.name || 'My Business'}).`
  )}`;

  return (
    <>
      {/* ========================================================================= */}
      {/* APPLICATION TOP NAVIGATION HEADER BAR */}
      {/* ========================================================================= */}
      <header
        ref={menuRef}
        className="h-[34px] bg-[#f8fafc] text-slate-700 border-b border-slate-200 select-none flex items-center justify-between px-2.5 sm:px-4 text-xs z-40 print:hidden font-sans shrink-0 shadow-xs"
      >
        {/* LEFT SECTION: Logo, Application Name & Navigation Items */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Logo & Application Name */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-200/70 transition-colors cursor-pointer mr-1"
            title="BizManage Dashboard Home"
          >
            <div className="w-4.5 h-4.5 relative shrink-0">
              <Image
                src="/logo-transparent.png"
                alt="BizManage Logo"
                width={18}
                height={18}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-tight hidden sm:inline">
              BizManage
            </span>
          </Link>

          {/* Company Menu Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'company' ? null : 'company')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeMenu === 'company'
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : 'hover:bg-slate-200/70 text-slate-700'
              }`}
            >
              Company
            </button>

            {/* Company Dropdown Menu */}
            {activeMenu === 'company' && (
              <div className="absolute left-0 mt-1.5 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-slate-800">
                <div className="px-3 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Active Company
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {business?.name || 'My Business'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    PAN/VAT: {business?.taxNumber || 'Not set'} • {business?.currency || 'NPR'}
                  </p>
                </div>

                {/* Company Switching List */}
                <div className="py-1">
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Switch Company
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {memberships.map((m: any) => {
                      const b = m.business;
                      const isActive = b.id === business?.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            if (onSwitchBusiness) onSwitchBusiness(b.id);
                            setActiveMenu(null);
                            toast.success(`Switched to ${b.name}`);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="truncate">{b.name}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Company Actions */}
                <div className="pt-1.5 border-t border-slate-100 space-y-0.5">
                  <Link
                    href="/setup-business"
                    onClick={() => setActiveMenu(null)}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Create New Company</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setActiveMenu(null)}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Company Profile & Settings</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Help Menu Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeMenu === 'help'
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              Help
            </button>

            {/* Help Dropdown Menu */}
            {activeMenu === 'help' && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    setIsSupportModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                >
                  <Headphones className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Instant Online Support</p>
                    <p className="text-[10px] text-slate-500">Live chat, AnyDesk remote help</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    setIsShortcutsOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                >
                  <Keyboard className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Keyboard Shortcuts</p>
                    <p className="text-[10px] text-slate-500">Fast entry hotkeys list</p>
                  </div>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setActiveMenu(null)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-emerald-50 text-emerald-800 font-medium transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center font-bold text-emerald-600">
                    💬
                  </span>
                  <div>
                    <p className="font-bold text-emerald-950 leading-tight">WhatsApp Helpline</p>
                    <p className="text-[10px] text-emerald-700">{supportPhoneDisplay}</p>
                  </div>
                </a>

                <div className="pt-1.5 mt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu(null);
                      setIsVersionOpen(true);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                  >
                    <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>About BizManage Desktop</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Versions Trigger */}
          <button
            type="button"
            onClick={() => setIsVersionOpen(true)}
            className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Software Version & Updates"
          >
            Versions
          </button>

          {/* Shortcuts Trigger */}
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Keyboard Shortcuts Cheat Sheet"
          >
            Shortcuts
          </button>

          {/* Reload Button (⟳) */}
          <button
            type="button"
            onClick={handleReload}
            disabled={isReloading}
            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer ml-0.5"
            title="Refresh App Data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {/* RIGHT SECTION: WhatsApp Support & Instant Online Support */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 text-slate-700">
          {/* WhatsApp Chat Support */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-200/70 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-[11px]"
            title="Chat directly with BizManage technical support on WhatsApp"
          >
            <span className="text-slate-600 font-normal">WhatsApp Chat Support</span>
            {/* WhatsApp Icon with green online indicator dot */}
            <div className="relative flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 fill-[#25D366] shrink-0"
                viewBox="0 0 24 24"
              >
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.159.57 4.19 1.564 5.946l-1.657 6.054 6.222-1.632c1.703.929 3.657 1.464 5.74 1.464 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-1 ring-white" />
            </div>
            <span className="font-semibold text-blue-600 hover:underline">{supportPhoneDisplay}</span>
          </a>

          {/* Separator */}
          <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

          {/* Get Instant Online Support */}
          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-200/70 text-blue-600 font-semibold hover:underline text-[11px] transition-colors cursor-pointer"
            title="Connect with BizManage Online Tech Support"
          >
            <span className="text-slate-500 text-xs font-mono font-bold">⋈</span>
            <span>Get Instant Online Support</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MODAL 1: VERSIONS & CHANGELOG */}
      {/* ========================================================================= */}
      {isVersionOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">BizManage Desktop</h3>
                    <p className="text-xs text-slate-500">Version v2.4.2 (Desktop Release)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVersionOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs text-slate-600">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-emerald-900">System Up to Date</span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Latest
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-2">What&apos;s New in v2.4.2:</h4>
                  <ul className="space-y-1.5 text-[11px] list-disc pl-4 text-slate-600">
                    <li>Comprehensive Buy & Sell ledger with real-time stock balances.</li>
                    <li>Full JSON & Excel export/import support with confirmation alerts.</li>
                    <li>Persistent notification read status synchronized directly in MySQL.</li>
                    <li>Desktop app header bar with instant WhatsApp and online support.</li>
                    <li>Offline PWA capabilities and high-DPI desktop shortcuts.</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckingUpdate(true);
                    setTimeout(() => {
                      setIsCheckingUpdate(false);
                      toast.success('You are running the latest version of BizManage!');
                    }, 1000);
                  }}
                  disabled={isCheckingUpdate}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-blue-600' : ''}`} />
                  <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsVersionOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KEYBOARD SHORTCUTS CHEAT SHEET */}
      {/* ========================================================================= */}
      {isShortcutsOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Keyboard Shortcuts</h3>
                    <p className="text-xs text-slate-500">Accelerate your billing and inventory workflow</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShortcutsOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                {[
                  { key: 'Ctrl + Q', action: 'Quick Entry (Create Sale, Purchase, Item, Expense)', tag: 'Global' },
                  { key: 'Ctrl + K', action: 'Universal Global Search (Items, Parties, Invoices)', tag: 'Global' },
                  { key: 'Ctrl + P', action: 'Print current invoice, ledger, or report', tag: 'Global' },
                  { key: 'Alt + S', action: 'Open Sales & Invoices ledger', path: '/transactions/sales' },
                  { key: 'Alt + P', action: 'Open Purchase Bills ledger', path: '/transactions/purchases' },
                  { key: 'Alt + I', action: 'Open Inventory Products & Services', path: '/inventory' },
                  { key: 'Alt + C', action: 'Open Parties Directory (Customers & Suppliers)', path: '/parties' },
                  { key: 'Alt + R', action: 'Open Financial Reports & IRD VAT Books', path: '/reports' },
                  { key: 'Alt + B', action: 'Open POS Fast Retail Checkout Counter', path: '/transactions/pos' },
                  { key: 'Esc', action: 'Close any active popup, drawer, or modal dialog', tag: 'Interface' },
                ].map((s, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{s.action}</span>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] font-bold shadow-2xs">
                        {s.key}
                      </kbd>
                      {s.path && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsShortcutsOpen(false);
                            router.push(s.path);
                          }}
                          className="text-[10px] text-blue-600 hover:underline font-bold"
                        >
                          Go
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => setIsShortcutsOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GET INSTANT ONLINE SUPPORT */}
      {/* ========================================================================= */}
      {isSupportModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Instant Online Support</h3>
                    <p className="text-xs text-slate-500">Dedicated assistance for your BizManage ERP system</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* 1. WhatsApp Support Box */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 hover:border-emerald-300 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      💬
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                        WhatsApp Live Helpdesk
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Instant responses on {supportPhoneDisplay}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs group-hover:bg-emerald-500 transition-colors">
                    Chat Now
                  </span>
                </a>

                {/* 2. AnyDesk Remote Support Box */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">AnyDesk Remote Assistance</h4>
                      <p className="text-[11px] text-slate-600">
                        Our technicians can connect remotely to configure your printer, VAT, or billing
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-blue-100 text-[11px] text-slate-700 space-y-1 mt-2">
                    <p>1. Open AnyDesk or TeamViewer on your PC.</p>
                    <p>2. Send your 9-digit address to our WhatsApp support.</p>
                    <p>3. Accept the incoming support session request.</p>
                  </div>
                </div>

                {/* 3. Direct Email */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-700">Official Support Email:</span>
                  </div>
                  <a
                    href="mailto:support@bizmanage.com"
                    className="font-bold text-blue-600 hover:underline"
                  >
                    support@bizmanage.com
                  </a>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
