'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  FileText,
  LogOut,
  ShieldCheck,
  FileBarChart,
  Activity,
  ChevronDown,
  Building,
  CreditCard,
  Menu,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, logout } = useAuth();
  
  // To avoid hydration mismatch or flashing content before auth check
  const [mounted, setMounted] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && mounted) {
      if (!user && pathname !== '/admin/login') {
        router.push('/admin/login');
      } else if (user && !user.isSystemAdmin && pathname !== '/admin/login') {
        router.push('/dashboard');
      }
    }
  }, [user, authLoading, mounted, router, pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Fetch pending payments count for notification badge
  useEffect(() => {
    if (user?.isSystemAdmin) {
      api.get('/admin/stats')
        .then((res) => {
          if (res.data?.success && res.data?.data?.payments?.pendingCount !== undefined) {
            setPendingCount(res.data.data.payments.pendingCount);
          }
        })
        .catch(() => {});
    }
  }, [user, pathname]);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  // Prevent rendering admin layout wrapper on the login page itself
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!mounted || authLoading || !user || !user.isSystemAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const navItems: { name: string; href: string; icon: any; badge?: number; disabled?: boolean }[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Payment Requests', href: '/admin/payments', icon: CreditCard, badge: pendingCount },
    { name: 'Packages', href: '/admin/packages', icon: Package },
    { name: 'Businesses', href: '/admin/businesses', icon: Building },
    { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
    { name: 'Logs', href: '/admin/logs', icon: Activity },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-300 font-sans flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#0f1013] border-r border-slate-800/60 flex flex-col hidden lg:flex fixed inset-y-0 z-50">
        <Link href="/" className="h-16 flex items-center px-6 gap-3 shrink-0 border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
          <Image src="/logo-full-transparent.png" alt="BizManage" width={110} height={32} className="object-contain" />
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">ADMIN</span>
        </Link>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            if (item.disabled) {
              return (
                <div key={item.name} className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </div>
                  <span className="text-[9px] uppercase tracking-wider bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Soon</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
                  {item.name}
                </div>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-4 mt-auto border-t border-slate-800/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 w-full transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="relative w-72 max-w-[80vw] bg-[#0f1013] border-r border-slate-800 flex flex-col h-full z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Image src="/logo-full-transparent.png" alt="BizManage" width={100} height={28} className="object-contain" />
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">ADMIN</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {item.name}
                    </div>
                    {Boolean(item.badge && item.badge > 0) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Drawer Footer User Info & Sign Out */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center gap-3 mb-3 px-1">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-slate-700 text-xs font-medium text-slate-300 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-800/60 bg-[#0f1013]/90 backdrop-blur-md sticky top-0 z-30">
          {/* Mobile Hamburger & Brand */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <Image src="/logo-full-transparent.png" alt="BizManage" width={90} height={26} className="object-contain" />
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">ADMIN</span>
            </Link>
          </div>

          {/* Desktop spacer */}
          <div className="hidden lg:block font-semibold text-sm text-slate-400">
            BizManage Superadmin Center
          </div>

          {/* User Profile Avatar & Dropdown */}
          <div className="relative">
            <div 
              className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-800/50 p-1.5 rounded-xl transition-colors"
              onClick={() => setProfileOpen(!isProfileOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-md">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 leading-tight">System Admin</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-0.5 hidden sm:block transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProfileOpen(false)}
                ></div>
                <div className="absolute top-12 right-0 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-1.5">
                  <div className="p-2.5 border-b border-slate-800 mb-1">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link 
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </Link>
                  <button 
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors w-full text-left mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for Admin */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0f1013]/95 border-t border-slate-800/90 backdrop-blur-md px-2 py-1.5 flex items-center justify-around">
        <Link
          href="/admin/dashboard"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-all ${
            pathname === '/admin/dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </Link>

        <Link
          href="/admin/payments"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 relative transition-all ${
            pathname === '/admin/payments' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px]">Payments</span>
          {pendingCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </Link>

        <Link
          href="/admin/businesses"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-all ${
            pathname === '/admin/businesses' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Building className="w-5 h-5" />
          <span className="text-[10px]">Tenants</span>
        </Link>

        <Link
          href="/admin/packages"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-all ${
            pathname === '/admin/packages' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px]">Packages</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 text-slate-400 hover:text-white transition-all`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>
    </div>
  );
}
