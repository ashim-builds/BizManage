'use client';

import { ReactNode, useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { QuickEntryModal } from '@/components/common/QuickEntryModal';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { NotificationCenter } from '@/components/common/NotificationCenter';
import toast from 'react-hot-toast';
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
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useNetworkStatus } from '@/services/offlineSyncService';

import { sidebarSections, NavSection, NavGroupItem } from '@/components/layout/navConfig';

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const { user, activeBusinessId, loading, setActiveBusinessId, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, triggerManualSync } = useNetworkStatus();

  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  // Global Quick Entry trigger listener & keyboard shortcut (Ctrl+Q)
  useEffect(() => {
    const handleOpenQuickEntry = () => setQuickEntryOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setQuickEntryOpen((prev) => !prev);
      }
    };

    window.addEventListener('open-quick-entry', handleOpenQuickEntry);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-quick-entry', handleOpenQuickEntry);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Click outside to close user menu dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [userMenuOpen]);

  const userBusinesses = (user?.memberships || []).map((m: any) => m.business).filter(Boolean);
  const currentBiz = (userBusinesses.find((b: any) => b.id === activeBusinessId) || userBusinesses[0]) as any;
  const createdAt = currentBiz?.createdAt ? new Date(currentBiz.createdAt) : new Date();
  const trialDays = 14;
  const trialEndDate = currentBiz?.trialEndsAt
    ? new Date(currentBiz.trialEndsAt)
    : new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);

  const now = new Date();
  const isTrialActive = now < trialEndDate;
  const msLeft = Math.max(0, trialEndDate.getTime() - now.getTime());
  const daysLeftInTrial = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const totalTrialMs = trialDays * 24 * 60 * 60 * 1000;
  const trialProgressPercent = Math.min(100, Math.max(0, Math.round((msLeft / totalTrialMs) * 100)));

  const isPaidPlan = Boolean(
    currentBiz?.subscriptionPackage &&
    !currentBiz?.subscriptionPackage?.name?.toLowerCase().includes('starter') &&
    !currentBiz?.subscriptionPackage?.name?.toLowerCase().includes('free')
  );

  // During 14-day trial or with paid plan, user has full/subscribed access
  const hasSelectedPlan = isTrialActive || Boolean(currentBiz?.subscriptionPackage);

  // Global feature lock calculation - 100% unlocked during trial
  const currentSection = sidebarSections.find((s) => {
    const [sHref] = (s.href || '').split('?');
    return (
      sHref === pathname ||
      s.children?.some((c) => {
        const [cHref] = c.href.split('?');
        return cHref === pathname;
      })
    );
  });
  let requiredFeature = currentSection?.requiredFeature;
  if (!requiredFeature && currentSection?.children) {
    const child = currentSection.children.find((c) => {
      const [cHref] = c.href.split('?');
      return cHref === pathname;
    });
    if (child && (child as any).requiredFeature) {
      requiredFeature = (child as any).requiredFeature;
    }
  }

  const isFeatureLocked = isTrialActive
    ? false
    : Boolean(requiredFeature && !(currentBiz?.subscriptionPackage?.features || []).includes(requiredFeature));

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.isSystemAdmin) {
        router.push('/admin/dashboard');
      } else if (!user.memberships || user.memberships.length === 0) {
        // User has no business yet - send to setup business/store
        router.push('/setup-business');
      }
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMounted(true);
    setMobileOpen(false);

    // Always scroll window to top (0, 0) on route change
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    // Find if the current path belongs to any dropdown section
    const matchingSection = sidebarSections.find(
      (s) =>
        s.children &&
        s.children.some((c) => {
          const [cHref] = c.href.split('?');
          return cHref === pathname;
        })
    );

    if (matchingSection) {
      setOpenSections({ [matchingSection.name]: true });
    } else {
      // Auto close dropdowns when navigating to Home, Parties, Reports, etc.
      setOpenSections({});
    }
  }, [pathname, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-900 relative overflow-hidden font-sans">
        {/* Subtle decorative background gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-blue-50/80 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] bg-indigo-50/60 rounded-full blur-[80px] pointer-events-none" />

        {/* Loading content */}
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center w-20 h-20">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full shadow-inner"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            {/* Inner pulsing logo icon container */}
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center shadow-xs">
              <Building2 className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Initializing BizManage</h2>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
              <span className="flex gap-1 items-center">
                <span
                  className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: '0s' }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></span>
              </span>
              <span>Loading your workspace</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // If user has no businesses, show a redirect screen with fallback button
  if (!user.memberships || user.memberships.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-900 relative overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-blue-50/80 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full shadow-inner" />
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center shadow-xs">
              <Building2 className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Setting up your workspace</h2>
            <p className="text-xs sm:text-sm text-slate-500">Redirecting to business setup...</p>
            <div className="pt-3">
              <Link
                href="/setup-business"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
              >
                Continue to Business Setup &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentBusiness = currentBiz;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Quick Entry Modal Component */}
      <QuickEntryModal isOpen={quickEntryOpen} onClose={() => setQuickEntryOpen(false)} />

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 bg-[#16192E] border-r border-[#222744] z-40 flex flex-col transition-all duration-300 print:hidden ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-[60px] overflow-visible' : 'w-64'}`}
      >
        <div
          className={`py-4 border-b border-[#222744] flex items-center min-h-[68px] ${sidebarCollapsed ? 'px-2 justify-center' : 'px-5 justify-between'}`}
        >
          {!sidebarCollapsed && (
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo-full-transparent.png"
                alt="BizManage Logo"
                className="h-9 sm:h-10 w-auto max-w-[150px] object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/" className="flex items-center justify-center group" title="BizManage">
              <img
                src="/logo-full-transparent.png"
                alt="BizManage"
                className="h-7 w-7 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
              />
            </Link>
          )}
          <div className="flex items-center gap-1">
            {/* Collapse / Expand toggle — desktop only */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-[#212646] transition-all"
            >
              {sidebarCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav
          className={`flex-1 p-2 space-y-0.5 ${sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto scrollbar-thin scrollbar-thumb-[#222744]'}`}
        >
          {sidebarSections.map((section) => {
            const Icon = section.icon;
            const isActive = pathname === section.href || (section.href === '/dashboard' && pathname === '/');

            if (!section.children) {
              return (
                <div
                  key={section.name}
                  className={`group/nav relative flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-[#212646] text-white font-semibold border-l-4 border-[#EF4444] rounded-r-xl shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-[#212646]/60 rounded-xl'
                  } ${sidebarCollapsed ? 'pr-0 justify-center' : 'pr-2'}`}
                >
                  <Link
                    href={section.href!}
                    className={`flex-1 flex items-center gap-3 py-2 text-xs font-medium min-w-0 ${
                      sidebarCollapsed ? 'px-3 justify-center' : 'px-3'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                    {!sidebarCollapsed && <span className="truncate">{section.name}</span>}
                  </Link>

                  {/* Single Item Tooltip on Hover in Collapsed Mode */}
                  {sidebarCollapsed && (
                    <div className="absolute left-[54px] top-1/2 -translate-y-1/2 hidden group-hover/nav:flex items-center bg-[#16192E] border border-[#2B3258] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none before:content-[''] before:absolute before:-left-1.5 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:bg-[#16192E] before:border-l before:border-b before:border-[#2B3258] before:rotate-45">
                      {section.name}
                    </div>
                  )}

                  {section.hasPlusButton && !sidebarCollapsed && (
                    <Link
                      href={section.plusHref || section.href!}
                      onClick={(e) => {
                        if (section.name === 'Items' && pathname === '/inventory') {
                          e.preventDefault();
                          window.dispatchEvent(new CustomEvent('open-create-item'));
                        }
                      }}
                      title={`Add New ${section.name === 'Parties' ? 'Party' : 'Item'}`}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 active:scale-90 transition-all shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              );
            }

            const isGroupActive = section.children.some((c) => {
              const [cPath] = c.href.split('?');
              return cPath === pathname;
            });
            const isSectionOpen = openSections[section.name] ?? false;

            // In collapsed mode, render group as icon-only button with rich floating flyout menu on hover
            if (sidebarCollapsed) {
              return (
                <div key={section.name} className="relative group/collapsed">
                  <div
                    className={`flex items-center justify-center w-full py-2 rounded-xl transition-all cursor-pointer ${
                      isGroupActive
                        ? 'bg-[#212646] text-white border-l-4 border-[#EF4444]'
                        : 'text-slate-300 hover:text-white hover:bg-[#212646]/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isGroupActive ? 'text-white' : 'text-slate-300'}`} />
                  </div>

                  {/* Floating Flyout Dropdown Menu on Hover */}
                  <div className="absolute left-[54px] top-0 hidden group-hover/collapsed:flex flex-col bg-[#16192E] border border-[#2B3258] rounded-xl shadow-2xl p-1.5 min-w-[210px] z-50 animate-in fade-in zoom-in-95 duration-150 before:content-[''] before:absolute before:-left-1.5 before:top-3.5 before:w-3 before:h-3 before:bg-[#16192E] before:border-l before:border-b before:border-[#2B3258] before:rotate-45">
                    <div className="px-3 py-1.5 border-b border-[#222744] mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {section.name}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {section.children.map((child) => {
                        const ChildIcon = child.icon;
                        const [childPath, childQuery] = child.href.split('?');
                        const isChildActive = childQuery
                          ? pathname === childPath &&
                            (currentTab === new URLSearchParams(childQuery).get('tab') ||
                              (!currentTab && new URLSearchParams(childQuery).get('tab') === 'sync-share'))
                          : pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                              isChildActive
                                ? 'bg-[#212646] text-white font-bold border-l-2 border-[#EF4444]'
                                : 'text-slate-300 hover:text-white hover:bg-[#212646]/80'
                            }`}
                          >
                            {ChildIcon && (
                              <ChildIcon
                                className={`w-3.5 h-3.5 shrink-0 ${isChildActive ? 'text-[#EF4444]' : 'text-slate-400'}`}
                              />
                            )}
                            <span className="truncate">{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={section.name} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setOpenSections((prev) => (prev[section.name] ? {} : { [section.name]: true }));
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-r-xl text-xs font-medium cursor-pointer transition-all ${
                    isGroupActive
                      ? 'text-white bg-[#212646] font-semibold border-l-4 border-[#EF4444]'
                      : 'text-slate-300 hover:text-white hover:bg-[#212646]/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 ${isGroupActive ? 'text-white' : 'text-slate-300'}`} />
                    <span className="truncate">{section.name}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-250 ease-in-out ${
                      isSectionOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-250 ease-in-out ${
                    isSectionOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pl-6 space-y-0.5 border-l border-[#232847] ml-5 my-0.5 py-0.5">
                      {section.children.map((child) => {
                        const ChildIcon = child.icon;
                        const [childPath, childQuery] = child.href.split('?');
                        const isChildActive = childQuery
                          ? pathname === childPath &&
                            (currentTab === new URLSearchParams(childQuery).get('tab') ||
                              (!currentTab && new URLSearchParams(childQuery).get('tab') === 'sync-share'))
                          : pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={`flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium transition-all duration-150 ${
                              isChildActive
                                ? 'bg-[#212646] text-white font-bold border-l-2 border-[#EF4444] rounded-r-lg'
                                : 'text-slate-400 hover:text-white hover:bg-[#212646]/40 rounded-lg'
                            }`}
                          >
                            {ChildIcon && (
                              <ChildIcon className={`w-3.5 h-3.5 ${isChildActive ? 'text-white' : 'text-slate-400'}`} />
                            )}
                            <span className="truncate">{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className={`border-t border-[#222744] space-y-2 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
          {!sidebarCollapsed && isTrialActive && (
            <div className="rounded-2xl overflow-hidden border border-[#FDE047]/30 shadow-md">
              <div className="p-3.5 bg-gradient-to-b from-[#FFFDF0] to-[#FFF1CD] text-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-[#1E293B]">
                    {daysLeftInTrial} {daysLeftInTrial === 1 ? 'day' : 'days'} Free Trial left
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    All Free
                  </span>
                </div>
                <div className="w-full bg-[#FFE6A8] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                    style={{ width: `${trialProgressPercent}%` }}
                  />
                </div>
              </div>

              <Link
                href="/subscription"
                className="flex items-center justify-between px-3.5 py-2.5 bg-[#212646] hover:bg-[#282E55] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black text-[10px] shadow-xs">
                    ★
                  </div>
                  <span className="font-extrabold text-xs text-[#FDE047] group-hover:text-yellow-200 transition-colors">
                    Get BizManage Premium
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}

          {!sidebarCollapsed && !isTrialActive && !isPaidPlan && (
            <div className="rounded-2xl overflow-hidden border border-rose-500/40 shadow-md">
              <div className="p-3.5 bg-gradient-to-b from-rose-50 to-rose-100 text-rose-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-rose-900">14-Day Free Trial Expired</h4>
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-200/80 px-1.5 py-0.5 rounded">
                    Expired
                  </span>
                </div>
                <p className="text-[10px] text-rose-700 font-medium">
                  Please choose a subscription plan to unlock all premium features.
                </p>
              </div>
              <Link
                href="/subscription"
                className="flex items-center justify-between px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white transition-colors group"
              >
                <span className="font-extrabold text-xs">Choose Plan Now &rarr;</span>
              </Link>
            </div>
          )}

          {!sidebarCollapsed && !isTrialActive && isPaidPlan && (
            <div className="rounded-2xl overflow-hidden border border-emerald-500/30 bg-[#212646] p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {currentBiz?.subscriptionPackage?.name || 'Active Subscription'}
                </span>
                <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                  PRO
                </span>
              </div>
              <Link
                href="/subscription"
                className="text-[10px] text-slate-400 hover:text-white flex items-center justify-between pt-1 transition-colors"
              >
                <span>Manage Plan & Invoices</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {sidebarCollapsed && (
            <Link
              href="/subscription"
              title="Get BizManage Premium"
              className="flex items-center justify-center w-full py-2 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-[10px] hover:opacity-90 transition-opacity shadow-xs"
            >
              ★
            </Link>
          )}

          <div
            onClick={() => router.push('/settings')}
            className={`rounded-2xl bg-[#212646] hover:bg-[#282E55] border border-[#2D335E] flex items-center cursor-pointer transition-all ${
              sidebarCollapsed ? 'p-2 justify-center' : 'p-2.5 justify-between'
            }`}
            title="Business Profile & Settings"
          >
            <div className={`flex items-center min-w-0 ${sidebarCollapsed ? '' : 'gap-2.5'}`}>
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/20 flex items-center justify-center shrink-0 shadow-xs overflow-hidden p-0.5">
                {currentBiz?.logoUrl ? (
                  <img
                    src={currentBiz.logoUrl}
                    alt={currentBiz?.name || 'Business Logo'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                    {(currentBusiness?.name || 'RB').substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              {!sidebarCollapsed && (
                <span className="font-bold text-white text-xs truncate">{currentBusiness?.name || 'RB Hardware'}</span>
              )}
            </div>
            {!sidebarCollapsed && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
          </div>
        </div>
      </aside>

      {/* Main Content Shell (Clean Light Workspace) */}
      <main
        className={`flex-1 min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col pb-20 lg:pb-0 print:pl-0 print:bg-white print:min-h-0 print:pb-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[60px]' : 'lg:pl-64'}`}
      >
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 bg-white backdrop-blur-md z-30 print:hidden gap-2 shadow-xs">
          {/* Mobile View: Logo (< lg) */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
              <img
                src="/icon-192x192.png"
                alt="BizManage"
                className="h-8 w-8 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.28)] group-hover:scale-105 transition-transform shrink-0"
              />
            </Link>
          </div>

          {/* Desktop View: Breadcrumbs (>= lg) */}
          <div className="hidden lg:flex items-center gap-4 min-w-0">
            <div className="min-w-0 truncate">
              <Breadcrumbs />
            </div>
          </div>

          {/* Desktop View: Global Search (>= md) */}
          <div className="flex-1 max-w-xl mx-4 hidden md:flex justify-center">
            <GlobalSearch />
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Dynamic Notifications Dropdown */}
            <NotificationCenter
              activeBusinessId={activeBusinessId}
              readNotifIds={readNotifIds}
              setReadNotifIds={setReadNotifIds}
            />

            {/* Mobile Business Pill (< lg) */}
            <div className="lg:hidden relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                  {currentBiz?.logoUrl ? (
                    <img
                      src={currentBiz.logoUrl}
                      alt={currentBiz?.name || 'Business Logo'}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="w-full h-full bg-blue-600 rounded-md flex items-center justify-center font-black text-[9px] text-white">
                      {(currentBiz?.name || 'RB').substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-800 max-w-[85px] sm:max-w-[120px] truncate">
                  {currentBiz?.name || 'RB Hardware'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
            </div>

            {/* Desktop User Dropdown Menu (>= lg) */}
            <div className="hidden lg:block relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                  {currentBiz?.logoUrl ? (
                    <img
                      src={currentBiz.logoUrl}
                      alt={currentBiz?.name || 'Business Logo'}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="w-full h-full bg-blue-600 rounded-md flex items-center justify-center font-bold text-[10px] text-white">
                      {(user?.name || 'U').substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                  {user?.name || 'Account'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {userMenuOpen && (
                <>
                  {/* Backdrop for mobile closing */}
                  <div
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden"
                    onClick={() => setUserMenuOpen(false)}
                  />

                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900">{user.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-500" /> Account Settings
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="p-1.5 sm:p-4 md:p-6 lg:p-8 flex-1">
          {mounted &&
          !hasSelectedPlan &&
          pathname !== '/subscription' &&
          pathname !== '/settings' &&
          pathname !== '/dashboard' ? (
            <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-amber-500/30 text-center space-y-6 shadow-2xl font-sans">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Crown className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">14-Day Free Trial Ended</h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Your 14-day full free trial has concluded. To continue using all billing features, godowns, WhatsApp,
                  and accounting reports, please select a subscription plan.
                </p>
              </div>
              <Link
                href="/subscription"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all"
              >
                <Crown className="w-4 h-4" /> Go to Subscription Page & Choose Plan
              </Link>
            </div>
          ) : mounted &&
            isFeatureLocked &&
            pathname !== '/subscription' &&
            pathname !== '/settings' &&
            pathname !== '/dashboard' ? (
            <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-red-500/30 text-center space-y-6 shadow-2xl font-sans">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <Crown className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">Feature Locked</h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Your current subscription plan (
                  <span className="font-bold text-blue-400">{currentBiz?.subscriptionPackage?.name}</span>) does not
                  include access to this feature. Please upgrade your plan to unlock it.
                </p>
              </div>
              <Link
                href="/subscription"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all"
              >
                <Crown className="w-4 h-4" /> View Upgrade Options
              </Link>
            </div>
          ) : (
            <>
              {children}

              {/* Mobile Bottom Free Trial Card (Visible on mobile during active free trial) */}
              {mounted && isTrialActive && pathname !== '/subscription' && (
                <div className="lg:hidden mt-6 mb-3 rounded-2xl overflow-hidden border border-[#FDE047]/40 shadow-sm bg-[#16192E]">
                  <div className="p-3.5 bg-gradient-to-b from-[#FFFDF0] to-[#FFF1CD] text-[#1E293B] space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs text-[#1E293B]">
                        {daysLeftInTrial} {daysLeftInTrial === 1 ? 'day' : 'days'} Free Trial left
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        All Free
                      </span>
                    </div>
                    <div className="w-full bg-[#FFE6A8] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                        style={{ width: `${trialProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    href="/subscription"
                    className="flex items-center justify-between px-3.5 py-2.5 bg-[#212646] hover:bg-[#282E55] active:bg-[#1c203b] transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black text-[10px] shadow-xs">
                        ★
                      </div>
                      <span className="font-extrabold text-xs text-[#FDE047] group-hover:text-yellow-200 transition-colors">
                        Get BizManage Premium
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onQuickEntry={() => setQuickEntryOpen(true)} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
