import os
import json
import time
import uuid
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = os.path.join(os.getcwd(), 'data.json')

class Database:
    def __init__(self):
        self.data = {}
        self.load()

    def load(self):
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
                if 'simulatedEmails' not in self.data:
                    self.data['simulatedEmails'] = []
                if 'candidates' not in self.data or len(self.data['candidates']) == 0:
                    self.data['candidates'] = self._get_default_candidates()
                    self.save()
            except Exception as e:
                print(f"Error loading database: {e}")
                self.data = self._get_initial_seed_data()
        else:
            self.data = self._get_initial_seed_data()
            self.save()

    def save(self):
        try:
            with open(DB_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            print(f"Error saving database: {e}")

    def _get_default_candidates(self):
        return [
            {
              "id": "cand_1",
              "name": "Emily Watson",
              "email": "emily.watson@example.com",
              "phone": "+1 (555) 019-2834",
              "roleApplied": "Senior Frontend Engineer",
              "department": "Engineering",
              "experienceYears": 6,
              "status": "INTERVIEWING",
              "skills": ["React", "TypeScript", "TailwindCSS", "Next.js"],
              "registeredAt": "2026-06-15T09:00:00Z",
              "notes": "Strong visual UI/UX intuition. Excellent communications during initial screening rounds.",
              "gender": "FEMALE"
            },
            {
              "id": "cand_2",
              "name": "Marcus Vance",
              "email": "marcus.vance@example.com",
              "phone": "+1 (555) 014-9821",
              "roleApplied": "HR Operations Specialist",
              "department": "Human Resources",
              "experienceYears": 4,
              "status": "OFFER_EXTENDED",
              "skills": ["Talent Acquisition", "Payroll Specialist", "Employee Relations"],
              "registeredAt": "2026-06-20T14:30:00Z",
              "notes": "Highly recommended by Robert. Detailed knowledge of local labor laws and leave compliance structures.",
              "gender": "MALE"
            }
        ]

    def _get_initial_seed_data(self):
        # We can just return an empty structure if no initial data.json, 
        # but usually it should be preloaded from the user's data.json
        return {
            "employees": [],
            "departments": [],
            "leaveTypes": [],
            "leaveBalances": [],
            "leaveRequests": [],
            "holidays": [],
            "auditLogs": [],
            "policies": [],
            "settings": {},
            "simulatedEmails": [],
            "candidates": self._get_default_candidates()
        }

    # Getters
    def get_employees(self): return self.data.get('employees', [])
    def get_departments(self): return self.data.get('departments', [])
    def get_leave_types(self): return self.data.get('leaveTypes', [])
    def get_leave_balances(self): return self.data.get('leaveBalances', [])
    def get_leave_requests(self): return self.data.get('leaveRequests', [])
    def get_holidays(self): return self.data.get('holidays', [])
    def get_audit_logs(self): return self.data.get('auditLogs', [])
    def get_policies(self): return self.data.get('policies', [])
    def get_settings(self): return self.data.get('settings', {})
    def get_simulated_emails(self): return self.data.get('simulatedEmails', [])
    def get_candidates(self): return self.data.get('candidates', [])

    # Modifiers
    def update_employees(self, data): self.data['employees'] = data; self.save()
    def update_leave_requests(self, data): self.data['leaveRequests'] = data; self.save()
    def update_leave_balances(self, data): self.data['leaveBalances'] = data; self.save()
    def update_holidays(self, data): self.data['holidays'] = data; self.save()
    def update_leave_types(self, data): self.data['leaveTypes'] = data; self.save()
    def update_settings(self, data): self.data['settings'] = data; self.save()
    def update_simulated_emails(self, data): self.data['simulatedEmails'] = data; self.save()
    def update_candidates(self, data): self.data['candidates'] = data; self.save()
    
    def add_simulated_email(self, email):
        if 'simulatedEmails' not in self.data:
            self.data['simulatedEmails'] = []
        self.data['simulatedEmails'].insert(0, email)
        self.save()
        
    def clear_simulated_emails(self):
        self.data['simulatedEmails'] = []
        self.save()

    def add_audit_log(self, log):
        new_log = {
            **log,
            "id": f"log_{int(time.time()*1000)}_{uuid.uuid4().hex[:4]}",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        self.data['auditLogs'].insert(0, new_log)
        self.save()

db_instance = Database()

class MockBackgroundJobService:
    @staticmethod
    async def queue_email(leave_request_id, to_email, to_name, subject, body, type_str):
        email_id = f"mail_{int(time.time()*1000)}_{uuid.uuid4().hex[:4]}"
        
        initial_email = {
            "id": email_id,
            "toEmail": to_email,
            "toName": to_name,
            "subject": subject,
            "body": body,
            "status": "QUEUED",
            "leaveRequestId": leave_request_id,
            "type": type_str,
            "sentAt": datetime.utcnow().isoformat() + "Z"
        }
        
        db_instance.add_simulated_email(initial_email)
        print(f"[MockBackgroundJobService] Job QUEUED: Send email to {to_name} ({to_email}) for leave request {leave_request_id}")

        async def process_email():
            await asyncio.sleep(1.5)
            emails = db_instance.get_simulated_emails()
            mail = next((e for e in emails if e['id'] == email_id), None)
            if mail:
                mail['status'] = 'PROCESSING'
                db_instance.update_simulated_emails(emails)
                print(f"[MockBackgroundJobService] Job PROCESSING: Sending email {email_id}")
                
                await asyncio.sleep(1.0)
                final_emails = db_instance.get_simulated_emails()
                final_mail = next((e for e in final_emails if e['id'] == email_id), None)
                if final_mail:
                    final_mail['status'] = 'SENT'
                    final_mail['sentAt'] = datetime.utcnow().isoformat() + "Z"
                    db_instance.update_simulated_emails(final_emails)
                    print(f"[MockBackgroundJobService] Job COMPLETED: Email {email_id} SENT successfully to {to_email}")
                    
        asyncio.create_task(process_email())

    @staticmethod
    def handle_leave_status_change(event, leave_request, actor, comments=None):
        employees = db_instance.get_employees()
        employee = next((e for e in employees if e['id'] == leave_request['employeeId']), None)
        if not employee:
            employee = {
                "name": leave_request['employeeName'],
                "email": f"{leave_request['employeeName'].lower().replace(' ', '')}@example.com",
                "managerId": None,
                "managerName": None
            }

        manager = next((e for e in employees if e['id'] == employee.get('managerId')), None) if employee.get('managerId') else None
        if not manager and employee.get('managerName'):
            manager = next((e for e in employees if e['name'] == employee.get('managerName')), None)
            
        manager_email = manager['email'] if manager else 'hr@example.com'
        manager_name = manager['name'] if manager else 'HR Department'

        if event == 'SUBMITTED':
            manager_subject = f"[LeaveFlow] Action Required: New Leave Request from {employee['name']}"
            manager_body = f"""Dear {manager_name},

A new leave request has been submitted by {employee['name']} in your department ({leave_request.get('departmentName', 'Unknown')}) and is pending your approval.

Request Summary:
• Leave Type: {leave_request.get('leaveTypeName', 'Unknown')}
• Duration: {leave_request.get('duration', 0)} Day(s)
• Period: {leave_request.get('startDate', 'Unknown')} to {leave_request.get('endDate', 'Unknown')}
• Reason: "{leave_request.get('reason', '')}"

Please log in to the LeaveFlow LMS Manager Desk to review, approve, reject, or request further clarification regarding this request.

Regards,
LeaveFlow Background Automation Job Service
[Process ID: JOB_{str(int(time.time()*1000))[-6:]}]"""
            asyncio.create_task(MockBackgroundJobService.queue_email(leave_request['id'], manager_email, manager_name, manager_subject, manager_body, 'LEAVE_SUBMITTED'))

            emp_subject = f"[LeaveFlow] Leave Request Received: {leave_request.get('leaveTypeName', 'Unknown')}"
            emp_body = f"""Dear {employee['name']},

Your leave request for {leave_request.get('leaveTypeName', 'Unknown')} has been successfully submitted and is currently pending review by your manager {manager_name}.

Request Summary:
• Period: {leave_request.get('startDate', 'Unknown')} to {leave_request.get('endDate', 'Unknown')}
• Duration: {leave_request.get('duration', 0)} Day(s)
• Reason: "{leave_request.get('reason', '')}"

You will receive another automated notification as soon as the status of your request is updated.

Regards,
LeaveFlow LMS Engine"""
            asyncio.create_task(MockBackgroundJobService.queue_email(leave_request['id'], employee['email'], employee['name'], emp_subject, emp_body, 'LEAVE_SUBMITTED'))

        elif event == 'APPROVED':
            emp_subject = f"[LeaveFlow] APPROVED: Leave Request for {leave_request.get('leaveTypeName', 'Unknown')}"
            emp_body = f"""Dear {employee['name']},

Your leave request for {leave_request.get('leaveTypeName', 'Unknown')} has been APPROVED by {actor['name']}.

Request Summary:
• Period: {leave_request.get('startDate', 'Unknown')} to {leave_request.get('endDate', 'Unknown')}
• Duration: {leave_request.get('duration', 0)} Day(s)
• Comments: "{comments or 'None'}"

Your leave balance has been updated in the system. Have a good time off!

Regards,
LeaveFlow LMS Administration"""
            asyncio.create_task(MockBackgroundJobService.queue_email(leave_request['id'], employee['email'], employee['name'], emp_subject, emp_body, 'LEAVE_APPROVED'))
            
        elif event == 'REJECTED':
            emp_subject = f"[LeaveFlow] DECLINED: Leave Request for {leave_request.get('leaveTypeName', 'Unknown')}"
            emp_body = f"""Dear {employee['name']},

Please be informed that your leave request for {leave_request.get('leaveTypeName', 'Unknown')} has been DECLINED by {actor['name']}.

Request Summary:
• Period: {leave_request.get('startDate', 'Unknown')} to {leave_request.get('endDate', 'Unknown')}
• Duration: {leave_request.get('duration', 0)} Day(s)
• Comments / Feedback: "{comments or 'No feedback left.'}"

If you have questions regarding this decision, please schedule a sync with {actor['name']}.

Regards,
LeaveFlow LMS Team"""
            asyncio.create_task(MockBackgroundJobService.queue_email(leave_request['id'], employee['email'], employee['name'], emp_subject, emp_body, 'LEAVE_REJECTED'))

        elif event == 'CLARIFICATION':
            emp_subject = f"[LeaveFlow] CLARIFICATION REQUIRED: Leave Request for {leave_request.get('leaveTypeName', 'Unknown')}"
            emp_body = f"""Dear {employee['name']},

{actor['name']} has requested clarification regarding your leave request.

Request Details:
• Leave Type: {leave_request.get('leaveTypeName', 'Unknown')}
• Period: {leave_request.get('startDate', 'Unknown')} to {leave_request.get('endDate', 'Unknown')}
• Message/Question: "{comments or 'Please specify handover plans.'}"

Please login to LeaveFlow LMS, go to your Leave Hub, and edit or respond to this clarification request.

Regards,
LeaveFlow LMS Notifications"""
            asyncio.create_task(MockBackgroundJobService.queue_email(leave_request['id'], employee['email'], employee['name'], emp_subject, emp_body, 'LEAVE_CLARIFICATION'))

        elif event == 'CANCELLED':
            manager_subject = f"[LeaveFlow] Leave Request Cancelled: {employee['name']}"
            manager_body = f"""Dear {manager_name},

This is to notify you that {employee['name']} has cancelled/recalled their leave request for {leave_request.get('leaveTypeName', 'Unknown')} ({leave_request.get('startDate', 'Unknown')} to {leave_request.get('endDate', 'Unknown')}).

No further action is required for this request.

Regards,
LeaveFlow LMS Engine"""
            asyncio.create_task(MockBackgroundJobService.queue_email(leave_request['id'], manager_email, manager_name, manager_subject, manager_body, 'LEAVE_CANCELLED'))

# Auth State
current_session_user = None
if db_instance.get_employees():
    current_session_user = db_instance.get_employees()[0]

# Models
class LoginReq(BaseModel):
    email: str
    password: Optional[str] = None

class CreateLeaveTypeReq(BaseModel):
    name: str
    description: str
    defaultQuota: int
    requiresDocuments: bool
    paid: bool
    color: Optional[str] = None

class ActionLeaveReq(BaseModel):
    status: str
    comments: Optional[str] = None

class ChatReq(BaseModel):
    message: str
    history: Optional[List[Dict[Any, Any]]] = None
    systemPrompt: Optional[str] = None

# Routes
@app.post("/api/auth/login")
def login(req: LoginReq):
    global current_session_user
    if not req.email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    employee = next((e for e in db_instance.get_employees() if e['email'].lower() == req.email.lower()), None)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee record not found.")

    if employee['role'] == "HR":
        if not req.password:
            raise HTTPException(status_code=401, detail="Authentication required. Password is required for HR Portal.")
        if req.password != 'hr123':
            raise HTTPException(status_code=401, detail="Invalid credentials. Please enter the correct password for HR Admin.")
    elif employee['role'] == "SUPER_ADMIN":
        if not req.password:
            raise HTTPException(status_code=401, detail="Authentication required. Password is required for Administration.")
        if req.password != 'admin123':
            raise HTTPException(status_code=401, detail="Invalid credentials. Please enter the correct password for Super Admin.")

    current_session_user = employee
    db_instance.add_audit_log({
        "userId": employee['id'],
        "userName": employee['name'],
        "userEmail": employee['email'],
        "action": 'AUTH_LOGIN',
        "details": f"User logged in successfully with role {employee['role']}"
    })
    return {"user": employee}

@app.get("/api/auth/me")
def get_me():
    return {"user": current_session_user}

@app.post("/api/auth/logout")
def logout():
    global current_session_user
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'AUTH_LOGOUT',
            "details": 'User logged out'
        })
    current_session_user = None
    return {"success": True}

@app.get("/api/leave-types")
def get_leave_types():
    return db_instance.get_leave_types()

@app.post("/api/leave-types")
def create_leave_type(req: CreateLeaveTypeReq):
    leave_types = db_instance.get_leave_types()
    import re
    new_id = re.sub(r'[^a-z0-9]', '_', req.name.lower())
    new_type = {
        "id": new_id,
        "name": req.name,
        "description": req.description,
        "defaultQuota": int(req.defaultQuota),
        "requiresDocuments": bool(req.requiresDocuments),
        "paid": bool(req.paid),
        "color": req.color or 'bg-slate-100 text-slate-800 border-slate-200'
    }
    leave_types.append(new_type)
    db_instance.update_leave_types(leave_types)

    balances = db_instance.get_leave_balances()
    for emp in db_instance.get_employees():
        balances.append({
            "employeeId": emp['id'],
            "leaveTypeId": new_type['id'],
            "leaveTypeName": new_type['name'],
            "quota": new_type['defaultQuota'],
            "used": 0,
            "pending": 0,
            "remaining": new_type['defaultQuota']
        })
    db_instance.update_leave_balances(balances)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'CREATE_LEAVE_TYPE',
            "details": f"Created new leave type: {req.name}"
        })
    return new_type

@app.get("/api/leave-balances")
def get_leave_balances(employeeId: Optional[str] = None):
    balances = db_instance.get_leave_balances()
    if employeeId:
        return [b for b in balances if b['employeeId'] == employeeId]
    return balances

@app.get("/api/leave-requests")
def get_leave_requests(employeeId: Optional[str] = None):
    requests = db_instance.get_leave_requests()
    if employeeId:
        return [r for r in requests if r['employeeId'] == employeeId]
    return requests

@app.post("/api/leave-requests")
async def create_leave_request(req: Request):
    data = await req.json()
    new_req = {
        **data,
        "id": f"req_{int(time.time()*1000)}_{uuid.uuid4().hex[:4]}",
        "status": "PENDING",
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "history": [{
            "status": 'PENDING',
            "updatedBy": data.get('employeeId'),
            "updatedByName": data.get('employeeName'),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "comments": 'Request submitted.'
        }]
    }
    requests_list = db_instance.get_leave_requests()
    requests_list.append(new_req)
    db_instance.update_leave_requests(requests_list)

    balances = db_instance.get_leave_balances()
    balance = next((b for b in balances if b['employeeId'] == data.get('employeeId') and b['leaveTypeId'] == data.get('leaveTypeId')), None)
    if balance:
        balance['pending'] += int(data.get('duration', 0))
        balance['remaining'] = balance['quota'] - balance['used'] - balance['pending']
        db_instance.update_leave_balances(balances)

    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'APPLY_LEAVE',
            "details": f"Applied for {data.get('leaveTypeName')} from {data.get('startDate')} to {data.get('endDate')}"
        })

    MockBackgroundJobService.handle_leave_status_change('SUBMITTED', new_req, current_session_user)
    return new_req

# --- Bulk action endpoint (used by Manager bulk approve/reject bar) ---
# IMPORTANT: This must be defined BEFORE any /api/leave-requests/{requestId} routes
@app.post("/api/leave-requests/bulk-action")
async def bulk_action_leave_requests(req: Request):
    data = await req.json()
    ids = data.get('ids', [])
    status = data.get('status')
    comments = data.get('comments', '')
    
    if not ids or not status:
        raise HTTPException(status_code=400, detail="ids and status are required.")
    
    requests = db_instance.get_leave_requests()
    results = []
    
    for rid in ids:
        req_obj = next((r for r in requests if r['id'] == rid), None)
        if not req_obj:
            continue
        
        old_status = req_obj['status']
        req_obj['status'] = status
        if current_session_user:
            if current_session_user['role'] == 'MANAGER':
                req_obj['managerComments'] = comments
            elif current_session_user['role'] in ['HR', 'SUPER_ADMIN']:
                req_obj['hrComments'] = comments

        req_obj.setdefault('history', []).insert(0, {
            "status": status,
            "updatedBy": current_session_user['id'] if current_session_user else 'system',
            "updatedByName": current_session_user['name'] if current_session_user else 'System',
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "comments": comments or 'Bulk action applied.'
        })

        if old_status == 'PENDING' and status in ['APPROVED', 'REJECTED', 'CANCELLED']:
            balances = db_instance.get_leave_balances()
            balance = next((b for b in balances if b['employeeId'] == req_obj['employeeId'] and b['leaveTypeId'] == req_obj['leaveTypeId']), None)
            if balance:
                balance['pending'] -= req_obj.get('duration', 0)
                if status == 'APPROVED':
                    balance['used'] += req_obj.get('duration', 0)
                balance['remaining'] = balance['quota'] - balance['used'] - balance['pending']
                db_instance.update_leave_balances(balances)

        if status in ['APPROVED', 'REJECTED', 'CLARIFICATION', 'CANCELLED']:
            MockBackgroundJobService.handle_leave_status_change(status, req_obj, current_session_user, comments)
        
        results.append(req_obj)
    
    db_instance.update_leave_requests(requests)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": f"BULK_{status}_LEAVE",
            "details": f"Bulk {status.lower()} {len(results)} leave request(s)"
        })
    
    return {"success": True, "processed": len(results)}

@app.patch("/api/leave-requests/{requestId}")
async def update_leave_request(requestId: str, payload: ActionLeaveReq):
    requests = db_instance.get_leave_requests()
    req_obj = next((r for r in requests if r['id'] == requestId), None)
    if not req_obj:
        raise HTTPException(status_code=404, detail="Leave request not found.")
        
    old_status = req_obj['status']
    req_obj['status'] = payload.status
    if current_session_user:
        if current_session_user['role'] == 'MANAGER':
            req_obj['managerComments'] = payload.comments
        elif current_session_user['role'] == 'HR' or current_session_user['role'] == 'SUPER_ADMIN':
            req_obj['hrComments'] = payload.comments

    req_obj['history'].insert(0, {
        "status": payload.status,
        "updatedBy": current_session_user['id'] if current_session_user else 'system',
        "updatedByName": current_session_user['name'] if current_session_user else 'System',
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "comments": payload.comments or 'Status updated.'
    })
    db_instance.update_leave_requests(requests)

    if old_status == 'PENDING' and payload.status in ['APPROVED', 'REJECTED', 'CANCELLED']:
        balances = db_instance.get_leave_balances()
        balance = next((b for b in balances if b['employeeId'] == req_obj['employeeId'] and b['leaveTypeId'] == req_obj['leaveTypeId']), None)
        if balance:
            balance['pending'] -= req_obj['duration']
            if payload.status == 'APPROVED':
                balance['used'] += req_obj['duration']
            balance['remaining'] = balance['quota'] - balance['used'] - balance['pending']
            db_instance.update_leave_balances(balances)

    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": f"{payload.status}_LEAVE",
            "details": f"Updated leave request {requestId} to {payload.status}"
        })

    if payload.status in ['APPROVED', 'REJECTED', 'CLARIFICATION', 'CANCELLED']:
        MockBackgroundJobService.handle_leave_status_change(payload.status, req_obj, current_session_user, payload.comments)

    return req_obj

# --- Action endpoint (used by Manager/HR approve/reject/clarify buttons) ---
@app.post("/api/leave-requests/{requestId}/action")
async def action_leave_request(requestId: str, req: Request):
    data = await req.json()
    status = data.get('status')
    comments = data.get('comments', '')
    
    requests = db_instance.get_leave_requests()
    req_obj = next((r for r in requests if r['id'] == requestId), None)
    if not req_obj:
        raise HTTPException(status_code=404, detail="Leave request not found.")
    
    old_status = req_obj['status']
    req_obj['status'] = status
    if current_session_user:
        if current_session_user['role'] == 'MANAGER':
            req_obj['managerComments'] = comments
        elif current_session_user['role'] in ['HR', 'SUPER_ADMIN']:
            req_obj['hrComments'] = comments

    req_obj.setdefault('history', []).insert(0, {
        "status": status,
        "updatedBy": current_session_user['id'] if current_session_user else 'system',
        "updatedByName": current_session_user['name'] if current_session_user else 'System',
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "comments": comments or 'Status updated.'
    })
    db_instance.update_leave_requests(requests)

    if old_status == 'PENDING' and status in ['APPROVED', 'REJECTED', 'CANCELLED']:
        balances = db_instance.get_leave_balances()
        balance = next((b for b in balances if b['employeeId'] == req_obj['employeeId'] and b['leaveTypeId'] == req_obj['leaveTypeId']), None)
        if balance:
            balance['pending'] -= req_obj.get('duration', 0)
            if status == 'APPROVED':
                balance['used'] += req_obj.get('duration', 0)
            balance['remaining'] = balance['quota'] - balance['used'] - balance['pending']
            db_instance.update_leave_balances(balances)

    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": f"{status}_LEAVE",
            "details": f"Updated leave request {requestId} to {status}"
        })

    if status in ['APPROVED', 'REJECTED', 'CLARIFICATION', 'CANCELLED']:
        MockBackgroundJobService.handle_leave_status_change(status, req_obj, current_session_user, comments)

    return req_obj
    return {"success": True}

# --- Cancel endpoint (used by Employee cancel button) ---
@app.post("/api/leave-requests/{requestId}/cancel")
def cancel_leave_request(requestId: str):
    requests = db_instance.get_leave_requests()
    req_obj = next((r for r in requests if r['id'] == requestId), None)
    if not req_obj:
        raise HTTPException(status_code=404, detail="Leave request not found.")
    
    old_status = req_obj['status']
    req_obj['status'] = 'CANCELLED'
    req_obj.setdefault('history', []).insert(0, {
        "status": 'CANCELLED',
        "updatedBy": current_session_user['id'] if current_session_user else 'system',
        "updatedByName": current_session_user['name'] if current_session_user else 'System',
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "comments": 'Request cancelled by employee.'
    })
    
    if old_status == 'PENDING':
        balances = db_instance.get_leave_balances()
        balance = next((b for b in balances if b['employeeId'] == req_obj['employeeId'] and b['leaveTypeId'] == req_obj['leaveTypeId']), None)
        if balance:
            balance['pending'] -= req_obj.get('duration', 0)
            balance['remaining'] = balance['quota'] - balance['used'] - balance['pending']
            db_instance.update_leave_balances(balances)
    
    db_instance.update_leave_requests(requests)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'CANCEL_LEAVE',
            "details": f"Cancelled leave request {requestId}"
        })
    
    MockBackgroundJobService.handle_leave_status_change('CANCELLED', req_obj, current_session_user)
    return {"success": True}

@app.delete("/api/leave-requests/{requestId}")
def delete_leave_request(requestId: str):
    requests = db_instance.get_leave_requests()
    req_obj = next((r for r in requests if r['id'] == requestId), None)
    if not req_obj:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    if req_obj['status'] == 'PENDING':
        balances = db_instance.get_leave_balances()
        balance = next((b for b in balances if b['employeeId'] == req_obj['employeeId'] and b['leaveTypeId'] == req_obj['leaveTypeId']), None)
        if balance:
            balance['pending'] -= req_obj['duration']
            balance['remaining'] = balance['quota'] - balance['used'] - balance['pending']
            db_instance.update_leave_balances(balances)

    filtered = [r for r in requests if r['id'] != requestId]
    db_instance.update_leave_requests(filtered)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'DELETE_LEAVE',
            "details": f"Deleted leave request {requestId}"
        })
    return {"success": True}

@app.get("/api/employees")
def get_employees():
    return db_instance.get_employees()

@app.post("/api/employees")
async def create_employee(req: Request):
    data = await req.json()
    employees = db_instance.get_employees()
    new_emp = {
        **data,
        "id": f"emp_{int(time.time()*1000)}_{uuid.uuid4().hex[:4]}"
    }
    employees.append(new_emp)
    db_instance.update_employees(employees)
    
    leave_types = db_instance.get_leave_types()
    balances = db_instance.get_leave_balances()
    for lt in leave_types:
        balances.append({
            "employeeId": new_emp['id'],
            "leaveTypeId": lt['id'],
            "leaveTypeName": lt['name'],
            "quota": lt['defaultQuota'],
            "used": 0,
            "pending": 0,
            "remaining": lt['defaultQuota']
        })
    db_instance.update_leave_balances(balances)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'CREATE_EMPLOYEE',
            "details": f"Added new employee: {new_emp['name']}"
        })
    return new_emp

@app.patch("/api/employees/{employeeId}")
async def update_employee(employeeId: str, req: Request):
    data = await req.json()
    employees = db_instance.get_employees()
    emp = next((e for e in employees if e['id'] == employeeId), None)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    emp.update(data)
    db_instance.update_employees(employees)
    return emp

# --- Toggle employee status (used by HR activate/deactivate button) ---
@app.post("/api/employees/{employeeId}/status")
async def toggle_employee_status(employeeId: str, req: Request):
    data = await req.json()
    new_status = data.get('status', 'ACTIVE')
    employees = db_instance.get_employees()
    emp = next((e for e in employees if e['id'] == employeeId), None)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp['status'] = new_status
    db_instance.update_employees(employees)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'TOGGLE_EMPLOYEE_STATUS',
            "details": f"Set employee {emp['name']} status to {new_status}"
        })
    return emp

@app.get("/api/holidays")
def get_holidays():
    return db_instance.get_holidays()

# --- Create holiday (used by HR add holiday form) ---
@app.post("/api/holidays")
async def create_holiday(req: Request):
    data = await req.json()
    holidays = db_instance.get_holidays()
    new_holiday = {
        "id": f"hol_{int(time.time()*1000)}_{uuid.uuid4().hex[:4]}",
        "name": data.get('name', ''),
        "date": data.get('date', ''),
        "type": data.get('type', 'OPTIONAL')
    }
    holidays.append(new_holiday)
    db_instance.update_holidays(holidays)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'CREATE_HOLIDAY',
            "details": f"Added holiday: {new_holiday['name']} on {new_holiday['date']}"
        })
    return new_holiday

# --- Delete holiday (used by HR delete holiday button) ---
@app.delete("/api/holidays/{holidayId}")
def delete_holiday(holidayId: str):
    holidays = db_instance.get_holidays()
    holiday = next((h for h in holidays if h['id'] == holidayId), None)
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    filtered = [h for h in holidays if h['id'] != holidayId]
    db_instance.update_holidays(filtered)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'DELETE_HOLIDAY',
            "details": f"Deleted holiday: {holiday['name']}"
        })
    return {"success": True}

@app.get("/api/audit-logs")
def get_audit_logs():
    return db_instance.get_audit_logs()

@app.get("/api/policies")
def get_policies():
    return db_instance.get_policies()

@app.get("/api/settings")
def get_settings():
    return db_instance.get_settings()

@app.patch("/api/settings")
async def update_settings(req: Request):
    data = await req.json()
    settings = db_instance.get_settings()
    settings.update(data)
    db_instance.update_settings(settings)
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'UPDATE_SETTINGS',
            "details": 'Updated system settings'
        })
    return settings

@app.get("/api/simulated-emails")
def get_simulated_emails():
    return db_instance.get_simulated_emails()

@app.delete("/api/simulated-emails")
def clear_simulated_emails():
    db_instance.clear_simulated_emails()
    return {"success": True}

# --- POST route for clearing emails (frontend uses POST /api/simulated-emails/clear) ---
@app.post("/api/simulated-emails/clear")
def clear_simulated_emails_post():
    db_instance.clear_simulated_emails()
    return {"success": True}

@app.get("/api/candidates")
def get_candidates():
    return db_instance.get_candidates()

# --- Update candidate (used by CandidateProfile save) ---
@app.put("/api/candidates/{candidateId}")
async def update_candidate(candidateId: str, req: Request):
    data = await req.json()
    candidates = db_instance.get_candidates()
    cand = next((c for c in candidates if c['id'] == candidateId), None)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    cand.update(data)
    db_instance.update_candidates(candidates)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'UPDATE_CANDIDATE',
            "details": f"Updated candidate: {cand.get('name', candidateId)}"
        })
    return cand

# --- Create candidate (used by RegisterCandidateModal) ---
@app.post("/api/candidates")
async def create_candidate(req: Request):
    data = await req.json()
    candidates = db_instance.get_candidates()
    new_cand = {
        **data,
        "id": f"cand_{int(time.time()*1000)}_{uuid.uuid4().hex[:4]}",
        "registeredAt": datetime.utcnow().isoformat() + "Z"
    }
    candidates.append(new_cand)
    db_instance.update_candidates(candidates)
    
    if current_session_user:
        db_instance.add_audit_log({
            "userId": current_session_user['id'],
            "userName": current_session_user['name'],
            "userEmail": current_session_user['email'],
            "action": 'REGISTER_CANDIDATE',
            "details": f"Registered new candidate: {new_cand.get('name', '')}"
        })
    return new_cand

@app.post("/api/ai/chat")
async def ai_chat(req: ChatReq):
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            contents = []
            
            if req.history:
                for msg in req.history:
                    contents.append({
                        "role": "user" if msg.get('sender') == 'user' else "model",
                        "parts": [{"text": msg.get('text', '')}]
                    })
                    
            contents.append({
                "role": "user",
                "parts": [{"text": req.message}]
            })
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=contents,
                config=genai.types.GenerateContentConfig(
                    system_instruction=req.systemPrompt,
                    temperature=0.3,
                ),
            )
            
            answer_text = response.text or "I apologize, but I couldn't formulate a response."
            
            parsed_form = None
            import re
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', answer_text)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(1).strip())
                    if parsed and parsed.get('action') == 'FILL_FORM':
                        parsed_form = parsed
                except Exception as e:
                    print('Failed to parse model auto-fill JSON:', e)
                    
            return {"text": answer_text, "parsedForm": parsed_form}
            
        except Exception as e:
            print("Gemini API Error:", e)
            # fallback below
    
    # Fallback response
    lower = req.message.lower()
    parsed_form = None
    if 'apply' in lower or 'take' in lower or 'leave' in lower:
        reply = """Certainly! I've extracted your request to apply for leave. I have auto-filled the Leave Request Form for you below with relative dates resolving from Saturday, July 4, 2026:
```json
{
  "action": "FILL_FORM",
  "leaveTypeId": "casual",
  "startDate": "2026-07-06",
  "endDate": "2026-07-06",
  "reason": "Personal urgent matter",
  "halfDay": false,
  "duration": 1
}
```
Please review and submit the form in the dashboard!"""
        parsed_form = {
            "leaveTypeId": 'casual',
            "startDate": '2026-07-06',
            "endDate": '2026-07-06',
            "reason": 'Personal urgent matter',
            "halfDay": False,
            "duration": 1,
        }
    elif 'balance' in lower or 'quota' in lower or 'much' in lower:
        reply = """Here are your remaining balances:
- Casual Leave: 5 days
- Sick Leave: 9 days
- Annual / Earned Leave: 23 days
- Compensatory Off: 3 days
- Work From Home: 96 days remaining."""
    else:
        reply = "Hello! I'm your AI HR assistant. I can help you check your leave balance, explain policies, or draft a leave application form for you. What type of leave are you considering?"

    return {"text": reply, "parsedForm": parsed_form}

# Serve static frontend files in production
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow API routes to pass through (though they should be matched first by FastAPI)
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        
        # Fallback to index.html for React Router
        return FileResponse("dist/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
