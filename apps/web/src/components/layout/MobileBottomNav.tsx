import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  ShoppingBag,
  ArrowLeftRight,
  Plus,
  Receipt,
  ShoppingCart,
  Menu,
  X,
  ChevronRight,
  Crown,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Building2,
  Printer,
  Boxes,
  Store,
  Globe,
  Landmark,
  Wallet,
  TrendingDown,
  TrendingUp,
  FileBarChart,
  Settings,
  Search,
  RefreshCw,
  Clock,
  Upload,
  History,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { ModalPortal } from '@/components/common/ModalPortal';

interface FeatureItem {
  name: string;
  href: string;
  icon: any;
  color: string;
  desc?: string;
  plusHref?: string;
}

interface FeatureCategory {
  title: string;
  icon: any;
  items: FeatureItem[];
}

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
    { name: 'Items', href: '/inventory', icon: ShoppingBag, active: pathname?.startsWith('/inventory') },
    { name: 'More', action: () => setMoreMenuOpen(true), icon: Menu, active: isMoreActive || moreMenuOpen },
  ];

  // Comprehensive categorized feature grid mirroring Desktop Sidebar with 100% data parity
  const featureCategories: FeatureCategory[] = [
    {
      title: 'Sale',
      icon: Receipt,
      items: [
        {
          name: 'Sale Invoices',
          href: '/transactions/sales',
          icon: Receipt,
          color: 'text-red-600 bg-red-50',
          desc: 'Customer tax invoices',
        },
        {
          name: 'POS Quick Billing',
          href: '/transactions/pos',
          icon: Zap,
          color: 'text-amber-600 bg-amber-50',
          desc: 'Fast barcode counter',
        },
        {
          name: 'Payment In',
          href: '/transactions/payment-in',
          icon: ArrowDownLeft,
          color: 'text-emerald-600 bg-emerald-50',
          desc: 'Receive customer dues',
        },
        {
          name: 'Sale Return',
          href: '/transactions/sales-return',
          icon: RotateCcw,
          color: 'text-rose-600 bg-rose-50',
          desc: 'Credit notes & returns',
        },
      ],
    },
    {
      title: 'Purchase & Expense',
      icon: ShoppingCart,
      items: [
        {
          name: 'Purchase Bills',
          href: '/transactions/purchases',
          icon: ShoppingBag,
          color: 'text-blue-600 bg-blue-50',
          desc: 'Vendor stock inward',
        },
        {
          name: 'Payment Out',
          href: '/transactions/payment-out',
          icon: ArrowUpRight,
          color: 'text-rose-600 bg-rose-50',
          desc: 'Pay vendor balances',
        },
        {
          name: 'Expenses',
          href: '/expenses',
          icon: TrendingDown,
          color: 'text-orange-600 bg-orange-50',
          desc: 'Track operational costs',
        },
        {
          name: 'Purchase Return',
          href: '/transactions/purchase-return',
          icon: RotateCcw,
          color: 'text-slate-600 bg-slate-100',
          desc: 'Debit notes & returns',
        },
      ],
    },
    {
      title: 'Transactions & Finance',
      icon: ArrowLeftRight,
      items: [
        {
          name: 'All Transactions',
          href: '/transactions',
          icon: ArrowLeftRight,
          color: 'text-violet-600 bg-violet-50',
          desc: 'Unified transaction log',
        },
        {
          name: 'Cashflow Ledger',
          href: '/cashflow',
          icon: Wallet,
          color: 'text-slate-700 bg-slate-100',
          desc: 'Cash in / out tracking',
        },
        {
          name: 'Profit & Loss',
          href: '/profit-loss',
          icon: TrendingUp,
          color: 'text-blue-700 bg-blue-50',
          desc: 'Net income & margins',
        },
        {
          name: 'Cash & Bank',
          href: '/accounts',
          icon: Landmark,
          color: 'text-emerald-700 bg-emerald-50',
          desc: 'Bank accounts & wallets',
        },
      ],
    },
    {
      title: 'Online Store',
      icon: Store,
      items: [
        {
          name: 'My Online Store',
          href: '/storefront',
          icon: Store,
          color: 'text-purple-600 bg-purple-50',
          desc: 'Manage e-commerce shop',
        },
        {
          name: 'Explore Stores',
          href: '/explore-stores',
          icon: Globe,
          color: 'text-blue-500 bg-blue-50',
          desc: 'Discover merchant stores',
        },
      ],
    },
    {
      title: 'Reports & Analytics',
      icon: FileBarChart,
      items: [
        {
          name: 'Business Reports',
          href: '/reports',
          icon: FileBarChart,
          color: 'text-indigo-700 bg-indigo-50',
          desc: 'Sales, GST, Stock & P&L',
        },
      ],
    },
    {
      title: 'Sync, Share & Backup',
      icon: RotateCcw,
      items: [
        {
          name: 'Cloud Sync & Share',
          href: '/sync-backup?tab=sync-share',
          icon: RefreshCw,
          color: 'text-emerald-600 bg-emerald-50',
          desc: 'Real-time multi-device sync',
        },
        {
          name: 'Auto Backup',
          href: '/sync-backup?tab=auto-backup',
          icon: Clock,
          color: 'text-cyan-600 bg-cyan-50',
          desc: 'Automated database backups',
        },
        {
          name: 'Restore Backup',
          href: '/sync-backup?tab=restore-backup',
          icon: Upload,
          color: 'text-amber-700 bg-amber-50',
          desc: 'Restore from previous file',
        },
      ],
    },
    {
      title: 'Utilities & Operations',
      icon: Wrench,
      items: [
        {
          name: 'Godowns & Transfer',
          href: '/inventory/godowns',
          icon: Building2,
          color: 'text-cyan-600 bg-cyan-50',
          desc: 'Multi-warehouse stock',
        },
        {
          name: 'Print Barcode Labels',
          href: '/inventory/labels',
          icon: Printer,
          color: 'text-violet-600 bg-violet-50',
          desc: 'Label designer & printing',
        },
        {
          name: 'Manufacturing (BOM)',
          href: '/manufacturing',
          icon: Boxes,
          color: 'text-amber-700 bg-amber-50',
          desc: 'Bill of materials & assembly',
        },
        {
          name: 'Staff & Attendance',
          href: '/staff',
          icon: Users,
          color: 'text-teal-700 bg-teal-50',
          desc: 'Employee roles & shifts',
        },
        {
          name: 'Activity & Audit Log',
          href: '/activity-log',
          icon: History,
          color: 'text-slate-700 bg-slate-100',
          desc: 'Audit trail of all edits',
        },
      ],
    },
    {
      title: 'Settings & Subscription',
      icon: Settings,
      items: [
        {
          name: 'Settings',
          href: '/settings',
          icon: Settings,
          color: 'text-slate-700 bg-slate-100',
          desc: 'Company, taxes & print styles',
        },
        {
          name: 'Plans & Pricing',
          href: '/subscription',
          icon: Crown,
          color: 'text-amber-600 bg-amber-50',
          desc: 'Upgrade plan & invoices',
        },
      ],
    },
  ];

  // Filter features if searching
  const filteredCategories = featureCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.desc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.title.toLowerCase().includes(searchTerm.toLowerCase())
      ),
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
        <ModalPortal>
          <div className="fixed inset-0 z-[120] lg:hidden bg-white flex flex-col font-sans animate-in fade-in duration-150">
            {/* Top Bar */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10 shadow-xs">
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>BizManage Menu</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold">
                    {currentBusiness?.name || 'My Business'}
                  </span>
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">All shortcuts, tools, reports & modules</p>
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
                  placeholder="Search tools, reports, godowns, staff..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Scrollable Compact Feature Grid */}
            <div
              className="flex-1 overflow-y-auto p-3.5 space-y-5 bg-[#F8FAFC] pb-safe"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)' }}
            >
              {filteredCategories.map((category, cIdx) => (
                <div key={cIdx} className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1">
                    <category.icon className="w-3.5 h-3.5 text-slate-500" />
                    <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      {category.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {category.items.map((item, iIdx) => {
                      const ItemIcon = item.icon;
                      const [itemPath, itemQuery] = item.href.split('?');
                      const isActive = pathname === itemPath;

                      return (
                        <div key={iIdx} className="relative group">
                          <Link
                            href={item.href}
                            onClick={() => {
                              setMoreMenuOpen(false);
                              setSearchTerm('');
                            }}
                            className={`p-3 rounded-2xl bg-white border shadow-2xs active:bg-slate-50 active:scale-98 transition-all flex flex-col justify-between gap-1.5 h-full min-h-[72px] ${
                              isActive
                                ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}
                              >
                                <ItemIcon className="w-4 h-4" />
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 leading-tight line-clamp-1">
                                {item.name}
                              </span>
                              {item.desc && (
                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                                  {item.desc}
                                </p>
                              )}
                            </div>
                          </Link>

                          {item.plusHref && (
                            <Link
                              href={item.plusHref}
                              onClick={(e) => {
                                if (item.name.includes('Items') && pathname === '/inventory') {
                                  e.preventDefault();
                                  setMoreMenuOpen(false);
                                  window.dispatchEvent(new CustomEvent('open-create-item'));
                                } else {
                                  setMoreMenuOpen(false);
                                }
                              }}
                              title={`Add new ${item.name}`}
                              className="absolute top-2.5 right-7 w-6 h-6 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors active:scale-90"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
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
        </ModalPortal>
      )}
    </>
  );
}

