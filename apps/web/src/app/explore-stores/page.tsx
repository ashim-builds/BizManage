'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Store,
  Search,
  MapPin,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Building2,
  X,
  Phone,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { usePublicStores } from '@/hooks/useStorefront';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useAuth } from '@/providers/AuthProvider';

export default function ExploreStoresPage() {
  const { user } = useAuth();
  const { data: publicStores, isLoading } = usePublicStores();
  const [searchQuery, setSearchQuery] = useState('');

  const stores = publicStores || [];

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    const term = searchQuery.trim().toLowerCase();
    return stores.filter((s: any) => {
      const title = (s.title || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const address = (s.address || '').toLowerCase();
      const slug = (s.slug || '').toLowerCase();
      return title.includes(term) || desc.includes(term) || address.includes(term) || slug.includes(term);
    });
  }, [stores, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500 selection:text-white flex flex-col justify-between font-sans">
      <div>
        <PublicHeader />

        {/* Hero Header */}
        <section className="relative pt-16 pb-12 px-6 max-w-7xl mx-auto text-center border-b border-slate-800/80">
          <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Store className="w-4 h-4" />
            <span>Public E-Commerce Catalog Directory</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
            Explore Active <span className="text-emerald-400">Online Stores</span>
          </h1>

          <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Browse verified online storefronts powered by BizManage ERP. View product catalogs, compare transparent pricing, and place direct online orders.
          </p>

          {/* Quick Create Store / Go to Dashboard CTA */}
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href={user ? (user.memberships?.length > 0 ? "/dashboard" : "/setup-business") : "/register"}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <Store className="w-4 h-4" />
              <span>{user?.memberships?.length ? "Open Workspace Dashboard" : "Create Your Business & Online Store"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Search Filter Bar */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search online stores by name, location, or handle…"
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* Stores Catalog Directory Grid */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
              <Store className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Stores Found</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {searchQuery
                  ? `No published online stores matched "${searchQuery}". Try searching with a different term.`
                  : 'There are currently no active online stores published in the directory.'}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700"
                >
                  Clear Search Filter
                </button>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all"
                >
                  Create & Publish Your Store <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Showing {filteredStores.length} published online store{filteredStores.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredStores.map((store: any) => (
                  <div
                    key={store.slug}
                    className="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all p-6 flex flex-col justify-between space-y-5 hover:shadow-xl hover:shadow-emerald-500/5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg shrink-0 overflow-hidden">
                          {store.logoUrl ? (
                            <img src={store.logoUrl} alt={store.title} className="w-full h-full object-contain p-1 rounded-xl" />
                          ) : (
                            store.title ? store.title.substring(0, 2).toUpperCase() : <Store className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                            {store.title}
                          </h3>
                          {store.address ? (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {store.address}
                            </p>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Verified Online Store
                            </span>
                          )}
                        </div>
                      </div>

                      {store.description && (
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                          {store.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        /store/{store.slug}
                      </span>
                      <Link
                        href={`/store/${store.slug}`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                      >
                        Visit Store <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
