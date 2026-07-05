import { LeaveRequest } from '../types';

/**
 * Escapes characters for CSV format.
 */
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Downloads leave requests as a CSV file.
 */
export function exportToCSV(requests: LeaveRequest[], filename = 'leave_requests_report.csv') {
  const headers = [
    'Request ID',
    'Employee Name',
    'Department',
    'Leave Category',
    'Start Date',
    'End Date',
    'Duration (Days)',
    'Status',
    'Reason/Description',
    'Submitted At',
    'Approver Comments'
  ];

  const rows = requests.map(req => [
    req.id,
    req.employeeName,
    req.departmentName,
    req.leaveTypeName,
    req.startDate,
    req.endDate,
    req.duration,
    req.status,
    req.reason || '',
    req.createdAt,
    req.comments || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats and triggers the browser print dialog to print/save as PDF.
 */
export function printPDFReport(requests: LeaveRequest[], title = 'Leave Requests Report') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate and print PDF reports.');
    return;
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tableRowsHtml = requests.map(req => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px; font-weight: bold; font-size: 11px;">${req.employeeName}</td>
      <td style="padding: 10px; font-size: 11px;">${req.departmentName}</td>
      <td style="padding: 10px; font-size: 11px;">${req.leaveTypeName}</td>
      <td style="padding: 10px; font-size: 11px; white-space: nowrap;">${req.startDate} to ${req.endDate}</td>
      <td style="padding: 10px; font-size: 11px; text-align: center;">${req.duration}d</td>
      <td style="padding: 10px; font-size: 11px; text-align: center;">
        <span style="
          padding: 3px 8px;
          border-radius: 9999px;
          font-weight: bold;
          font-size: 9px;
          ${
            req.status === 'APPROVED'
              ? 'background-color: #ecfdf5; color: #065f46; border: 1px solid #d1fae5;'
              : req.status === 'REJECTED'
              ? 'background-color: #fef2f2; color: #991b1b; border: 1px solid #fee2e2;'
              : 'background-color: #fffbeb; color: #92400e; border: 1px solid #fef3c7;'
          }
        ">${req.status}</span>
      </td>
      <td style="padding: 10px; font-size: 11px; color: #64748b;">${req.reason || '-'}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1e293b;
          margin: 40px;
          line-height: 1.5;
        }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between; align-items: center; border-b: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.025em; font-weight: 700;">${title}</h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Generated on ${today}</p>
        </div>
        <div class="no-print">
          <button onclick="window.print()" style="
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          ">Print / Save as PDF</button>
        </div>
      </div>

      <div style="margin-bottom: 20px; font-size: 12px; color: #475569;">
        <strong>Total Records:</strong> ${requests.length} leaves
      </div>

      <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">
            <th style="padding: 12px 10px;">Employee</th>
            <th style="padding: 12px 10px;">Department</th>
            <th style="padding: 12px 10px;">Category</th>
            <th style="padding: 12px 10px;">Dates</th>
            <th style="padding: 12px 10px; text-align: center;">Duration</th>
            <th style="padding: 12px 10px; text-align: center;">Status</th>
            <th style="padding: 12px 10px;">Reason</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml.length > 0 ? tableRowsHtml : `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8; font-size: 13px;">No leave records found matching current filters.</td></tr>`}
        </tbody>
      </table>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; text-align: center;">
        End of Leave Management Report. Confidential - Internal Staff Directory Use Only.
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  // We trigger printing automatically as well for maximum user convenience
  setTimeout(() => {
    printWindow.print();
  }, 300);
}
