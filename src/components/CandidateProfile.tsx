import React, { useState } from 'react';
import { Candidate } from '../types';
import { 
  ArrowLeft, Mail, Phone, Calendar, Briefcase, Award, CheckCircle2, 
  XCircle, Clock, Send, Plus, Trash2, Edit2, Check, User, Sparkles
} from 'lucide-react';

interface CandidateProfileProps {
  key?: string;
  candidate: Candidate;
  onBack: () => void;
  onUpdate: (updated: Candidate) => void;
}

const STATUS_CONFIGS = {
  APPLIED: { label: 'Applied', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900', icon: Clock },
  SCREENING: { label: 'Screening', color: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900', icon: User },
  INTERVIEWING: { label: 'Interviewing', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900', icon: Briefcase },
  OFFER_EXTENDED: { label: 'Offer Extended', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900', icon: Send },
  HIRED: { label: 'Hired', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900', icon: XCircle },
};

export default function CandidateProfile({ candidate, onBack, onUpdate }: CandidateProfileProps) {
  const [status, setStatus] = useState(candidate.status);
  const [notes, setNotes] = useState(candidate.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState<string[]>(candidate.skills);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [candidateGender, setCandidateGender] = useState(candidate.gender || 'PREFER_NOT_TO_SAY');

  const statusInfo = STATUS_CONFIGS[status] || STATUS_CONFIGS.APPLIED;
  const StatusIcon = statusInfo.icon;

  const handleGenderChange = async (newGender: Candidate['gender']) => {
    setCandidateGender(newGender || 'PREFER_NOT_TO_SAY');
    saveCandidateChanges({ ...candidate, status, notes, skills, gender: newGender });
  };

  const handleStatusChange = async (newStatus: Candidate['status']) => {
    setStatus(newStatus);
    saveCandidateChanges({ ...candidate, status: newStatus, notes, skills, gender: candidateGender });
  };

  const handleSaveNotes = () => {
    setIsEditingNotes(false);
    saveCandidateChanges({ ...candidate, status, notes, skills, gender: candidateGender });
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    const trimmed = newSkill.trim();
    if (!skills.includes(trimmed)) {
      const updatedSkills = [...skills, trimmed];
      setSkills(updatedSkills);
      saveCandidateChanges({ ...candidate, status, notes, skills: updatedSkills, gender: candidateGender });
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);
    saveCandidateChanges({ ...candidate, status, notes, skills: updatedSkills, gender: candidateGender });
  };

  const saveCandidateChanges = async (updatedCandidate: Candidate) => {
    setIsUpdating(true);
    setUpdateSuccess(false);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCandidate),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 2000);
      }
    } catch (e) {
      console.error('Error updating candidate:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Upper Control Ribbon */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboards</span>
        </button>

        {updateSuccess && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900 animate-fade-in">
            <Check className="h-3 w-3" />
            <span>Profile Synced Successfully</span>
          </span>
        )}
      </div>

      {/* Main Grid: Info card on left, registration / timeline on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 cols: Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6 transition-colors">
            
            {/* Header / Avatar Name block */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-sm">
                  {candidate.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">{candidate.name}</h2>
                    {candidateGender && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        candidateGender === 'FEMALE' 
                          ? 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-900' 
                          : candidateGender === 'MALE'
                            ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}>
                        {candidateGender.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{candidate.roleApplied} • {candidate.department}</span>
                  </p>
                </div>
              </div>

              {/* Action Dropdowns */}
              <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                {/* Gender Selector dropdown */}
                <div className="flex flex-col gap-1 sm:items-end">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Gender Identity</span>
                  <select
                    value={candidateGender}
                    onChange={(e) => handleGenderChange(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer outline-none transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-750 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="PREFER_NOT_TO_SAY">Prefer Not to Say</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other / Non-binary</option>
                  </select>
                </div>

                {/* Status Selector dropdown */}
                <div className="flex flex-col gap-1 sm:items-end">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Status Outcome</span>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as Candidate['status'])}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer outline-none transition-all ${statusInfo.color}`}
                  >
                    <option value="APPLIED">Applied (Review)</option>
                    <option value="SCREENING">Screening Phase</option>
                    <option value="INTERVIEWING">Interviewing Phase</option>
                    <option value="OFFER_EXTENDED">Offer Extended</option>
                    <option value="HIRED">Hired (Onboard)</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Candidate Metadata and Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Contact Detail</h4>
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <a href={`mailto:${candidate.email}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium break-all">{candidate.email}</a>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="font-mono">{candidate.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>Registered on {new Date(candidate.registeredAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Experience and Position Spec */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Qualifications</h4>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-indigo-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{candidate.experienceYears} Years</span>
                    <span>of Industry Experience</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Target Team</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">{candidate.department}</p>
                  </div>
                </div>
              </div>

              {/* Current Hiring Pipeline stage visualization */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Stage Visual</h4>
                <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center gap-2">
                  <StatusIcon className="h-8 w-8 text-indigo-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{statusInfo.label}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Updated live on server state</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Skills & Competencies Tags */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Registered Skills & Tech Stack</h4>
                <span className="text-[10px] text-slate-400">{skills.length} tags added</span>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {skills.map(skill => (
                  <span 
                    key={skill} 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100/60 dark:border-indigo-900 rounded-lg group"
                  >
                    <span>{skill}</span>
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 cursor-pointer transition-colors"
                      title={`Remove ${skill}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {skills.length === 0 && (
                  <span className="text-xs text-slate-400 italic">No skill competencies entered yet.</span>
                )}
              </div>

              {/* Add competency tag form */}
              <form onSubmit={handleAddSkill} className="flex max-w-xs gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="e.g. Docker, Python, HR Audit"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Exclusive Women's Welfare & Maternity Benefits Section */}
            {candidateGender === 'FEMALE' && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="bg-gradient-to-r from-rose-50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/10 border border-rose-100/70 dark:border-rose-900/40 rounded-2xl p-4 sm:p-5 space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0 animate-pulse">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-wide">Women's Welfare & Family Support Eligibility</h4>
                      <p className="text-[11px] text-rose-700/90 dark:text-rose-400 mt-1 leading-relaxed">Upon onboarding, this candidate is automatically eligible for LeaveFlow's comprehensive female-centric benefits, including paid maternity, wellness breaks, and nursery support programs.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-xl border border-rose-100/50 dark:border-rose-950 text-[11px] shadow-3xs">
                      <p className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <span>👶 Paid Maternity</span>
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed"><b>26 Weeks</b> fully paid time off with an optional 4-week flexible hybrid ramp-back transition schedule.</p>
                    </div>
                    <div className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-xl border border-rose-100/50 dark:border-rose-950 text-[11px] shadow-3xs">
                      <p className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <span>🌸 Wellness Days</span>
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed"><b>12 Days/Year</b> fully paid menstrual hygiene or preventative gynecological health checkup breaks.</p>
                    </div>
                    <div className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-xl border border-rose-100/50 dark:border-rose-950 text-[11px] shadow-3xs">
                      <p className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <span>🏥 Family Care</span>
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">Prenatal consultation support, pediatric advisory stipends, and flexible breastfeeding breaks.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right 1 col: Evaluation Notes & System Audit */}
        <div className="space-y-6">
          
          {/* Notes Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Recruiter Evaluation Notes</h4>
              <button
                onClick={() => isEditingNotes ? handleSaveNotes() : setIsEditingNotes(true)}
                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                title={isEditingNotes ? "Save Notes" : "Edit Notes"}
              >
                {isEditingNotes ? <Check className="h-4 w-4 text-emerald-600" /> : <Edit2 className="h-3.5 w-3.5" />}
              </button>
            </div>

            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  placeholder="Write interview summaries, reference details or vetting progress notes..."
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full py-1.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-extrabold cursor-pointer transition-colors text-center"
                >
                  Save Notes
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850/40">
                {notes ? (
                  <p className="whitespace-pre-line">{notes}</p>
                ) : (
                  <p className="italic text-slate-400">No evaluation notes compiled. Click edit to begin recording interview metrics.</p>
                )}
              </div>
            )}
          </div>

          {/* Hiring Workflow Checklist Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">Hiring Compliance Checklists</h4>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <input 
                  type="checkbox" 
                  checked={true} 
                  readOnly 
                  className="h-4 w-4 accent-indigo-600 rounded mt-0.5" 
                />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Application Registered</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Automated timestamp recorded</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <input 
                  type="checkbox" 
                  checked={['SCREENING', 'INTERVIEWING', 'OFFER_EXTENDED', 'HIRED'].includes(status)} 
                  readOnly 
                  className="h-4 w-4 accent-indigo-600 rounded mt-0.5" 
                />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Recruiter Screening</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Vetting alignment on department parameters</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <input 
                  type="checkbox" 
                  checked={['INTERVIEWING', 'OFFER_EXTENDED', 'HIRED'].includes(status)} 
                  readOnly 
                  className="h-4 w-4 accent-indigo-600 rounded mt-0.5" 
                />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Technical / Ops Interview</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Department Head technical alignment validation</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <input 
                  type="checkbox" 
                  checked={['OFFER_EXTENDED', 'HIRED'].includes(status)} 
                  readOnly 
                  className="h-4 w-4 accent-indigo-600 rounded mt-0.5" 
                />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Decision & Offer Out</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Drafting package terms and alignment rules</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
