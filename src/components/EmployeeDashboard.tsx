/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee, LeaveBalance, LeaveType, LeaveRequest } from '../types';
import { Plus, Calendar, Paperclip, AlertCircle, History, FileText, Trash2, CheckCircle2, HelpCircle } from 'lucide-react';

interface EmployeeDashboardProps {
  currentUser: Employee;
  leaveTypes: LeaveType[];
  refreshTrigger: number;
  onLeaveApplied: () => void;
  aiDraftForm: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    halfDay: boolean;
  } | null;
  onClearAiDraft: () => void;
}

export default function EmployeeDashboard({
  currentUser,
  leaveTypes,
  refreshTrigger,
  onLeaveApplied,
  aiDraftForm,
  onClearAiDraft,
}: EmployeeDashboardProps) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(currentUser.id);

  // Form Fields
  const [leaveTypeId, setLeaveTypeId] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } catch (err) {
        console.error('Error fetching employees list:', err);
      }
    };
    fetchEmployees();
  }, [currentUser]);

  useEffect(() => {
    setTargetEmployeeId(currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    fetchBalancesAndRequests();
  }, [currentUser, refreshTrigger, targetEmployeeId]);

  // Apply AI pre-fill draft if present
  useEffect(() => {
    if (aiDraftForm) {
      setLeaveTypeId(aiDraftForm.leaveTypeId);
      setStartDate(aiDraftForm.startDate);
      setEndDate(aiDraftForm.endDate);
      setReason(aiDraftForm.reason);
      setHalfDay(aiDraftForm.halfDay);
      setFormSuccess('Leave request fields successfully pre-filled by AI Companion!');
      // Clear draft container state
      onClearAiDraft();
    }
  }, [aiDraftForm]);

  const fetchBalancesAndRequests = async () => {
    setIsLoading(true);
    try {
      const [balRes, reqRes] = await Promise.all([
        fetch(`/api/leave-balances?employeeId=${targetEmployeeId}`),
        fetch(`/api/leave-requests?employeeId=${targetEmployeeId}`),
      ]);
      const balData = await balRes.json();
      const reqData = await reqRes.json();
      
      setBalances(balData);
      setMyRequests(reqData);
    } catch (e) {
      console.error('Error fetching employee metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentName(file.name);
    }
  };

  const calculateDuration = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    let dur = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return halfDay ? 0.5 : dur;
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const dur = calculateDuration();
    if (dur <= 0) {
      setFormError('End Date must be equal to or greater than Start Date.');
      return;
    }

    // Dynamic Policy Validations
    const selectedType = leaveTypes.find(t => t.id === leaveTypeId);
    
    // Sick Leave document requirement
    if (leaveTypeId === 'sick' && dur > 2 && !documentName) {
      setFormError('A valid Medical Certificate document upload is required for Sick Leave requests longer than 2 days.');
      return;
    }

    // Annual Leave advance application guideline
    if (leaveTypeId === 'annual') {
      const advanceDays = Math.ceil((new Date(startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (advanceDays < 7) {
        setFormError('Annual Leave requires at least 7 days (1 week) advance application notice.');
        return;
      }
    }

    // Check balance
    const currentBal = balances.find(b => b.leaveTypeId === leaveTypeId);
    if (currentBal && currentBal.remaining < dur && leaveTypeId !== 'lop') {
      setFormError(`Insufficient leave balance. Remaining: ${currentBal.remaining} days, Requested: ${dur} days.`);
      return;
    }

    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveTypeId,
          startDate,
          endDate,
          reason,
          halfDay,
          supportingDocument: documentName,
          employeeId: targetEmployeeId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess('Leave request successfully applied! Sent for Manager approval.');
        setStartDate('');
        setEndDate('');
        setReason('');
        setHalfDay(false);
        setDocumentName(null);
        fetchBalancesAndRequests();
        onLeaveApplied();
      } else {
        setFormError(data.error || 'Failed to submit request.');
      }
    } catch (err) {
      setFormError('Network communication error. Failed to apply leave.');
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel and recall this leave application?')) return;
    try {
      const res = await fetch(`/api/leave-requests/${id}/cancel`, { method: 'POST' });
      if (res.ok) {
        fetchBalancesAndRequests();
        onLeaveApplied();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to cancel request');
      }
    } catch (e) {
      alert('Error cancelling request');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <span className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
        <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">Loading Employee Portal...</span>
      </div>
    );
  }

  const selectedEmployee = employees.find(e => e.id === targetEmployeeId) || currentUser;

  return (
    <div className="space-y-8" id="employee-dashboard-module">
      {/* Employee Selector for Leave Application */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 shadow-3xs transition-colors duration-200">
        <div className="text-center md:text-left">
          <h3 className="text-md font-bold text-slate-950 dark:text-white">Apply Leave on Behalf of Employee</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select an employee from the dropdown to apply for leave, view current balances, and check history.</p>
        </div>
        <div className="w-full md:w-80">
          <label className="block text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Target Employee</label>
          <select
            value={targetEmployeeId}
            onChange={(e) => setTargetEmployeeId(e.target.value)}
            id="dropdown-apply-behalf-employee"
            className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {emp.name} ({emp.departmentName} • {emp.role.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Leave Balance Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 font-mono uppercase tracking-widest mb-4">Leave Quotas & Balances for {selectedEmployee.name}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {balances.map((bal) => {
            const leaveType = leaveTypes.find(t => t.id === bal.leaveTypeId);
            const percentUsed = Math.min(100, Math.round((bal.used / bal.quota) * 100));
            
            return (
              <div
                key={bal.leaveTypeId}
                className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${leaveType?.color?.split(' ')[0] || 'bg-slate-400'}`}></span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Remaining</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 font-sans truncate" title={bal.leaveTypeName}>
                    {bal.leaveTypeName}
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-bold font-mono text-slate-900">{bal.remaining}</span>
                    <span className="text-xs text-slate-400 font-sans">/ {bal.quota} d</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 text-[10px]">
                  <div className="flex justify-between text-slate-500 font-sans">
                    <span>Used: <b>{bal.used}d</b></span>
                    <span>Pending: <b>{bal.pending}d</b></span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        bal.remaining === 0 ? 'bg-red-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${100 - percentUsed}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Apply Form & History List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Container */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Plus className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-900 font-sans tracking-tight">Apply for Leave ({selectedEmployee.name})</h3>
          </div>

          <form onSubmit={handleApplyLeave} className="space-y-4">
            {/* Success & Error boxes */}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2 animate-shake">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p>{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p>{formSuccess}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Leave Type</label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                id="select-leave-type"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} {type.requiresDocuments ? '• Docs Required' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  id="input-start-date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  id="input-end-date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* Half Day Switcher */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              <div className="text-xs">
                <span className="font-bold text-slate-700 block">Half-Day Leave</span>
                <span className="text-[10px] text-slate-400">Apply for first or second half only</span>
              </div>
              <input
                type="checkbox"
                checked={halfDay}
                onChange={(e) => setHalfDay(e.target.checked)}
                id="checkbox-half-day"
                className="h-4.5 w-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reason / Comments</label>
              <textarea
                placeholder="Explain details of vacation, surgery, personal emergencies..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                id="input-leave-reason"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                required
              />
            </div>

            {/* Upload Document Integration */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Supporting Document {leaveTypeId === 'sick' ? '(Required for Sick > 2 days)' : '(Optional)'}
              </label>
              <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 text-center relative hover:bg-slate-100/50 transition-colors cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileChange}
                  id="input-supporting-doc"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <div className="flex flex-col items-center justify-center gap-1">
                  <Paperclip className="h-4.5 w-4.5 text-slate-400" />
                  <span className="text-[11px] font-medium text-slate-600">
                    {documentName ? documentName : 'Select file or drag-and-drop'}
                  </span>
                  <span className="text-[9px] text-slate-400">PDF, PNG, JPG up to 5MB</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3 font-mono">
                <span>Calculated Outage:</span>
                <span className="font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded-lg">
                  {calculateDuration()} days
                </span>
              </div>
              <button
                type="submit"
                id="btn-submit-leave-request"
                className="w-full bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-xs font-sans"
              >
                Submit Application
              </button>
            </div>
          </form>
        </div>

        {/* My Applications History List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-500" />
              <h3 className="text-lg font-semibold text-slate-900 font-sans tracking-tight">Application Tracker & History ({selectedEmployee.name})</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
              {myRequests.length} Applications Total
            </span>
          </div>

          {myRequests.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center gap-2">
              <FileText className="h-10 w-10 text-slate-300 stroke-1" />
              <p className="text-xs text-slate-400 font-sans">{selectedEmployee.name} hasn't submitted any leave applications yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isClarification = req.status === 'CLARIFICATION';
                
                return (
                  <div
                    key={req.id}
                    className="border border-slate-100 rounded-xl p-4.5 hover:border-slate-200 transition-all shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 font-sans">{req.leaveTypeName}</span>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-lg border border-slate-200/55">
                            {req.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-1">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{req.startDate} to {req.endDate}</span>
                          <span className="bg-slate-100 text-slate-600 px-1.5 rounded-md font-bold font-sans text-[10px]">
                            {req.duration} days
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : req.status === 'REJECTED'
                            ? 'bg-red-50 text-red-800 border-red-100'
                            : req.status === 'CLARIFICATION'
                            ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse'
                            : 'bg-blue-50 text-blue-800 border-blue-100'
                        }`}>
                          {req.status}
                        </span>

                        {isPending && (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg cursor-pointer"
                            title="Cancel Request"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200/50 text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px] font-mono block mb-1">My Reason</span>
                      <p className="text-slate-700 italic font-sans leading-relaxed">"{req.reason}"</p>

                      {req.supportingDocument && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50/50 p-1.5 rounded-lg w-fit border border-blue-100">
                          <FileText className="h-3 w-3" />
                          <span className="font-medium font-sans truncate">{req.supportingDocument}</span>
                        </div>
                      )}
                    </div>

                    {/* Expandable History / Workflow log */}
                    {req.history && req.history.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px] font-mono block mb-2">Workflow Progress</span>
                        <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1.5">
                          {req.history.map((hist, idx) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[16.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                              <div className="text-[11px] text-slate-500 font-sans">
                                <span className="font-bold text-slate-700">{hist.updatedByName}</span> changed status to <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded-md border border-slate-200">{hist.status}</span>
                                <p className="text-slate-400 italic mt-0.5">"{hist.comments}" • {new Date(hist.timestamp).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
