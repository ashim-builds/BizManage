'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Plus, ShoppingBag, Menu, X, ChevronRight } from 'lucide-react';
import { sidebarSections } from '@/app/(dashboard)/layout';

interface MobileBottomNavProps {
  onQuickEntry: () => void;
}

export function MobileBottomNav({ onQuickEntry }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const isMoreActive = !['/dashboard', '/transactions/sales', '/transactions/purchases'].includes(pathname || '');

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home, active: pathname === '/dashboard' },
    { name: 'Sales', href: '/transactions/sales', icon: Receipt, active: pathname === '/transactions/sales' },
    { name: 'Quick Entry', action: onQuickEntry, icon: Plus, isAction: true },
    { name: 'Purchases', href: '/transactions/purchases', icon: ShoppingBag, active: pathname === '/transactions/purchases' },
    { name: 'More', action: () => setMoreMenuOpen(true), icon: Menu, active: isMoreActive || moreMenuOpen },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden print:hidden bg-slate-900 border-t border-slate-800 pb-safe pb-safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            if (item.isAction) {
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className="flex flex-col items-center justify-center gap-1 min-w-[64px]"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                </button>
              );
            }
            if (item.action) {
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className={`flex flex-col items-center justify-center gap-1 min-w-[64px] active:scale-95 transition-all ${
                    item.active ? 'text-blue-500' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${item.active ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span className={`text-[10px] font-medium ${item.active ? 'text-blue-500' : 'text-slate-400'}`}>
                    {item.name}
                  </span>
                </button>
              );
            }
            return (
              <Link
                key={idx}
                href={item.href!}
                className={`flex flex-col items-center justify-center gap-1 min-w-[64px] active:scale-95 transition-all ${
                  item.active ? 'text-blue-500' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${item.active ? 'text-blue-500' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-medium ${item.active ? 'text-blue-500' : 'text-slate-400'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* More Menu Bottom Sheet */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMoreMenuOpen(false)} />
          
          <div className="relative bg-slate-900 rounded-t-3xl border-t border-slate-800 flex flex-col max-h-[85vh] shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            {/* Handle / Close bar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white pl-2">Menu</h2>
              <button 
                onClick={() => setMoreMenuOpen(false)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="overflow-y-auto p-4 space-y-6 pb-safe" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
              {sidebarSections.map((section, idx) => {
                // Skip items already in bottom nav
                if (['Dashboard'].includes(section.name)) return null;

                const SectionIcon = section.icon;

                if (!section.children) {
                  return (
                    <div key={idx}>
                      <Link
                        href={section.href!}
                        onClick={() => setMoreMenuOpen(false)}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-800/60 active:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                            <SectionIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <span className="text-base font-semibold text-slate-200">{section.name}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </Link>
                    </div>
                  );
                }

                // If it has children (like Transactions)
                return (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-2">{section.name}</h3>
                    <div className="bg-slate-800/40 border border-slate-800/60 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
                      {section.children.map((child, cIdx) => {
                        // Skip Sales and Purchases as they are in the bottom nav
                        if (['Sales Invoices', 'Purchase Bills'].includes(child.name)) return null;
                        
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            key={cIdx}
                            href={child.href}
                            onClick={() => setMoreMenuOpen(false)}
                            className="flex items-center justify-between p-4 active:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <ChildIcon className="w-5 h-5 text-slate-400" />
                              <span className="text-sm font-medium text-slate-300">{child.name}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
