/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Employee, LeaveRequest, SystemSettings } from '../types';
import { Check, X, MessageSquare, AlertTriangle, Users, Calendar, Clock, ArrowRight, BarChart3, Download } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import { exportToCSV, printPDFReport } from '../utils/exportUtils';

const getRequestAgeInHours = (createdAt: string) => {
  const createdTime = new Date(createdAt).getTime();
  const now = new Date().getTime();
  // Simulated date July 4, 2026, 03:57:15-07:00
  const simulatedNow = new Date('2026-07-04T03:57:15-07:00').getTime();
  const activeNow = Math.max(now, simulatedNow);
  const diffMs = activeNow - createdTime;
  return Math.max(0, diffMs / (1000 * 60 * 60));
};

interface ManagerDashboardProps {
  currentUser: Employee;
  refreshTrigger: number;
  onActionCompleted: () => void;
  settings: SystemSettings;
}

export default function ManagerDashboard({
  currentUser,
  refreshTrigger,
  onActionCompleted,
  settings,
}: ManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'ANALYTICS'>('REQUESTS');
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bulk operation and selection states
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [bulkComment, setBulkComment] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Comments for each pending item
  const [actionComments, setActionComments] = useState<{ [reqId: string]: string }>({});

  useEffect(() => {
    fetchManagerData();
  }, [currentUser, refreshTrigger]);

  const fetchManagerData = async () => {
    setIsLoading(true);
    try {
      const isHrOrAdmin = currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN';
      const reqUrl = isHrOrAdmin
        ? '/api/leave-requests?all=true'
        : `/api/leave-requests?managerId=${currentUser.id}`;

      const [reqRes, empRes, allReqRes] = await Promise.all([
        fetch(reqUrl),
        fetch('/api/employees'),
        fetch('/api/leave-requests?all=true'),
      ]);
      const reqData = await reqRes.json();
      const empData = await empRes.json();
      const allReqData = await allReqRes.json();

      setTeamRequests(reqData);
      setTeamMembers(isHrOrAdmin ? empData : empData.filter((e: Employee) => e.managerId === currentUser.id));
      setAllRequests(allReqData);

      // Keep only selected IDs that are still pending in the refreshed data
      const pendingIds = reqData.filter((r: LeaveRequest) => r.status === 'PENDING').map((r: LeaveRequest) => r.id);
      setSelectedRequestIds(prev => prev.filter(id => pendingIds.includes(id)));
    } catch (e) {
      console.error('Error fetching manager metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED' | 'CLARIFICATION') => {
    const comments = actionComments[id] || '';
    if (status === 'REJECTED' && !comments.trim()) {
      alert('Please provide comment feedback explaining the rejection decision.');
      return;
    }
    if (status === 'CLARIFICATION' && !comments.trim()) {
      alert('Please specify what details/clarification you require from the employee.');
      return;
    }

    try {
      const res = await fetch(`/api/leave-requests/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments }),
      });

      if (res.ok) {
        setActionComments(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        fetchManagerData();
        onActionCompleted();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete action.');
      }
    } catch (e) {
      alert('Network communication issue. Failed to submit action.');
    }
  };

  const handleBulkAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (selectedRequestIds.length === 0) return;

    if (status === 'REJECTED' && !bulkComment.trim()) {
      alert('Please provide a comment feedback explaining the bulk rejection decision.');
      return;
    }

    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/leave-requests/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedRequestIds,
          status,
          comments: bulkComment,
        }),
      });

      if (res.ok) {
        setSelectedRequestIds([]);
        setBulkComment('');
        fetchManagerData();
        onActionCompleted();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete bulk action.');
      }
    } catch (e) {
      alert('Network communication issue. Failed to submit bulk action.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Check for any overlapping leaves (Approved or Pending)
  const getOverlappingRequests = (req: LeaveRequest) => {
    const rStart = new Date(req.startDate);
    const rEnd = new Date(req.endDate);

    const overlaps = allRequests.filter(item => {
      // Exclude self, rejected, or same-day cancellations
      if (item.id === req.id || item.status === 'REJECTED') return false;
      // Filter for members in same department
      if (item.departmentName !== req.departmentName) return false;

      const iStart = new Date(item.startDate);
      const iEnd = new Date(item.endDate);

      // Simple overlap logic: Start A <= End B and End A >= Start B
      return rStart <= iEnd && rEnd >= iStart;
    });

    return overlaps;
  };

  // Metrics for Team Panel
  const pendingRequests = teamRequests.filter(r => r.status === 'PENDING');
  const pendingRequestsCount = pendingRequests.length;
  
  // Who is out today (using mock current date July 4, 2026)
  const todayStr = '2026-07-04';
  const outTodayList = allRequests.filter(r => {
    if (r.status !== 'APPROVED') return false;
    const s = new Date(r.startDate);
    const e = new Date(r.endDate);
    const t = new Date(todayStr);
    s.setHours(0,0,0,0);
    e.setHours(0,0,0,0);
    t.setHours(0,0,0,0);
    return t >= s && t <= e;
  });

  const presentTeamCount = teamMembers.length - outTodayList.filter(o => teamMembers.map(t => t.id).includes(o.employeeId)).length;
  const presencePercent = Math.round((presentTeamCount / (teamMembers.length || 1)) * 100);
  const isUnderStaffed = presencePercent < settings.staffingThresholdPercent;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <span className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
        <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">Loading Manager Portal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="manager-dashboard-module">
      {/* 1. Overview Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Pending Approvals</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{pendingRequestsCount} Requests</p>
          </div>
          <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              {currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN' ? 'Total Organization Size' : 'Managed Team Size'}
            </span>
            <p className="text-2xl font-bold font-mono text-slate-900">{teamMembers.length} Members</p>
          </div>
          <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className={`rounded-2xl p-5 border shadow-xs flex items-center justify-between ${
          isUnderStaffed
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div className="space-y-1">
            <span className={`text-xs font-mono uppercase tracking-widest ${isUnderStaffed ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
              {currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN' ? 'Org Presence Today (July 4)' : 'Team Presence Today (July 4)'}
            </span>
            <p className="text-2xl font-bold font-mono">{presencePercent}% Presence</p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
            isUnderStaffed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Understaffed Warning Banner */}
      {isUnderStaffed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest font-mono">Department Staffing Presence Threshold Violation</h4>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Caution: Attendance is currently at <b>{presencePercent}%</b> which is below the configurable staffing threshold rule (<b>{settings.staffingThresholdPercent}% Presence</b> required). Carefully audit overlapping leaves before approving further vacation periods to maintain operational capability.
            </p>
          </div>
        </div>
      )}

      {/* Tab Switcher Selector */}
      <div className="flex border-b border-slate-100 pb-2.5 gap-2">
        <button
          onClick={() => setActiveTab('REQUESTS')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === 'REQUESTS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>{currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN' ? 'All Applications' : 'Team Applications'} ({pendingRequestsCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === 'ANALYTICS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>{currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN' ? 'System Analytics Insights' : 'Team Analytics Insights'}</span>
        </button>
      </div>

      {activeTab === 'ANALYTICS' ? (
        <AnalyticsDashboard
          allRequests={allRequests}
          employees={teamMembers}
          viewType={currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN' ? 'HR' : 'MANAGER'}
          managerId={currentUser.id}
        />
      ) : (
        /* 2. Review Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        
        {/* Review list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-400 font-mono uppercase tracking-widest">
                {currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN' ? 'All Applications for Review' : 'Team Applications for Review'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Currently loaded: {teamRequests.length} applications
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mr-1">Export:</span>
              <button
                onClick={() => exportToCSV(teamRequests, 'team_leave_report.csv')}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
                title="Download CSV Report"
                id="btn-export-csv-manager"
              >
                <Download className="h-3 w-3" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => printPDFReport(teamRequests, currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN' ? 'Organization Leave Applications Report' : 'Team Leave Applications Report')}
                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-xl text-[10px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-100/50 dark:border-indigo-900/30"
                title="Print or Save PDF Report"
                id="btn-export-pdf-manager"
              >
                <Download className="h-3 w-3" />
                <span>PDF / Print</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5 mb-2">
            {pendingRequests.length > 0 ? (
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="checkbox-select-all-pending"
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 h-4 w-4 cursor-pointer"
                  checked={selectedRequestIds.length === pendingRequests.length && pendingRequests.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRequestIds(pendingRequests.map(r => r.id));
                    } else {
                      setSelectedRequestIds([]);
                    }
                  }}
                />
                <span>Select All Pending ({pendingRequests.length})</span>
              </label>
            ) : <div />}
          </div>
          
          {pendingRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center flex flex-col items-center gap-2 shadow-xs">
              <Check className="h-10 w-10 text-emerald-400 stroke-1" />
              <p className="text-xs text-slate-400 font-sans">Excellent! No pending leave requests on your desk.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => {
                const overlaps = getOverlappingRequests(req);
                const isOverlapWarning = overlaps.length > 0;
                const ageInHours = getRequestAgeInHours(req.createdAt);
                const isEscalated = ageInHours > 48;
                const isSelected = selectedRequestIds.includes(req.id);

                return (
                  <div
                    key={req.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm space-y-4 transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 ring-1 ring-blue-500 dark:border-blue-600 dark:ring-blue-600 bg-blue-50/5 dark:bg-blue-950/5'
                        : isEscalated
                        ? 'border-rose-200 dark:border-rose-950/80 bg-rose-50/5 dark:bg-rose-950/5 hover:border-rose-300 dark:hover:border-rose-900/60'
                        : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`checkbox-select-${req.id}`}
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRequestIds(prev => [...prev, req.id]);
                            } else {
                              setSelectedRequestIds(prev => prev.filter(id => id !== req.id));
                            }
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer shrink-0"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">{req.employeeName}</span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">{req.departmentName}</span>
                            {isEscalated && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/40 animate-pulse">
                                <Clock className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: '3s' }} />
                                <span>{"Escalated (>48h)"}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                            <span>{req.startDate} to {req.endDate} ({req.duration} days)</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900/40 self-start">
                        {req.leaveTypeName}
                      </span>
                    </div>

                    {/* Employee Reason */}
                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3.5 border border-slate-200/50 dark:border-slate-800/80 text-xs">
                      <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px] font-mono block mb-1">Reason Statement</span>
                      <p className="text-slate-700 dark:text-slate-300 italic font-sans leading-relaxed">"{req.reason}"</p>
                      
                      {req.supportingDocument && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 p-1 rounded-lg w-fit border border-blue-100 dark:border-blue-900/30">
                          <span>Attached: {req.supportingDocument}</span>
                        </div>
                      )}
                    </div>

                    {/* Escalation Alert Callout */}
                    {isEscalated && (
                      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-3.5 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold uppercase tracking-wider text-[9px] font-mono text-rose-600 dark:text-rose-400">Escalation Alert (SLA Overdue)</p>
                          <p className="text-[11px] leading-relaxed">
                            This leave request has been pending decision for <b>{Math.round(ageInHours)} hours</b>, which exceeds the company-mandated 48-hour SLA. Immediate action is required to ensure scheduling compliance and team coverage.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Overlap Alarm Indicator */}
                    {isOverlapWarning && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[9px] font-mono">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Leave Collision Detected (Overlaps)</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-700 font-sans">
                          {overlaps.map(o => (
                            <li key={o.id}>
                              <b>{o.employeeName}</b> is also out / applying on <b>{o.startDate} to {o.endDate}</b> ({o.leaveTypeName} • {o.status})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Decision comments & actions */}
                    <div className="space-y-3 pt-2">
                      <textarea
                        placeholder="Add review feedback, comments, or clarification queries..."
                        value={actionComments[req.id] || ''}
                        onChange={(e) => setActionComments(prev => ({ ...prev, [req.id]: e.target.value }))}
                        id={`comments-${req.id}`}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
                      />

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(req.id, 'CLARIFICATION')}
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 text-[11px] font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/40"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Request Clarification</span>
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'REJECTED')}
                          className="bg-red-50 text-red-700 hover:bg-red-100 text-[11px] font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-red-100"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'APPROVED')}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold py-1.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve Leave</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Outage Board Today */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-fit">
          <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest mb-4">
            {currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN' ? 'Organization Outages Board' : 'Team Outages Board'}
          </h4>
          
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3 text-xs">
              <span className="text-slate-500 font-sans block">Currently Out Today (Jul 4):</span>
              <div className="mt-2 space-y-2">
                {outTodayList.length === 0 ? (
                  <p className="text-slate-400 italic">No team members scheduled out today.</p>
                ) : (
                  outTodayList.map(o => (
                    <div key={o.id} className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block">{o.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{o.leaveTypeName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200">
                        {o.startDate} to {o.endDate}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-xs">
              <span className="text-slate-500 font-sans block mb-2">
                {currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN' ? 'Organization Roster Presence:' : 'Team Roster Presence Directory:'}
              </span>
              <div className="space-y-2">
                {teamMembers.map(m => {
                  const isOut = outTodayList.map(o => o.employeeId).includes(m.id);
                  return (
                    <div key={m.id} className="flex items-center justify-between p-1">
                      <div className="flex items-center gap-2">
                        <img src={m.avatar} alt={m.name} className="h-6 w-6 rounded-full object-cover" />
                        <span className="font-medium text-slate-700">{m.name}</span>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${isOut ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} title={isOut ? 'Out on Leave' : 'Active Present'}></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
      )}

      {/* 3. Bulk Approve/Reject Floating Action Bar */}
      {selectedRequestIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-4xl w-[92%] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-4 animate-in slide-in-from-bottom-5 duration-200" id="manager-bulk-action-bar">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Bulk Leave Operations</h4>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedRequestIds.length} of {pendingRequests.length} request(s) selected
                </p>
              </div>
            </div>

            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Bulk comments (required for rejections)..."
                value={bulkComment}
                onChange={(e) => setBulkComment(e.target.value)}
                id="input-bulk-comment"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setSelectedRequestIds([])}
                id="btn-bulk-clear"
                className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-xl"
              >
                Clear
              </button>
              <button
                onClick={() => handleBulkAction('REJECTED')}
                disabled={isBulkProcessing}
                id="btn-bulk-reject"
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:bg-red-500/5 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Bulk Reject</span>
              </button>
              <button
                onClick={() => handleBulkAction('APPROVED')}
                disabled={isBulkProcessing}
                id="btn-bulk-approve"
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isBulkProcessing ? (
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Bulk Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
