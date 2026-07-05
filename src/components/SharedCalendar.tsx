/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { LeaveRequest, Holiday } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Gift, UserCheck } from 'lucide-react';

interface SharedCalendarProps {
  leaveRequests: LeaveRequest[];
  holidays: Holiday[];
}

export default function SharedCalendar({ leaveRequests, holidays }: SharedCalendarProps) {
  // We lock the initial default calendar to July 2026 for the demo state (system date July 4, 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // 0-indexed, 6 = July
  const [selectedDay, setSelectedDay] = useState<number | null>(4); // Default to July 4

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedDay(null);
  };

  const getDayDetails = (dayNum: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    
    const activeHolidays = holidays.filter(h => h.date === dateStr);
    
    const activeLeaves = leaveRequests.filter(r => {
      if (r.status !== 'APPROVED' && r.status !== 'PENDING') return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const current = new Date(dateStr);
      // Remove time hours for accurate date-only comparison
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      current.setHours(0,0,0,0);
      return current >= start && current <= end;
    });

    return { activeHolidays, activeLeaves, dateStr };
  };

  const renderCells = () => {
    const cells = [];
    
    // Empty cells before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-24 border-b border-r border-slate-100 bg-slate-50/50" />);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const { activeHolidays, activeLeaves } = getDayDetails(day);
      const isSelected = selectedDay === day;
      const isToday = currentYear === 2026 && currentMonth === 6 && day === 4;

      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => setSelectedDay(day)}
          id={`calendar-day-${day}`}
          className={`h-24 border-b border-r border-slate-100 p-1.5 flex flex-col justify-between items-stretch text-left transition-all hover:bg-blue-50/30 cursor-pointer ${
            isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''
          } ${isToday ? 'bg-amber-50/50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold h-5 w-5 rounded-full flex items-center justify-center ${
              isToday ? 'bg-amber-500 text-white font-bold' : isSelected ? 'text-blue-600' : 'text-slate-700'
            }`}>
              {day}
            </span>
            {isToday && <span className="text-[10px] font-mono text-amber-600 font-medium">TODAY</span>}
          </div>

          <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[52px]">
            {activeHolidays.map(h => (
              <div key={h.id} className="text-[10px] truncate px-1 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 flex items-center gap-0.5" title={h.name}>
                <Gift className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{h.name}</span>
              </div>
            ))}
            {activeLeaves.map(r => (
              <div
                key={r.id}
                className={`text-[9px] truncate px-1 py-0.5 rounded border flex items-center gap-0.5 ${
                  r.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'
                }`}
                title={`${r.employeeName}: ${r.leaveTypeName} (${r.status})`}
              >
                <span className="h-1 w-1 rounded-full bg-current flex-shrink-0"></span>
                <span className="truncate">{r.employeeName} ({r.leaveTypeName.split(' ')[0]})</span>
              </div>
            ))}
          </div>
        </button>
      );
    }

    // Empty cells at the end to complete grid row
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = 42 - totalCells; // 6 rows of 7 days
    for (let i = 0; i < (remaining >= 7 ? remaining - 7 : remaining); i++) {
      cells.push(<div key={`empty-end-${i}`} className="h-24 border-b border-r border-slate-100 bg-slate-50/50" />);
    }

    return cells;
  };

  const selectedDetails = selectedDay ? getDayDetails(selectedDay) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-4" id="shared-calendar-module">
      {/* Calendar Grid */}
      <div className="lg:col-span-3 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900 font-sans tracking-tight">Organization Leave Calendar</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800 font-mono w-32 text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button onClick={handleNextMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center border-t border-l border-slate-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 border-r border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500">
              {d}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 border-l border-slate-100">
          {renderCells()}
        </div>
      </div>

      {/* Selected Day sidebar panel */}
      <div className="border-t lg:border-t-0 lg:border-l border-slate-100 p-6 bg-slate-50/50 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-semibold text-slate-400 font-mono tracking-widest uppercase mb-4">Day Activity & Details</h4>
          {selectedDay ? (
            <div>
              <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-xs mb-4">
                <p className="text-sm font-semibold text-slate-800">{monthNames[currentMonth]} {selectedDay}, {currentYear}</p>
                <p className="text-xs text-slate-400 font-mono">{selectedDetails?.dateStr}</p>
              </div>

              {/* Holidays Section */}
              <div className="mb-4">
                <h5 className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-2">
                  <Gift className="h-3 w-3 text-red-500" /> Holidays
                </h5>
                {selectedDetails?.activeHolidays && selectedDetails.activeHolidays.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {selectedDetails.activeHolidays.map(h => (
                      <div key={h.id} className="bg-red-50/50 border border-red-100 p-2.5 rounded-xl text-xs text-red-800">
                        <span className="font-semibold">{h.name}</span>
                        <span className="block text-[10px] text-red-500 mt-0.5">{h.type} HOLIDAY</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No public holidays on this day.</p>
                )}
              </div>

              {/* Leaves Section */}
              <div>
                <h5 className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-2">
                  <UserCheck className="h-3 w-3 text-emerald-500" /> Scheduled Outages
                </h5>
                {selectedDetails?.activeLeaves && selectedDetails.activeLeaves.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {selectedDetails.activeLeaves.map(r => (
                      <div
                        key={r.id}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
                            : 'bg-amber-50/50 border-amber-100 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span>{r.employeeName}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">{r.leaveTypeName}</p>
                        <p className="text-[10px] text-slate-400 italic font-sans">"{r.reason}"</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Nobody scheduled out on this day.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Select any calendar date grid cell to inspect active leave requests, holiday definitions, and team schedules.</p>
          )}
        </div>

        <div className="mt-6 border-t border-slate-200/60 pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
            <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-100 border border-emerald-200"></span>
            <span>Approved Leave</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans mt-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded bg-amber-100 border border-amber-200 animate-pulse"></span>
            <span>Pending Leave</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans mt-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded bg-red-100 border border-red-200"></span>
            <span>Official Holiday</span>
          </div>
        </div>
      </div>
    </div>
  );
}
