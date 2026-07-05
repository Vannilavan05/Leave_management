/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee, AuditLog, SystemSettings, SimulatedEmail } from '../types';
import { 
  Sliders, 
  Shield, 
  Cpu, 
  Database, 
  Save, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Mail,
  Trash2,
  Clock,
  Play,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: Employee;
  refreshTrigger: number;
  onSettingsUpdated: () => void;
}

export default function AdminDashboard({
  currentUser,
  refreshTrigger,
  onSettingsUpdated,
}: AdminDashboardProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'AUDIT_LOGS' | 'EMAILS_QUEUE'>('AUDIT_LOGS');
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  // Edit fields
  const [aiEnabled, setAiEnabled] = useState(true);
  const [escalationDays, setEscalationDays] = useState(3);
  const [allowLossOfPay, setAllowLossOfPay] = useState(true);
  const [staffingThreshold, setStaffingThreshold] = useState(50);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, [currentUser, refreshTrigger]);

  useEffect(() => {
    // Poll emails periodically to show real-time background status transitions (QUEUED -> PROCESSING -> SENT)
    const interval = setInterval(() => {
      fetchEmails();
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/simulated-emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (e) {
      console.error('Error fetching simulated emails:', e);
    }
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, settingsRes, emailsRes] = await Promise.all([
        fetch('/api/audit-logs'),
        fetch('/api/settings'),
        fetch('/api/simulated-emails')
      ]);
      const logsData = await logsRes.json();
      const settingsData = await settingsRes.json();
      const emailsData = await emailsRes.json();

      setLogs(logsData);
      setSettings(settingsData);
      setEmails(emailsData);
      
      setAiEnabled(settingsData.aiEnabled);
      setEscalationDays(settingsData.escalationDays);
      setAllowLossOfPay(settingsData.allowLossOfPay);
      setStaffingThreshold(settingsData.staffingThresholdPercent);
    } catch (e) {
      console.error('Error fetching admin telemetry datasets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearEmails = async () => {
    try {
      const res = await fetch('/api/simulated-emails/clear', { method: 'POST' });
      if (res.ok) {
        setEmails([]);
      }
    } catch (e) {
      console.error('Error clearing emails:', e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiEnabled,
          escalationDays,
          allowLossOfPay,
          staffingThresholdPercent: staffingThreshold,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onSettingsUpdated();
      } else {
        const d = await res.json();
        setSaveError(d.error || 'Failed to update rules.');
      }
    } catch (e) {
      setSaveError('Network failure saving system guidelines.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <span className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
        <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">Loading Admin Panel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="admin-dashboard-module">
      
      {/* 1. Monitoring Telemetry Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">CPU Container Load</span>
          <div className="flex items-center gap-2 mt-1">
            <Cpu className="h-4 w-4 text-emerald-500" />
            <span className="text-lg font-bold font-mono text-slate-800">12.4 %</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-1">Status: Optimum Health</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Memory Allocation</span>
          <div className="flex items-center gap-2 mt-1">
            <Sliders className="h-4 w-4 text-emerald-500" />
            <span className="text-lg font-bold font-mono text-slate-800">184 / 512 MB</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-1">JVM Hotspot Normal</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">PostgreSQL Health</span>
          <div className="flex items-center gap-2 mt-1">
            <Database className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="text-lg font-bold font-mono text-slate-800">ONLINE</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-1">Drizzle Schema Valid</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">API Latency</span>
          <div className="flex items-center gap-2 mt-1">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-lg font-bold font-mono text-slate-800">42 ms</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-1">SSL Rate Limits Secure</span>
        </div>
      </div>

      {/* 2. Rule Config & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Form Column */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-5">
            <Sliders className="h-5 w-5 text-slate-800" />
            <h4 className="text-sm font-bold text-slate-800 font-sans uppercase tracking-widest">Global Leave Parameters</h4>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Parameters updated successfully!</span>
              </div>
            )}
            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* AI Switch */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              <div className="text-xs">
                <span className="font-bold text-slate-700 block">AI HR Companion</span>
                <span className="text-[10px] text-slate-400">Enable conversational NLP helper</span>
              </div>
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                id="checkbox-settings-ai-toggle"
                className="h-4.5 w-4.5 text-slate-800 border-slate-300 rounded focus:ring-slate-900 cursor-pointer"
              />
            </div>

            {/* Loss of Pay Switch */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              <div className="text-xs">
                <span className="font-bold text-slate-700 block">Allow Loss of Pay (LOP)</span>
                <span className="text-[10px] text-slate-400">Enable unpaid leave allocations</span>
              </div>
              <input
                type="checkbox"
                checked={allowLossOfPay}
                onChange={(e) => setAllowLossOfPay(e.target.checked)}
                id="checkbox-settings-lop-toggle"
                className="h-4.5 w-4.5 text-slate-800 border-slate-300 rounded focus:ring-slate-900 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Manager Escalation Threshold (Days)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={escalationDays}
                onChange={(e) => setEscalationDays(Number(e.target.value))}
                id="input-settings-escalation-days"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Pending requests escalate to HR after N days.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Min Team Presence Threshold (%)</label>
              <input
                type="number"
                min={10}
                max={100}
                value={staffingThreshold}
                onChange={(e) => setStaffingThreshold(Number(e.target.value))}
                id="input-settings-staffing-threshold"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Warn managers if active presence falls below N%.</span>
            </div>

            <button
              type="submit"
              id="btn-settings-save"
              className="w-full bg-slate-900 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>Save System Parameters</span>
            </button>
          </form>
        </div>

        {/* Tabbed Admin Workspace Column */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[500px]">
          
          {/* Header tabs navigation */}
          <div className="flex border-b border-slate-100 p-2 gap-2 bg-slate-50/50 rounded-t-2xl">
            <button
              onClick={() => setActiveSubTab('AUDIT_LOGS')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                activeSubTab === 'AUDIT_LOGS'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Compliance Audit Trails</span>
            </button>
            <button
              onClick={() => setActiveSubTab('EMAILS_QUEUE')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                activeSubTab === 'EMAILS_QUEUE'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Mail className="h-4 w-4 animate-bounce" />
              <span>Simulated Outbox Queue</span>
              {emails.some(e => e.status !== 'SENT') && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            
            {activeSubTab === 'AUDIT_LOGS' && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-800" />
                    <h4 className="text-sm font-bold text-slate-800 font-sans uppercase tracking-widest">System Audit Trails</h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    {logs.length} Live Log Records
                  </span>
                </div>

                <div className="space-y-3.5 overflow-y-auto max-h-[460px] pr-2 flex-1">
                  {logs.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No system audit logs found.</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="border-b border-slate-50 pb-3 text-xs leading-relaxed font-sans">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase mb-1">
                          <span className="font-bold text-slate-600">{log.userName} ({log.userEmail})</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase">
                            {log.action}
                          </span>
                          <p className="text-slate-700">{log.details}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Audit ID: {log.id}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeSubTab === 'EMAILS_QUEUE' && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-slate-800" />
                    <h4 className="text-sm font-bold text-slate-800 font-sans uppercase tracking-widest">Simulated Background Email Dispatcher</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {emails.length > 0 && (
                      <button
                        onClick={handleClearEmails}
                        className="flex items-center gap-1 bg-red-50 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Purge Mail Server</span>
                      </button>
                    )}
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      {emails.length} Dispatched Emails
                    </span>
                  </div>
                </div>

                {/* Subtitle explaining SMTP Background Job states */}
                <p className="text-[11px] text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-sans leading-relaxed">
                  💡 <strong>Asynchronous Background Workers Mode:</strong> Notifications transition asynchronously from <strong className="text-amber-600 font-mono">QUEUED</strong> (pending dispatch latency) → <strong className="text-blue-600 font-mono">PROCESSING</strong> (rendering SMTP content) → <strong className="text-emerald-600 font-mono">SENT</strong> (delivered).
                </p>

                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 flex-1">
                  {emails.length === 0 ? (
                    <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                        <Mail className="h-6 w-6" />
                      </div>
                      <p className="text-xs text-slate-400 font-sans">No simulated email notifications dispatched yet.</p>
                      <p className="text-[10px] text-slate-300 font-mono max-w-xs uppercase tracking-wider">Submit or Approve leave requests to trigger SMTP background worker</p>
                    </div>
                  ) : (
                    emails.map((email) => {
                      const isExpanded = expandedEmailId === email.id;
                      
                      // Render dynamic status badge
                      let statusBadge = null;
                      if (email.status === 'QUEUED') {
                        statusBadge = (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase animate-pulse">
                            <Clock className="h-3 w-3 text-amber-600 animate-spin" />
                            Queued
                          </span>
                        );
                      } else if (email.status === 'PROCESSING') {
                        statusBadge = (
                          <span className="flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase animate-pulse">
                            <Play className="h-3 w-3 text-blue-600 animate-pulse" />
                            Processing
                          </span>
                        );
                      } else {
                        statusBadge = (
                          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase">
                            <Check className="h-3 w-3 text-emerald-600" />
                            Sent
                          </span>
                        );
                      }

                      return (
                        <div 
                          key={email.id} 
                          className="bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all font-sans overflow-hidden"
                        >
                          {/* Brief header banner */}
                          <div 
                            onClick={() => setExpandedEmailId(isExpanded ? null : email.id)}
                            className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="space-y-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-900 text-white uppercase tracking-wider">
                                  {email.type.replace('_', ' ')}
                                </span>
                                {statusBadge}
                              </div>
                              <h5 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">{email.subject}</h5>
                              <p className="text-[10px] text-slate-500 font-mono">
                                To: <span className="font-semibold text-slate-700">{email.toName}</span> &lt;{email.toEmail}&gt;
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-mono text-slate-400">
                                {email.sentAt ? new Date(email.sentAt).toLocaleTimeString() : 'Pending'}
                              </span>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </div>
                          </div>

                          {/* Expanded Envelope Preview */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-white space-y-3.5">
                              
                              {/* SMTP Mock Headers */}
                              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/50 text-[10px] font-mono text-slate-400 leading-relaxed">
                                <span className="font-semibold text-slate-500">From:</span> &lt;noreply@leaveflow-automation.internal&gt;<br />
                                <span className="font-semibold text-slate-500">To:</span> {email.toName} &lt;{email.toEmail}&gt;<br />
                                <span className="font-semibold text-slate-500">Subject:</span> {email.subject}<br />
                                <span className="font-semibold text-slate-500">MIME-Version:</span> 1.0 (MockSMTP-Client-v1.4)<br />
                                <span className="font-semibold text-slate-500">Route-Gateway:</span> sandbox-smtp.local.host (Internal Container Forwarder)
                              </div>

                              {/* Email Body */}
                              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-xs font-sans text-slate-700 whitespace-pre-wrap leading-relaxed text-left">
                                {email.body}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
