'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/services/utilityService';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { QuickEntryModal } from '@/components/common/QuickEntryModal';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Package,
  TrendingDown,
  TrendingUp,
  Wallet,
  FileBarChart,
  Settings,
  Crown,
  LogOut,
  Building2,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Bell,
  Plus,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  RotateCcw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  BellOff,
} from 'lucide-react';

interface NavGroupItem {
  name: string;
  href: string;
  icon: any;
}

interface NavSection {
  name: string;
  icon: any;
  href?: string;
  children?: NavGroupItem[];
}

const sidebarSections: NavSection[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Transactions',
    icon: Receipt,
    children: [
      { name: 'Payment In', href: '/transactions/payment-in', icon: ArrowDownLeft },
      { name: 'Sales Invoices', href: '/transactions/sales', icon: Receipt },
      { name: 'Sales Return', href: '/transactions/sales-return', icon: RotateCcw },
      { name: 'Payment Out', href: '/transactions/payment-out', icon: ArrowUpRight },
      { name: 'Purchase Bills', href: '/transactions/purchases', icon: ShoppingBag },
      { name: 'Purchase Return', href: '/transactions/purchase-return', icon: RotateCcw },
    ],
  },
  { name: 'Parties', href: '/parties', icon: Users },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Cash & Bank', href: '/accounts', icon: Wallet },
  { name: 'Expenses', href: '/expenses', icon: TrendingDown },
  { name: 'Other Income', href: '/income', icon: TrendingUp },
  { name: 'Cashflow', href: '/cashflow', icon: Wallet },
  { name: 'Reports', href: '/reports', icon: FileBarChart },
  { name: 'Subscription', href: '/subscription', icon: Crown },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeBusinessId, loading, setActiveBusinessId, logout } = useAuth();
  const { data: notifData } = useNotifications();

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bizmanage_read_notifications');
        return saved ? JSON.parse(saved) : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifications.filter((n) => !readNotifIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizmanage_read_notifications', JSON.stringify(updated));
    }
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(pathname?.startsWith('/transactions') ?? false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [hasSelectedPlan, setHasSelectedPlan] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMounted(true);
    if (pathname?.startsWith('/transactions')) {
      setTransactionsOpen(true);
    }
    setMobileOpen(false);

    if (typeof window !== 'undefined') {
      const plan = localStorage.getItem('bizmanage_selected_plan');
      setHasSelectedPlan(!!plan);
    }
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userBusinesses = (user.memberships || []).map((m) => m.business).filter(Boolean);
  const currentBusiness = userBusinesses.find((b) => b.id === activeBusinessId) || userBusinesses[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Quick Entry Modal Component */}
      <QuickEntryModal isOpen={quickEntryOpen} onClose={() => setQuickEntryOpen(false)} />

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col transition-transform duration-300 print:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & Business Switcher Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {currentBusiness?.logoUrl ? (
              <img
                src={currentBusiness.logoUrl}
                alt="Business Logo"
                className="w-8 h-8 rounded-xl object-contain bg-slate-950 border border-slate-700 p-0.5 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/30 shrink-0">
                BM
              </div>
            )}
            <div className="overflow-hidden">
              <h2 className="text-lg font-bold text-white truncate font-sans">BizManage</h2>
              <p className="text-[10px] text-slate-400 font-medium truncate">ERP Edition</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business Selector Area */}
        <div className="p-3 border-b border-slate-800/80">
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {currentBusiness?.name || 'My Business'}
                </p>
                <p className="text-[10px] text-slate-400">Active Tenant</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {sidebarSections.map((section) => {
            const Icon = section.icon;
            const isActive = pathname === section.href;

            if (!section.children) {
              return (
                <Link
                  key={section.name}
                  href={section.href!}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{section.name}</span>
                </Link>
              );
            }

            const isGroupActive = pathname?.startsWith('/transactions') ?? false;
            return (
              <div key={section.name} className="space-y-1">
                <button
                  onClick={() => setTransactionsOpen(!transactionsOpen)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isGroupActive
                      ? 'text-white bg-slate-800/80 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-blue-400" />
                    <span>{section.name}</span>
                  </div>
                  {transactionsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {transactionsOpen && (
                  <div className="pl-6 space-y-1 border-l border-slate-800 ml-5 my-1">
                    {section.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = pathname === child.href;
                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                            isChildActive
                              ? 'bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                        >
                          <ChildIcon className="w-3.5 h-3.5 text-slate-400" />
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-400">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-slate-700 text-xs font-medium text-slate-300 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <main className="lg:pl-64 flex-1 min-h-screen bg-slate-950 flex flex-col print:pl-0 print:bg-white print:min-h-0">
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-30 print:hidden gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg border border-slate-800 bg-slate-900 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 truncate">
              <Breadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Entry Trigger Button */}
            <button
              onClick={() => setQuickEntryOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap shrink-0"
              title="Fast transaction entry interface"
            >
              <Zap className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-300" />  <span className="hidden sm:inline">Quick Entry</span>
            </button>

            {/* Dynamic Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  const nextState = !notificationsOpen;
                  setNotificationsOpen(nextState);
                }}
                className="relative p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-lg animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-96 max-h-[480px] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-slate-400" />
                      <h4 className="text-xs font-bold text-white">Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white">{unreadCount}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <button onClick={() => setNotificationsOpen(false)} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <BellOff className="w-8 h-8 text-slate-700 mb-3" />
                      <p className="text-xs font-semibold text-slate-500">All caught up!</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">No active alerts right now.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/50">
                      {notifications.map((item) => {
                        const isRead = readNotifIds.includes(item.id);
                        const cfg = {
                          WARNING:  { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/20',  dot: 'bg-amber-400' },
                          ERROR:    { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',    dot: 'bg-red-400' },
                          SUCCESS:  { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
                          INFO:     { icon: Info,           color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    dot: 'bg-blue-400' },
                        }[item.type] || { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400' };
                        const Icon = cfg.icon;

                        const relativeTime = (() => {
                          const diff = Date.now() - new Date(item.createdAt).getTime();
                          const mins = Math.floor(diff / 60000);
                          if (mins < 1) return 'just now';
                          if (mins < 60) return `${mins}m ago`;
                          const hrs = Math.floor(mins / 60);
                          if (hrs < 24) return `${hrs}h ago`;
                          return `${Math.floor(hrs / 24)}d ago`;
                        })();

                        return (
                          <Link
                            key={item.id}
                            href={item.link}
                            onClick={() => {
                              const updated = Array.from(new Set([...readNotifIds, item.id]));
                              setReadNotifIds(updated);
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('bizmanage_read_notifications', JSON.stringify(updated));
                              }
                              setNotificationsOpen(false);
                            }}
                            className={`flex items-start gap-3 px-4 py-3 transition-all hover:bg-slate-800/50 ${
                              isRead ? 'opacity-60' : ''
                            }`}
                          >
                            {/* Type Icon */}
                            <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${cfg.bg} border ${cfg.border}`}>
                              <Icon className={`w-4 h-4 ${cfg.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs font-bold truncate ${cfg.color}`}>{item.title}</p>
                                <span className="text-[10px] text-slate-500 shrink-0">{relativeTime}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{item.message}</p>
                            </div>

                            {/* Unread dot */}
                            {!isRead && (
                              <div className={`shrink-0 w-2 h-2 rounded-full mt-2 ${cfg.dot}`} />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-3 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-white hidden md:inline">{user.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="text-xs font-bold text-white">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="w-3.5 h-3.5" /> Account Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-8 flex-1">
          {mounted && !hasSelectedPlan && pathname !== '/subscription' && pathname !== '/settings' && pathname !== '/dashboard' ? (
            <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-amber-500/30 text-center space-y-6 shadow-2xl font-sans">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Crown className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">Subscription Selection Required</h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  You must select a subscription plan (including the <span className="font-bold text-emerald-400">Free Starter plan</span>) before accessing this feature.
                </p>
              </div>
              <Link
                href="/subscription"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all"
              >
                <Crown className="w-4 h-4" /> Go to Subscription Page & Choose Plan
              </Link>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
