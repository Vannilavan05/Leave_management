/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Employee, LeaveType, Holiday, LeaveRequest, SystemSettings, UserRole, Candidate } from './types';
import RoleSelector from './components/RoleSelector';
import SharedCalendar from './components/SharedCalendar';
import AIAssistantModal from './components/AIAssistantModal';
import EmployeeDashboard from './components/EmployeeDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import HRDashboard from './components/HRDashboard';
import AdminDashboard from './components/AdminDashboard';
import CandidateProfile from './components/CandidateProfile';
import RegisterCandidateModal from './components/RegisterCandidateModal';
import CandidateSearchDropdown from './components/CandidateSearchDropdown';
import { ShieldCheck, CalendarRange, Sparkles, LogOut, LayoutGrid, CheckSquare, Settings, Sun, Moon, Users, UserPlus } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  
  const [activePortalTab, setActivePortalTab] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Transfer state for AI pre-fill
  const [aiDraftForm, setAiDraftForm] = useState<{
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    halfDay: boolean;
  } | null>(null);

  useEffect(() => {
    fetchSessionAndCoreData();
  }, [refreshTrigger]);

  const fetchSessionAndCoreData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        const user = meData.user;
        setCurrentUser(user);
        
        // Define default active view based on role on first load
        if (user && !activePortalTab) {
          if (user.role === UserRole.EMPLOYEE) setActivePortalTab('MY_LEAVES');
          else if (user.role === UserRole.MANAGER) setActivePortalTab('TEAM_REVIEW');
          else if (user.role === UserRole.HR) setActivePortalTab('HR_CONSOLE');
          else if (user.role === UserRole.SUPER_ADMIN) setActivePortalTab('ADMIN_PANEL');
        }
      }

      // Fetch other structural tables
      const [typesRes, holRes, reqRes, setRes, candRes] = await Promise.all([
        fetch('/api/leave-types'),
        fetch('/api/holidays'),
        fetch('/api/leave-requests?all=true'),
        fetch('/api/settings'),
        fetch('/api/candidates'),
      ]);

      if (typesRes.ok) setLeaveTypes(await typesRes.json());
      if (holRes.ok) setHolidays(await holRes.json());
      if (reqRes.ok) setAllRequests(await reqRes.json());
      if (setRes.ok) setSettings(await setRes.json());
      if (candRes.ok) setCandidates(await candRes.json());

    } catch (e) {
      console.error('Error bootstrapping application metadata:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSwitch = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        // Clear active tab so it resets to default for new role
        setActivePortalTab('');
        setRefreshTrigger((prev) => prev + 1);
        return { success: true };
      } else {
        const data = await res.json();
        setIsLoading(false);
        return { success: false, error: data.error || 'Authentication failed' };
      }
    } catch (e) {
      console.error('Error switching user login context:', e);
      setIsLoading(false);
      return { success: false, error: 'Network error occurred. Please try again.' };
    }
  };

  const forceRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleApplyDraft = (draft: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    halfDay: boolean;
  }) => {
    setAiDraftForm(draft);
    // Switch to Employee Leave submission panel
    setActivePortalTab('MY_LEAVES');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 transition-colors duration-200">
        <span className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest font-bold">Bootstrapping LeaveFlow LMS...</span>
      </div>
    );
  }

  // Define tab navigation based on role privileges
  const getAvailableTabs = () => {
    if (!currentUser) return [];
    
    const tabs = [{ id: 'MY_LEAVES', label: 'Employee', icon: LayoutGrid }];
    
    if (currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.HR) {
      tabs.push({ id: 'TEAM_REVIEW', label: 'Team Lead', icon: CheckSquare });
    }
    
    if (currentUser.role === UserRole.HR || currentUser.role === UserRole.SUPER_ADMIN) {
      tabs.push({ id: 'HR_CONSOLE', label: 'HR', icon: CalendarRange });
    }
    
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      tabs.push({ id: 'ADMIN_PANEL', label: 'Administration', icon: Settings });
    }
    
    return tabs;
  };

  const renderActiveDashboard = () => {
    if (!currentUser || !settings) return null;

    let content = null;
    switch (activePortalTab) {
      case 'MY_LEAVES':
        content = (
          <EmployeeDashboard
            currentUser={currentUser}
            leaveTypes={leaveTypes}
            refreshTrigger={refreshTrigger}
            onLeaveApplied={forceRefresh}
            aiDraftForm={aiDraftForm}
            onClearAiDraft={() => setAiDraftForm(null)}
          />
        );
        break;
      case 'TEAM_REVIEW':
        content = (
          <ManagerDashboard
            currentUser={currentUser}
            refreshTrigger={refreshTrigger}
            onActionCompleted={forceRefresh}
            settings={settings}
          />
        );
        break;
      case 'HR_CONSOLE':
        content = (
          <HRDashboard
            currentUser={currentUser}
            leaveTypes={leaveTypes}
            refreshTrigger={refreshTrigger}
            onStructureModified={forceRefresh}
          />
        );
        break;
      case 'ADMIN_PANEL':
        content = (
          <AdminDashboard
            currentUser={currentUser}
            refreshTrigger={refreshTrigger}
            onSettingsUpdated={forceRefresh}
          />
        );
        break;
      default:
        content = null;
    }

    if (!content) return null;

    return (
      <motion.div
        key={activePortalTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. Quick Switch Demo Environment Header */}
      <RoleSelector currentUser={currentUser} onUserSwitch={handleUserSwitch} />

      {/* 2. Main Navigation Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 shadow-2xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 dark:bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <CalendarRange className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="text-md font-bold text-slate-900 dark:text-white tracking-tight">LeaveFlow LMS</h1>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 tracking-widest uppercase">Enterprise HR Automation</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            
            {/* Searchable Candidate Directory Dropdown */}
            <CandidateSearchDropdown
              candidates={candidates}
              selectedCandidateId={selectedCandidateId}
              onSelect={(candId) => setSelectedCandidateId(candId)}
            />

            {/* Register New Candidate Button */}
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold cursor-pointer transition-colors shadow-2xs"
              title="Register New Candidate"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Register Candidate</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              id="theme-toggle-btn"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all cursor-pointer shadow-3xs bg-white dark:bg-slate-900"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-slate-600" />
              )}
            </button>

            {/* Active User profile card */}
            {currentUser && (
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 p-2 rounded-2xl">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                />
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</span>
                    <span className="text-[9px] font-mono font-bold bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md uppercase">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">{currentUser.departmentName}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* 3. Portal Dashboard Tab Navigator */}
        {currentUser && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-50 dark:border-slate-800/60 flex items-center gap-4">
            <nav className="flex gap-4 py-1">
              {getAvailableTabs().map((tab) => {
                const Icon = tab.icon;
                const isActive = activePortalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSelectedCandidateId(''); // Clear candidate redirect if tab is explicitly clicked
                      setActivePortalTab(tab.id);
                    }}
                    id={`tab-main-${tab.id.toLowerCase()}`}
                    className={`flex items-center gap-1.5 py-3 px-1 border-b-2 font-semibold text-xs transition-all cursor-pointer ${
                      isActive && !selectedCandidateId
                        ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* 4. Active Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {selectedCandidateId && candidates.find(c => c.id === selectedCandidateId) ? (
          <CandidateProfile
            key={selectedCandidateId}
            candidate={candidates.find(c => c.id === selectedCandidateId)!}
            onBack={() => setSelectedCandidateId('')}
            onUpdate={(updated) => {
              setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
            }}
          />
        ) : (
          <>
            {renderActiveDashboard()}

            {/* 5. Shared Public Calendar (Shown to all roles) */}
            <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800/80">
              <SharedCalendar leaveRequests={allRequests} holidays={holidays} />
            </div>
          </>
        )}

      </main>

      {/* Footer credit */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500 font-mono transition-colors duration-200">
        <p>© 2026 LeaveFlow Enterprise. System Date: July 4, 2026 (UTC). Powered by Gemini AI Studio.</p>
      </footer>

      {/* 6. AI Conversational Assistant Panel */}
      {currentUser && (
        <AIAssistantModal
          onApplyDraftForm={handleApplyDraft}
          employeeName={currentUser.name}
        />
      )}

      {/* 7. Register Candidate Modal Dialog */}
      <RegisterCandidateModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegistered={(newCand) => {
          setCandidates(prev => [newCand, ...prev]);
          setSelectedCandidateId(newCand.id);
        }}
      />

    </div>
  );
}
