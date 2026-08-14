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
} from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, logout } = useAuth();
  
  // To avoid hydration mismatch or flashing content before auth check
  const [mounted, setMounted] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);

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

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Packages', href: '/admin/packages', icon: Package },
    { name: 'Businesses', href: '/admin/businesses', icon: Building },
    { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
    { name: 'Logs', href: '/admin/logs', icon: Activity },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-300 font-sans flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#0f1013] border-r border-slate-800/60 flex flex-col hidden lg:flex fixed inset-y-0 z-50">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
                {item.name}
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
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-end px-6 border-b border-slate-800/60 bg-[#0f1013]/80 backdrop-blur-md sticky top-0 z-40 relative">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-800/50 p-1.5 rounded-lg transition-colors pr-3"
            onClick={() => setProfileOpen(!isProfileOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-lg">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-white leading-tight">{user.name}</p>
              <p className="text-xs text-slate-400 leading-tight">System Admin</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 ml-1 hidden sm:block transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setProfileOpen(false)}
              ></div>
              <div className="absolute top-14 right-6 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b border-slate-800/60 block sm:hidden">
                  <p className="text-sm font-semibold text-white px-2 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 px-2 truncate">{user.email}</p>
                </div>
                <div className="p-1">
                  <Link 
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button 
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors w-full text-left mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
