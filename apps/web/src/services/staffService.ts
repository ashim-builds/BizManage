'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface StaffMember {
  id: string;
  name: string;
  role: 'Cashier' | 'Store Manager' | 'Accountant' | 'Sales Associate' | 'Inventory Lead';
  phone: string;
  email?: string;
  baseSalary: number;
  joinDate: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
}

export interface ShiftLog {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  date: string;
  clockInTime: string;
  clockOutTime?: string;
  openingCash: number;
  closingCash?: number;
  status: 'ACTIVE_SHIFT' | 'CLOSED';
  notes?: string;
}

export interface PayrollVoucher {
  id: string;
  voucherNo: string;
  staffId: string;
  staffName: string;
  role: string;
  monthYear: string;
  paymentDate: string;
  baseSalary: number;
  bonusCommission: number;
  advanceDeduction: number;
  netPaidAmount: number;
  paymentMode: 'CASH' | 'BANK' | 'FONEPAY';
  status: 'PAID' | 'PENDING';
  notes?: string;
}

const INITIAL_STAFF: StaffMember[] = [];
const INITIAL_SHIFTS: ShiftLog[] = [];
const INITIAL_PAYROLL: PayrollVoucher[] = [];

// Helper functions for localStorage
function getStoredData<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStoredData<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// Custom React Query Hooks
export function useStaffMembers() {
  return useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      return getStoredData<StaffMember[]>('bizmanage_staff_list', INITIAL_STAFF);
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newStaff: Omit<StaffMember, 'id'>) => {
      const current = getStoredData<StaffMember[]>('bizmanage_staff_list', INITIAL_STAFF);
      const created: StaffMember = { ...newStaff, id: `staff-${Date.now()}` };
      const updated = [created, ...current];
      setStoredData('bizmanage_staff_list', updated);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
    },
  });
}

export function useShiftLogs() {
  return useQuery({
    queryKey: ['shift-logs'],
    queryFn: async () => {
      return getStoredData<ShiftLog[]>('bizmanage_shift_logs', INITIAL_SHIFTS);
    },
  });
}

export function useClockInShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newShift: Omit<ShiftLog, 'id' | 'status'>) => {
      const current = getStoredData<ShiftLog[]>('bizmanage_shift_logs', INITIAL_SHIFTS);
      const created: ShiftLog = {
        ...newShift,
        id: `shift-${Date.now()}`,
        status: 'ACTIVE_SHIFT',
      };
      const updated = [created, ...current];
      setStoredData('bizmanage_shift_logs', updated);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-logs'] });
    },
  });
}

export function useClockOutShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, closingCash, notes }: { shiftId: string; closingCash: number; notes?: string }) => {
      const current = getStoredData<ShiftLog[]>('bizmanage_shift_logs', INITIAL_SHIFTS);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updated = current.map((s) => {
        if (s.id === shiftId) {
          return {
            ...s,
            clockOutTime: timeStr,
            closingCash,
            status: 'CLOSED' as const,
            notes: notes || s.notes,
          };
        }
        return s;
      });
      setStoredData('bizmanage_shift_logs', updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-logs'] });
    },
  });
}

export function usePayrollVouchers() {
  return useQuery({
    queryKey: ['payroll-vouchers'],
    queryFn: async () => {
      return getStoredData<PayrollVoucher[]>('bizmanage_payroll_list', INITIAL_PAYROLL);
    },
  });
}

export function useCreatePayrollVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newPay: Omit<PayrollVoucher, 'id' | 'voucherNo'>) => {
      const current = getStoredData<PayrollVoucher[]>('bizmanage_payroll_list', INITIAL_PAYROLL);
      const voucherNo = `PAY-${new Date().getFullYear()}-${String(current.length + 1).padStart(3, '0')}`;
      const created: PayrollVoucher = { ...newPay, id: `pay-${Date.now()}`, voucherNo };
      const updated = [created, ...current];
      setStoredData('bizmanage_payroll_list', updated);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-vouchers'] });
    },
  });
}
