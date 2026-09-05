'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  X,
  Check,
  CheckCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Search,
  ArrowLeft,
  ArrowRight,
  Package,
  Wallet,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  NotificationItem,
  useNotifications,
  useMarkNotificationsRead,
  useMarkNotificationsUnread,
} from '@/services/utilityService';
import { ModalPortal } from './ModalPortal';

interface NotificationCenterProps {
  activeBusinessId?: string | null;
  readNotifIds?: string[];
  setReadNotifIds?: (ids: string[]) => void;
  userReadNotifications?: string[];
}

type FilterCategory = 'all' | 'unread' | 'stock' | 'payment';

export function NotificationCenter({
  activeBusinessId,
  readNotifIds,
  setReadNotifIds,
}: NotificationCenterProps) {
  const { data: notifData, isLoading } = useNotifications(activeBusinessId);
  const markReadMutation = useMarkNotificationsRead(activeBusinessId);
  const markUnreadMutation = useMarkNotificationsUnread(activeBusinessId);

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  // Sync server-persisted readNotifIds with parent state if provided
  useEffect(() => {
    if (notifData?.readNotifIds && setReadNotifIds) {
      setReadNotifIds(notifData.readNotifIds);
    }
  }, [notifData?.readNotifIds, setReadNotifIds]);

  // Guarantee newest notifications appear AT THE TOP
  const notifications = useMemo(() => {
    const list = notifData?.notifications || [];
    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [notifData?.notifications]);

  // Unread count
  const unreadCount = useMemo(() => {
    if (typeof notifData?.unreadCount === 'number') {
      return notifData.unreadCount;
    }
    return notifications.filter((n) => !n.isRead).length;
  }, [notifData?.unreadCount, notifications]);

  // Category counts
  const stockCount = useMemo(() => {
    return notifications.filter(
      (n) =>
        n.type === 'WARNING' ||
        n.title.toLowerCase().includes('stock') ||
        n.message.toLowerCase().includes('stock') ||
        n.message.toLowerCase().includes('inventory')
    ).length;
  }, [notifications]);

  const paymentCount = useMemo(() => {
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes('payment') ||
        n.title.toLowerCase().includes('due') ||
        n.message.toLowerCase().includes('payment') ||
        n.message.toLowerCase().includes('due') ||
        n.message.toLowerCase().includes('settled') ||
        n.message.toLowerCase().includes('bill') ||
        n.message.toLowerCase().includes('invoice')
    ).length;
  }, [notifications]);

  // Click outside to close handler for desktop dropdown (ignores touches inside mobile sheet)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      // Do nothing if click/touch is inside desktop dropdown or mobile sheet
      if (desktopContainerRef.current?.contains(target)) return;
      if (mobileSheetRef.current?.contains(target)) return;

      // On mobile (< 640px), the sheet is fullscreen portal; don't close on touch events
      if (typeof window !== 'undefined' && window.innerWidth < 640) return;

      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    if (setReadNotifIds) {
      setReadNotifIds(allIds);
    }
    markReadMutation.mutate({ markAll: true, notificationIds: allIds });
  };

  const toggleSingleRead = (e: React.MouseEvent, item: NotificationItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (item.isRead) {
      if (setReadNotifIds && readNotifIds) {
        setReadNotifIds(readNotifIds.filter((id) => id !== item.id));
      }
      markUnreadMutation.mutate({ notificationId: item.id });
    } else {
      if (setReadNotifIds && readNotifIds) {
        setReadNotifIds(Array.from(new Set([...readNotifIds, item.id])));
      }
      markReadMutation.mutate({ notificationId: item.id });
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      if (setReadNotifIds && readNotifIds) {
        setReadNotifIds(Array.from(new Set([...readNotifIds, item.id])));
      }
      markReadMutation.mutate({ notificationId: item.id });
    }
    setIsOpen(false);
  };

  // Filter items by category & search query
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Category filter
      if (activeFilter === 'unread' && item.isRead) return false;
      if (activeFilter === 'stock') {
        const isStock =
          item.type === 'WARNING' ||
          item.title.toLowerCase().includes('stock') ||
          item.message.toLowerCase().includes('stock') ||
          item.message.toLowerCase().includes('inventory');
        if (!isStock) return false;
      }
      if (activeFilter === 'payment') {
        const isPayment =
          item.title.toLowerCase().includes('payment') ||
          item.title.toLowerCase().includes('due') ||
          item.message.toLowerCase().includes('payment') ||
          item.message.toLowerCase().includes('due') ||
          item.message.toLowerCase().includes('settled') ||
          item.message.toLowerCase().includes('bill') ||
          item.message.toLowerCase().includes('invoice');
        if (!isPayment) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMessage = item.message.toLowerCase().includes(q);
        return matchesTitle || matchesMessage;
      }
      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  // Helper for notification visual config
  const getNotificationStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'WARNING':
        return {
          icon: AlertTriangle,
          color: 'text-amber-700',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          accent: 'border-l-amber-500',
        };
      case 'ERROR':
        return {
          icon: XCircle,
          color: 'text-rose-700',
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
          accent: 'border-l-rose-500',
        };
      case 'SUCCESS':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-700',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          accent: 'border-l-emerald-500',
        };
      case 'INFO':
      default:
        return {
          icon: Info,
          color: 'text-blue-700',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          accent: 'border-l-blue-500',
        };
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'just now';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff) || diff < 0) return 'just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  // Content for the Notification List (shared between mobile & desktop)
  const renderNotificationList = (isMobileView: boolean) => (
    <div
      className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white overscroll-contain"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Checking for alerts & updates...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="py-16 px-6 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
            <BellOff className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {searchQuery
                ? 'No matching notifications found'
                : activeFilter === 'unread'
                ? 'No unread notifications'
                : activeFilter === 'stock'
                ? 'No low stock alerts'
                : activeFilter === 'payment'
                ? 'No payment / bill notices'
                : 'All caught up!'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery
                ? 'Try searching with another keyword or clear the search input.'
                : activeFilter === 'unread'
                ? 'You have reviewed all your pending alerts.'
                : 'Stock warnings, customer payments, and sales updates will appear here automatically.'}
            </p>
          </div>
          {(searchQuery || activeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        filteredNotifications.map((item) => {
          const isRead = item.isRead;
          const style = getNotificationStyle(item.type);
          const Icon = style.icon;
          const timeAgo = formatRelativeTime(item.createdAt);

          return (
            <div
              key={item.id}
              className={`group relative flex items-start gap-3.5 p-4 transition-all border-l-4 ${
                isRead
                  ? 'border-l-transparent bg-white hover:bg-slate-50/80'
                  : `${style.accent} bg-slate-50/70 hover:bg-slate-100/90`
              }`}
            >
              {/* Type Icon Pill */}
              <div
                className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 ${style.bg} border ${style.border} shadow-2xs`}
              >
                <Icon className={`w-4 h-4 ${style.color} stroke-[2.5]`} />
              </div>

              {/* Main Content (Clickable) */}
              <Link
                href={item.link || '#'}
                onClick={() => handleNotificationClick(item)}
                className="flex-1 min-w-0 pr-8 cursor-pointer space-y-1 block"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold truncate ${
                      isRead ? 'text-slate-800' : 'text-slate-950 font-black'
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0 font-mono">
                    {timeAgo}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {item.message}
                </p>

                {item.link && (
                  <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700">
                    <span>View details</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </Link>

              {/* Mark Read/Unread Button */}
              <button
                type="button"
                onClick={(e) => toggleSingleRead(e, item)}
                className={`absolute right-3.5 top-4 p-1.5 rounded-lg transition-all min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer ${
                  isRead
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 opacity-60 sm:opacity-0 sm:group-hover:opacity-100'
                    : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs'
                }`}
                title={isRead ? 'Mark as unread' : 'Mark as read'}
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="relative" ref={desktopContainerRef}>
      {/* ========================================================================= */}
      {/* BELL TRIGGER BUTTON */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 sm:p-2.5 rounded-xl border transition-all duration-150 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
          isOpen
            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 shadow-xs'
            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs'
        }`}
        title="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'scale-110' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-md shadow-rose-600/30">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ========================================================================= */}
      {/* 📱 MOBILE PHONE FULLSCREEN SHEET (< sm) */}
      {/* ========================================================================= */}
      {isOpen && (
        <ModalPortal>
          <div
            ref={mobileSheetRef}
            className="sm:hidden fixed inset-0 z-[150] flex flex-col bg-white overflow-hidden animate-in slide-in-from-bottom duration-200"
          >
            {/* Mobile Top Header */}
            <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 tracking-tight">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {notifications.length} total alerts & updates
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors min-h-[44px] cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Search & Filter Chips Bar */}
            <div className="p-3 bg-slate-50/60 border-b border-slate-200 shrink-0 space-y-2.5">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search alerts (e.g. low stock, payment)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 min-h-[44px] shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Horizontal Scrollable Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>All</span>
                  <span className="opacity-80 font-mono text-[11px]">({notifications.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('unread')}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                    activeFilter === 'unread'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        activeFilter === 'unread' ? 'bg-white text-blue-700' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {stockCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('stock')}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                      activeFilter === 'stock'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Low Stock</span>
                    <span className="opacity-80 font-mono text-[11px]">({stockCount})</span>
                  </button>
                )}

                {paymentCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('payment')}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                      activeFilter === 'payment'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Payments</span>
                    <span className="opacity-80 font-mono text-[11px]">({paymentCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Notification Items Scrollable Body */}
            {renderNotificationList(true)}

            {/* Mobile Bottom Sticky Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-500 font-medium">
                Showing {filteredNotifications.length} of {notifications.length}
              </span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="font-bold text-blue-700 hover:text-blue-800 p-1"
                >
                  Mark all as read
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="font-bold text-slate-700 hover:text-slate-900 p-1"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* 💻 DESKTOP DROPDOWN (>= sm) */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="hidden sm:flex absolute right-0 top-full mt-2.5 w-[440px] max-h-[580px] flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-150">
          {/* Desktop Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                  <Bell className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 tracking-tight">Notifications</h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                    title="Mark all notifications as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop Tabs & Search */}
            <div className="mt-3.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('unread')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeFilter === 'unread'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        activeFilter === 'unread' ? 'bg-white text-blue-700' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
                {stockCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('stock')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeFilter === 'stock'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Stock ({stockCount})
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-[150px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Notification List */}
          {renderNotificationList(false)}

          {/* Desktop Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>{notifications.length} total alerts</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-700 hover:text-slate-900 font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
