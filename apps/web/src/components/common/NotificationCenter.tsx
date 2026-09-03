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
  Filter,
  ArrowRight,
} from 'lucide-react';
import {
  NotificationItem,
  useNotifications,
  useMarkNotificationsRead,
  useMarkNotificationsUnread,
} from '@/services/utilityService';

interface NotificationCenterProps {
  activeBusinessId?: string | null;
  readNotifIds?: string[];
  setReadNotifIds?: (ids: string[]) => void;
  userReadNotifications?: string[];
}

export function NotificationCenter({
  activeBusinessId,
  readNotifIds,
  setReadNotifIds,
}: NotificationCenterProps) {
  const { data: notifData, isLoading } = useNotifications(activeBusinessId);
  const markReadMutation = useMarkNotificationsRead(activeBusinessId);
  const markUnreadMutation = useMarkNotificationsUnread(activeBusinessId);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Unread count is directly synchronized with MySQL database
  const unreadCount = useMemo(() => {
    if (typeof notifData?.unreadCount === 'number') {
      return notifData.unreadCount;
    }
    return notifications.filter((n) => !n.isRead).length;
  }, [notifData?.unreadCount, notifications]);

  // Click outside to close handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
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

  // Filter items by Tab & Search query
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const isRead = item.isRead;
      if (activeTab === 'unread' && isRead) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMessage = item.message.toLowerCase().includes(q);
        return matchesTitle || matchesMessage;
      }
      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl border transition-all duration-200 ${
          isOpen
            ? 'border-blue-500/50 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
            : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/80'
        }`}
        title="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'scale-110' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-[9px] font-bold text-white shadow-lg shadow-red-500/30 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <>
          {/* Mobile backdrop for dismiss */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-40 sm:hidden animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed sm:absolute inset-x-3 top-16 sm:top-auto sm:inset-x-auto sm:right-0 sm:mt-2.5 sm:w-[420px] max-h-[calc(100vh-5.5rem)] sm:max-h-[540px] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 tracking-wide">Notifications</h4>
                    <p className="text-[10px] text-slate-500">
                      {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs & Search */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      activeTab === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('unread')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                      activeTab === 'unread'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>Unread</span>
                    {unreadCount > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          activeTab === 'unread' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                        }`}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Quick Search */}
                {notifications.length > 3 && (
                  <div className="relative flex-1 max-w-[150px]">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Notification List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 custom-scrollbar bg-white">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-slate-400">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-14 px-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                    <BellOff className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {searchQuery
                      ? 'No matching notifications found'
                      : activeTab === 'unread'
                      ? 'No unread notifications'
                      : 'All caught up!'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                    {searchQuery
                      ? 'Try searching with another keyword.'
                      : activeTab === 'unread'
                      ? 'You have read all your alerts.'
                      : 'New stock alerts, payment updates, and sales notifications will appear here at the top.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isRead = item.isRead;
                  const cfg =
                    {
                      WARNING: {
                        icon: AlertTriangle,
                        color: 'text-amber-600',
                        bg: 'bg-amber-50',
                        border: 'border-amber-200',
                        glow: '',
                        accent: 'border-l-amber-500',
                      },
                      ERROR: {
                        icon: XCircle,
                        color: 'text-rose-600',
                        bg: 'bg-rose-50',
                        border: 'border-rose-200',
                        glow: '',
                        accent: 'border-l-rose-500',
                      },
                      SUCCESS: {
                        icon: CheckCircle2,
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-50',
                        border: 'border-emerald-200',
                        glow: '',
                        accent: 'border-l-emerald-500',
                      },
                      INFO: {
                        icon: Info,
                        color: 'text-blue-600',
                        bg: 'bg-blue-50',
                        border: 'border-blue-200',
                        glow: '',
                        accent: 'border-l-blue-500',
                      },
                    }[item.type] || {
                      icon: Info,
                      color: 'text-blue-600',
                      bg: 'bg-blue-50',
                      border: 'border-blue-200',
                      glow: '',
                      accent: 'border-l-blue-500',
                    };
                  const Icon = cfg.icon;

                  // Relative time calculation
                  const relativeTime = (() => {
                    if (!item.createdAt) return 'just now';
                    const diff = Date.now() - new Date(item.createdAt).getTime();
                    if (isNaN(diff) || diff < 0) return 'just now';
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return 'just now';
                    if (mins < 60) return `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h ago`;
                    const days = Math.floor(hrs / 24);
                    if (days < 7) return `${days}d ago`;
                    return new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    });
                  })();

                  return (
                    <div
                      key={item.id}
                      className={`group relative flex items-start gap-3 px-4 py-3.5 transition-all border-l-4 ${
                        isRead
                          ? 'border-l-transparent bg-white hover:bg-slate-50'
                          : `${cfg.accent} bg-slate-50/70 hover:bg-slate-100/80`
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${cfg.bg} border ${cfg.border}`}
                      >
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>

                      {/* Content Link */}
                      <Link
                        href={item.link}
                        onClick={() => handleNotificationClick(item)}
                        className="flex-1 min-w-0 pr-6 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs font-bold truncate transition-colors ${
                              isRead ? 'text-slate-700' : 'text-slate-900 font-extrabold'
                            }`}
                          >
                            {item.title}
                          </p>
                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                            {relativeTime}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {item.message}
                        </p>
                      </Link>

                      {/* Right actions: Toggle Read/Unread */}
                      <div className="absolute right-3 top-3.5 flex items-center gap-1">
                        <button
                          onClick={(e) => toggleSingleRead(e, item)}
                          className={`p-1 rounded-lg transition-all ${
                            isRead
                              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100'
                              : 'text-blue-600 hover:bg-blue-50'
                          }`}
                          title={isRead ? 'Mark as unread' : 'Mark as read'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between text-[11px] text-slate-500">
                <span>{notifications.length} total notification{notifications.length > 1 ? 's' : ''}</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Close panel
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
