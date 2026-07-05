/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  UserRole,
  Employee,
  Department,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  Holiday,
  AuditLog,
  SystemSettings,
  PolicyDoc,
  SimulatedEmail,
  Candidate,
} from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Path utilities for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('Warning: GEMINI_API_KEY is not defined. AI Assistant will operate in fallback mock mode.');
}

// Relational Database State (In-Memory with persistent backup in data.json)
const DB_FILE = path.join(process.cwd(), 'data.json');

interface DatabaseSchema {
  employees: Employee[];
  departments: Department[];
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  holidays: Holiday[];
  auditLogs: AuditLog[];
  policies: PolicyDoc[];
  settings: SystemSettings;
  simulatedEmails?: SimulatedEmail[];
  candidates?: Candidate[];
}

// Initial Seed Data
const initialSeedData: DatabaseSchema = {
  employees: [
    {
      id: 'emp_1',
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.EMPLOYEE,
      departmentId: 'dept_eng',
      departmentName: 'Engineering',
      managerId: 'emp_2',
      managerName: 'Jane Smith',
      joinDate: '2025-01-15',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      status: 'ACTIVE',
    },
    {
      id: 'emp_2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: UserRole.MANAGER,
      departmentId: 'dept_eng',
      departmentName: 'Engineering',
      managerId: 'emp_3',
      managerName: 'Robert Vance',
      joinDate: '2023-06-10',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      status: 'ACTIVE',
    },
    {
      id: 'emp_3',
      name: 'Robert Vance',
      email: 'robert@example.com',
      role: UserRole.HR,
      departmentId: 'dept_hr',
      departmentName: 'Human Resources',
      managerId: 'admin_1',
      managerName: 'Super Admin',
      joinDate: '2021-03-01',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      status: 'ACTIVE',
    },
    {
      id: 'admin_1',
      name: 'Vannila Chandrasekaran',
      email: 'vannilavanchandrasekaran@gmail.com', // Preseeded user email as Admin
      role: UserRole.SUPER_ADMIN,
      departmentId: 'dept_admin',
      departmentName: 'Administration',
      managerId: null,
      managerName: null,
      joinDate: '2020-01-01',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      status: 'ACTIVE',
    },
    {
      id: 'emp_4',
      name: 'Alice Williams',
      email: 'alice@example.com',
      role: UserRole.EMPLOYEE,
      departmentId: 'dept_eng',
      departmentName: 'Engineering',
      managerId: 'emp_2',
      managerName: 'Jane Smith',
      joinDate: '2025-03-20',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      status: 'ACTIVE',
    },
    {
      id: 'emp_5',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: UserRole.EMPLOYEE,
      departmentId: 'dept_eng',
      departmentName: 'Engineering',
      managerId: 'emp_2',
      managerName: 'Jane Smith',
      joinDate: '2024-11-01',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      status: 'ACTIVE',
    },
  ],
  departments: [
    { id: 'dept_eng', name: 'Engineering', managerId: 'emp_2', description: 'Core product development and systems engineering.' },
    { id: 'dept_hr', name: 'Human Resources', managerId: 'emp_3', description: 'HR policy, talent acquisition, and employee success.' },
    { id: 'dept_admin', name: 'Administration', managerId: 'admin_1', description: 'Executive leadership and IT support.' },
  ],
  leaveTypes: [
    { id: 'casual', name: 'Casual Leave', description: 'Used for short personal matters. Max 2 consecutive days.', defaultQuota: 8, requiresDocuments: false, paid: true, color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { id: 'sick', name: 'Sick Leave', description: 'Used for medical emergencies. Requires document if > 2 days.', defaultQuota: 10, requiresDocuments: true, paid: true, color: 'bg-red-100 text-red-800 border-red-200' },
    { id: 'annual', name: 'Annual / Earned Leave', description: 'Planned vacations. Requires 1 week advance application.', defaultQuota: 32, requiresDocuments: false, paid: true, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { id: 'paternity', name: 'Paternity Leave', description: '15 days of paid parental leave for new fathers.', defaultQuota: 15, requiresDocuments: true, paid: true, color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'maternity', name: 'Maternity Leave', description: '26 weeks of paid parental leave for female employees.', defaultQuota: 182, requiresDocuments: true, paid: true, color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { id: 'bereavement', name: 'Bereavement Leave', description: 'Used during loss of immediate family members. Up to 5 days.', defaultQuota: 5, requiresDocuments: false, paid: true, color: 'bg-slate-100 text-slate-800 border-slate-200' },
    { id: 'comp_off', name: 'Compensatory Off', description: 'Earned by working on weekends or public holidays.', defaultQuota: 3, requiresDocuments: false, paid: true, color: 'bg-sky-100 text-sky-800 border-sky-200' },
    { id: 'wfh', name: 'Work From Home', description: 'Remote work logging. Does not deduct from leave quotas.', defaultQuota: 100, requiresDocuments: false, paid: true, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    { id: 'lop', name: 'Loss of Pay (LOP)', description: 'Unpaid leave once all balances are exhausted.', defaultQuota: 365, requiresDocuments: false, paid: false, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  ],
  leaveBalances: [
    // Preseeded John Doe balances
    { employeeId: 'emp_1', leaveTypeId: 'casual', leaveTypeName: 'Casual Leave', quota: 8, used: 2, pending: 1, remaining: 5 },
    { employeeId: 'emp_1', leaveTypeId: 'sick', leaveTypeName: 'Sick Leave', quota: 10, used: 1, pending: 0, remaining: 9 },
    { employeeId: 'emp_1', leaveTypeId: 'annual', leaveTypeName: 'Annual / Earned Leave', quota: 32, used: 5, pending: 4, remaining: 23 },
    { employeeId: 'emp_1', leaveTypeId: 'paternity', leaveTypeName: 'Paternity Leave', quota: 15, used: 0, pending: 0, remaining: 15 },
    { employeeId: 'emp_1', leaveTypeId: 'bereavement', leaveTypeName: 'Bereavement Leave', quota: 5, used: 0, pending: 0, remaining: 5 },
    { employeeId: 'emp_1', leaveTypeId: 'comp_off', leaveTypeName: 'Compensatory Off', quota: 3, used: 0, pending: 0, remaining: 3 },
    { employeeId: 'emp_1', leaveTypeId: 'wfh', leaveTypeName: 'Work From Home', quota: 100, used: 4, pending: 0, remaining: 96 },
    { employeeId: 'emp_1', leaveTypeId: 'lop', leaveTypeName: 'Loss of Pay (LOP)', quota: 365, used: 0, pending: 0, remaining: 365 },

    // Preseeded Alice Williams balances
    { employeeId: 'emp_4', leaveTypeId: 'casual', leaveTypeName: 'Casual Leave', quota: 8, used: 0, pending: 0, remaining: 8 },
    { employeeId: 'emp_4', leaveTypeId: 'sick', leaveTypeName: 'Sick Leave', quota: 10, used: 0, pending: 1, remaining: 9 },
    { employeeId: 'emp_4', leaveTypeId: 'annual', leaveTypeName: 'Annual / Earned Leave', quota: 32, used: 0, pending: 0, remaining: 32 },

    // Preseeded Bob Johnson balances
    { employeeId: 'emp_5', leaveTypeId: 'casual', leaveTypeName: 'Casual Leave', quota: 8, used: 1, pending: 0, remaining: 7 },
    { employeeId: 'emp_5', leaveTypeId: 'sick', leaveTypeName: 'Sick Leave', quota: 10, used: 2, pending: 0, remaining: 8 },
    { employeeId: 'emp_5', leaveTypeId: 'annual', leaveTypeName: 'Annual / Earned Leave', quota: 32, used: 2, pending: 0, remaining: 30 },
  ],
  leaveRequests: [
    {
      id: 'req_1',
      employeeId: 'emp_1',
      employeeName: 'John Doe',
      departmentName: 'Engineering',
      leaveTypeId: 'annual',
      leaveTypeName: 'Annual / Earned Leave',
      startDate: '2026-07-10',
      endDate: '2026-07-13',
      duration: 4,
      halfDay: false,
      reason: 'Summer family vacation trip to the national park.',
      supportingDocument: null,
      status: 'PENDING',
      managerComments: null,
      hrComments: null,
      createdAt: '2026-07-01T10:00:00Z',
      history: [
        {
          status: 'PENDING',
          updatedBy: 'emp_1',
          updatedByName: 'John Doe',
          timestamp: '2026-07-01T10:00:00Z',
          comments: 'Request submitted for team review.',
        },
      ],
    },
    {
      id: 'req_2',
      employeeId: 'emp_1',
      employeeName: 'John Doe',
      departmentName: 'Engineering',
      leaveTypeId: 'casual',
      leaveTypeName: 'Casual Leave',
      startDate: '2026-07-07',
      endDate: '2026-07-07',
      duration: 1,
      halfDay: false,
      reason: 'Home plumbing maintenance and urgent technician visit.',
      supportingDocument: null,
      status: 'PENDING',
      managerComments: null,
      hrComments: null,
      createdAt: '2026-07-03T09:30:00Z',
      history: [
        {
          status: 'PENDING',
          updatedBy: 'emp_1',
          updatedByName: 'John Doe',
          timestamp: '2026-07-03T09:30:00Z',
          comments: 'Applied for personal matter.',
        },
      ],
    },
    {
      id: 'req_3',
      employeeId: 'emp_4',
      employeeName: 'Alice Williams',
      departmentName: 'Engineering',
      leaveTypeId: 'sick',
      leaveTypeName: 'Sick Leave',
      startDate: '2026-07-06',
      endDate: '2026-07-06',
      duration: 1,
      halfDay: false,
      reason: 'Dental wisdom tooth extraction surgery appointment.',
      supportingDocument: 'medical_cert_alice.pdf',
      status: 'PENDING',
      managerComments: null,
      hrComments: null,
      createdAt: '2026-07-03T15:00:00Z',
      history: [
        {
          status: 'PENDING',
          updatedBy: 'emp_4',
          updatedByName: 'Alice Williams',
          timestamp: '2026-07-03T15:00:00Z',
          comments: 'Wisdom tooth surgery recovery.',
        },
      ],
    },
    {
      id: 'req_4',
      employeeId: 'emp_5',
      employeeName: 'Bob Johnson',
      departmentName: 'Engineering',
      leaveTypeId: 'annual',
      leaveTypeName: 'Annual / Earned Leave',
      startDate: '2026-06-15',
      endDate: '2026-06-17',
      duration: 3,
      halfDay: false,
      reason: 'Moving to a new apartment in the city.',
      supportingDocument: null,
      status: 'APPROVED',
      managerComments: 'Approved. Ensure tasks are delegated before leaving.',
      hrComments: 'Processed.',
      createdAt: '2026-06-05T08:00:00Z',
      history: [
        {
          status: 'PENDING',
          updatedBy: 'emp_5',
          updatedByName: 'Bob Johnson',
          timestamp: '2026-06-05T08:00:00Z',
          comments: 'Request submitted.',
        },
        {
          status: 'APPROVED',
          updatedBy: 'emp_2',
          updatedByName: 'Jane Smith',
          timestamp: '2026-06-06T11:00:00Z',
          comments: 'Approved. Ensure tasks are delegated.',
        },
      ],
    },
  ],
  holidays: [
    { id: 'hol_1', name: 'Independence Day', date: '2026-07-04', type: 'FEDERAL' },
    { id: 'hol_2', name: 'Labor Day', date: '2026-09-07', type: 'FEDERAL' },
    { id: 'hol_3', name: 'Thanksgiving Day', date: '2026-11-26', type: 'FEDERAL' },
    { id: 'hol_4', name: 'Christmas Day', date: '2026-12-25', type: 'FEDERAL' },
    { id: 'hol_5', name: 'New Year Day', date: '2026-01-01', type: 'FEDERAL' },
    { id: 'hol_6', name: 'Optional Birthday Holiday', date: '2026-07-20', type: 'OPTIONAL' },
  ],
  auditLogs: [
    { id: 'log_1', userId: 'emp_1', userName: 'John Doe', userEmail: 'john@example.com', action: 'APPLY_LEAVE', details: 'Applied for Annual Leave from 2026-07-10 to 2026-07-13', timestamp: '2026-07-01T10:00:00Z' },
    { id: 'log_2', userId: 'emp_1', userName: 'John Doe', userEmail: 'john@example.com', action: 'APPLY_LEAVE', details: 'Applied for Casual Leave on 2026-07-07', timestamp: '2026-07-03T09:30:00Z' },
    { id: 'log_3', userId: 'emp_4', userName: 'Alice Williams', userEmail: 'alice@example.com', action: 'APPLY_LEAVE', details: 'Applied for Sick Leave on 2026-07-06 with supporting documents', timestamp: '2026-07-03T15:00:00Z' },
  ],
  policies: [
    {
      id: 'pol_casual',
      title: 'Casual Leave Policy',
      category: 'Casual Leave',
      content: 'Casual leave is provided for unexpected personal emergencies or planning short events. Employees receive 8 days of Casual Leave per calendar year. No more than 2 consecutive days of Casual Leave may be taken. Casual leave cannot be combined with Sick Leave or Annual Leave. At least 24 hours advance notice is required except in extreme emergencies.',
    },
    {
      id: 'pol_sick',
      title: 'Sick & Medical Leave Policy',
      category: 'Sick Leave',
      content: 'Sick leave is strictly reserved for medical illnesses, emergencies, surgeries, or doctor appointments. Employees receive 10 days of paid Sick Leave per year. If a Sick Leave spans more than 2 consecutive business days, a valid Medical Certificate (PDF or image) uploaded by a certified practitioner is mandatory for HR verification and approval.',
    },
    {
      id: 'pol_annual',
      title: 'Annual / Earned Vacation Leave Policy',
      category: 'Annual Leave',
      content: 'Annual leave is provided for long vacations and recreational activities. Employees accrue Annual Leave at a rate of 2.67 days per completed month of service, totaling 32 days per year. Accrued leave carries over with a maximum cap of 45 days. To ensure smooth department operations, employees must submit Annual Leave requests at least 1 week (7 calendar days) in advance. Approvals are subject to team staffing availability (minimum 50% department presence required).',
    },
    {
      id: 'pol_parental',
      title: 'Maternity & Paternity Parental Leave',
      category: 'Parental Leave',
      content: 'Maternity Leave provides 26 weeks (182 days) of fully paid leave for female employees following birth or legal adoption. Paternity Leave provides 15 calendar days of fully paid leave for male employees. Requests require supporting certificates (birth notification, hospital registry) and must be requested at least 4 weeks in advance.',
    },
    {
      id: 'pol_lop',
      title: 'Loss of Pay (LOP) Policy',
      category: 'Loss of Pay',
      content: 'Loss of Pay (unpaid leave) can be applied when all other paid leave balances (Casual, Sick, Annual) are exhausted. Manager and HR approvals are strictly mandatory. LOP days are deducted directly from the monthly payroll cycle.',
    },
    {
      id: 'pol_wfh',
      title: 'Work From Home (WFH) Guidelines',
      category: 'Remote Work',
      content: 'Work From Home is an administrative arrangement to support remote work flexibility. WFH does not deduct from any leave balances. Employees must log WFH schedules in advance with manager approval. Core working hours (10 AM to 4 PM local time) must be maintained.',
    },
  ],
  settings: {
    aiEnabled: true,
    escalationDays: 3,
    allowLossOfPay: true,
    staffingThresholdPercent: 50,
  },
  simulatedEmails: [],
};

// Database State Controller
class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = initialSeedData;
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        if (!this.data.simulatedEmails) {
          this.data.simulatedEmails = [];
        }
        if (!this.data.candidates || this.data.candidates.length === 0) {
          this.data.candidates = [
            {
              id: 'cand_1',
              name: 'Emily Watson',
              email: 'emily.watson@example.com',
              phone: '+1 (555) 019-2834',
              roleApplied: 'Senior Frontend Engineer',
              department: 'Engineering',
              experienceYears: 6,
              status: 'INTERVIEWING',
              skills: ['React', 'TypeScript', 'TailwindCSS', 'Next.js'],
              registeredAt: '2026-06-15T09:00:00Z',
              notes: 'Strong visual UI/UX intuition. Excellent communications during initial screening rounds.',
              gender: 'FEMALE'
            },
            {
              id: 'cand_2',
              name: 'Marcus Vance',
              email: 'marcus.vance@example.com',
              phone: '+1 (555) 014-9821',
              roleApplied: 'HR Operations Specialist',
              department: 'Human Resources',
              experienceYears: 4,
              status: 'OFFER_EXTENDED',
              skills: ['Talent Acquisition', 'Payroll Specialist', 'Employee Relations'],
              registeredAt: '2026-06-20T14:30:00Z',
              notes: 'Highly recommended by Robert. Detailed knowledge of local labor laws and leave compliance structures.',
              gender: 'MALE'
            }
          ];
          this.save();
        }
        console.log('Database loaded successfully from file.');
      } else {
        this.data.candidates = [
          {
            id: 'cand_1',
            name: 'Emily Watson',
            email: 'emily.watson@example.com',
            phone: '+1 (555) 019-2834',
            roleApplied: 'Senior Frontend Engineer',
            department: 'Engineering',
            experienceYears: 6,
            status: 'INTERVIEWING',
            skills: ['React', 'TypeScript', 'TailwindCSS', 'Next.js'],
            registeredAt: '2026-06-15T09:00:00Z',
            notes: 'Strong visual UI/UX intuition. Excellent communications during initial screening rounds.',
            gender: 'FEMALE'
          },
          {
            id: 'cand_2',
            name: 'Marcus Vance',
            email: 'marcus.vance@example.com',
            phone: '+1 (555) 014-9821',
            roleApplied: 'HR Operations Specialist',
            department: 'Human Resources',
            experienceYears: 4,
            status: 'OFFER_EXTENDED',
            skills: ['Talent Acquisition', 'Payroll Specialist', 'Employee Relations'],
            registeredAt: '2026-06-20T14:30:00Z',
            notes: 'Highly recommended by Robert. Detailed knowledge of local labor laws and leave compliance structures.',
            gender: 'MALE'
          }
        ];
        this.save();
        console.log('Database initialized with default seed data.');
      }
    } catch (e) {
      console.error('Error loading database:', e);
      this.data = initialSeedData;
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  // Getters
  public getEmployees() { return this.data.employees; }
  public getDepartments() { return this.data.departments; }
  public getLeaveTypes() { return this.data.leaveTypes; }
  public getLeaveBalances() { return this.data.leaveBalances; }
  public getLeaveRequests() { return this.data.leaveRequests; }
  public getHolidays() { return this.data.holidays; }
  public getAuditLogs() { return this.data.auditLogs; }
  public getPolicies() { return this.data.policies; }
  public getSettings() { return this.data.settings; }
  public getSimulatedEmails(): SimulatedEmail[] { return this.data.simulatedEmails || []; }
  public getCandidates(): Candidate[] { return this.data.candidates || []; }

  // Modifiers
  public updateEmployees(employees: Employee[]) { this.data.employees = employees; this.save(); }
  public updateLeaveRequests(requests: LeaveRequest[]) { this.data.leaveRequests = requests; this.save(); }
  public updateLeaveBalances(balances: LeaveBalance[]) { this.data.leaveBalances = balances; this.save(); }
  public updateHolidays(holidays: Holiday[]) { this.data.holidays = holidays; this.save(); }
  public updateLeaveTypes(leaveTypes: LeaveType[]) { this.data.leaveTypes = leaveTypes; this.save(); }
  public updateSettings(settings: SystemSettings) { this.data.settings = settings; this.save(); }
  public updateSimulatedEmails(emails: SimulatedEmail[]) { this.data.simulatedEmails = emails; this.save(); }
  public updateCandidates(candidates: Candidate[]) { this.data.candidates = candidates; this.save(); }
  public addSimulatedEmail(email: SimulatedEmail) {
    if (!this.data.simulatedEmails) this.data.simulatedEmails = [];
    this.data.simulatedEmails.unshift(email);
    this.save();
  }
  public clearSimulatedEmails() {
    this.data.simulatedEmails = [];
    this.save();
  }
  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const newLog: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(newLog);
    this.save();
  }
}

const dbInstance = new Database();

class MockBackgroundJobService {
  public static queueEmail(
    leaveRequestId: string,
    toEmail: string,
    toName: string,
    subject: string,
    body: string,
    type: SimulatedEmail['type']
  ) {
    const emailId = `mail_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    // Immediately create a "QUEUED" email log
    const initialEmail: SimulatedEmail = {
      id: emailId,
      toEmail,
      toName,
      subject,
      body,
      status: 'QUEUED',
      leaveRequestId,
      type,
      sentAt: new Date().toISOString()
    };
    
    dbInstance.addSimulatedEmail(initialEmail);
    console.log(`[MockBackgroundJobService] Job QUEUED: Send email to ${toName} (${toEmail}) for leave request ${leaveRequestId}`);

    // Simulate background processing queue latency (1.5 seconds)
    setTimeout(() => {
      const emails = dbInstance.getSimulatedEmails();
      const mail = emails.find(e => e.id === emailId);
      if (mail) {
        mail.status = 'PROCESSING';
        dbInstance.updateSimulatedEmails(emails);
        console.log(`[MockBackgroundJobService] Job PROCESSING: Sending email ${emailId}`);
        
        // Simulate SMTP delivery (1 second)
        setTimeout(() => {
          const finalEmails = dbInstance.getSimulatedEmails();
          const finalMail = finalEmails.find(e => e.id === emailId);
          if (finalMail) {
            finalMail.status = 'SENT';
            finalMail.sentAt = new Date().toISOString();
            dbInstance.updateSimulatedEmails(finalEmails);
            console.log(`[MockBackgroundJobService] Job COMPLETED: Email ${emailId} SENT successfully to ${toEmail}`);
          }
        }, 1000);
      }
    }, 1500);
  }

  // Trigger leave request notification flow based on event state changes
  public static handleLeaveStatusChange(
    event: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CLARIFICATION' | 'CANCELLED',
    leaveRequest: LeaveRequest,
    actor: Employee,
    comments?: string
  ) {
    const employees = dbInstance.getEmployees();
    const employee = employees.find(e => e.id === leaveRequest.employeeId) || {
      name: leaveRequest.employeeName,
      email: `${leaveRequest.employeeName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      managerId: null,
      managerName: null
    };

    // Find Manager
    let manager = employee.managerId ? employees.find(e => e.id === employee.managerId) : null;
    if (!manager && employee.managerName) {
      manager = employees.find(e => e.name === employee.managerName) || null;
    }
    const managerEmail = manager ? manager.email : 'hr@example.com';
    const managerName = manager ? manager.name : 'HR Department';

    if (event === 'SUBMITTED') {
      // 1. Send Email to Manager
      const managerSubject = `[LeaveFlow] Action Required: New Leave Request from ${employee.name}`;
      const managerBody = `Dear ${managerName},

A new leave request has been submitted by ${employee.name} in your department (${leaveRequest.departmentName}) and is pending your approval.

Request Summary:
• Leave Type: ${leaveRequest.leaveTypeName}
• Duration: ${leaveRequest.duration} Day(s)
• Period: ${leaveRequest.startDate} to ${leaveRequest.endDate}
• Reason: "${leaveRequest.reason}"

Please log in to the LeaveFlow LMS Manager Desk to review, approve, reject, or request further clarification regarding this request.

Regards,
LeaveFlow Background Automation Job Service
[Process ID: JOB_${Date.now().toString().slice(-6)}]`;

      this.queueEmail(leaveRequest.id, managerEmail, managerName, managerSubject, managerBody, 'LEAVE_SUBMITTED');

      // 2. Send Email to Employee
      const empSubject = `[LeaveFlow] Leave Request Received: ${leaveRequest.leaveTypeName}`;
      const empBody = `Dear ${employee.name},

Your leave request for ${leaveRequest.leaveTypeName} has been successfully submitted and is currently pending review by your manager ${managerName}.

Request Summary:
• Period: ${leaveRequest.startDate} to ${leaveRequest.endDate}
• Duration: ${leaveRequest.duration} Day(s)
• Reason: "${leaveRequest.reason}"

You will receive another automated notification as soon as the status of your request is updated.

Regards,
LeaveFlow LMS Engine`;

      this.queueEmail(leaveRequest.id, employee.email, employee.name, empSubject, empBody, 'LEAVE_SUBMITTED');
    } 
    
    else if (event === 'APPROVED') {
      // Send Email to Employee
      const empSubject = `[LeaveFlow] APPROVED: Leave Request for ${leaveRequest.leaveTypeName}`;
      const empBody = `Dear ${employee.name},

Your leave request for ${leaveRequest.leaveTypeName} has been APPROVED by ${actor.name}.

Request Summary:
• Period: ${leaveRequest.startDate} to ${leaveRequest.endDate}
• Duration: ${leaveRequest.duration} Day(s)
• Comments: "${comments || 'None'}"

Your leave balance has been updated in the system. Have a good time off!

Regards,
LeaveFlow LMS Administration`;

      this.queueEmail(leaveRequest.id, employee.email, employee.name, empSubject, empBody, 'LEAVE_APPROVED');
    } 
    
    else if (event === 'REJECTED') {
      // Send Email to Employee
      const empSubject = `[LeaveFlow] DECLINED: Leave Request for ${leaveRequest.leaveTypeName}`;
      const empBody = `Dear ${employee.name},

Please be informed that your leave request for ${leaveRequest.leaveTypeName} has been DECLINED by ${actor.name}.

Request Summary:
• Period: ${leaveRequest.startDate} to ${leaveRequest.endDate}
• Duration: ${leaveRequest.duration} Day(s)
• Comments / Feedback: "${comments || 'No feedback left.'}"

If you have questions regarding this decision, please schedule a sync with ${actor.name}.

Regards,
LeaveFlow LMS Team`;

      this.queueEmail(leaveRequest.id, employee.email, employee.name, empSubject, empBody, 'LEAVE_REJECTED');
    } 
    
    else if (event === 'CLARIFICATION') {
      // Send Email to Employee
      const empSubject = `[LeaveFlow] CLARIFICATION REQUIRED: Leave Request for ${leaveRequest.leaveTypeName}`;
      const empBody = `Dear ${employee.name},

${actor.name} has requested clarification regarding your leave request.

Request Details:
• Leave Type: ${leaveRequest.leaveTypeName}
• Period: ${leaveRequest.startDate} to ${leaveRequest.endDate}
• Message/Question: "${comments || 'Please specify handover plans.'}"

Please login to LeaveFlow LMS, go to your Leave Hub, and edit or respond to this clarification request.

Regards,
LeaveFlow LMS Notifications`;

      this.queueEmail(leaveRequest.id, employee.email, employee.name, empSubject, empBody, 'LEAVE_CLARIFICATION');
    } 
    
    else if (event === 'CANCELLED') {
      // Send Email to Manager
      const managerSubject = `[LeaveFlow] Leave Request Cancelled: ${employee.name}`;
      const managerBody = `Dear ${managerName},

This is to notify you that ${employee.name} has cancelled/recalled their leave request for ${leaveRequest.leaveTypeName} (${leaveRequest.startDate} to ${leaveRequest.endDate}).

No further action is required for this request.

Regards,
LeaveFlow LMS Engine`;

      this.queueEmail(leaveRequest.id, managerEmail, managerName, managerSubject, managerBody, 'LEAVE_CANCELLED');
    }
  }
}

// Authentication Helper
let currentSessionUser: Employee | null = dbInstance.getEmployees()[0]; // Default mock session (John Doe)

// Express REST API Routes

// Authentication Endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const employee = dbInstance.getEmployees().find(emp => emp.email.toLowerCase() === email.toLowerCase());
  if (!employee) {
    return res.status(404).json({ error: 'Employee record not found.' });
  }

  // Enforce credentials check for HR and Administration (SUPER_ADMIN)
  if (employee.role === UserRole.HR) {
    if (!password) {
      return res.status(401).json({ error: 'Authentication required. Password is required for HR Portal.' });
    }
    if (password !== 'hr123') {
      return res.status(401).json({ error: 'Invalid credentials. Please enter the correct password for HR Admin.' });
    }
  } else if (employee.role === UserRole.SUPER_ADMIN) {
    if (!password) {
      return res.status(401).json({ error: 'Authentication required. Password is required for Administration.' });
    }
    if (password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid credentials. Please enter the correct password for Super Admin.' });
    }
  }

  currentSessionUser = employee;
  dbInstance.addAuditLog({
    userId: employee.id,
    userName: employee.name,
    userEmail: employee.email,
    action: 'AUTH_LOGIN',
    details: `User logged in successfully with role ${employee.role}`,
  });

  res.json({ user: employee });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: currentSessionUser });
});

app.post('/api/auth/logout', (req, res) => {
  if (currentSessionUser) {
    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: 'AUTH_LOGOUT',
      details: 'User logged out',
    });
  }
  currentSessionUser = null;
  res.json({ success: true });
});

// Leave Types API
app.get('/api/leave-types', (req, res) => {
  res.json(dbInstance.getLeaveTypes());
});

app.post('/api/leave-types', (req, res) => {
  const { name, description, defaultQuota, requiresDocuments, paid, color } = req.body;
  const leaveTypes = dbInstance.getLeaveTypes();
  const newType: LeaveType = {
    id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    name,
    description,
    defaultQuota: Number(defaultQuota),
    requiresDocuments: Boolean(requiresDocuments),
    paid: Boolean(paid),
    color: color || 'bg-slate-100 text-slate-800 border-slate-200',
  };

  leaveTypes.push(newType);
  dbInstance.updateLeaveTypes(leaveTypes);

  // Initialize balances for all employees for this new type
  const balances = dbInstance.getLeaveBalances();
  dbInstance.getEmployees().forEach(emp => {
    balances.push({
      employeeId: emp.id,
      leaveTypeId: newType.id,
      leaveTypeName: newType.name,
      quota: newType.defaultQuota,
      used: 0,
      pending: 0,
      remaining: newType.defaultQuota,
    });
  });
  dbInstance.updateLeaveBalances(balances);

  if (currentSessionUser) {
    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: 'CREATE_LEAVE_TYPE',
      details: `Created new leave category: ${name} (quota: ${defaultQuota})`,
    });
  }

  res.status(201).json(newType);
});

// Holidays API
app.get('/api/holidays', (req, res) => {
  res.json(dbInstance.getHolidays());
});

app.post('/api/holidays', (req, res) => {
  const { name, date, type } = req.body;
  if (!name || !date) {
    return res.status(400).json({ error: 'Name and date are required' });
  }

  const holidays = dbInstance.getHolidays();
  const newHoliday: Holiday = {
    id: `hol_${Date.now()}`,
    name,
    date,
    type: type || 'FEDERAL',
  };

  holidays.push(newHoliday);
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  dbInstance.updateHolidays(holidays);

  if (currentSessionUser) {
    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: 'ADD_HOLIDAY',
      details: `Added holiday: ${name} on ${date}`,
    });
  }

  res.status(201).json(newHoliday);
});

app.delete('/api/holidays/:id', (req, res) => {
  const { id } = req.params;
  const holidays = dbInstance.getHolidays();
  const item = holidays.find(h => h.id === id);
  if (!item) return res.status(404).json({ error: 'Holiday not found' });

  const filtered = holidays.filter(h => h.id !== id);
  dbInstance.updateHolidays(filtered);

  if (currentSessionUser) {
    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: 'DELETE_HOLIDAY',
      details: `Deleted holiday: ${item.name} on ${item.date}`,
    });
  }

  res.json({ success: true });
});

// Leave Balances API
app.get('/api/leave-balances', (req, res) => {
  const empId = req.query.employeeId as string || currentSessionUser?.id;
  if (!empId) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }
  const balances = dbInstance.getLeaveBalances().filter(b => b.employeeId === empId);
  res.json(balances);
});

// Leave Requests API
app.get('/api/leave-requests', (req, res) => {
  const empId = req.query.employeeId as string;
  const managerId = req.query.managerId as string;
  const all = req.query.all === 'true';

  let requests = dbInstance.getLeaveRequests();

  if (empId) {
    requests = requests.filter(r => r.employeeId === empId);
  } else if (managerId) {
    // Find requests of team members managed by this manager ID
    const teamEmpIds = dbInstance.getEmployees()
      .filter(e => e.managerId === managerId)
      .map(e => e.id);
    requests = requests.filter(r => teamEmpIds.includes(r.employeeId));
  } else if (!all && currentSessionUser) {
    // Default safety filter
    if (currentSessionUser.role === UserRole.EMPLOYEE) {
      requests = requests.filter(r => r.employeeId === currentSessionUser!.id);
    } else if (currentSessionUser.role === UserRole.MANAGER) {
      const teamEmpIds = dbInstance.getEmployees()
        .filter(e => e.managerId === currentSessionUser!.id)
        .map(e => e.id);
      requests = requests.filter(r => teamEmpIds.includes(r.employeeId) || r.employeeId === currentSessionUser!.id);
    }
  }

  res.json(requests);
});

// Apply Leave Request
app.post('/api/leave-requests', (req, res) => {
  const { leaveTypeId, startDate, endDate, reason, halfDay, supportingDocument, employeeId } = req.body;
  if (!currentSessionUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!leaveTypeId || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Find target employee (default to current session user)
  const targetEmployeeId = employeeId || currentSessionUser.id;
  const targetEmployee = dbInstance.getEmployees().find(e => e.id === targetEmployeeId);
  if (!targetEmployee) {
    return res.status(404).json({ error: 'Selected employee not found' });
  }

  // Find leave type
  const leaveType = dbInstance.getLeaveTypes().find(t => t.id === leaveTypeId);
  if (!leaveType) {
    return res.status(404).json({ error: 'Leave type not found' });
  }

  // Check document requirement
  if (leaveType.requiresDocuments && !supportingDocument) {
    // Check if sick leave duration requires doc
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dur = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (dur > 2) {
      return res.status(400).json({ error: `Medical Certificate document upload is required for ${leaveType.name} longer than 2 days.` });
    }
  }

  // Calculate Duration
  const start = new Date(startDate);
  const end = new Date(endDate);
  let duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (halfDay) {
    duration = 0.5;
  }

  // Validate leave balance
  const userBalances = dbInstance.getLeaveBalances();
  const balance = userBalances.find(b => b.employeeId === targetEmployee.id && b.leaveTypeId === leaveTypeId);

  if (!balance && leaveTypeId !== 'lop') {
    return res.status(400).json({ error: 'Leave balance record not found.' });
  }

  if (balance && balance.remaining < duration && !dbInstance.getSettings().allowLossOfPay) {
    return res.status(400).json({ error: `Insufficient leave balance. Remaining: ${balance.remaining} days, Requested: ${duration} days.` });
  }

  // Create Request
  const newRequest: LeaveRequest = {
    id: `req_${Date.now()}`,
    employeeId: targetEmployee.id,
    employeeName: targetEmployee.name,
    departmentName: targetEmployee.departmentName,
    leaveTypeId,
    leaveTypeName: leaveType.name,
    startDate,
    endDate,
    duration,
    halfDay: Boolean(halfDay),
    reason,
    supportingDocument: supportingDocument || null,
    status: 'PENDING',
    managerComments: null,
    hrComments: null,
    createdAt: new Date().toISOString(),
    history: [
      {
        status: 'PENDING',
        updatedBy: currentSessionUser.id,
        updatedByName: currentSessionUser.name,
        timestamp: new Date().toISOString(),
        comments: 'Leave request submitted.',
      },
    ],
  };

  const requests = dbInstance.getLeaveRequests();
  requests.unshift(newRequest);
  dbInstance.updateLeaveRequests(requests);

  // Update leave balance pending counter
  if (balance) {
    balance.pending += duration;
    balance.remaining = Math.max(0, balance.quota - balance.used - balance.pending);
    dbInstance.updateLeaveBalances(userBalances);
  }

  dbInstance.addAuditLog({
    userId: currentSessionUser.id,
    userName: currentSessionUser.name,
    userEmail: currentSessionUser.email,
    action: 'APPLY_LEAVE',
    details: `Applied for ${leaveType.name} on behalf of ${targetEmployee.name}: ${startDate} to ${endDate} (${duration} days)`,
  });

  // Trigger Background Job email simulations
  MockBackgroundJobService.handleLeaveStatusChange('SUBMITTED', newRequest, currentSessionUser);

  res.status(201).json(newRequest);
});

// Bulk Leave Request Action (Approve / Reject)
app.post('/api/leave-requests/bulk-action', (req, res) => {
  const { ids, status, comments } = req.body; // APPROVED, REJECTED

  if (!currentSessionUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'List of leave request IDs is required.' });
  }

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid action status for bulk operations.' });
  }

  const requests = dbInstance.getLeaveRequests();
  const balances = dbInstance.getLeaveBalances();
  const processedRequests: LeaveRequest[] = [];
  const errors: string[] = [];

  for (const id of ids) {
    const request = requests.find(r => r.id === id);
    if (!request) {
      errors.push(`Request ${id} not found.`);
      continue;
    }

    if (request.status !== 'PENDING') {
      errors.push(`Request ${id} is not in PENDING state.`);
      continue;
    }

    const oldStatus = request.status;
    request.status = status;

    if (currentSessionUser.role === UserRole.MANAGER) {
      request.managerComments = comments || '';
    } else if (currentSessionUser.role === UserRole.HR || currentSessionUser.role === UserRole.SUPER_ADMIN) {
      request.hrComments = comments || '';
    }

    request.history.push({
      status,
      updatedBy: currentSessionUser.id,
      updatedByName: currentSessionUser.name,
      timestamp: new Date().toISOString(),
      comments: comments || `${status} via Bulk Action by ${currentSessionUser.name}`,
    });

    // Update Leave Balance actual counts on Approval / Rejection
    const balance = balances.find(b => b.employeeId === request.employeeId && b.leaveTypeId === request.leaveTypeId);

    if (balance) {
      const duration = request.duration;

      if (oldStatus === 'PENDING') {
        balance.pending = Math.max(0, balance.pending - duration);
      }

      if (status === 'APPROVED') {
        balance.used += duration;
      }

      balance.remaining = Math.max(0, balance.quota - balance.used - balance.pending);
    }

    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: `LEAVE_${status}_BULK`,
      details: `Bulk ${status} request ${id} for employee ${request.employeeName}. Comments: ${comments || 'None'}`,
    });

    // Trigger Background Job email simulations
    MockBackgroundJobService.handleLeaveStatusChange(status as any, request, currentSessionUser, comments);
    processedRequests.push(request);
  }

  dbInstance.updateLeaveRequests(requests);
  dbInstance.updateLeaveBalances(balances);

  res.json({ success: true, processedCount: processedRequests.length, errors });
});

// Update Leave Status (Approve / Reject / Clarification)
app.post('/api/leave-requests/:id/action', (req, res) => {
  const { id } = req.params;
  const { status, comments } = req.body; // APPROVED, REJECTED, CLARIFICATION

  if (!currentSessionUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!['APPROVED', 'REJECTED', 'CLARIFICATION'].includes(status)) {
    return res.status(400).json({ error: 'Invalid action status.' });
  }

  const requests = dbInstance.getLeaveRequests();
  const request = requests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found.' });
  }

  const oldStatus = request.status;
  request.status = status;

  if (currentSessionUser.role === UserRole.MANAGER) {
    request.managerComments = comments || '';
  } else if (currentSessionUser.role === UserRole.HR || currentSessionUser.role === UserRole.SUPER_ADMIN) {
    request.hrComments = comments || '';
  }

  request.history.push({
    status,
    updatedBy: currentSessionUser.id,
    updatedByName: currentSessionUser.name,
    timestamp: new Date().toISOString(),
    comments: comments || `${status} by ${currentSessionUser.name}`,
  });

  dbInstance.updateLeaveRequests(requests);

  // Update Leave Balance actual counts on Approval / Rejection
  const balances = dbInstance.getLeaveBalances();
  const balance = balances.find(b => b.employeeId === request.employeeId && b.leaveTypeId === request.leaveTypeId);

  if (balance) {
    const duration = request.duration;

    if (oldStatus === 'PENDING') {
      balance.pending = Math.max(0, balance.pending - duration);
    }

    if (status === 'APPROVED') {
      balance.used += duration;
    }

    balance.remaining = Math.max(0, balance.quota - balance.used - balance.pending);
    dbInstance.updateLeaveBalances(balances);
  }

  dbInstance.addAuditLog({
    userId: currentSessionUser.id,
    userName: currentSessionUser.name,
    userEmail: currentSessionUser.email,
    action: `LEAVE_${status}`,
    details: `${status} request ${id} for employee ${request.employeeName}. Comments: ${comments || 'None'}`,
  });

  // Trigger Background Job email simulations
  MockBackgroundJobService.handleLeaveStatusChange(status as any, request, currentSessionUser, comments);

  res.json(request);
});

// Cancel / Recall Leave Request
app.post('/api/leave-requests/:id/cancel', (req, res) => {
  const { id } = req.params;
  if (!currentSessionUser) return res.status(401).json({ error: 'Not authenticated' });

  const requests = dbInstance.getLeaveRequests();
  const request = requests.find(r => r.id === id);
  if (!request) return res.status(404).json({ error: 'Leave request not found' });

  if (request.employeeId !== currentSessionUser.id && currentSessionUser.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: 'You do not have permission to cancel this request' });
  }

  const oldStatus = request.status;
  request.status = 'REJECTED';
  request.history.push({
    status: 'REJECTED',
    updatedBy: currentSessionUser.id,
    updatedByName: currentSessionUser.name,
    timestamp: new Date().toISOString(),
    comments: 'Cancelled by Employee.',
  });

  dbInstance.updateLeaveRequests(requests);

  // Deduct from balances pending
  if (oldStatus === 'PENDING') {
    const balances = dbInstance.getLeaveBalances();
    const balance = balances.find(b => b.employeeId === request.employeeId && b.leaveTypeId === request.leaveTypeId);
    if (balance) {
      balance.pending = Math.max(0, balance.pending - request.duration);
      balance.remaining = Math.max(0, balance.quota - balance.used - balance.pending);
      dbInstance.updateLeaveBalances(balances);
    }
  }

  dbInstance.addAuditLog({
    userId: currentSessionUser.id,
    userName: currentSessionUser.name,
    userEmail: currentSessionUser.email,
    action: 'CANCEL_LEAVE',
    details: `Cancelled leave request ${id}`,
  });

  // Trigger Background Job email simulations
  MockBackgroundJobService.handleLeaveStatusChange('CANCELLED', request, currentSessionUser);

  res.json(request);
});

// Simulated Emails API
app.get('/api/simulated-emails', (req, res) => {
  res.json(dbInstance.getSimulatedEmails());
});

app.post('/api/simulated-emails/clear', (req, res) => {
  dbInstance.clearSimulatedEmails();
  res.json({ success: true });
});

// Settings API
app.get('/api/settings', (req, res) => {
  res.json(dbInstance.getSettings());
});

app.post('/api/settings', (req, res) => {
  const { aiEnabled, escalationDays, allowLossOfPay, staffingThresholdPercent } = req.body;

  const updatedSettings: SystemSettings = {
    aiEnabled: aiEnabled !== undefined ? Boolean(aiEnabled) : dbInstance.getSettings().aiEnabled,
    escalationDays: escalationDays !== undefined ? Number(escalationDays) : dbInstance.getSettings().escalationDays,
    allowLossOfPay: allowLossOfPay !== undefined ? Boolean(allowLossOfPay) : dbInstance.getSettings().allowLossOfPay,
    staffingThresholdPercent: staffingThresholdPercent !== undefined ? Number(staffingThresholdPercent) : dbInstance.getSettings().staffingThresholdPercent,
  };

  dbInstance.updateSettings(updatedSettings);

  if (currentSessionUser) {
    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: 'UPDATE_SETTINGS',
      details: 'Updated global system rules and policy thresholds.',
    });
  }

  res.json(updatedSettings);
});

// Employee Directory Endpoints
app.get('/api/employees', (req, res) => {
  res.json(dbInstance.getEmployees());
});

app.post('/api/employees', (req, res) => {
  const { name, email, role, departmentId } = req.body;
  if (!name || !email || !role || !departmentId) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const employees = dbInstance.getEmployees();
  const dept = dbInstance.getDepartments().find(d => d.id === departmentId);

  const newEmp: Employee = {
    id: `emp_${Date.now()}`,
    name,
    email,
    role: role as UserRole,
    departmentId,
    departmentName: dept ? dept.name : 'Unknown',
    managerId: role === UserRole.EMPLOYEE ? 'emp_2' : 'emp_3', // Default assignments
    managerName: role === UserRole.EMPLOYEE ? 'Jane Smith' : 'Robert Vance',
    joinDate: new Date().toISOString().split('T')[0],
    avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?w=150`,
    status: 'ACTIVE',
  };

  employees.push(newEmp);
  dbInstance.updateEmployees(employees);

  // Initialize balances for new employee
  const balances = dbInstance.getLeaveBalances();
  dbInstance.getLeaveTypes().forEach(t => {
    balances.push({
      employeeId: newEmp.id,
      leaveTypeId: t.id,
      leaveTypeName: t.name,
      quota: t.defaultQuota,
      used: 0,
      pending: 0,
      remaining: t.defaultQuota,
    });
  });
  dbInstance.updateLeaveBalances(balances);

  if (currentSessionUser) {
    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: 'CREATE_EMPLOYEE',
      details: `Created employee: ${name} (${email}) with role ${role}`,
    });
  }

  res.status(201).json(newEmp);
});

app.post('/api/employees/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // ACTIVE, INACTIVE

  const employees = dbInstance.getEmployees();
  const emp = employees.find(e => e.id === id);
  if (!emp) return res.status(404).json({ error: 'Employee not found.' });

  emp.status = status;
  dbInstance.updateEmployees(employees);

  if (currentSessionUser) {
    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: 'EMPLOYEE_STATUS',
      details: `Changed status of employee ${emp.name} to ${status}`,
    });
  }

  res.json(emp);
});

// Candidates API Endpoints
app.get('/api/candidates', (req, res) => {
  res.json(dbInstance.getCandidates());
});

app.post('/api/candidates', (req, res) => {
  const { name, email, phone, roleApplied, department, experienceYears, status, skills, notes, gender } = req.body;
  if (!name || !email || !roleApplied || !department) {
    return res.status(400).json({ error: 'Name, Email, Role, and Department are required.' });
  }

  const candidates = dbInstance.getCandidates();
  const newCandidate: Candidate = {
    id: `cand_${Date.now()}`,
    name,
    email,
    phone: phone || '',
    roleApplied,
    department,
    experienceYears: experienceYears ? Number(experienceYears) : 0,
    status: status || 'APPLIED',
    skills: skills || [],
    registeredAt: new Date().toISOString(),
    notes: notes || '',
    gender: gender || 'PREFER_NOT_TO_SAY',
  };

  candidates.unshift(newCandidate);
  dbInstance.updateCandidates(candidates);

  if (currentSessionUser) {
    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: 'REGISTER_CANDIDATE',
      details: `Registered candidate: ${name} for ${roleApplied} (${department})`,
    });
  }

  res.status(201).json(newCandidate);
});

app.put('/api/candidates/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, roleApplied, department, experienceYears, status, skills, notes, gender } = req.body;

  const candidates = dbInstance.getCandidates();
  const candIndex = candidates.findIndex(c => c.id === id);
  if (candIndex === -1) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  const existing = candidates[candIndex];
  const updated: Candidate = {
    ...existing,
    name: name !== undefined ? name : existing.name,
    email: email !== undefined ? email : existing.email,
    phone: phone !== undefined ? phone : existing.phone,
    roleApplied: roleApplied !== undefined ? roleApplied : existing.roleApplied,
    department: department !== undefined ? department : existing.department,
    experienceYears: experienceYears !== undefined ? Number(experienceYears) : existing.experienceYears,
    status: status !== undefined ? status : existing.status,
    skills: skills !== undefined ? skills : existing.skills,
    notes: notes !== undefined ? notes : existing.notes,
    gender: gender !== undefined ? gender : existing.gender,
  };

  candidates[candIndex] = updated;
  dbInstance.updateCandidates(candidates);

  if (currentSessionUser) {
    dbInstance.addAuditLog({
      userId: currentSessionUser.id,
      userName: currentSessionUser.name,
      userEmail: currentSessionUser.email,
      action: 'UPDATE_CANDIDATE',
      details: `Updated candidate: ${updated.name} (Status: ${updated.status})`,
    });
  }

  res.json(updated);
});

// Audit Logs API
app.get('/api/audit-logs', (req, res) => {
  res.json(dbInstance.getAuditLogs());
});

// AI chat agent endpoints
app.post('/api/ai/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!dbInstance.getSettings().aiEnabled) {
    return res.json({
      text: 'The AI assistant is currently disabled in system settings. Please ask an HR Admin to enable it.',
    });
  }

  const employee = currentSessionUser || dbInstance.getEmployees()[0];
  const userBalances = dbInstance.getLeaveBalances().filter(b => b.employeeId === employee.id);
  const balancesSummary = userBalances.map(b => `${b.leaveTypeName} (ID: ${b.leaveTypeId}): Quota ${b.quota}, Used ${b.used}, Pending ${b.pending}, Remaining ${b.remaining}`).join('\n');

  const policiesList = dbInstance.getPolicies().map(p => `[${p.category} Policy] (${p.title}): ${p.content}`).join('\n\n');
  const holidaysList = dbInstance.getHolidays().map(h => `- ${h.name} on ${h.date} (${h.type})`).join('\n');

  const systemPrompt = `You are "HR Companion", an intelligent HR Assistant in the Leave Management System.
The current employee speaking with you is: ${employee.name} (Role: ${employee.role}, Department: ${employee.departmentName}, ID: ${employee.id}).
Today's date is: Saturday, July 4, 2026. Use this exact current date to resolve all relative dates (like "next Monday", "tomorrow", "this Friday").

Leave balances for ${employee.name}:
${balancesSummary}

List of upcoming Holidays:
${holidaysList}

Company Leave Policies:
${policiesList}

INSTRUCTIONS:
1. Speak professionally, helpful, and objective.
2. Maintain conversational context based on the history.
3. If the user wants to check their balances, answer using the leave balance data.
4. If the user wants to apply for a leave (e.g., "I need a sick leave for 2 days starting next Monday"), retrieve policy guidelines and check:
   - Whether they have enough balance.
   - Whether they need to submit supporting documentation (e.g. medical certificates if sick leave is > 2 consecutive days).
   - Help them resolve relative dates. (e.g. Next Monday from Jul 4, 2026 is Jul 6, 2026).
5. Crucially, when they express clear intent to apply for leave (either directly or after you confirm details), you MUST output a structured JSON code block of type \`json\` containing the parsed form details. This allows our frontend application to automatically populate the leave form!
   The JSON block MUST strictly be formatted like this:
   \`\`\`json
   {
     "action": "FILL_FORM",
     "leaveTypeId": "sick", // match one of the leave type IDs: casual, sick, annual, paternity, maternity, comp_off, wfh, lop
     "startDate": "2026-07-06", // YYYY-MM-DD format
     "endDate": "2026-07-07", // YYYY-MM-DD format
     "reason": "Dental wisdom tooth surgery",
     "halfDay": false,
     "duration": 2
   }
   \`\`\`
6. If they ask generic questions about the holiday calendar, maternity eligibility, etc., answer them using the retrieved policies RAG.
7. CRITICAL formatting rule: Avoid overusing or wrapping conversational text in raw markdown asterisks (like * or **) unnecessarily. Only use asterisks when specifically highlighting key entities, headings, or structured terms. Keep normal dialogue and replies as clean, plain, beautifully readable text with natural paragraph line-breaks rather than dense asterisk clutter.`;

  try {
    let apiCallSucceeded = false;
    let response;

    if (ai) {
      const messagesPayload = [];

      // Reconstruct history
      if (history && Array.isArray(history)) {
        history.forEach((msg: any) => {
          messagesPayload.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
          });
        });
      }

      // Append current message
      messagesPayload.push({
        role: 'user',
        parts: [{ text: message }],
      });

      let modelToUse = 'gemini-3.5-flash';
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          response = await ai.models.generateContent({
            model: modelToUse,
            contents: messagesPayload,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.3,
            },
          });
          apiCallSucceeded = true;
          break; // successfully generated content, exit retry loop
        } catch (apiError: any) {
          attempts++;
          console.warn(`Attempt ${attempts} failed for model ${modelToUse}:`, apiError);
          if (attempts >= maxAttempts) {
            console.warn('All Gemini API retries failed (Quota/Limit reached). Falling back to sandbox response generator.');
            break;
          }
          // On failure, switch to other robust models as a fallback
          if (attempts === 1) {
            modelToUse = 'gemini-flash-latest';
          } else if (attempts === 2) {
            modelToUse = 'gemini-3.1-flash-lite';
          }
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    if (apiCallSucceeded && response) {
      const answerText = response?.text || "I apologize, but I couldn't formulate a response. How can I help you today?";

      // Parse JSON from answer if it exists
      let parsedForm = undefined;
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = answerText.match(jsonRegex);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1].trim());
          if (parsed && parsed.action === 'FILL_FORM') {
            parsedForm = parsed;
          }
        } catch (e) {
          console.error('Failed to parse model auto-fill JSON:', e);
        }
      }

      res.json({
        text: answerText,
        parsedForm,
      });

    } else {
      // Fallback response when GEMINI_API_KEY is not available or has exhausted its quota
      let reply = `I'm in sandbox mode. How can I help you?`;
      let parsedForm = undefined;

      const lower = message.toLowerCase();
      if (lower.includes('apply') || lower.includes('take') || lower.includes('leave')) {
        reply = `Certainly! I've extracted your request to apply for leave. I have auto-filled the Leave Request Form for you below with relative dates resolving from Saturday, July 4, 2026:
\`\`\`json
{
  "action": "FILL_FORM",
  "leaveTypeId": "casual",
  "startDate": "2026-07-06",
  "endDate": "2026-07-06",
  "reason": "Personal urgent matter",
  "halfDay": false,
  "duration": 1
}
\`\`\`
Please review and submit the form in the dashboard!`;
        parsedForm = {
          leaveTypeId: 'casual',
          startDate: '2026-07-06',
          endDate: '2026-07-06',
          reason: 'Personal urgent matter',
          halfDay: false,
          duration: 1,
        };
      } else if (lower.includes('balance') || lower.includes('quota') || lower.includes('much')) {
        reply = `Here are your remaining balances:
- Casual Leave: 5 days
- Sick Leave: 9 days
- Annual / Earned Leave: 23 days
- Compensatory Off: 3 days
- Work From Home: 96 days remaining.`;
      } else {
        reply = `Hello! I'm your AI HR assistant. I can help you check your leave balance, explain policies, or draft a leave application form for you. What type of leave are you considering?`;
      }

      res.json({
        text: reply,
        parsedForm,
      });
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown AI companion error.' });
  }
});

// Vite Setup Middleware
if (process.env.NODE_ENV !== 'production') {
  // We use Vite dev server middleware in local development
  import('vite').then(async (viteModule) => {
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Development Full-Stack Server running on port ${PORT}`);
    });
  });
} else {
  // Serve static dist in production
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Production Full-Stack Server running on port ${PORT}`);
  });
}
