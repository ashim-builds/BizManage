'use client';

import React, { ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight, Inbox, ChevronLeft, ArrowUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  mobileHidden?: boolean; // Hide from mobile card key-value list if shown elsewhere
  isPrimaryTitle?: boolean; // Used as main card header on mobile
  isStatusBadge?: boolean; // Shown at top right of mobile card
}

export interface ResponsiveDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (item: T) => void;
  renderMobileCard?: (item: T, index: number) => ReactNode;
  renderMobileCardHeader?: (item: T) => ReactNode;
  renderMobileCardExtra?: (item: T) => ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

export function ResponsiveDataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display at this time.',
  emptyAction,
  onRowClick,
  renderMobileCard,
  renderMobileCardHeader,
  renderMobileCardExtra,
  pagination,
  className = '',
}: ResponsiveDataTableProps<T>) {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className={`w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xs ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
          <div className="h-14 bg-slate-50 rounded-xl w-full" />
          <div className="h-14 bg-slate-50 rounded-xl w-full" />
          <div className="h-14 bg-slate-50 rounded-xl w-full" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`w-full bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs ${className}`}>
        <div className="inline-flex p-4 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 mb-4">
          <Inbox className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">{emptyTitle}</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">{emptyDescription}</p>
        {emptyAction && <div className="flex justify-center">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* ── DESKTOP & TABLET TABLE VIEW (Independent Horizontal Scroll) ────────── */}
      <div className="hidden md:block w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3.5 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
              {data.map((item, index) => {
                const rowKey = keyExtractor(item, index);
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {col.render
                          ? col.render(item, index)
                          : (item as any)[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MOBILE CARD VIEW (No Table Squeeze, Full Touch Ergonomics) ──────── */}
      <div className="md:hidden space-y-3">
        {data.map((item, index) => {
          const cardKey = keyExtractor(item, index);

          // If custom mobile card renderer is provided, use it
          if (renderMobileCard) {
            return (
              <div key={cardKey}>
                {renderMobileCard(item, index)}
              </div>
            );
          }

          const isExpanded = !!expandedCards[cardKey];
          const primaryCol = columns.find((c) => c.isPrimaryTitle);
          const statusCol = columns.find((c) => c.isStatusBadge);
          const actionsCol = columns.find((c) => c.key === 'actions' || c.header.toLowerCase() === 'actions');
          const detailCols = columns.filter(
            (c) => !c.mobileHidden && !c.isPrimaryTitle && !c.isStatusBadge && c.key !== 'actions' && c.header.toLowerCase() !== 'actions'
          );

          return (
            <div
              key={cardKey}
              onClick={() => onRowClick && onRowClick(item)}
              className={`bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs transition-all ${
                onRowClick ? 'active:scale-[0.99] cursor-pointer' : ''
              }`}
            >
              {/* Card Header: Main identifier & Status/Amount */}
              {renderMobileCardHeader ? (
                renderMobileCardHeader(item)
              ) : (
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="min-w-0 flex-1">
                    {primaryCol ? (
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {primaryCol.render ? primaryCol.render(item, index) : (item as any)[primaryCol.key]}
                      </div>
                    ) : (
                      <div className="font-bold text-slate-900 text-sm truncate">
                        #{index + 1}
                      </div>
                    )}
                  </div>
                  {statusCol && (
                    <div className="shrink-0">
                      {statusCol.render ? statusCol.render(item, index) : (item as any)[statusCol.key]}
                    </div>
                  )}
                </div>
              )}

              {/* Key-Value Details Grid */}
              {detailCols.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5 pt-3 text-xs">
                  {detailCols.map((col) => (
                    <div key={col.key} className={col.align === 'right' ? 'text-right' : 'text-left'}>
                      <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">
                        {col.header}
                      </span>
                      <span className="font-bold text-slate-900 break-words">
                        {col.render ? col.render(item, index) : (item as any)[col.key] ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dedicated Actions Row */}
              {actionsCol && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end">
                  {actionsCol.render ? actionsCol.render(item, index) : (item as any)[actionsCol.key]}
                </div>
              )}

              {/* Extra expandable mobile section */}
              {renderMobileCardExtra && (
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => toggleExpand(cardKey, e)}
                    className="w-full flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 py-1"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'View More Details'}</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-700 animate-in fade-in">
                      {renderMobileCardExtra(item)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── PAGINATION CONTROLS ────────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs text-xs">
          <div className="text-slate-600 font-medium">
            Page <span className="font-bold text-slate-900">{pagination.currentPage}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.totalPages}</span>
            {pagination.totalItems !== undefined && (
              <span className="hidden sm:inline ml-1 font-semibold text-slate-500">({pagination.totalItems} total)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
