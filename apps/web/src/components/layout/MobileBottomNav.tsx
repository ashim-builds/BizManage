'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Package,
  ArrowLeftRight,
  MoreHorizontal,
  Plus,
  Receipt,
  ShoppingBag,
  Menu,
  X,
  ChevronRight,
  Crown,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Building2,
  ScanBarcode,
  Boxes,
  Megaphone,
  Store,
  Globe,
  Landmark,
  Wallet,
  TrendingDown,
  TrendingUp,
  FileBarChart,
  Settings,
  Search,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface MobileBottomNavProps {
  onQuickEntry: () => void;
}

export function MobileBottomNav({ onQuickEntry }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const currentBusiness = user?.memberships?.[0]?.business;
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Hide global navigation on full-screen editor & new transaction pages so page action bars are visible
  const isFullScreenEditor =
    pathname?.endsWith('/new') || pathname?.includes('/transactions/pos') || pathname?.endsWith('/edit');

  if (isFullScreenEditor) {
    return null;
  }

  const isMoreActive = !['/dashboard', '/parties', '/inventory'].includes(pathname || '');

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home, active: pathname === '/dashboard' || pathname === '/' },
    { name: 'Parties', href: '/parties', icon: Users, active: pathname?.startsWith('/parties') },
    { name: '+ Add', action: onQuickEntry, icon: Plus, isAction: true },
    { name: 'Items', href: '/inventory', icon: Package, active: pathname?.startsWith('/inventory') },
    { name: 'More', action: () => setMoreMenuOpen(true), icon: Menu, active: isMoreActive || moreMenuOpen },
  ];

  // Comprehensive categorized feature grid for full-screen "More" menu
  const featureCategories = [
    {
      title: 'Sales & POS Billing',
      items: [
        { name: 'Sale Invoices', href: '/transactions/sales', icon: Receipt, color: 'text-red-600 bg-red-50' },
        { name: 'POS Quick Billing', href: '/transactions/pos', icon: Zap, color: 'text-amber-600 bg-amber-50' },
        {
          name: 'Payment In',
          href: '/transactions/payment-in',
          icon: ArrowDownLeft,
          color: 'text-emerald-600 bg-emerald-50',
        },
        {
          name: 'Sale Return',
          href: '/transactions/sales-return',
          icon: RotateCcw,
          color: 'text-slate-600 bg-slate-100',
        },
      ],
    },
    {
      title: 'Purchases & Expenses',
      items: [
        {
          name: 'Purchase Bills',
          href: '/transactions/purchases',
          icon: ShoppingBag,
          color: 'text-blue-600 bg-blue-50',
        },
        {
          name: 'Payment Out',
          href: '/transactions/payment-out',
          icon: ArrowUpRight,
          color: 'text-rose-600 bg-rose-50',
        },
        { name: 'Expenses', href: '/expenses', icon: TrendingDown, color: 'text-orange-600 bg-orange-50' },
        {
          name: 'Purchase Return',
          href: '/transactions/purchase-return',
          icon: RotateCcw,
          color: 'text-slate-600 bg-slate-100',
        },
      ],
    },
    {
      title: 'Inventory & Warehouses',
      items: [
        { name: 'Stock & Items', href: '/inventory', icon: Package, color: 'text-indigo-600 bg-indigo-50' },
        { name: 'Godowns & Transfer', href: '/inventory/godowns', icon: Building2, color: 'text-cyan-600 bg-cyan-50' },
        {
          name: 'Barcode Printing',
          href: '/inventory/labels',
          icon: ScanBarcode,
          color: 'text-violet-600 bg-violet-50',
        },
        { name: 'Manufacturing (BOM)', href: '/manufacturing', icon: Boxes, color: 'text-amber-700 bg-amber-50' },
      ],
    },
    {
      title: 'Parties & Business Growth',
      items: [
        { name: 'Parties / Ledgers', href: '/parties', icon: Users, color: 'text-teal-600 bg-teal-50' },
        { name: 'WhatsApp Hub', href: '/marketing', icon: Megaphone, color: 'text-green-600 bg-green-50' },
        { name: 'Online Store', href: '/storefront', icon: Store, color: 'text-purple-600 bg-purple-50' },
        { name: 'Explore Stores', href: '/explore-stores', icon: Globe, color: 'text-blue-500 bg-blue-50' },
      ],
    },
    {
      title: 'Finance & Reports',
      items: [
        { name: 'Bank & Accounts', href: '/accounts', icon: Landmark, color: 'text-emerald-700 bg-emerald-50' },
        { name: 'Cashflow Ledger', href: '/cashflow', icon: Wallet, color: 'text-slate-700 bg-slate-100' },
        { name: 'Profit & Loss', href: '/profit-loss', icon: TrendingUp, color: 'text-blue-700 bg-blue-50' },
        { name: 'Financial Reports', href: '/reports', icon: FileBarChart, color: 'text-indigo-700 bg-indigo-50' },
      ],
    },
    {
      title: 'Tools & Workspace',
      items: [
        { name: 'Sync & Backup', href: '/sync-backup', icon: RotateCcw, color: 'text-emerald-600 bg-emerald-50' },
        { name: 'Settings', href: '/settings', icon: Settings, color: 'text-slate-700 bg-slate-100' },
        { name: 'Upgrade Plan', href: '/subscription', icon: Crown, color: 'text-amber-600 bg-amber-50' },
      ],
    },
  ];

  // Filter features if searching
  const filteredCategories = featureCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <>
      {/* 1. Mobile Bottom Bar (White Theme - Elevated for System Navigation Bar & Back Button Clearance) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden print:hidden bg-white/95 border-t border-slate-200 backdrop-blur-md shadow-lg"
        style={{ paddingBottom: 'max(22px, calc(env(safe-area-inset-bottom) + 14px))' }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-0.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            if (item.isAction) {
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] cursor-pointer"
                  title="Quick Entry"
                >
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30 hover:bg-red-500 active:scale-95 transition-transform">
                    <Icon className="w-5 h-5 text-white stroke-[2.5]" />
                  </div>
                </button>
              );
            }
            if (item.action) {
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 active:scale-95 transition-all cursor-pointer ${
                    item.active ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.active ? 'text-blue-600 stroke-[2.5]' : 'text-slate-500'}`} />
                  <span
                    className={`text-[10px] ${item.active ? 'font-bold text-blue-600' : 'font-semibold text-slate-600'}`}
                  >
                    {item.name}
                  </span>
                </button>
              );
            }
            return (
              <Link
                key={idx}
                href={item.href!}
                className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 active:scale-95 transition-all ${
                  item.active ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.active ? 'text-blue-600 stroke-[2.5]' : 'text-slate-500'}`} />
                <span
                  className={`text-[10px] ${item.active ? 'font-bold text-blue-600' : 'font-semibold text-slate-600'}`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. Full-Screen White "More" Menu with Small Compact Tiles */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-white flex flex-col font-sans animate-in fade-in duration-150">
          {/* Top Bar */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10 shadow-xs">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>BizManage Menu</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold">
                  {currentBusiness?.name || 'My Business'}
                </span>
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">All shortcuts, tools & modules</p>
            </div>

            <button
              onClick={() => {
                setMoreMenuOpen(false);
                setSearchTerm('');
              }}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition-colors"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Search */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 bg-[#F8FAFC]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tools, reports, godowns..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Scrollable Compact Feature Grid */}
          <div
            className="flex-1 overflow-y-auto p-3.5 space-y-5 bg-[#F8FAFC] pb-safe"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
          >
            {filteredCategories.map((category, cIdx) => (
              <div key={cIdx} className="space-y-2">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 px-1">{category.title}</h3>

                <div className="grid grid-cols-2 gap-2.5">
                  {category.items.map((item, iIdx) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={iIdx}
                        href={item.href}
                        onClick={() => {
                          setMoreMenuOpen(false);
                          setSearchTerm('');
                        }}
                        className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 active:bg-slate-50 active:scale-98 transition-all flex items-center gap-2.5 group"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 text-left leading-snug">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500 font-medium">
                No features found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
