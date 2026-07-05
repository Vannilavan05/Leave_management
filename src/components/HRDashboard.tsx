/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee, Holiday, LeaveType, LeaveRequest, UserRole } from '../types';
import { Plus, Users, Calendar, Award, Trash2, Shield, Search, ListFilter, AlertCircle, Download } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import { exportToCSV, printPDFReport } from '../utils/exportUtils';

interface HRDashboardProps {
  currentUser: Employee;
  leaveTypes: LeaveType[];
  refreshTrigger: number;
  onStructureModified: () => void;
}

export default function HRDashboard({
  currentUser,
  leaveTypes,
  refreshTrigger,
  onStructureModified,
}: HRDashboardProps) {
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'HOLIDAYS' | 'LEAVE_TYPES' | 'ALL_REQUESTS' | 'ANALYTICS'>('EMPLOYEES');
  
  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Employee Form
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState(UserRole.EMPLOYEE);
  const [empDept, setEmpDept] = useState('dept_eng');
  const [empError, setEmpError] = useState<string | null>(null);

  // New Holiday Form
  const [holName, setHolName] = useState('');
  const [holDate, setHolDate] = useState('');
  const [holType, setHolType] = useState<'FEDERAL' | 'OPTIONAL'>('FEDERAL');
  const [holError, setHolError] = useState<string | null>(null);

  // New Leave Type Form
  const [ltName, setLtName] = useState('');
  const [ltDesc, setLtDesc] = useState('');
  const [ltQuota, setLtQuota] = useState('12');
  const [ltRequiresDocs, setLtRequiresDocs] = useState(false);
  const [ltPaid, setLtPaid] = useState(true);
  const [ltColor, setLtColor] = useState('bg-blue-100 text-blue-800 border-blue-200');
  const [ltError, setLtError] = useState<string | null>(null);

  useEffect(() => {
    fetchHrData();
  }, [currentUser, refreshTrigger, activeTab]);

  const fetchHrData = async () => {
    setIsLoading(true);
    try {
      const [empRes, holRes, reqRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/holidays'),
        fetch('/api/leave-requests?all=true'),
      ]);
      const empData = await empRes.json();
      const holData = await holRes.json();
      const reqData = await reqRes.json();

      setEmployees(empData);
      setHolidays(holData);
      setAllRequests(reqData);
    } catch (e) {
      console.error('Error fetching HR admin datasets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Add Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError(null);
    if (!empName.trim() || !empEmail.trim()) {
      setEmpError('Please fill in employee name and email.');
      return;
    }

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empName,
          email: empEmail,
          role: empRole,
          departmentId: empDept,
        }),
      });

      if (res.ok) {
        setEmpName('');
        setEmpEmail('');
        fetchHrData();
        onStructureModified();
      } else {
        const d = await res.json();
        setEmpError(d.error || 'Failed to register employee.');
      }
    } catch (e) {
      setEmpError('Network error registering employee.');
    }
  };

  // Toggle Employee Status
  const handleToggleEmployeeStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/employees/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchHrData();
      }
    } catch (e) {
      console.error('Error toggling employee status:', e);
    }
  };

  // Add Holiday
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setHolError(null);
    if (!holName.trim() || !holDate) {
      setHolError('Please specify holiday description and calendar date.');
      return;
    }

    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: holName, date: holDate, type: holType }),
      });

      if (res.ok) {
        setHolName('');
        setHolDate('');
        fetchHrData();
        onStructureModified();
      } else {
        const d = await res.json();
        setHolError(d.error || 'Failed to save holiday.');
      }
    } catch (e) {
      setHolError('Network error saving holiday.');
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      const res = await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHrData();
        onStructureModified();
      }
    } catch (e) {
      console.error('Error deleting holiday:', e);
    }
  };

  // Add Leave Category Type
  const handleAddLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setLtError(null);
    if (!ltName.trim() || !ltDesc.trim()) {
      setLtError('Please fill in name and description for leave type.');
      return;
    }

    try {
      const res = await fetch('/api/leave-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ltName,
          description: ltDesc,
          defaultQuota: ltQuota,
          requiresDocuments: ltRequiresDocs,
          paid: ltPaid,
          color: ltColor,
        }),
      });

      if (res.ok) {
        setLtName('');
        setLtDesc('');
        setLtQuota('12');
        setLtRequiresDocs(false);
        setLtPaid(true);
        fetchHrData();
        onStructureModified();
      } else {
        const d = await res.json();
        setLtError(d.error || 'Failed to create category.');
      }
    } catch (e) {
      setLtError('Network error creating leave category.');
    }
  };

  return (
    <div className="space-y-6" id="hr-dashboard-module">
      
      {/* 1. Header & Navigation Tab Rails */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-900 font-sans tracking-tight">HR Control Console</h3>
        </div>

        <div className="flex flex-wrap border-b border-slate-100 md:border-b-0 gap-1.5 bg-slate-100 p-1.5 rounded-xl">
          {['EMPLOYEES', 'HOLIDAYS', 'LEAVE_TYPES', 'ALL_REQUESTS', 'ANALYTICS'].map((tab) => {
            const isActive = activeTab === tab;
            const labels: { [key: string]: string } = {
              EMPLOYEES: 'Staff Directory',
              HOLIDAYS: 'Holiday Calendar',
              LEAVE_TYPES: 'Leave Policies',
              ALL_REQUESTS: 'Organization Logs',
              ANALYTICS: 'Analytics Insights',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                id={`tab-hr-${tab.toLowerCase()}`}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tab Contents */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <span className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">Fetching Console Metrics...</span>
        </div>
      ) : activeTab === 'ANALYTICS' ? (
        <AnalyticsDashboard
          allRequests={allRequests}
          employees={employees}
          viewType="HR"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Left Content Panel (Col Span 2) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm min-h-[400px]">
            {activeTab === 'EMPLOYEES' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h4 className="text-sm font-bold text-slate-800 font-sans">Active Organization Staff ({employees.length})</h4>
                  <span className="text-[10px] font-mono bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase">Directory Overview</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                        <th className="py-2.5">Staff Name</th>
                        <th className="py-2.5">Email / Account</th>
                        <th className="py-2.5">Role</th>
                        <th className="py-2.5">Department</th>
                        <th className="py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-slate-800 flex items-center gap-2">
                            <img src={emp.avatar} alt={emp.name} className="h-7 w-7 rounded-full object-cover" />
                            <span>{emp.name}</span>
                          </td>
                          <td className="py-3 font-mono text-slate-500">{emp.email}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] uppercase font-semibold">
                              {emp.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600 font-sans">{emp.departmentName}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleToggleEmployeeStatus(emp.id, emp.status)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all border ${
                                emp.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-800 border-red-100 hover:bg-red-100'
                              }`}
                            >
                              {emp.status}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'HOLIDAYS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h4 className="text-sm font-bold text-slate-800 font-sans">Active Holiday Schedules ({holidays.length})</h4>
                  <span className="text-[10px] font-mono bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase">Calendar Settings</span>
                </div>

                <div className="space-y-3">
                  {holidays.map((h) => (
                    <div key={h.id} className="border border-slate-100 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-200 hover:shadow-2xs transition-all">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-800 font-sans block">{h.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono uppercase">
                          <span>{h.date}</span>
                          <span>•</span>
                          <span className={`px-1.5 rounded ${h.type === 'FEDERAL' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{h.type} HOLIDAY</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 cursor-pointer"
                        title="Delete Holiday"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'LEAVE_TYPES' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h4 className="text-sm font-bold text-slate-800 font-sans">System Leave Category Types ({leaveTypes.length})</h4>
                  <span className="text-[10px] font-mono bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase">Policy Rules</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leaveTypes.map((type) => (
                    <div key={type.id} className="border border-slate-100 rounded-xl p-4 space-y-3 shadow-2xs hover:border-slate-200 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 font-sans">{type.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">Quota: {type.defaultQuota}d</span>
                      </div>
                      <p className="text-xs text-slate-500 font-sans leading-relaxed">
                        {type.description}
                      </p>
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-50 text-[10px] font-mono text-slate-400 uppercase">
                        <span className={`px-1.5 rounded ${type.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                          {type.paid ? 'PAID LEAVE' : 'UNPAID LEAVE'}
                        </span>
                        <span>•</span>
                        <span className={`px-1.5 rounded ${type.requiresDocuments ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>
                          {type.requiresDocuments ? 'DOCS MANDATORY' : 'NO DOCS REQUIRED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ALL_REQUESTS' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 font-sans">Organization Leave logs ({allRequests.length})</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Comprehensive historic system logs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium mr-1">Download Report:</span>
                    <button
                      onClick={() => exportToCSV(allRequests, 'organization_leave_report.csv')}
                      className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200/50"
                      title="Download CSV"
                      id="btn-export-csv-hr"
                    >
                      <Download className="h-3 w-3" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={() => printPDFReport(allRequests, 'Organization Leave Logs Report')}
                      className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-100/50"
                      title="Print / PDF"
                      id="btn-export-pdf-hr"
                    >
                      <Download className="h-3 w-3" />
                      <span>PDF / Print</span>
                    </button>
                    <span className="text-[10px] font-mono bg-slate-50 border border-slate-100 text-slate-500 px-2.5 py-1 rounded-full uppercase ml-1">System Audits</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {allRequests.map((req) => (
                    <div key={req.id} className="border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{req.employeeName}</span>
                          <span className="text-[10px] font-mono text-slate-400">{req.departmentName}</span>
                        </div>
                        <p className="text-slate-600 mt-1">
                          {req.leaveTypeName} • {req.startDate} to {req.endDate} (<b>{req.duration}d</b>)
                        </p>
                        <p className="text-slate-400 italic text-[11px] mt-1 font-sans">"{req.reason}"</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : req.status === 'REJECTED'
                            ? 'bg-red-50 text-red-800 border-red-100'
                            : 'bg-amber-50 text-amber-800 border-amber-100'
                        }`}>
                          {req.status}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">ID: {req.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* HR Side Form Panel (Col Span 1) */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-fit">
            
            {activeTab === 'EMPLOYEES' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                  <Plus className="h-4.5 w-4.5 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">Register New Staff</h4>
                </div>

                {empError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p>{empError}</p>
                  </div>
                )}

                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Richard Hendricks"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      id="input-new-emp-name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Corporate Email</label>
                    <input
                      type="email"
                      placeholder="e.g. richard@piedpiper.com"
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      id="input-new-emp-email"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Designated Role</label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value as UserRole)}
                      id="select-new-emp-role"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value={UserRole.EMPLOYEE}>Regular Employee</option>
                      <option value={UserRole.MANAGER}>Department Manager</option>
                      <option value={UserRole.HR}>HR Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Department Assignment</label>
                    <select
                      value={empDept}
                      onChange={(e) => setEmpDept(e.target.value)}
                      id="select-new-emp-dept"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="dept_eng">Engineering</option>
                      <option value="dept_hr">Human Resources</option>
                      <option value="dept_admin">Administration</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    id="btn-register-employee"
                    className="w-full bg-indigo-600 text-white text-xs font-semibold py-2 px-4 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Register Employee
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'HOLIDAYS' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                  <Plus className="h-4.5 w-4.5 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">Schedule Holiday</h4>
                </div>

                {holError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p>{holError}</p>
                  </div>
                )}

                <form onSubmit={handleAddHoliday} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Holiday Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Christmas Day"
                      value={holName}
                      onChange={(e) => setHolName(e.target.value)}
                      id="input-new-holiday-name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Calendar Date</label>
                    <input
                      type="date"
                      value={holDate}
                      onChange={(e) => setHolDate(e.target.value)}
                      id="input-new-holiday-date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Holiday Class</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHolType('FEDERAL')}
                        className={`flex-1 py-1.5 px-3 border rounded-lg text-xs font-semibold cursor-pointer text-center ${
                          holType === 'FEDERAL'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                      >
                        Federal
                      </button>
                      <button
                        type="button"
                        onClick={() => setHolType('OPTIONAL')}
                        className={`flex-1 py-1.5 px-3 border rounded-lg text-xs font-semibold cursor-pointer text-center ${
                          holType === 'OPTIONAL'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                      >
                        Optional
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-add-holiday"
                    className="w-full bg-indigo-600 text-white text-xs font-semibold py-2 px-4 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Schedule Holiday
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'LEAVE_TYPES' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                  <Plus className="h-4.5 w-4.5 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">Define Leave Category</h4>
                </div>

                {ltError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p>{ltError}</p>
                  </div>
                )}

                <form onSubmit={handleAddLeaveType} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Maternity Leave"
                      value={ltName}
                      onChange={(e) => setLtName(e.target.value)}
                      id="input-new-lt-name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Category Description</label>
                    <textarea
                      placeholder="e.g. Fully paid leave for child birth and postnatal care."
                      value={ltDesc}
                      onChange={(e) => setLtDesc(e.target.value)}
                      id="input-new-lt-desc"
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Default Annual Quota (Days)</label>
                    <input
                      type="number"
                      value={ltQuota}
                      onChange={(e) => setLtQuota(e.target.value)}
                      id="input-new-lt-quota"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Requires Medical/Legal Docs</span>
                      <input
                        type="checkbox"
                        checked={ltRequiresDocs}
                        onChange={(e) => setLtRequiresDocs(e.target.checked)}
                        id="checkbox-new-lt-docs"
                        className="h-4 w-4 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Paid Leave Category</span>
                      <input
                        type="checkbox"
                        checked={ltPaid}
                        onChange={(e) => setLtPaid(e.target.checked)}
                        id="checkbox-new-lt-paid"
                        className="h-4 w-4 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-create-leave-type"
                    className="w-full bg-indigo-600 text-white text-xs font-semibold py-2 px-4 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Create Leave Category
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'ALL_REQUESTS' && (
              <div className="bg-indigo-50 border border-indigo-200 p-4.5 rounded-2xl text-xs text-indigo-900 space-y-2">
                <h4 className="font-bold text-indigo-950 uppercase tracking-widest font-mono text-[10px]">Administrative Controls Notice</h4>
                <p className="leading-relaxed font-sans text-indigo-800">
                  As an HR Administrator or Super Admin, you have global overview of all applications submitted across the departments.
                </p>
                <p className="leading-relaxed font-sans text-indigo-800">
                  Individual Managers perform primary line approvals, while HR monitors staffing violations, escalation deadlines, and processes corporate audits.
                </p>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
