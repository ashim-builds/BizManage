'use client';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Staff &amp; Cashier Payroll <Users className="w-6 h-6 text-blue-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage employee directory, cashier shift clock-ins/outs, and monthly salary payslips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsClockInOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shadow-sm"
          >
            <Clock className="w-4 h-4 text-amber-400" /> Clock In Shift
          </button>

          <button
            type="button"
            onClick={() => setIsCreatePayOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shadow-sm"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" /> Issue Salary
          </button>

          <button
            type="button"
            onClick={() => setIsAddStaffOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-blue-600/25 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Staff Members</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{staffList.length} Staff</p>
          <p className="text-[11px] text-slate-400">
            Base Monthly Payroll: <strong className="text-slate-200">Rs. {totalMonthlyBaseSalary.toLocaleString()}</strong>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Clocked-In Shifts</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{activeShifts.length} Active</p>
          <p className="text-[11px] text-slate-400">Cashiers currently at counter</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Salary Disbursed</span>
            <BadgeCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">
            Rs. {totalPaidPayrollThisMonth.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">Issued payslips recorded</p>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Staff Directory ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'shifts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" /> Shift Tracker ({activeShifts.length} Active)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'payroll'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Salary Payroll ({payrollList.length})
          </button>
        </div>

        {activeTab === 'staff' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
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
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold flex items-center justify-center text-base">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{staff.name}</h3>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-800 text-blue-400 text-[10px] font-bold border border-slate-700">
                      {staff.role}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    staff.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {staff.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" /> Phone:
                  </span>
                  <strong className="text-slate-200">{staff.phone}</strong>
                </div>
                {staff.email && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" /> Email:
                    </span>
                    <span className="text-slate-300 truncate max-w-[150px]">{staff.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Base Salary:
                  </span>
                  <strong className="text-emerald-400 font-mono text-xs">
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
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Currently Active Counter Shifts ({activeShifts.length})
            </h3>

            {activeShifts.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs space-y-2">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No cashier shifts currently clocked in.</p>
                <button
                  type="button"
                  onClick={() => setIsClockInOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all inline-block mt-2"
                >
                  Clock In New Shift
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-4 shadow-lg shadow-amber-500/5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {shift.staffName}
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-extrabold border border-amber-500/20">
                            ON SHIFT
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400">{shift.role} • Date: {shift.date}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setClockOutTarget(shift);
                          setClockOutClosingCash('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                      >
                        Clock Out &amp; Close Shift
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Clocked In At:</span>
                        <strong className="text-white font-mono">{shift.clockInTime}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Opening Counter Cash:</span>
                        <strong className="text-emerald-400 font-mono">
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
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-slate-300">Shift History Log ({closedShifts.length})</h3>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                    <th className="p-3.5">Staff Member</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Clock In</th>
                    <th className="p-3.5">Clock Out</th>
                    <th className="p-3.5 text-right">Opening Cash</th>
                    <th className="p-3.5 text-right">Closing Cash</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {closedShifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-bold text-white">{shift.staffName}</td>
                      <td className="p-3.5">{shift.date}</td>
                      <td className="p-3.5 font-mono">{shift.clockInTime}</td>
                      <td className="p-3.5 font-mono">{shift.clockOutTime || '-'}</td>
                      <td className="p-3.5 text-right font-mono text-slate-300">
                        Rs. {Number(shift.openingCash).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        Rs. {Number(shift.closingCash || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
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
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
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
              <tbody className="divide-y divide-slate-800/60">
                {payrollList.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-400">{pay.voucherNo}</td>
                    <td className="p-3.5 font-bold text-white">{pay.staffName}</td>
                    <td className="p-3.5">{pay.monthYear}</td>
                    <td className="p-3.5">{pay.paymentDate}</td>
                    <td className="p-3.5 text-right font-mono">Rs. {pay.baseSalary.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-400">
                      +Rs. {pay.bonusCommission.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-400">
                      -Rs. {pay.advanceDeduction.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-white">
                      Rs. {pay.netPaidAmount.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPayslip(pay)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 inline-flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3 text-blue-400" /> Payslip
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
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <form
              onSubmit={handleAddStaffSubmit}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-400" /> Add New Staff Member
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Designation / Role</label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Cashier">Cashier</option>
                      <option value="Store Manager">Store Manager</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Sales Associate">Sales Associate</option>
                      <option value="Inventory Lead">Inventory Lead</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      placeholder="9841XXXXXX"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Base Monthly Salary (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={newStaff.baseSalary}
                    onChange={(e) => setNewStaff({ ...newStaff, baseSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
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
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <form
              onSubmit={handleClockInSubmit}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" /> Cashier Shift Clock In
                </h3>
                <button
                  type="button"
                  onClick={() => setIsClockInOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Staff Member</label>
                  <select
                    required
                    value={newShift.staffId}
                    onChange={(e) => setNewShift({ ...newShift, staffId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
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
                  <label className="block text-slate-300 font-semibold mb-1">Opening Cash in Counter Float (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={newShift.openingCash}
                    onChange={(e) => setNewShift({ ...newShift, openingCash: Number(e.target.value) })}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shift Notes / Counter #</label>
                  <input
                    type="text"
                    value={newShift.notes}
                    onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClockInOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30"
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
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <form
              onSubmit={handleClockOutSubmit}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-400" /> Clock Out &amp; Close Shift
                </h3>
                <button
                  type="button"
                  onClick={() => setClockOutTarget(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <p className="font-bold text-white">{clockOutTarget.staffName} ({clockOutTarget.role})</p>
                <p className="text-slate-400">
                  Clocked in at: <strong className="text-slate-200">{clockOutTarget.clockInTime}</strong> | Opening Cash: <strong className="text-emerald-400">Rs. {clockOutTarget.openingCash.toLocaleString()}</strong>
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Final Counter Closing Cash Count (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={clockOutClosingCash}
                    onChange={(e) => setClockOutClosingCash(e.target.value)}
                    placeholder="Enter cash amount in drawer"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Handover Notes</label>
                  <input
                    type="text"
                    value={clockOutNotes}
                    onChange={(e) => setClockOutNotes(e.target.value)}
                    placeholder="e.g. All drawer cash balanced cleanly"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setClockOutTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
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
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <form
              onSubmit={handleCreatePaySubmit}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" /> Issue Monthly Salary Voucher
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatePayOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Employee</label>
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
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
                    <label className="block text-slate-300 font-semibold mb-1">Salary Month/Year</label>
                    <input
                      type="text"
                      required
                      value={newPayroll.monthYear}
                      onChange={(e) => setNewPayroll({ ...newPayroll, monthYear: e.target.value })}
                      placeholder="e.g. August 2026"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Payment Mode</label>
                    <select
                      value={newPayroll.paymentMode}
                      onChange={(e) => setNewPayroll({ ...newPayroll, paymentMode: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="CASH">Cash Counter</option>
                      <option value="BANK">Bank Account</option>
                      <option value="FONEPAY">Fonepay / QR</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Base Salary</label>
                    <input
                      type="number"
                      required
                      value={newPayroll.baseSalary}
                      onChange={(e) => setNewPayroll({ ...newPayroll, baseSalary: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-400 font-semibold mb-1">+ Bonus</label>
                    <input
                      type="number"
                      value={newPayroll.bonusCommission}
                      onChange={(e) => setNewPayroll({ ...newPayroll, bonusCommission: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-rose-400 font-semibold mb-1">- Deduction</label>
                    <input
                      type="number"
                      value={newPayroll.advanceDeduction}
                      onChange={(e) => setNewPayroll({ ...newPayroll, advanceDeduction: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center font-bold">
                  <span className="text-slate-300">Net Payable Amount:</span>
                  <span className="text-emerald-400 font-mono text-sm">
                    Rs.{' '}
                    {(
                      Number(newPayroll.baseSalary || 0) +
                      Number(newPayroll.bonusCommission || 0) -
                      Number(newPayroll.advanceDeduction || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatePayOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
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

          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 font-sans">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-400" /> Salary Payslip Voucher
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Printable Area */}
              <div
                id="printable-payslip"
                className="p-6 bg-white text-slate-950 rounded-xl border border-slate-300 space-y-4 font-sans text-xs select-text shadow-inner"
              >
                <div className="text-center border-b border-slate-300 pb-3 space-y-1">
                  <h2 className="text-lg font-black uppercase text-slate-900">{business?.name || 'BizManage Store'}</h2>
                  <p className="text-[11px] text-slate-600">{business?.address || 'Kathmandu, Nepal'}</p>
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-widest pt-1">EMPLOYEE SALARY PAYSLIP</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-slate-500 block">Voucher Number:</span>
                    <strong className="font-mono text-slate-900">{selectedPayslip.voucherNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Payment Date:</span>
                    <strong className="text-slate-900">{selectedPayslip.paymentDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Employee Name:</span>
                    <strong className="text-slate-900">{selectedPayslip.staffName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Designation:</span>
                    <strong className="text-slate-900">{selectedPayslip.role}</strong>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-slate-800">
                      <th className="p-2 font-bold">Earnings &amp; Deductions Breakdown</th>
                      <th className="p-2 text-right font-bold">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2">Basic Monthly Salary</td>
                      <td className="p-2 text-right font-mono">Rs. {selectedPayslip.baseSalary.toLocaleString()}</td>
                    </tr>
                    {selectedPayslip.bonusCommission > 0 && (
                      <tr>
                        <td className="p-2 text-emerald-800 font-semibold">+ Performance Bonus / Allowance</td>
                        <td className="p-2 text-right font-mono text-emerald-800 font-semibold">
                          +Rs. {selectedPayslip.bonusCommission.toLocaleString()}
                        </td>
                      </tr>
                    )}
                    {selectedPayslip.advanceDeduction > 0 && (
                      <tr>
                        <td className="p-2 text-rose-800 font-semibold">- Advance Salary / Deductions</td>
                        <td className="p-2 text-right font-mono text-rose-800 font-semibold">
                          -Rs. {selectedPayslip.advanceDeduction.toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                      <td className="p-2 text-sm">NET SALARY PAID ({selectedPayslip.paymentMode})</td>
                      <td className="p-2 text-right font-mono text-sm text-slate-900">
                        Rs. {selectedPayslip.netPaidAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="pt-6 flex justify-between text-[10px] text-slate-500">
                  <div className="text-center pt-4 border-t border-slate-300 w-32">
                    <p>Employee Signature</p>
                  </div>
                  <div className="text-center pt-4 border-t border-slate-300 w-32">
                    <p>Employer Signature</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md flex items-center gap-2"
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
