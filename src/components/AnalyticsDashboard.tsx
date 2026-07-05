/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { LeaveRequest, Employee, LeaveType } from '../types';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  BarChart3, 
  PieChart as PieIcon, 
  Sparkles,
  Info
} from 'lucide-react';

interface AnalyticsDashboardProps {
  allRequests: LeaveRequest[];
  employees: Employee[];
  viewType: 'HR' | 'MANAGER';
  managerId?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'];

export default function AnalyticsDashboard({
  allRequests,
  employees,
  viewType,
  managerId,
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'ALL' | 'H1' | 'Q3'>('ALL');

  // Filter requests & employees based on manager context if viewType is 'MANAGER'
  const filteredData = useMemo(() => {
    let activeEmployees = employees;
    let activeRequests = allRequests;

    if (viewType === 'MANAGER' && managerId) {
      // Find all employees managed by this manager
      const teamEmpIds = employees
        .filter(emp => emp.managerId === managerId)
        .map(emp => emp.id);
      
      activeEmployees = employees.filter(emp => emp.managerId === managerId || emp.id === managerId);
      activeRequests = allRequests.filter(req => 
        teamEmpIds.includes(req.employeeId) || req.employeeId === managerId
      );
    }

    return {
      employees: activeEmployees,
      requests: activeRequests
    };
  }, [allRequests, employees, viewType, managerId]);

  // 1. Calculate General High-Level Cards Metrics
  const summaryMetrics = useMemo(() => {
    const totalRequests = filteredData.requests.length;
    const pending = filteredData.requests.filter(r => r.status === 'PENDING').length;
    const approved = filteredData.requests.filter(r => r.status === 'APPROVED').length;
    const clarification = filteredData.requests.filter(r => r.status === 'CLARIFICATION').length;
    const rejected = filteredData.requests.filter(r => r.status === 'REJECTED').length;
    
    // Average duration of approved leaves
    const approvedLeaves = filteredData.requests.filter(r => r.status === 'APPROVED');
    const totalDays = approvedLeaves.reduce((sum, r) => sum + Number(r.duration || 0), 0);
    const avgDuration = approvedLeaves.length ? Math.round((totalDays / approvedLeaves.length) * 10) / 10 : 0;

    return {
      totalRequests,
      pending,
      approved,
      clarification,
      rejected,
      avgDuration,
      totalDays
    };
  }, [filteredData]);

  // 2. Trend Calculations (Requests approved/applied per month for 2026)
  const leaveTrendsData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize monthly tracker
    const monthlyStats = monthNames.map((name, index) => ({
      month: name,
      index,
      Approved: 0,
      Applied: 0,
      TotalDays: 0,
    }));

    filteredData.requests.forEach(req => {
      if (!req.startDate) return;
      const date = new Date(req.startDate);
      // Ensure we map standard 2026 mock timeline
      const monthIdx = date.getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyStats[monthIdx].Applied += 1;
        if (req.status === 'APPROVED') {
          monthlyStats[monthIdx].Approved += 1;
          monthlyStats[monthIdx].TotalDays += Number(req.duration || 0);
        }
      }
    });

    // Apply TimeRange filter
    if (timeRange === 'H1') {
      return monthlyStats.slice(0, 6);
    } else if (timeRange === 'Q3') {
      return monthlyStats.slice(6, 9);
    }
    return monthlyStats;
  }, [filteredData, timeRange]);

  // 3. Department leave distribution and utilization
  const departmentData = useMemo(() => {
    const deptMap: { [key: string]: { name: string; totalEmployees: number; approvedLeaves: number; totalDays: number } } = {};

    // First populate total staff per department from filtered employees
    filteredData.employees.forEach(emp => {
      const deptKey = emp.departmentId || 'dept_eng';
      const deptName = emp.departmentName || 'Engineering';
      if (!deptMap[deptKey]) {
        deptMap[deptKey] = {
          name: deptName,
          totalEmployees: 0,
          approvedLeaves: 0,
          totalDays: 0,
        };
      }
      deptMap[deptKey].totalEmployees += 1;
    });

    // Next add approved leaves count and duration
    filteredData.requests.forEach(req => {
      if (req.status !== 'APPROVED') return;
      const deptKey = req.departmentId || 'dept_eng';
      const deptName = req.departmentName || 'Engineering';

      if (!deptMap[deptKey]) {
        deptMap[deptKey] = {
          name: deptName,
          totalEmployees: 0,
          approvedLeaves: 0,
          totalDays: 0,
        };
      }
      deptMap[deptKey].approvedLeaves += 1;
      deptMap[deptKey].totalDays += Number(req.duration || 0);
    });

    return Object.values(deptMap).map(dept => {
      // Utilization rate = total leave days taken / (employees * 30 days) as a baseline metric for relative visualization
      const potentialDays = (dept.totalEmployees || 1) * 20; // 20 days standard working capacity
      const utilizationPercent = Math.min(100, Math.round((dept.totalDays / potentialDays) * 100));
      return {
        department: dept.name,
        'Staff Count': dept.totalEmployees,
        'Leave Bookings': dept.approvedLeaves,
        'Total Out Days': dept.totalDays,
        'Utilization rate (%)': utilizationPercent,
      };
    });
  }, [filteredData]);

  // 4. Leave categories composition (e.g. Sick, Vacation, Personal, Maternity)
  const leaveCategoryData = useMemo(() => {
    const categoryMap: { [key: string]: { name: string; count: number; value: number } } = {};

    filteredData.requests.forEach(req => {
      const typeName = req.leaveTypeName || 'Annual Leave';
      if (!categoryMap[typeName]) {
        categoryMap[typeName] = {
          name: typeName,
          count: 0,
          value: 0
        };
      }
      categoryMap[typeName].count += 1;
      categoryMap[typeName].value += Number(req.duration || 0); // use total days for pie share
    });

    return Object.values(categoryMap).filter(item => item.value > 0);
  }, [filteredData]);

  // 5. Request Status Breakdown
  const statusBreakdownData = useMemo(() => {
    return [
      { name: 'Approved', value: summaryMetrics.approved, color: '#10b981' },
      { name: 'Pending Review', value: summaryMetrics.pending, color: '#f59e0b' },
      { name: 'Clarification', value: summaryMetrics.clarification, color: '#3b82f6' },
      { name: 'Declined', value: summaryMetrics.rejected, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [summaryMetrics]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Upper Control Bar / Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>Interactive Operations Analytics</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time visual intelligence on workforce utilization, leave distribution metrics, and approval performance.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setTimeRange('ALL')}
            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
              timeRange === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Full Year
          </button>
          <button
            onClick={() => setTimeRange('H1')}
            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
              timeRange === 'H1' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            H1 (Jan-Jun)
          </button>
          <button
            onClick={() => setTimeRange('Q3')}
            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
              timeRange === 'Q3' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Q3 (Jul-Sep)
          </button>
        </div>
      </div>

      {/* Metrics Summary Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total leave days approved */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Total Vacation Booked</span>
            <span className="h-6 w-6 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{summaryMetrics.totalDays} Days</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Approved leaves combined</p>
          </div>
        </div>

        {/* Average Leave Duration */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Avg Request Tenure</span>
            <span className="h-6 w-6 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{summaryMetrics.avgDuration} Days</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Per approved leave booking</p>
          </div>
        </div>

        {/* Pending Approval load */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Action Queue Load</span>
            <span className={`h-6 w-6 rounded-lg flex items-center justify-center ${summaryMetrics.pending > 0 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{summaryMetrics.pending} Pending</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Awaiting manager execution</p>
          </div>
        </div>

        {/* Action Rate Percentage */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Resolution Ratio</span>
            <span className="h-6 w-6 bg-purple-50 dark:bg-purple-950/40 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {summaryMetrics.totalRequests > 0 
                ? Math.round(((summaryMetrics.approved + summaryMetrics.rejected) / summaryMetrics.totalRequests) * 100)
                : 100}%
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Requests fully resolved</p>
          </div>
        </div>

      </div>

      {/* Main Charts Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Leave Volume Trends Over Time */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Leave Allocation Trends (Applied vs. Approved)</h4>
            </div>
            <Info className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-pointer" title="Monthly count of submitted requests and their status outcome." />
          </div>

          <div className="h-[260px] w-full text-xs">
            {leaveTrendsData.some(d => d.Applied > 0 || d.Approved > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leaveTrendsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appliedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="approvedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tooltip-border, #f1f5f9)" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #ffffff)', color: 'var(--tooltip-color, #1e293b)', borderRadius: '12px', border: '1px solid var(--tooltip-border, #e2e8f0)', fontFamily: 'sans-serif' }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" dataKey="Applied" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#appliedColor)" name="Total Applied" />
                  <Area type="monotone" dataKey="Approved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#approvedColor)" name="Total Approved" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">No leaves submitted for this interval.</div>
            )}
          </div>
        </div>

        {/* 2. Department leave utilization and total days */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Departmental Leave Days & Staffing Volume</h4>
            </div>
            <span className="text-[9px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">Total Duration Out</span>
          </div>

          <div className="h-[260px] w-full text-xs">
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tooltip-border, #f1f5f9)" />
                  <XAxis dataKey="department" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #ffffff)', color: 'var(--tooltip-color, #1e293b)', borderRadius: '12px', border: '1px solid var(--tooltip-border, #e2e8f0)' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Total Out Days" fill="#6366f1" radius={[4, 4, 0, 0]} name="Leave Days Booked" />
                  <Bar dataKey="Staff Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Headcount" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">No departmental datasets populated.</div>
            )}
          </div>
        </div>

        {/* 3. Leave Categories Composition (Pie Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Leave Category Composition (Share of Days)</h4>
            </div>
            <span className="text-[9px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">Category Shares</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="col-span-1 md:col-span-2 h-[220px] w-full text-xs">
              {leaveCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leaveCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {leaveCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} Days`, 'Total Time Taken']} 
                      contentStyle={{ backgroundColor: 'var(--tooltip-bg, #ffffff)', color: 'var(--tooltip-color, #1e293b)', borderRadius: '12px', border: '1px solid var(--tooltip-border, #e2e8f0)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">No leaves registered under any categories.</div>
              )}
            </div>

            {/* Explanatory legend table */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">Share Details</h5>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {leaveCategoryData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono ml-2">{item.value}d</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Request Status & Compliance Flow (Status Breakdown) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Application Review Status Distribution</h4>
            </div>
            <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">Fulfillment</span>
          </div>

          <div className="h-[220px] w-full text-xs">
            {statusBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdownData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--tooltip-border, #f1f5f9)" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #ffffff)', color: 'var(--tooltip-color, #1e293b)', borderRadius: '12px', border: '1px solid var(--tooltip-border, #e2e8f0)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Requests">
                    {statusBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">No applications registered.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
