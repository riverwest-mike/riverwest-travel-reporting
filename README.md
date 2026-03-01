# RiverWest Travel & Mileage Reporting

A web application for RiverWest employees to submit mileage reimbursement and travel expense reports, with multi-approver workflows, automated email notifications, accounting export, and organization-wide analytics.

---

## What It Does

- **Employees** log trips (origin, destination, properties visited) and submit expense reports for mileage reimbursement
- **Managers** review submitted reports, optionally annotate individual trips with notes, then approve or send back for revision
- **Admins** manage employees, properties, mileage rates, and pending user activations — and have full access to organization-wide analytics
- Approved reports are automatically emailed to the accounting team as an Excel workbook
- Mileage is calculated automatically using Google Maps and reimbursed at the current rate (managed in-app, no env variable needed)

---

## User Roles

| Role | Access |
|------|--------|
| **Employee** | Submit trips and expense reports, view own history |
| **Manager** | All employee access + approve or send back reports for assigned employees; view accounting log |
| **Admin** | Full access — manage employees, properties, mileage rates, and pending users; view all reports; access analytics |

Employees may have more than one approver — all are notified on submission and any one of them may approve or return the report.

> **Note:** A legacy `APPLICATION_OWNER` role exists in the database for backwards compatibility. It is treated identically to `ADMIN` in all application logic and cannot be assigned to new users through the UI.

---

## Approval Workflow

Reports move through the following statuses:

| Status | Meaning |
|--------|---------|
| **Draft** | Employee is building the report (trips editable) |
| **Submitted** | Submitted to approver(s) for review |
| **Approved** | Approver approved — Excel sent to accounting, report locked |
| **Needs Revision** | Approver sent back for edits (trips editable again) |

### Approver review
1. Open a pending report from the **Approvals** queue (shows how many days it has been waiting)
2. Optionally click **Add Note** on any trip to flag specific issues
3. Click **Approve Report** — a confirmation dialog shows the total miles and reimbursement amount before finalizing; the accounting Excel is emailed automatically
4. Or click **Send Back for Revision** — enter an overall explanation (required); per-trip notes are included in the notification email

### Employee revision
1. The report shows an amber banner with the approver's overall note and any per-trip annotations
2. Optionally type a message to the approver explaining your changes
3. Edit, add, or delete trips as needed
4. Click **Resubmit** — all approvers are notified; the same report number is preserved

---

## Getting Started (For Employees)

1. Go to the app URL and click **Sign Up** using your **exact work email address** (e.g. `jsmith@riverwestproperties.com`)
2. Your account will be **pending** until an Admin activates it and assigns your role and approver(s)
3. Once activated you will receive an email with a link to the app
4. Set your primary office address in **Profile & Settings** — this is used as the default trip origin

> Your work email must match the one in the system. Contact an admin if you have trouble signing in.

---

## Admin Guide

### Managing Employees
Go to **Administration → Employees** to:
- Add, edit, or deactivate employee accounts
- Assign one or more approvers per employee (any assigned approver can approve their reports)
- Change roles (Admins only; no user can change their own role)
- Click **View Reports** to jump directly to an employee's report history

### Managing Properties
Go to **Administration → Properties** to add, edit, or deactivate properties in the destination list.

### Accounting Log
Go to **Administration → Sent to Accounting** to view all reports that have been approved and emailed to accounting. Managers see only their team's reports; Admins see all.

### Activating Pending Users
Go to **Administration → Pending Users** to see new sign-ups awaiting activation. For each user, select their role and assign approver(s), then click **Activate**.

### Managing Mileage Rates
Go to **Administration → Mileage Rates** to add a new rate (with an effective date) or view rate history. The current rate applies to all new reports created on or after its effective date. Rates are stored in the database — no deployment needed to update them.

### Deleted Reports
Go to **Administration → Deleted Reports** to view soft-deleted reports. From here you can permanently (hard) delete a report if needed.

---

## Analytics

The **Analytics** section (Admin-only, collapsible in the sidebar) provides five detailed reporting pages:

| Page | Description |
|------|-------------|
| **Overview** | Radar view — live pipeline status, year summary, top employees, top destinations, recent monthly activity, and approval speed highlights |
| **Employee Miles** | Sortable table by employee: trips, total miles, total reimbursed, avg miles/trip. Filter by year + manager |
| **Properties** | Trip activity per property: trips as origin, trips as destination, total trips, miles, reimbursed. Filter by year |
| **Monthly Trends** | Month-by-month breakdown with inline bar charts. Filter by year |
| **Approval Metrics** | Manager turnaround time — avg days to decision, reports reviewed, approved vs returned. Color-coded bars (green = fast). Filter by year + manager |

All detail pages have sortable column headers (click to toggle asc/desc).

---

## Reseeding the Database
If you ever need to reset and reseed all data (⚠️ this wipes everything):
```
GET https://[app-url]/api/seed?secret=[SEED_SECRET]
```
The seed creates all employees, properties, and approver relationships. Michael Pisano (`mpisano@riverwestpartners.com`) is seeded as Admin.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. `https://travel.riverwestpartners.com`) |
| `GOOGLE_MAPS_API_KEY` | Google Maps Distance Matrix API key |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | SMTP login email |
| `SMTP_PASSWORD` | SMTP password or app password |
| `SMTP_FROM` | From address for outgoing emails |
| `ACCOUNTING_EMAIL` | Email address that receives approved reports |
| `SEED_SECRET` | Secret key to protect the `/api/seed` endpoint |

> **Mileage rate** is managed in the app under **Administration → Mileage Rates** — there is no `MILEAGE_RATE` environment variable.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL via Prisma ORM (Prisma Postgres)
- **Auth:** Clerk
- **Hosting:** Vercel
- **Email:** Nodemailer (Gmail SMTP)
- **Maps:** Google Maps Distance Matrix API
- **UI:** Tailwind CSS + Radix UI

---

## Deployment

The app auto-deploys to Vercel on every push to `main`. The build command runs `prisma db push` automatically to keep the database schema in sync.

To update the mileage rate, use the **Administration → Mileage Rates** page in the app — no redeployment required.
