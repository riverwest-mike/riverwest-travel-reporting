import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

interface SendReportEmailOptions {
  employeeName: string
  reportNumber: string
  period: string
  managerEmail: string
  managerName: string
  excelBuffer: Buffer
  fileName: string
}

export async function sendReportToAccounting(opts: SendReportEmailOptions) {
  const transport = createTransport()
  const accountingEmail = process.env.ACCOUNTING_EMAIL ?? 'controller@riverwestpartners.com'

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? `"RiverWest Properties" <${process.env.SMTP_USER}>`,
    to: accountingEmail,
    cc: opts.managerEmail,
    subject: `Approved Expense Report ${opts.reportNumber} — ${opts.employeeName} — ${opts.period}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: #1E3A5F; padding: 16px 24px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 18px;">RiverWest Properties</h2>
          <p style="color: #b3c9e1; margin: 4px 0 0; font-size: 13px;">Mileage Reimbursement Report</p>
        </div>
        <div style="border: 1px solid #d9e4f0; border-top: none; padding: 24px; border-radius: 0 0 4px 4px;">
          <p>Please find the approved expense report attached.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f0f4f9; font-weight: bold; width: 140px;">Employee</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${opts.employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f0f4f9; font-weight: bold;">Report #</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${opts.reportNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f0f4f9; font-weight: bold;">Period</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${opts.period}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f0f4f9; font-weight: bold;">Approved By</td>
              <td style="padding: 8px 12px;">${opts.managerName}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            This report was approved via the RiverWest Properties Travel Reporting system.
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: opts.fileName,
        content: opts.excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  })
}

interface NotifyManagerOptions {
  employeeName: string
  reportNumber: string
  period: string
  managerEmail: string
  managerName: string
  reportUrl: string
}

export async function notifyManagerOfSubmission(opts: NotifyManagerOptions) {
  const transport = createTransport()

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? `"RiverWest Properties" <${process.env.SMTP_USER}>`,
    to: opts.managerEmail,
    subject: `Action Required: Expense Report ${opts.reportNumber} submitted by ${opts.employeeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: #1E3A5F; padding: 16px 24px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 18px;">RiverWest Properties</h2>
          <p style="color: #b3c9e1; margin: 4px 0 0; font-size: 13px;">Expense Report — Approval Required</p>
        </div>
        <div style="border: 1px solid #d9e4f0; border-top: none; padding: 24px; border-radius: 0 0 4px 4px;">
          <p>Hi ${opts.managerName},</p>
          <p><strong>${opts.employeeName}</strong> has submitted an expense report for your review.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f0f4f9; font-weight: bold; width: 120px;">Report #</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${opts.reportNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f0f4f9; font-weight: bold;">Period</td>
              <td style="padding: 8px 12px;">${opts.period}</td>
            </tr>
          </table>
          <a href="${opts.reportUrl}"
             style="display: inline-block; background: #1E3A5F; color: white; padding: 10px 20px;
                    text-decoration: none; border-radius: 4px; margin-top: 8px;">
            Review &amp; Approve
          </a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            RiverWest Properties Travel Reporting System
          </p>
        </div>
      </div>
    `,
  })
}

interface NotifyEmployeeOptions {
  employeeEmail: string
  employeeName: string
  reportNumber: string
  period: string
  approved: boolean
  rejectionReason?: string
  reportUrl: string
}

export async function notifyEmployeeOfDecision(opts: NotifyEmployeeOptions) {
  const transport = createTransport()

  const statusLabel = opts.approved ? 'Approved ✓' : 'Rejected'
  const statusColor = opts.approved ? '#16a34a' : '#dc2626'

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? `"RiverWest Properties" <${process.env.SMTP_USER}>`,
    to: opts.employeeEmail,
    subject: `Expense Report ${opts.reportNumber} ${opts.approved ? 'Approved' : 'Rejected'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: #1E3A5F; padding: 16px 24px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 18px;">RiverWest Properties</h2>
          <p style="color: #b3c9e1; margin: 4px 0 0; font-size: 13px;">Expense Report Status Update</p>
        </div>
        <div style="border: 1px solid #d9e4f0; border-top: none; padding: 24px; border-radius: 0 0 4px 4px;">
          <p>Hi ${opts.employeeName},</p>
          <p>Your expense report has been reviewed.</p>
          <p style="font-size: 16px;">Status: <strong style="color: ${statusColor};">${statusLabel}</strong></p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f0f4f9; font-weight: bold; width: 120px;">Report #</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${opts.reportNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f0f4f9; font-weight: bold;">Period</td>
              <td style="padding: 8px 12px;">${opts.period}</td>
            </tr>
            ${opts.rejectionReason ? `
            <tr>
              <td style="padding: 8px 12px; background: #f0f4f9; font-weight: bold; color: #dc2626;">Reason</td>
              <td style="padding: 8px 12px; color: #dc2626;">${opts.rejectionReason}</td>
            </tr>` : ''}
          </table>
          ${!opts.approved ? `
          <p>Please review the feedback above and resubmit your report with the necessary corrections.</p>` : ''}
          <a href="${opts.reportUrl}"
             style="display: inline-block; background: #1E3A5F; color: white; padding: 10px 20px;
                    text-decoration: none; border-radius: 4px; margin-top: 8px;">
            View Report
          </a>
        </div>
      </div>
    `,
  })
}
