import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageBreak, Header, Footer, PageNumber,
  convertInchesToTwip,
} from 'docx'
import { writeFileSync } from 'fs'

// ── Colour palette ────────────────────────────────────────────────────────
const NAVY  = '1E3A5F'
const GOLD  = 'B8962E'
const LIGHT = 'EBF0F7'
const WHITE = 'FFFFFF'
const GRAY  = '6B7280'
const AMBER = '92400E'
const GREEN = '166534'

// ── Helpers ───────────────────────────────────────────────────────────────

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 160 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 36 })],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 28 })],
  })
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 24 })],
  })
}

function p(runs, opts = {}) {
  const children = typeof runs === 'string'
    ? [new TextRun({ text: runs, size: 22 })]
    : runs.map(r => new TextRun({ size: 22, ...r }))
  return new Paragraph({ spacing: { after: 120 }, ...opts, children })
}

function bold(text, color) {
  return new TextRun({ text, bold: true, size: 22, ...(color ? { color } : {}) })
}

function run(text, opts = {}) {
  return new TextRun({ text, size: 22, ...opts })
}

function bullet(text, level = 0) {
  const children = typeof text === 'string'
    ? [new TextRun({ text, size: 22 })]
    : text.map(r => new TextRun({ size: 22, ...r }))
  return new Paragraph({
    bullet: { level },
    spacing: { after: 80 },
    children,
  })
}

function numbered(text, level = 0) {
  const children = typeof text === 'string'
    ? [new TextRun({ text, size: 22 })]
    : text.map(r => new TextRun({ size: 22, ...r }))
  return new Paragraph({
    numbering: { reference: 'numbered-list', level },
    spacing: { after: 80 },
    children,
  })
}

function hr() {
  return new Paragraph({
    spacing: { after: 160 },
    border: { bottom: { color: NAVY, style: BorderStyle.SINGLE, size: 6 } },
    children: [],
  })
}

function br() {
  return new Paragraph({ children: [new PageBreak()] })
}

function spacer() {
  return new Paragraph({ spacing: { after: 160 }, children: [] })
}

function noteBox(label, text, color = NAVY, bg = LIGHT) {
  const cell = new TableCell({
    shading: { fill: bg, type: ShadingType.SOLID },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    borders: {
      top:    { style: BorderStyle.SINGLE, color, size: 12 },
      bottom: { style: BorderStyle.NONE },
      left:   { style: BorderStyle.NONE },
      right:  { style: BorderStyle.NONE },
    },
    children: [
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: label, bold: true, color, size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text, size: 20 })],
      }),
    ],
  })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [cell] })],
    borders: {
      top:    { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left:   { style: BorderStyle.NONE },
      right:  { style: BorderStyle.NONE },
      insideH: { style: BorderStyle.NONE },
      insideV: { style: BorderStyle.NONE },
    },
  })
}

// Generic table: headers[] + rows[][]
function makeTable(headers, rows, colWidths) {
  const totalCols = headers.length
  const defaultWidth = Math.floor(100 / totalCols)

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        shading: { fill: NAVY, type: ShadingType.SOLID },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: colWidths ? colWidths[i] : defaultWidth, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20 })],
          }),
        ],
      })
    ),
  })

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) => {
        const isArray = Array.isArray(cell)
        const bg = ri % 2 === 0 ? WHITE : LIGHT
        return new TableCell({
          shading: { fill: bg, type: ShadingType.SOLID },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          width: { size: colWidths ? colWidths[ci] : defaultWidth, type: WidthType.PERCENTAGE },
          children: isArray
            ? cell.map(line =>
                new Paragraph({
                  spacing: { after: 60 },
                  children: [new TextRun({ text: line, size: 20 })],
                })
              )
            : [new Paragraph({ children: [new TextRun({ text: String(cell), size: 20 })] })],
        })
      }),
    })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  })
}

// ── Document sections ─────────────────────────────────────────────────────

function coverPage() {
  return [
    new Paragraph({ spacing: { before: 2000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'RIVERWEST PROPERTIES',
          bold: true, color: NAVY, size: 52, allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'Travel & Mileage Reporting System', color: GOLD, size: 36 })],
    }),
    hr(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: 'Onboarding & Control Document', bold: true, color: NAVY, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'Version 2.0', color: GRAY, size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({
        text: `Effective: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        color: GRAY, size: 22,
      })],
    }),
    makeTable(
      ['Role', 'Name', 'Email'],
      [
        ['Application Owner', 'Michael Pisano', 'mpisano@riverwestpartners.com'],
      ],
      [30, 35, 35]
    ),
    spacer(),
    br(),
  ]
}

function section1() {
  return [
    h1('1. System Overview'),
    hr(),
    p('The RiverWest Travel & Mileage Reporting System is a web application that allows RiverWest Properties employees to record business trips, calculate mileage reimbursements, and submit expense reports through a structured multi-step approval workflow.'),
    p('Once an approver approves a report, an Excel summary is automatically emailed to the accounting team — eliminating manual spreadsheet work and providing a complete, auditable record of all reimbursements.'),
    spacer(),
    h2('1.1  Key Capabilities'),
    bullet('Employees log trips by selecting origin and destination properties or addresses'),
    bullet('Distance is calculated automatically via the Google Maps Distance Matrix API'),
    bullet('Reports are submitted to one or more assigned approvers for review'),
    bullet('Approvers can annotate individual trips with notes and approve or return for revision'),
    bullet('Approved reports are exported as a formatted Excel workbook and emailed to accounting'),
    bullet('Mileage reimbursement rates are managed in the application by the Application Owner'),
    bullet('New user accounts require activation by the Application Owner before access is granted'),
    bullet('Soft-deleted reports are retained in a log accessible to the Application Owner'),
    spacer(),
    h2('1.2  Technology Stack'),
    makeTable(
      ['Component', 'Technology'],
      [
        ['Framework',        'Next.js 14 (App Router, React Server Components)'],
        ['Database',         'PostgreSQL via Prisma ORM (Prisma Postgres / Supabase)'],
        ['Authentication',   'Clerk (email/password, SSO-ready)'],
        ['Email',            'Nodemailer with Gmail SMTP'],
        ['Distance API',     'Google Maps Distance Matrix API'],
        ['Excel Export',     'ExcelJS'],
        ['UI Components',    'Tailwind CSS + Radix UI (shadcn/ui)'],
        ['Hosting',          'Vercel (auto-deploy from main branch)'],
      ],
      [30, 70]
    ),
    spacer(),
    h2('1.3  Access URL'),
    p('The application is hosted at the URL configured in the NEXT_PUBLIC_APP_URL environment variable. Contact the Application Owner for the current production URL.'),
    br(),
  ]
}

function section2() {
  return [
    h1('2. User Roles & Permissions'),
    hr(),
    p('The system has four roles arranged in a hierarchy. Each higher role inherits all permissions of the roles below it.'),
    spacer(),
    makeTable(
      ['Role', 'Description', 'Key Permissions'],
      [
        [
          'Employee',
          'Field staff and office employees who incur travel expenses.',
          ['Create and edit expense reports (own only)', 'Add, edit, and delete trips on draft/revision reports', 'Submit reports for approval', 'Resubmit reports after revision', 'View own report history'],
        ],
        [
          'Manager',
          'Approvers assigned to one or more employees. May also submit their own reports.',
          ['All Employee permissions', 'View the Approvals queue for assigned employees', 'Approve or return reports for revision', 'Add per-trip notes when returning reports', 'View the Sent to Accounting log (own team only)'],
        ],
        [
          'Admin',
          'Administrative staff with full organisational visibility.',
          ['All Manager permissions', 'View and manage all employees and their approver assignments', 'View and manage all properties', 'View all reports organisation-wide', 'Run bulk Excel exports', 'Access Admin Dashboard & Analytics', 'Soft-delete reports'],
        ],
        [
          'Application Owner',
          'The system administrator. Michael Pisano (mpisano@riverwestpartners.com) holds this role.',
          ['All Admin permissions', 'Set and manage mileage reimbursement rates', 'Activate and configure pending user accounts', 'Assign roles (including the Application Owner role)', 'View and permanently delete soft-deleted reports', 'Access all AO-only system settings'],
        ],
      ],
      [18, 32, 50]
    ),
    spacer(),
    noteBox('Multi-Approver Note', 'An employee may have more than one approver assigned. All assigned approvers are notified when a report is submitted. Any single approver may approve or return the report — the first action taken is final.'),
    br(),
  ]
}

function section3() {
  return [
    h1('3. Account Setup & Onboarding'),
    hr(),
    h2('3.1  New Employee Sign-Up'),
    numbered('Go to the application URL and click Sign Up.'),
    numbered('Enter your work email address (e.g. jsmith@riverwestproperties.com). This must exactly match the email on file with your manager.'),
    numbered('Create a password and complete any Clerk verification steps.'),
    numbered([bold('Your account is now PENDING.'), run(' You will see a "Your account is pending activation" message and cannot access the application yet.')]),
    numbered('The Application Owner receives an email notification about your sign-up and will activate your account.'),
    spacer(),
    noteBox('Important', 'You must use your exact work email address. If your Clerk account uses a personal email, the system will not be able to link you to your employee record and your account may not be found.', AMBER, 'FFFBEB'),
    spacer(),
    h2('3.2  Account Activation (Application Owner)'),
    p('When a new user signs up, the Application Owner must activate their account before they can log in:'),
    numbered('Log in as the Application Owner and go to Application Owner → Pending Users.'),
    numbered('Locate the new user in the list.'),
    numbered('Click Activate, then select the appropriate Role and assign one or more Approver(s).'),
    numbered('Click Confirm. The user will receive an activation email with a link to the application.'),
    spacer(),
    h2('3.3  Profile & Settings'),
    p('Once activated, employees should set their Primary Office address in Profile & Settings (accessible from the left sidebar):'),
    bullet('The Primary Office address is used as the default origin when adding a new trip.'),
    bullet('It defaults to the Columbus corporate office (4215 Worth Ave, Columbus, OH 43219).'),
    bullet('Employees who work from a different location should update this to their primary work site.'),
    br(),
  ]
}

function section4() {
  return [
    h1('4. Employee Guide'),
    hr(),
    h2('4.1  Creating an Expense Report'),
    numbered('In the left sidebar, click My Reports.'),
    numbered('Click New Report in the sidebar or the button on the reports page.'),
    numbered('Select the Report Period (month and year). Each period can have only one active report.'),
    numbered('Click Create Report. The report opens in Draft status.'),
    spacer(),
    h2('4.2  Adding Trips'),
    p('From a Draft or Needs Revision report, click Add Trip:'),
    numbered('Select the trip Date.'),
    numbered('Choose an Origin — either Primary Office, a property from the dropdown, or a Custom Address.'),
    numbered('Choose a Destination in the same way.'),
    numbered('Optionally check Round Trip to double the mileage automatically.'),
    numbered('Enter a Business Purpose (required for submission).'),
    numbered('Click Add Trip. Distance is calculated automatically via Google Maps.'),
    spacer(),
    noteBox('Duplicate Trip Warning', 'If the same origin/destination/date combination appears in another report, the system shows a warning. You can either cancel or click "Add Anyway" if the trip is legitimate. Exact duplicates within the same report are blocked outright.', AMBER, 'FFFBEB'),
    spacer(),
    h2('4.3  Trip Location Types'),
    makeTable(
      ['Type', 'Description'],
      [
        ['Primary Office',  'Your personal office address from Profile & Settings. Defaults to the Columbus corporate office.'],
        ['Property',        'A RiverWest property selected from the managed property list. Start typing to search.'],
        ['Custom Address',  'Any free-text address. Used for destinations not in the property list (e.g., government offices, vendors).'],
      ],
      [25, 75]
    ),
    spacer(),
    h2('4.4  Editing and Deleting Trips'),
    bullet('Trips may be edited or deleted while the report is in Draft or Needs Revision status.'),
    bullet('Once submitted, trips are locked and cannot be changed without the report being returned.'),
    spacer(),
    h2('4.5  Submitting a Report'),
    numbered('Ensure all trips have a Business Purpose entered.'),
    numbered('Click Submit for Approval.'),
    numbered('The report status changes to Submitted and all assigned approvers receive an email notification.'),
    spacer(),
    h2('4.6  Revising a Returned Report'),
    p('If an approver returns a report for revision (status: Needs Revision):'),
    numbered('Open the report — a banner shows the approver\'s overall reason and any per-trip notes.'),
    numbered('Review the notes and make the necessary corrections (add, edit, or delete trips).'),
    numbered('Optionally enter a message to your approver explaining what you changed.'),
    numbered('Click Resubmit. All approvers are notified. The same report number is preserved — no new report is created.'),
    br(),
  ]
}

function section5() {
  return [
    h1('5. Approver (Manager) Guide'),
    hr(),
    h2('5.1  Approvals Queue'),
    p('Go to Approvals in the left sidebar to see all reports awaiting your review. The queue shows:'),
    bullet('Employee name and report period'),
    bullet('Report number and submission date'),
    bullet('How many days the report has been waiting (e.g., "3 days ago")'),
    bullet('A badge on the sidebar link showing the total number of pending reports'),
    spacer(),
    h2('5.2  Reviewing a Report'),
    numbered('Click a report row to open the detail view.'),
    numbered('Review each trip: date, origin, destination, distance, round-trip flag, and business purpose.'),
    numbered('Optionally click Add Note on any trip to attach a comment — notes are included in the revision email to the employee.'),
    spacer(),
    h2('5.3  Approving a Report'),
    numbered('Click Approve Report.'),
    numbered('A confirmation dialog appears showing the total miles and total reimbursement amount for final verification.'),
    numbered('Click Confirm Approval.'),
    numbered(['The report status changes to ', bold('Approved'), run(' and is locked.'), run(' An Excel workbook is automatically generated and emailed to the accounting team.')]),
    spacer(),
    noteBox('Note', 'Approval is irreversible. Once approved, the report cannot be returned for revision. Verify mileage totals in the confirmation dialog before confirming.', NAVY, LIGHT),
    spacer(),
    h2('5.4  Sending Back for Revision'),
    numbered('Click Send Back for Revision.'),
    numbered('Enter an overall reason for the return (required).'),
    numbered('Optionally add notes on specific trips using the Add Note button before clicking Send Back.'),
    numbered([run('Click '), bold('Send Back'), run('. The report status changes to '), bold('Needs Revision'), run(' and the employee receives an email containing the overall reason and all per-trip notes, with the trip\'s date, origin, and destination labelled for clarity.')]),
    spacer(),
    h2('5.5  Team History'),
    p('Below the pending queue, the Approvals page shows a Team History section listing the last 50 reports across all statuses (Approved, Needs Revision) for employees you oversee. This provides a complete audit trail of decisions made.'),
    spacer(),
    h2('5.6  Accounting Log'),
    p('Go to Admin → Sent to Accounting (or Approvals → Sent to Accounting for manager-only access) to view a log of all reports sent to the accounting team, including the approver name, approval date, and report totals. Managers see only their team\'s reports.'),
    br(),
  ]
}

function section6() {
  return [
    h1('6. Admin Guide'),
    hr(),
    h2('6.1  Employee Management'),
    p('Go to Admin → Employees to manage the employee list.'),
    h3('Adding a New Employee'),
    numbered('Click Add Employee.'),
    numbered('Enter the employee\'s name and work email address.'),
    numbered('Select a role.'),
    numbered('Assign one or more approvers by checking the checkbox next to each approver\'s name.'),
    numbered('Click Save.'),
    spacer(),
    noteBox('Email Matching', 'The email entered here must exactly match the email the employee uses when signing up via Clerk. If they do not match, the account will not link correctly.', AMBER, 'FFFBEB'),
    spacer(),
    h3('Editing an Employee'),
    bullet('Click the pencil icon on any employee row to open the edit drawer.'),
    bullet('You can change the name, email, role, home address, and approver assignments.'),
    bullet('Admins cannot assign or remove the Application Owner role — only the Application Owner can do that.'),
    bullet('Nobody can change their own role.'),
    spacer(),
    h3('Deactivating an Employee'),
    bullet('Click the trash icon on an employee row to soft-deactivate their account.'),
    bullet('Deactivated employees cannot log in but their historical report data is retained.'),
    bullet('Reactivate by editing the employee and toggling Active status.'),
    spacer(),
    h3('Viewing an Employee\'s Reports'),
    bullet('Click View Reports on any employee row to jump directly to their report history in the All Reports view.'),
    spacer(),
    h2('6.2  Property Management'),
    p('Go to Admin → Properties to manage the list of properties available as trip origins/destinations.'),
    bullet('Add a property with its name, street address, city, and state.'),
    bullet('Deactivated properties no longer appear in the trip origin/destination dropdowns but are retained in historical trip records.'),
    spacer(),
    h2('6.3  All Reports'),
    p('Go to Admin → All Reports to view every report in the system.'),
    bullet('Filter by status, employee, approver, year, and month.'),
    bullet('Click any report to open the full detail view.'),
    bullet('Admins may soft-delete a report (it moves to the Deleted Reports log accessible to the Application Owner).'),
    spacer(),
    h2('6.4  Admin Dashboard & Analytics'),
    p('Go to Admin for an at-a-glance dashboard showing:'),
    bullet('Total reports by status'),
    bullet('Total miles and reimbursement amounts'),
    bullet('Reports awaiting approval'),
    bullet('Recent activity'),
    spacer(),
    h2('6.5  Bulk Excel Export'),
    p('From the Admin → Sent to Accounting page, use the export controls to download a bulk Excel workbook covering all approved trips matching the selected filters (status, employee, manager, year, month).'),
    br(),
  ]
}

function section7() {
  return [
    h1('7. Application Owner Guide'),
    hr(),
    h2('7.1  Pending Users Activation'),
    p('Go to Application Owner → Pending Users to see all accounts that have signed up but not yet been activated.'),
    numbered('Click Activate next to a pending user.'),
    numbered('Select the appropriate Role from the dropdown.'),
    numbered('Check one or more Approver(s) from the list.'),
    numbered('Click Activate Account. The user receives an email confirming their account is active.'),
    spacer(),
    h2('7.2  Mileage Rate Management'),
    p('Go to Application Owner → Mileage Rates to manage the reimbursement rate.'),
    bullet('The current effective rate is shown prominently at the top of the page.'),
    bullet('The full rate history table shows all past rates with their effective dates.'),
    bullet('To set a new rate, click Add New Rate, enter the rate in $/mile and the date from which it applies, then save.'),
    bullet('The new rate automatically applies to all reports created on or after the effective date.'),
    bullet('Rates cannot be deleted if they are the only rate in the system.'),
    spacer(),
    noteBox('Annual Rate Update', 'Update the mileage rate at the start of each year when the IRS publishes the new standard mileage rate. No code deployment or environment variable change is required — update it here in the application.', GREEN, 'F0FDF4'),
    spacer(),
    h2('7.3  Deleted Reports'),
    p('Go to Application Owner → Deleted Reports to view all soft-deleted reports.'),
    bullet('Soft-deleted reports are removed from all standard views but are retained for audit purposes.'),
    bullet('The log shows who deleted the report, when, and any deletion reason recorded.'),
    bullet('To permanently remove a report, click Hard Delete on the report row and confirm. This action is irreversible.'),
    br(),
  ]
}

function section8() {
  return [
    h1('8. Report Status Reference'),
    hr(),
    p('A report moves through the following statuses during its lifecycle:'),
    spacer(),
    makeTable(
      ['Status', 'Meaning', 'Who Can Act', 'Next Transitions'],
      [
        ['Draft',         'Report is being built by the employee. Trips can be freely added, edited, or deleted.',                 'Employee (owner)',            'Submit → Submitted'],
        ['Submitted',     'Report has been sent to all assigned approvers. Trips are locked.',                                    'Any assigned approver or Admin/AO', 'Approve → Approved\nReturn → Needs Revision'],
        ['Needs Revision','Approver returned the report. Employee can edit trips and resubmit.',                                  'Employee (owner)',            'Resubmit → Submitted'],
        ['Approved',      'Report fully approved. Locked permanently. Accounting Excel emailed automatically.',                   'Admin/AO (soft delete only)', 'Soft Delete → (log)'],
      ],
      [18, 37, 25, 20]
    ),
    spacer(),
    noteBox('Note', 'Reports are never hard-deleted through normal workflows. Even soft-deleted reports remain accessible to the Application Owner in the Deleted Reports log.', NAVY, LIGHT),
    br(),
  ]
}

function section9() {
  return [
    h1('9. Email Notifications'),
    hr(),
    p('The following automated emails are sent by the system. All emails come from the address configured in SMTP_FROM.'),
    spacer(),
    makeTable(
      ['Trigger', 'Recipient(s)', 'Subject / Content'],
      [
        ['New user signs up (status: PENDING)',    'Application Owner',         'New User Sign-Up notification. Includes the new user\'s name and email, with a link to Pending Users.'],
        ['Employee submits or resubmits a report', 'All assigned approvers',    'Action Required: Expense Report [#] submitted by [Name] (or Resubmitted: ... on resubmission). Includes report number, period, and optional resubmit message from the employee. Contains a direct link to review the report.'],
        ['Approver approves a report',             'Accounting team + Approver (CC)', 'Approved Expense Report [#] — [Employee] — [Period]. Excel workbook attached.'],
        ['Approver returns report for revision',   'Employee (report owner)',    'Expense Report [#] — Sent Back for Revision. Contains the overall reason and per-trip notes (with trip date, origin, and destination labelled). Includes a link back to the report.'],
        ['Application Owner activates an account', 'Newly activated user',      'Your RiverWest Travel Reporting account is active. Contains a link to My Reports.'],
      ],
      [28, 24, 48]
    ),
    br(),
  ]
}

function section10() {
  return [
    h1('10. Accounting Excel Export'),
    hr(),
    p('When a report is approved, an Excel workbook (.xlsx) is generated automatically and emailed to the accounting team. Admins may also bulk-export multiple reports via the Sent to Accounting page.'),
    spacer(),
    h2('10.1  File Naming'),
    bullet('Auto-approval email attachment: RiverWest-[ReportNumber]-[Period].xlsx'),
    bullet('Bulk export download: RiverWest-BulkExport-[YYYY-MM-DD].xlsx'),
    spacer(),
    h2('10.2  Workbook Structure'),
    p('The workbook contains one sheet per report (or one combined sheet for bulk exports) with the following columns:'),
    spacer(),
    makeTable(
      ['Column', 'Description'],
      [
        ['Employee Name',       'Full name of the submitting employee'],
        ['Date Approved',       'Date the report was approved by the approver'],
        ['Departure Location',  'Origin property name or address'],
        ['Destination',         'Destination property name or address'],
        ['Business Purpose',    'Purpose text entered by the employee for the trip'],
        ['Approved Mileage',    'Total miles for the trip (distance × 2 for round trips)'],
        ['Rate ($/mi)',          'Mileage reimbursement rate effective at time of report creation'],
        ['Reimbursement Total', 'Approved Mileage × Rate'],
        ['Approved By',         'Name of the approver who approved the report'],
        ['Report #',            'Report number (e.g. EXP-2025-01-0001)'],
      ],
      [30, 70]
    ),
    spacer(),
    p('A totals row at the bottom of each report section sums Approved Mileage and Reimbursement Total across all trips.'),
    br(),
  ]
}

function section11() {
  return [
    h1('11. Environment & Configuration Reference'),
    hr(),
    p('The following environment variables must be configured in Vercel (or .env.local for local development). Contact the Application Owner, Michael Pisano (mpisano@riverwestpartners.com), for the actual values.'),
    spacer(),
    makeTable(
      ['Variable', 'Required', 'Description'],
      [
        ['DATABASE_URL',                       'Yes', 'Prisma Postgres / PostgreSQL connection string.'],
        ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',  'Yes', 'Clerk publishable key (public, safe to expose in the browser).'],
        ['CLERK_SECRET_KEY',                   'Yes', 'Clerk secret key. Keep confidential.'],
        ['NEXT_PUBLIC_APP_URL',                'Yes', 'Full URL of the application (e.g. https://travel.riverwestpartners.com). Used in email links.'],
        ['GOOGLE_MAPS_API_KEY',               'Yes', 'Google Maps Distance Matrix API key. Enable the Distance Matrix API in Google Cloud Console.'],
        ['SMTP_HOST',                          'Yes', 'SMTP server hostname (e.g. smtp.gmail.com).'],
        ['SMTP_PORT',                          'Yes', 'SMTP port (587 for TLS, 465 for SSL).'],
        ['SMTP_USER',                          'Yes', 'SMTP login email address.'],
        ['SMTP_PASSWORD',                      'Yes', 'SMTP password or app password. For Gmail, generate an App Password in Google Account settings.'],
        ['SMTP_FROM',                          'No',  'From address for outgoing emails. Defaults to SMTP_USER if not set. Example: "RiverWest Properties" <noreply@riverwestpartners.com>'],
        ['ACCOUNTING_EMAIL',                   'Yes', 'Email address that receives approved report workbooks. Defaults to controller@riverwestpartners.com if not set.'],
        ['SEED_SECRET',                        'Yes', 'Secret passphrase to protect the /api/seed endpoint. Only used during initial setup or data resets.'],
      ],
      [38, 12, 50]
    ),
    spacer(),
    noteBox('Mileage Rate', 'The mileage reimbursement rate is NOT configured via an environment variable. It is managed entirely within the application under Application Owner → Mileage Rates. This allows the rate to be updated without a code deployment.', GREEN, 'F0FDF4'),
    spacer(),
    h2('11.1  Initial Database Setup'),
    numbered('Deploy the application to Vercel with all environment variables set.'),
    numbered('Vercel runs prisma db push automatically during the build to apply the database schema.'),
    numbered('Seed the database by visiting: GET https://[app-url]/api/seed?secret=[SEED_SECRET]'),
    numbered('Sign up with the Application Owner email — Michael Pisano (mpisano@riverwestpartners.com) — and activate the account via the database if needed for first-time setup.'),
    numbered('Go to Application Owner → Mileage Rates and add the current IRS standard mileage rate with today\'s effective date.'),
    br(),
  ]
}

function section12() {
  return [
    h1('12. Report Numbering'),
    hr(),
    p('Report numbers are assigned automatically at the time a report is created and follow the format:'),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 160 },
      children: [new TextRun({ text: 'EXP-YYYY-MM-####', bold: true, size: 28, color: NAVY })],
    }),
    makeTable(
      ['Part', 'Description'],
      [
        ['EXP',  'Fixed prefix for all expense reports.'],
        ['YYYY', 'Four-digit year of the reporting period.'],
        ['MM',   'Two-digit month of the reporting period.'],
        ['####', 'Sequential four-digit number counting all reports created for that month/year (starting at 0001).'],
      ],
      [15, 85]
    ),
    spacer(),
    p('Example: EXP-2025-01-0003 is the third report created for January 2025, regardless of which employee created it.'),
    br(),
  ]
}

function section13() {
  return [
    h1('13. Troubleshooting & FAQ'),
    hr(),
    h2('"My account says Pending — I cannot log in."'),
    p('Your account has been created but not yet activated. Contact your manager or the Application Owner. They need to go to Application Owner → Pending Users, find your account, assign you a role and approver, and click Activate.'),
    spacer(),
    h2('"The wrong name/profile is showing in my settings."'),
    p('This was caused by a bug where the Settings page displayed the first employee alphabetically instead of the logged-in user. This has been resolved. If you still see incorrect data, clear your browser cache and sign out and back in.'),
    spacer(),
    h2('"I cannot see the Application Owner section in the sidebar."'),
    p('Only employees with the Application Owner role see that sidebar section. If you should have this access, contact Michael Pisano (mpisano@riverwestpartners.com) to have your role updated.'),
    spacer(),
    h2('"My trip mileage looks wrong."'),
    p('Mileage is calculated using the Google Maps Distance Matrix API based on the driving distance between the selected addresses. Ensure the property addresses in the system are correct (Admin → Properties) and that your Primary Office address in Profile & Settings is accurate. If a Custom Address was used, double-check it was entered correctly.'),
    spacer(),
    h2('"I submitted a report but my approver did not receive an email."'),
    p('Check the following: (1) The approver is correctly assigned — an Admin can verify this in Admin → Employees. (2) The SMTP environment variables are correctly set in Vercel. (3) Check the approver\'s spam or junk folder. Email is sent from the address in SMTP_FROM.'),
    spacer(),
    h2('"I need to correct an approved report."'),
    p('Approved reports are permanently locked as the integrity of the accounting record depends on immutability. Contact Michael Pisano (mpisano@riverwestpartners.com). If a correction is truly necessary, he can soft-delete the report and a new report can be created for the corrected period.'),
    spacer(),
    h2('"The mileage rate needs to be updated for the new year."'),
    p('Log in as the Application Owner, go to Application Owner → Mileage Rates, click Add New Rate, enter the new $/mile rate, and set the effective date to January 1 of the new year (or the IRS-published effective date). No code change or redeployment is needed.'),
    spacer(),
    h2('"I need to reset the database."'),
    p([bold('Warning: this deletes all data. ', AMBER), run('Only do this in a development/staging environment or as an intentional production reset. Call GET /api/seed?secret=[SEED_SECRET] — this wipes all trips, reports, employees, properties, and accounting logs, then re-seeds from the defined employee and property lists. All Clerk accounts remain intact but will be re-linked on next sign-in.')]),
    spacer(),
  ]
}

// ── Assemble and write ────────────────────────────────────────────────────

async function main() {
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'numbered-list',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, color: NAVY, size: 4 } },
                children: [
                  new TextRun({ text: 'RiverWest Properties — Travel & Mileage Reporting System', color: GRAY, size: 18 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, color: NAVY, size: 4 } },
                children: [
                  new TextRun({ text: 'Onboarding & Control Document — Confidential    |    Page ', color: GRAY, size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: GRAY, size: 18 }),
                  new TextRun({ text: ' of ', color: GRAY, size: 18 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GRAY, size: 18 }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverPage(),
          ...section1(),
          ...section2(),
          ...section3(),
          ...section4(),
          ...section5(),
          ...section6(),
          ...section7(),
          ...section8(),
          ...section9(),
          ...section10(),
          ...section11(),
          ...section12(),
          ...section13(),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const filename = 'RiverWest-Travel-Reporting-Onboarding-Guide.docx'
  writeFileSync(filename, buffer)
  console.log(`✓ Written: ${filename}  (${Math.round(buffer.length / 1024)} KB)`)
}

main().catch(err => { console.error(err); process.exit(1) })
