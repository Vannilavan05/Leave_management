/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  HR = 'HR',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string;
  departmentName: string;
  managerId: string | null;
  managerName: string | null;
  joinDate: string;
  avatar: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Department {
  id: string;
  name: string;
  managerId: string | null;
  description: string;
}

export interface LeaveType {
  id: string;
  name: string;
  description: string;
  defaultQuota: number;
  requiresDocuments: boolean;
  paid: boolean;
  color: string; // Tailwind bg-class e.g., 'bg-emerald-500' or hex
}

export interface LeaveBalance {
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  quota: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface StatusHistoryEntry {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLARIFICATION';
  updatedBy: string;
  updatedByName: string;
  timestamp: string;
  comments: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  duration: number; // in days
  halfDay: boolean;
  reason: string;
  supportingDocument: string | null; // Filename or data-url
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLARIFICATION';
  managerComments: string | null;
  hrComments: string | null;
  createdAt: string;
  history: StatusHistoryEntry[];
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'FEDERAL' | 'OPTIONAL';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestions?: string[];
  parsedForm?: {
    leaveTypeId?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    halfDay?: boolean;
    duration?: number;
    isValid?: boolean;
    validationErrors?: string[];
  };
}

export interface PolicyDoc {
  id: string;
  title: string;
  category: string;
  content: string;
}

export interface SystemSettings {
  aiEnabled: boolean;
  escalationDays: number;
  allowLossOfPay: boolean;
  staffingThresholdPercent: number; // e.g. min 50% team must be present
}

export interface SimulatedEmail {
  id: string;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  status: 'SENT' | 'FAILED' | 'QUEUED' | 'PROCESSING';
  sentAt?: string;
  leaveRequestId: string;
  type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CLARIFICATION' | 'LEAVE_CANCELLED' | 'LEAVE_ESCALATED';
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleApplied: string;
  department: string;
  experienceYears: number;
  status: 'APPLIED' | 'SCREENING' | 'INTERVIEWING' | 'OFFER_EXTENDED' | 'HIRED' | 'REJECTED';
  resumeUrl?: string;
  coverLetter?: string;
  skills: string[];
  registeredAt: string;
  notes?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
}

