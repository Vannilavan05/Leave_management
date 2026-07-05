/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserRole, Employee } from '../types';
import { Shield, User, Users, Briefcase, Lock, Eye, EyeOff, KeyRound, AlertCircle, X } from 'lucide-react';

interface RoleSelectorProps {
  currentUser: Employee | null;
  onUserSwitch: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
}

export default function RoleSelector({ currentUser, onUserSwitch }: RoleSelectorProps) {
  const accounts = [
    { name: 'John Doe', email: 'john@example.com', role: UserRole.EMPLOYEE, icon: User, desc: 'Employee (Engineering)' },
    { name: 'Jane Smith', email: 'jane@example.com', role: UserRole.MANAGER, icon: Users, desc: 'Manager (Engineering)' },
    { name: 'Robert Vance', email: 'robert@example.com', role: UserRole.HR, icon: Briefcase, desc: 'HR Admin (HR Dept)' },
    { name: 'Vannila Chandrasekaran', email: 'vannilavanchandrasekaran@gmail.com', role: UserRole.SUPER_ADMIN, icon: Shield, desc: 'Super Admin' },
  ];

  // Secure Authentication States
  const [selectedAuthAccount, setSelectedAuthAccount] = useState<typeof accounts[0] | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleAccountClick = async (acc: typeof accounts[0]) => {
    // Check if the role is a protected one (HR or SUPER_ADMIN)
    if (acc.role === UserRole.HR || acc.role === UserRole.SUPER_ADMIN) {
      setSelectedAuthAccount(acc);
      setPasswordInput('');
      setErrorMsg('');
      setShowPassword(false);
    } else {
      // Direct login for general employees without password
      await onUserSwitch(acc.email);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuthAccount) return;
    setErrorMsg('');
    setIsLoggingIn(true);

    try {
      const result = await onUserSwitch(selectedAuthAccount.email, passwordInput);
      if (result && result.success) {
        setSelectedAuthAccount(null);
        setPasswordInput('');
      } else {
        setErrorMsg(result?.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setErrorMsg('An unexpected connection error occurred.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getDemoPasswordHint = () => {
    if (!selectedAuthAccount) return '';
    return selectedAuthAccount.role === UserRole.HR ? 'hr123' : 'admin123';
  };

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">Enterprise Demo Environment</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Switch Role:</span>
          {accounts.map((acc) => {
            const Icon = acc.icon;
            const isActive = currentUser?.email === acc.email;
            const isProtected = acc.role === UserRole.HR || acc.role === UserRole.SUPER_ADMIN;

            return (
              <button
                key={acc.email}
                onClick={() => handleAccountClick(acc)}
                id={`btn-switch-${acc.role.toLowerCase()}`}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500 ring-offset-1 ring-offset-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={`${acc.desc} ${isProtected ? '(Requires Authentication)' : ''}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{acc.name}</span>
                {isProtected && (
                  <Lock className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secure Credentials Login Modal */}
      {selectedAuthAccount && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Secure Portal Access</h3>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Credentials Verification</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuthAccount(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                {(() => {
                  const Icon = selectedAuthAccount.icon;
                  return <Icon className="h-5 w-5" />;
                })()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{selectedAuthAccount.name}</h4>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 uppercase">
                    {selectedAuthAccount.role}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{selectedAuthAccount.email}</p>
              </div>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={`Enter password (hint: '${getDemoPasswordHint()}')`}
                    required
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  🔒 Enterprise grade security. Default passcode: <code className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1 py-0.5 rounded">{getDemoPasswordHint()}</code>
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-3 rounded-2xl text-red-700 dark:text-red-400 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAuthAccount(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Authenticate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
