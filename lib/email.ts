import nodemailer from 'nodemailer'

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT ?? '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

const FROM = () => process.env.SMTP_FROM ?? `"RiverWest Properties" <${process.env.SMTP_USER}>`

// ── Header / footer partials ───────────────────────────────────────────────

function emailHeader(subtitle: string) {
  return `
    <div style="background:#1E3A5F;padding:16px 24px;border-radius:4px 4px 0 0;">
      <h2 style="color:#fff;margin:0;font-size:18px;font-family:Arial,sans-serif;">RiverWest Properties</h2>
      <p style="color:#b3c9e1;margin:4px 0 0;font-size:13px;font-family:Arial,sans-serif;">${subtitle}</p>
    </div>`
}

function emailFooter() {
  return `<p style="color:#6b7280;font-size:12px;margin-top:24px;font-family:Arial,sans-serif;">
    RiverWest Properties Travel Reporting System
  </p>`
}

// ── Send approved report to accounting ────────────────────────────────────

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
  const accountingEmail = process.env.ACCOUNTING_EMAIL ?? 'controller@riverwestpartners.com'

  await transport.sendMail({
    from: FROM(),
    to: accountingEmail,
    cc: opts.managerEmail,
    subject: `Approved Expense Report ${opts.reportNumber} — ${opts.employeeName} — ${opts.period}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;">
        ${emailHeader('Mileage Reimbursement Report')}
        <div style="border:1px solid #d9e4f0;border-top:none;padding:24px;border-radius:0 0 4px 4px;">
          <p>Please find the approved expense report attached.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;width:140px;">Employee</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${opts.employeeName}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;">Report #</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${opts.reportNumber}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;">Period</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${opts.period}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;">Approved By</td>
              <td style="padding:8px 12px;">${opts.managerName}</td>
            </tr>
          </table>
          ${emailFooter()}
        </div>
      </div>`,
    attachments: [
      {
        filename: opts.fileName,
        content: opts.excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  })
}

// ── Notify approvers of a new submission ──────────────────────────────────

interface NotifyApproversOptions {
  employeeName: string
  reportNumber: string
  period: string
  approvers: { email: string; name: string }[]
  reportUrl: string
  resubmitMessage?: string | null
  isResubmission?: boolean
}

export async function notifyApproversOfSubmission(opts: NotifyApproversOptions) {
  const subject = opts.isResubmission
    ? `Resubmitted: Expense Report ${opts.reportNumber} from ${opts.employeeName}`
    : `Action Required: Expense Report ${opts.reportNumber} submitted by ${opts.employeeName}`

  const resubmitBlock = opts.resubmitMessage
    ? `<div style="background:#f0f4f9;border-left:3px solid #1E3A5F;padding:12px 16px;margin:16px 0;font-size:14px;">
        <p style="margin:0 0 4px;font-weight:bold;color:#1E3A5F;">Message from ${opts.employeeName}:</p>
        <p style="margin:0;color:#374151;">${opts.resubmitMessage}</p>
       </div>`
    : ''

  await Promise.all(
    opts.approvers.map((approver) =>
      transport.sendMail({
        from: FROM(),
        to: approver.email,
        subject,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;">
            ${emailHeader('Expense Report — Approval Required')}
            <div style="border:1px solid #d9e4f0;border-top:none;padding:24px;border-radius:0 0 4px 4px;">
              <p>Hi ${approver.name},</p>
              <p><strong>${opts.employeeName}</strong> has ${opts.isResubmission ? 'resubmitted' : 'submitted'} an expense report for your review.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr>
                  <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;width:120px;">Report #</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${opts.reportNumber}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;">Period</td>
                  <td style="padding:8px 12px;">${opts.period}</td>
                </tr>
              </table>
              ${resubmitBlock}
              <a href="${opts.reportUrl}"
                 style="display:inline-block;background:#1E3A5F;color:#fff;padding:10px 20px;
                        text-decoration:none;border-radius:4px;margin-top:8px;">
                Review &amp; Approve
              </a>
              ${emailFooter()}
            </div>
          </div>`,
      })
    )
  )
}

// ── Notify employee of approval/revision decision ─────────────────────────

interface TripNote {
  date: string
  origin: string
  destination: string
  note: string
}

interface NotifyEmployeeOptions {
  employeeEmail: string
  employeeName: string
  reportNumber: string
  period: string
  approved: boolean
  rejectionReason?: string
  tripNotes?: TripNote[]
  reportUrl: string
}

export async function notifyEmployeeOfDecision(opts: NotifyEmployeeOptions) {
  const statusLabel = opts.approved ? 'Approved ✓' : 'Sent Back for Revision'
  const statusColor = opts.approved ? '#16a34a' : '#d97706'

  const tripNotesBlock =
    !opts.approved && opts.tripNotes && opts.tripNotes.length > 0
      ? `<div style="margin-top:16px;">
          <p style="font-weight:bold;font-size:13px;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">Per-trip notes</p>
          ${opts.tripNotes
            .map(
              (tn) => `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px;">
              <p style="margin:0 0 4px;font-weight:bold;color:#92400e;">${tn.date} · ${tn.origin} → ${tn.destination}</p>
              <p style="margin:0;color:#78350f;">${tn.note}</p>
            </div>`
            )
            .join('')}
         </div>`
      : ''

  await transport.sendMail({
    from: FROM(),
    to: opts.employeeEmail,
    subject: `Expense Report ${opts.reportNumber} — ${opts.approved ? 'Approved' : 'Sent Back for Revision'}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;">
        ${emailHeader('Expense Report Status Update')}
        <div style="border:1px solid #d9e4f0;border-top:none;padding:24px;border-radius:0 0 4px 4px;">
          <p>Hi ${opts.employeeName},</p>
          <p>Your expense report has been reviewed.</p>
          <p style="font-size:16px;">Status: <strong style="color:${statusColor};">${statusLabel}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;width:120px;">Report #</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${opts.reportNumber}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;">Period</td>
              <td style="padding:8px 12px;">${opts.period}</td>
            </tr>
            ${
              opts.rejectionReason
                ? `<tr>
                <td style="padding:8px 12px;background:#fef3c7;font-weight:bold;color:#92400e;">Reason</td>
                <td style="padding:8px 12px;color:#92400e;">${opts.rejectionReason}</td>
              </tr>`
                : ''
            }
          </table>
          ${tripNotesBlock}
          ${
            !opts.approved
              ? `<p style="margin-top:16px;">Please review the feedback above, make corrections, and resubmit your report.</p>`
              : ''
          }
          <a href="${opts.reportUrl}"
             style="display:inline-block;background:#1E3A5F;color:#fff;padding:10px 20px;
                    text-decoration:none;border-radius:4px;margin-top:8px;">
            View Report
          </a>
          ${emailFooter()}
        </div>
      </div>`,
  })
}

// ── Notify Application Owner of new sign-up ───────────────────────────────

interface NotifyAONewUserOptions {
  ownerEmail: string
  ownerName: string
  newUserName: string
  newUserEmail: string
  pendingUsersUrl: string
}

export async function notifyApplicationOwnerOfNewUser(opts: NotifyAONewUserOptions) {

  await transport.sendMail({
    from: FROM(),
    to: opts.ownerEmail,
    subject: `New User Sign-Up: ${opts.newUserName} (${opts.newUserEmail})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;">
        ${emailHeader('New User Awaiting Activation')}
        <div style="border:1px solid #d9e4f0;border-top:none;padding:24px;border-radius:0 0 4px 4px;">
          <p>Hi ${opts.ownerName},</p>
          <p>A new user has signed up and is awaiting account activation:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;width:100px;">Name</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${opts.newUserName}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f0f4f9;font-weight:bold;">Email</td>
              <td style="padding:8px 12px;">${opts.newUserEmail}</td>
            </tr>
          </table>
          <p>Assign them a role and approver(s), then activate their account.</p>
          <a href="${opts.pendingUsersUrl}"
             style="display:inline-block;background:#1E3A5F;color:#fff;padding:10px 20px;
                    text-decoration:none;border-radius:4px;margin-top:8px;">
            Manage Pending Users
          </a>
          ${emailFooter()}
        </div>
      </div>`,
  })
}

// ── Notify user their account has been activated ──────────────────────────

interface NotifyActivationOptions {
  userEmail: string
  userName: string
  appUrl: string
}

export async function notifyUserActivated(opts: NotifyActivationOptions) {

  await transport.sendMail({
    from: FROM(),
    to: opts.userEmail,
    subject: 'Your RiverWest Travel Reporting account is active',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;">
        ${emailHeader('Account Activated')}
        <div style="border:1px solid #d9e4f0;border-top:none;padding:24px;border-radius:0 0 4px 4px;">
          <p>Hi ${opts.userName},</p>
          <p>Your RiverWest Properties Travel Reporting account has been activated. You can now sign in and submit expense reports.</p>
          <a href="${opts.appUrl}/reports"
             style="display:inline-block;background:#1E3A5F;color:#fff;padding:10px 20px;
                    text-decoration:none;border-radius:4px;margin-top:8px;">
            Go to My Reports
          </a>
          ${emailFooter()}
        </div>
      </div>`,
  })
}
