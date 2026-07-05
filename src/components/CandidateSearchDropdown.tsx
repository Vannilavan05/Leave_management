import React, { useState, useRef, useEffect } from 'react';
import { Candidate } from '../types';
import { Search, ChevronDown, Check, X, Users, Briefcase } from 'lucide-react';

interface CandidateSearchDropdownProps {
  candidates: Candidate[];
  selectedCandidateId: string;
  onSelect: (candidateId: string) => void;
}

export default function CandidateSearchDropdown({
  candidates,
  selectedCandidateId,
  onSelect,
}: CandidateSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'FEMALE' | 'MALE' | 'OTHER'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear query when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setGenderFilter('ALL');
    }
  }, [isOpen]);

  // Find the currently selected candidate object
  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  // Filter candidates in real-time by name, role, department, and gender
  const filteredCandidates = candidates.filter(cand => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ? true : (
      cand.name.toLowerCase().includes(query) ||
      cand.roleApplied.toLowerCase().includes(query) ||
      cand.department.toLowerCase().includes(query)
    );

    if (!matchesSearch) return false;
    if (genderFilter === 'ALL') return true;
    return cand.gender === genderFilter;
  });

  const handleSelect = (candId: string) => {
    onSelect(candId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative z-40">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/80 px-4 py-2.5 rounded-2xl shadow-3xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-left min-w-[200px] md:min-w-[240px]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Users className="h-4 w-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
        <div className="flex-1 min-w-0 pr-1">
          <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
            Candidate Directory
          </span>
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
            {selectedCandidate ? selectedCandidate.name : 'Select Candidate...'}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-450 dark:text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 w-[280px] sm:w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-scale-up z-50">
          
          {/* Search Input Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-850/60 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/20">
            <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by name, role, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-0 py-0.5"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
                title="Clear Search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Gender Filter Tabs */}
          <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto bg-slate-50/25 dark:bg-slate-950/10 scrollbar-none">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase mr-1 flex-shrink-0">Gender:</span>
            {(['ALL', 'FEMALE', 'MALE', 'OTHER'] as const).map((g) => {
              const isSel = genderFilter === g;
              return (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer flex-shrink-0 ${
                    isSel
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-3xs'
                      : 'bg-white dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-150 dark:border-slate-800/80 hover:bg-slate-55 dark:hover:bg-slate-800'
                  }`}
                >
                  {g === 'ALL' ? 'All' : g === 'FEMALE' ? 'Female' : g === 'MALE' ? 'Male' : 'Other'}
                </button>
              );
            })}
          </div>

          {/* Candidate List Container */}
          <div className="max-h-[260px] overflow-y-auto py-1 divide-y divide-slate-50 dark:divide-slate-850/40">
            
            {/* "Select Candidate..." (Reset/Clear Option) */}
            <button
              onClick={() => handleSelect('')}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                !selectedCandidateId 
                  ? 'bg-slate-50 dark:bg-slate-800/40 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/20'
              }`}
            >
              <span>None (Show Default Dashboards)</span>
              {!selectedCandidateId && <Check className="h-3.5 w-3.5" />}
            </button>

            {/* Filtered Candidates List */}
            {filteredCandidates.map(cand => {
              const isSelected = cand.id === selectedCandidateId;
              return (
                <button
                  key={cand.id}
                  onClick={() => handleSelect(cand.id)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors gap-3 ${
                    isSelected 
                      ? 'bg-slate-50 dark:bg-slate-800/40 text-indigo-600 dark:text-indigo-400' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850/30 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className={`font-bold truncate ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                      {cand.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-slate-400" />
                      <span>{cand.roleApplied} • <span className="font-semibold text-slate-400 dark:text-slate-500">{cand.department}</span></span>
                    </p>
                  </div>
                  
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Zero State Filter Outcomes */}
            {filteredCandidates.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 italic space-y-1">
                <p>No candidates match your filters.</p>
                <p className="text-[10px]">Try searching with a different name or job role.</p>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
