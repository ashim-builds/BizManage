'use client';
import { onNumericKeyDown, onNumericFocus, onNumericBlur } from '@/lib/numericInput';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  X,
  Printer,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  Building2,
  Wallet,
  ArrowRight,
  TrendingUp,
  FileText,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';
import { ModalPortal } from '@/components/common/ModalPortal';
import { LoadingState } from '@/components/common/LoadingState';
import {
  useStaffMembers,
  useCreateStaff,
  useShiftLogs,
  useClockInShift,
  useClockOutShift,
  usePayrollVouchers,
  useCreatePayrollVoucher,
  StaffMember,
  ShiftLog,
  PayrollVoucher,
} from '@/services/staffService';
import { useCurrentBusiness } from '@/services/businessService';

export default function StaffPayrollPage() {
  const [activeTab, setActiveTab] = useState<'staff' | 'shifts' | 'payroll'>('staff');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isClockInOpen, setIsClockInOpen] = useState(false);
  const [clockOutTarget, setClockOutTarget] = useState<ShiftLog | null>(null);
  const [isCreatePayOpen, setIsCreatePayOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollVoucher | null>(null);

  // Queries & Mutations
  const { data: staffList = [], isLoading: isStaffLoading } = useStaffMembers();
  const { data: shiftLogs = [], isLoading: isShiftsLoading } = useShiftLogs();
  const { data: payrollList = [], isLoading: isPayLoading } = usePayrollVouchers();
  const { data: business } = useCurrentBusiness();

  const createStaffMutation = useCreateStaff();
  const clockInMutation = useClockInShift();
  const clockOutMutation = useClockOutShift();
  const createPayMutation = useCreatePayrollVoucher();

  // Form States
  const [newStaff, setNewStaff] = useState<Omit<StaffMember, 'id'>>({
    name: '',
    role: 'Cashier',
    phone: '',
    email: '',
    baseSalary: 20000,
    joinDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const [newShift, setNewShift] = useState({
    staffId: '',
    openingCash: 5000,
    notes: 'Counter 01 Shift',
  });

  const [clockOutClosingCash, setClockOutClosingCash] = useState<string>('');
  const [clockOutNotes, setClockOutNotes] = useState<string>('');

  const [newPayroll, setNewPayroll] = useState({
    staffId: '',
    monthYear: 'August 2026',
    paymentDate: new Date().toISOString().split('T')[0],
    baseSalary: 20000,
    bonusCommission: 0,
    advanceDeduction: 0,
    paymentMode: 'CASH' as 'CASH' | 'BANK' | 'FONEPAY',
    notes: 'Monthly Salary Settlement',
  });

  if (isStaffLoading || isShiftsLoading || isPayLoading) {
    return <LoadingState message="Loading staff and payroll management..." />;
  }

  // Filtered Lists
  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  const activeShifts = shiftLogs.filter((s) => s.status === 'ACTIVE_SHIFT');
  const closedShifts = shiftLogs.filter((s) => s.status === 'CLOSED');

  const totalMonthlyBaseSalary = staffList.reduce((sum, s) => sum + Number(s.baseSalary || 0), 0);
  const totalPaidPayrollThisMonth = payrollList.reduce((sum, p) => sum + Number(p.netPaidAmount || 0), 0);

  // Handlers
  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.phone) return;
    createStaffMutation.mutate(newStaff, {
      onSuccess: () => {
        setIsAddStaffOpen(false);
        setNewStaff({
          name: '',
          role: 'Cashier',
          phone: '',
          email: '',
          baseSalary: 20000,
          joinDate: new Date().toISOString().split('T')[0],
          status: 'ACTIVE',
        });
      },
    });
  };

  const handleClockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffList.find((s) => s.id === newShift.staffId);
    if (!staff) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    clockInMutation.mutate(
      {
        staffId: staff.id,
        staffName: staff.name,
        role: staff.role,
        date: new Date().toISOString().split('T')[0],
        clockInTime: timeStr,
        openingCash: Number(newShift.openingCash || 0),
        notes: newShift.notes,
      },
      {
        onSuccess: () => {
          setIsClockInOpen(false);
        },
      }
    );
  };

  const handleClockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clockOutTarget) return;
    clockOutMutation.mutate(
      {
        shiftId: clockOutTarget.id,
        closingCash: Number(clockOutClosingCash || 0),
        notes: clockOutNotes,
      },
      {
        onSuccess: () => {
          setClockOutTarget(null);
          setClockOutClosingCash('');
          setClockOutNotes('');
        },
      }
    );
  };

  const handleCreatePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffList.find((s) => s.id === newPayroll.staffId);
    if (!staff) return;

    const base = Number(newPayroll.baseSalary || 0);
    const bonus = Number(newPayroll.bonusCommission || 0);
    const adv = Number(newPayroll.advanceDeduction || 0);
    const net = base + bonus - adv;

    createPayMutation.mutate(
      {
        staffId: staff.id,
        staffName: staff.name,
        role: staff.role,
        monthYear: newPayroll.monthYear,
        paymentDate: newPayroll.paymentDate,
        baseSalary: base,
        bonusCommission: bonus,
        advanceDeduction: adv,
        netPaidAmount: net,
        paymentMode: newPayroll.paymentMode,
        status: 'PAID',
        notes: newPayroll.notes,
      },
      {
        onSuccess: () => {
          setIsCreatePayOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            Staff &amp; Cashier Payroll <Users className="w-6 h-6 text-blue-600" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage employee directory, cashier shift clock-ins/outs, and monthly salary payslips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsClockInOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all border border-slate-200 shadow-xs active:scale-95 cursor-pointer min-h-[44px]"
          >
            <Clock className="w-4 h-4 text-amber-600" /> Clock In Shift
          </button>

          <button
            type="button"
            onClick={() => setIsCreatePayOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all border border-slate-200 shadow-xs active:scale-95 cursor-pointer min-h-[44px]"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" /> Issue Salary
          </button>

          <button
            type="button"
            onClick={() => setIsAddStaffOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Staff Members</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{staffList.length} Staff</p>
          <p className="text-[11px] text-slate-500">
            Base Monthly Payroll:{' '}
            <strong className="text-slate-800 font-mono">Rs. {totalMonthlyBaseSalary.toLocaleString()}</strong>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Clocked-In Shifts</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600">{activeShifts.length} Active</p>
          <p className="text-[11px] text-slate-500">Cashiers currently at counter</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Salary Disbursed</span>
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">Rs. {totalPaidPayrollThisMonth.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500">Issued payslips recorded</p>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-slate-100 border border-slate-200">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" /> Staff Directory ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'shifts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-4 h-4" /> Shift Tracker ({activeShifts.length} Active)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'payroll'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Salary Payroll ({payrollList.length})
          </button>
        </div>

        {activeTab === 'staff' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>
        )}
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-4 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 font-black flex items-center justify-center text-base">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{staff.name}</h3>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                      {staff.role}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    staff.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {staff.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone:
                  </span>
                  <strong className="text-slate-900 font-mono">{staff.phone}</strong>
                </div>
                {staff.email && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Email:
                    </span>
                    <span className="text-slate-700 truncate max-w-[150px] font-mono">{staff.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Base Salary:
                  </span>
                  <strong className="text-emerald-700 font-mono text-xs">
                    Rs. {Number(staff.baseSalary).toLocaleString()}/mo
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SHIFT TRACKER */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Active Shifts */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Currently Active Counter Shifts ({activeShifts.length})
            </h3>

            {activeShifts.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-xs space-y-2 shadow-xs">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No cashier shifts currently clocked in.</p>
                <button
                  type="button"
                  onClick={() => setIsClockInOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all inline-block mt-2 shadow-xs cursor-pointer"
                >
                  Clock In New Shift
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-5 rounded-2xl bg-white border border-amber-300 space-y-4 shadow-xs ring-1 ring-amber-500/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          {shift.staffName}
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">
                            ON SHIFT
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {shift.role} • Date: {shift.date}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setClockOutTarget(shift);
                          setClockOutClosingCash('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        Clock Out &amp; Close Shift
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Clocked In At:</span>
                        <strong className="text-slate-900 font-mono">{shift.clockInTime}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Opening Float:</span>
                        <strong className="text-emerald-700 font-mono">
                          Rs. {Number(shift.openingCash).toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shift History Log */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Shift History Log ({closedShifts.length})</h3>

            {/* Mobile Cards (< md) */}
            <div className="grid gap-3 md:hidden">
              {closedShifts.length === 0 ? (
                <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                  No shift history logs found.
                </div>
              ) : (
                closedShifts.map((shift) => (
                  <div key={shift.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-xs text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <strong className="text-slate-900 font-bold">{shift.staffName}</strong>
                      <span className="text-[10px] text-slate-500">{shift.date}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>Clock In: <span className="font-mono font-semibold text-slate-900">{shift.clockInTime}</span></div>
                      <div>Clock Out: <span className="font-mono font-semibold text-slate-900">{shift.clockOutTime || '—'}</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
                      <span>Opening: <strong className="font-mono text-slate-800">Rs. {Number(shift.openingCash).toLocaleString()}</strong></span>
                      <span>Closing: <strong className="font-mono text-emerald-700">Rs. {Number(shift.closingCash || 0).toLocaleString()}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs text-slate-800">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 font-bold">
                    <th className="p-3.5">Staff Member</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Clock In</th>
                    <th className="p-3.5">Clock Out</th>
                    <th className="p-3.5 text-right">Opening Cash</th>
                    <th className="p-3.5 text-right">Closing Cash</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {closedShifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{shift.staffName}</td>
                      <td className="p-3.5 text-slate-600">{shift.date}</td>
                      <td className="p-3.5 font-mono text-slate-600">{shift.clockInTime}</td>
                      <td className="p-3.5 font-mono text-slate-600">{shift.clockOutTime || '-'}</td>
                      <td className="p-3.5 text-right font-mono text-slate-800">
                        Rs. {Number(shift.openingCash).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                        Rs. {Number(shift.closingCash || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          CLOSED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SALARY PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {/* Mobile Cards (< md) */}
          <div className="grid gap-3.5 md:hidden">
            {payrollList.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                No salary vouchers recorded.
              </div>
            ) : (
              payrollList.map((pay) => (
                <div key={pay.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-mono font-bold text-blue-600">{pay.voucherNo}</span>
                      <strong className="block text-slate-900 text-xs font-bold">{pay.staffName}</strong>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">{pay.monthYear}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Base:</span>
                      <strong className="font-mono text-slate-800">Rs. {pay.baseSalary.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[10px]">+ Bonus:</span>
                      <strong className="font-mono text-emerald-700">Rs. {pay.bonusCommission.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-rose-700 block text-[10px]">- Deduct:</span>
                      <strong className="font-mono text-rose-700">Rs. {pay.advanceDeduction.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Net Salary Paid</span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        Rs. {pay.netPaidAmount.toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPayslip(pay)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> Payslip
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs text-slate-800">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 font-bold">
                  <th className="p-3.5">Voucher #</th>
                  <th className="p-3.5">Employee Name</th>
                  <th className="p-3.5">Month</th>
                  <th className="p-3.5">Payment Date</th>
                  <th className="p-3.5 text-right">Base Salary</th>
                  <th className="p-3.5 text-right">Bonus</th>
                  <th className="p-3.5 text-right">Deductions</th>
                  <th className="p-3.5 text-right">Net Paid</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollList.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-600">{pay.voucherNo}</td>
                    <td className="p-3.5 font-bold text-slate-900">{pay.staffName}</td>
                    <td className="p-3.5 text-slate-600">{pay.monthYear}</td>
                    <td className="p-3.5 text-slate-600">{pay.paymentDate}</td>
                    <td className="p-3.5 text-right font-mono text-slate-800">Rs. {pay.baseSalary.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">
                      +Rs. {pay.bonusCommission.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-700">
                      -Rs. {pay.advanceDeduction.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900">
                      Rs. {pay.netPaidAmount.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPayslip(pay)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" /> Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW EMPLOYEE */}
      {isAddStaffOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <form
              onSubmit={handleAddStaffSubmit}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" /> Add New Staff Member
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Role *</label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                    >
                      <option value="Cashier">Cashier</option>
                      <option value="Store Manager">Store Manager</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Sales Associate">Sales Associate</option>
                      <option value="Inventory Lead">Inventory Lead</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value.replace(/[^0-9]/g, '') })}
                      placeholder="9841XXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Base Monthly Salary (Rs.) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={onNumericKeyDown}
                    onFocus={onNumericFocus}
                    onBlur={onNumericBlur}
                    required
                    value={newStaff.baseSalary}
                    onChange={(e) => setNewStaff({ ...newStaff, baseSalary: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 min-h-[44px]"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: CLOCK IN SHIFT */}
      {isClockInOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <form
              onSubmit={handleClockInSubmit}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" /> Cashier Shift Clock In
                </h3>
                <button
                  type="button"
                  onClick={() => setIsClockInOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Staff Member *</label>
                  <select
                    required
                    value={newShift.staffId}
                    onChange={(e) => setNewShift({ ...newShift, staffId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  >
                    <option value="">-- Choose Employee --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Opening Cash Float (Rs.) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={onNumericKeyDown}
                    onFocus={onNumericFocus}
                    onBlur={onNumericBlur}
                    required
                    value={newShift.openingCash}
                    onChange={(e) => setNewShift({ ...newShift, openingCash: Number(e.target.value) })}
                    placeholder="e.g. 5000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Shift Notes / Counter #</label>
                  <input
                    type="text"
                    value={newShift.notes}
                    onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClockInOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 active:scale-95 min-h-[44px]"
                >
                  Clock In Now
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 3: CLOCK OUT SHIFT */}
      {clockOutTarget && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <form
              onSubmit={handleClockOutSubmit}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-600" /> Clock Out &amp; Close Shift
                </h3>
                <button
                  type="button"
                  onClick={() => setClockOutTarget(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-slate-900">
                  {clockOutTarget.staffName} ({clockOutTarget.role})
                </p>
                <p className="text-slate-500">
                  Clocked in at: <strong className="text-slate-800">{clockOutTarget.clockInTime}</strong> | Opening
                  Float: <strong className="text-emerald-700 font-mono">Rs. {clockOutTarget.openingCash.toLocaleString()}</strong>
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Final Drawer Closing Cash Count (Rs.) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    onKeyDown={onNumericKeyDown}
                    onFocus={onNumericFocus}
                    onBlur={onNumericBlur}
                    required
                    value={clockOutClosingCash}
                    onChange={(e) => setClockOutClosingCash(e.target.value)}
                    placeholder="Enter cash amount in drawer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Handover Notes</label>
                  <input
                    type="text"
                    value={clockOutNotes}
                    onChange={(e) => setClockOutNotes(e.target.value)}
                    placeholder="e.g. All drawer cash balanced cleanly"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClockOutTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-95 min-h-[44px]"
                >
                  Close Shift Now
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 4: ISSUE SALARY PAYROLL */}
      {isCreatePayOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <form
              onSubmit={handleCreatePaySubmit}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" /> Issue Monthly Salary Voucher
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatePayOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Employee *</label>
                  <select
                    required
                    value={newPayroll.staffId}
                    onChange={(e) => {
                      const staffId = e.target.value;
                      const staff = staffList.find((s) => s.id === staffId);
                      setNewPayroll({
                        ...newPayroll,
                        staffId,
                        baseSalary: staff ? staff.baseSalary : 20000,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                  >
                    <option value="">-- Choose Employee --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role} - Rs. {s.baseSalary.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Salary Month/Year *</label>
                    <input
                      type="text"
                      required
                      value={newPayroll.monthYear}
                      onChange={(e) => setNewPayroll({ ...newPayroll, monthYear: e.target.value })}
                      placeholder="e.g. August 2026"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Payment Mode</label>
                    <select
                      value={newPayroll.paymentMode}
                      onChange={(e) => setNewPayroll({ ...newPayroll, paymentMode: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                    >
                      <option value="CASH">Cash Counter</option>
                      <option value="BANK">Bank Account</option>
                      <option value="FONEPAY">Fonepay / QR</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Base Salary</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      onBlur={onNumericBlur}
                      required
                      value={newPayroll.baseSalary}
                      onChange={(e) => setNewPayroll({ ...newPayroll, baseSalary: Number(e.target.value) })}
                      className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 font-bold mb-1">+ Bonus</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      onBlur={onNumericBlur}
                      value={newPayroll.bonusCommission}
                      onChange={(e) => setNewPayroll({ ...newPayroll, bonusCommission: Number(e.target.value) })}
                      className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-emerald-700 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-rose-700 font-bold mb-1">- Deduct</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={onNumericKeyDown}
                      onFocus={onNumericFocus}
                      onBlur={onNumericBlur}
                      value={newPayroll.advanceDeduction}
                      onChange={(e) => setNewPayroll({ ...newPayroll, advanceDeduction: Number(e.target.value) })}
                      className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-rose-700 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-600 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center font-bold">
                  <span className="text-slate-700">Net Payable:</span>
                  <span className="text-emerald-700 font-mono text-sm font-black">
                    Rs.{' '}
                    {(
                      Number(newPayroll.baseSalary || 0) +
                      Number(newPayroll.bonusCommission || 0) -
                      Number(newPayroll.advanceDeduction || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatePayOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 min-h-[44px]"
                >
                  Confirm &amp; Pay Salary
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 5: PRINTABLE PAYSLIP */}
      {selectedPayslip && (
        <ModalPortal>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-payslip, #printable-payslip * { visibility: visible !important; }
              #printable-payslip {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
              }
            }
          `}</style>

          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 font-sans">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-600" /> Salary Payslip Voucher
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Printable Area */}
              <div
                id="printable-payslip"
                className="p-6 bg-white text-slate-950 rounded-2xl border border-slate-200 space-y-4 font-sans text-xs select-text shadow-xs"
              >
                <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                  <h2 className="text-lg font-black uppercase text-slate-900">{business?.name || 'BizManage Store'}</h2>
                  <p className="text-[11px] text-slate-500">{business?.address || 'Kathmandu, Nepal'}</p>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest pt-1">
                    EMPLOYEE SALARY PAYSLIP
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-slate-400 block">Voucher Number:</span>
                    <strong className="font-mono text-slate-900">{selectedPayslip.voucherNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Payment Date:</span>
                    <strong className="text-slate-900">{selectedPayslip.paymentDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Employee Name:</span>
                    <strong className="text-slate-900">{selectedPayslip.staffName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Designation:</span>
                    <strong className="text-slate-900">{selectedPayslip.role}</strong>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                      <th className="p-2 font-bold">Earnings &amp; Deductions Breakdown</th>
                      <th className="p-2 text-right font-bold">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2">Basic Monthly Salary</td>
                      <td className="p-2 text-right font-mono">Rs. {selectedPayslip.baseSalary.toLocaleString()}</td>
                    </tr>
                    {selectedPayslip.bonusCommission > 0 && (
                      <tr>
                        <td className="p-2 text-emerald-700 font-semibold">+ Performance Bonus / Allowance</td>
                        <td className="p-2 text-right font-mono text-emerald-700 font-semibold">
                          +Rs. {selectedPayslip.bonusCommission.toLocaleString()}
                        </td>
                      </tr>
                    )}
                    {selectedPayslip.advanceDeduction > 0 && (
                      <tr>
                        <td className="p-2 text-rose-700 font-semibold">- Advance Salary / Deductions</td>
                        <td className="p-2 text-right font-mono text-rose-700 font-semibold">
                          -Rs. {selectedPayslip.advanceDeduction.toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                      <td className="p-2 text-xs">NET SALARY PAID ({selectedPayslip.paymentMode})</td>
                      <td className="p-2 text-right font-mono text-xs text-slate-900">
                        Rs. {selectedPayslip.netPaidAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="pt-6 flex justify-between text-[10px] text-slate-400">
                  <div className="text-center pt-4 border-t border-slate-200 w-32">
                    <p>Employee Signature</p>
                  </div>
                  <div className="text-center pt-4 border-t border-slate-200 w-32">
                    <p>Employer Signature</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[44px]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 min-h-[44px]"
                >
                  <Printer className="w-4 h-4" /> Print Payslip
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
