import React, { useState } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { Candidate } from '../types';

interface RegisterCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (newCandidate: Candidate) => void;
}

export default function RegisterCandidateModal({ isOpen, onClose, onRegistered }: RegisterCandidateModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [roleApplied, setRoleApplied] = useState('');
  const [experienceYears, setExperienceYears] = useState('2');
  const [status, setStatus] = useState<Candidate['status']>('APPLIED');
  const [skillsString, setSkillsString] = useState('');
  const [notes, setNotes] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'>('PREFER_NOT_TO_SAY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !roleApplied.trim() || !department.trim()) {
      setErrorMessage('Please fill in Name, Email, Role Applied For, and Department.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Parse comma-separated skills
    const skills = skillsString
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      department,
      roleApplied: roleApplied.trim(),
      experienceYears: Number(experienceYears) || 0,
      status,
      skills,
      notes: notes.trim(),
      gender,
    };

    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newCand = await res.json();
        onRegistered(newCand);
        // Reset form
        setName('');
        setEmail('');
        setPhone('');
        setDepartment('Engineering');
        setRoleApplied('');
        setExperienceYears('2');
        setStatus('APPLIED');
        setSkillsString('');
        setNotes('');
        setGender('PREFER_NOT_TO_SAY');
        onClose();
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || 'Failed to register candidate. Please check server logs.');
      }
    } catch (e) {
      console.error('Error registering candidate:', e);
      setErrorMessage('Network or server error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden transition-all duration-200 animate-scale-up">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 p-5 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Candidate Registry Intake</h3>
              <p className="text-[10px] text-slate-400">Add an individual candidate to the enterprise dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-3 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Core Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Emily Watson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. emily.watson@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Contact and Experience Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +1 (555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Experience (Years)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Role and Department Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Role Applied For *</label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Frontend Engineer"
                value={roleApplied}
                onChange={(e) => setRoleApplied(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Engineering">Engineering</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Administration">Administration</option>
                <option value="Sales & Marketing">Sales & Marketing</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
          </div>

          {/* Initial Status, Gender and Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Hiring Pipeline Stage</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Candidate['status'])}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
              >
                <option value="APPLIED">Applied (Intake)</option>
                <option value="SCREENING">Screening Phase</option>
                <option value="INTERVIEWING">Interviewing Phase</option>
                <option value="OFFER_EXTENDED">Offer Extended</option>
                <option value="HIRED">Hired (Onboarding)</option>
                <option value="REJECTED">Archived (Rejected)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Gender Identity</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
              >
                <option value="PREFER_NOT_TO_SAY">Prefer Not to Say</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other / Non-binary</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Skills (Comma Separated)</label>
            <input
              type="text"
              placeholder="e.g. React, TypeScript, Rust, Auditing"
              value={skillsString}
              onChange={(e) => setSkillsString(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Notes area */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Initial Screener Evaluation Notes</label>
            <textarea
              rows={3}
              placeholder="Record initial communications or recruiter comments here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              {isSubmitting ? (
                <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Complete Registration</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
