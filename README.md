# RiverWest Travel & Mileage Reporting

A web application for RiverWest employees to submit mileage reimbursement and travel expense reports, with manager approval workflows and automated email notifications.

---

## What It Does

- **Employees** log trips (origin, destination, properties visited) and submit expense reports for mileage reimbursement
- **Managers** review submitted reports, optionally annotate individual trips with notes, then approve or send back for revision
- **Admins** manage employees, properties, and view all reports across the organization
- Approved reports are automatically emailed to the accounting team as an Excel workbook
- Mileage is calculated automatically using Google Maps and reimbursed at the current IRS rate

---

## User Roles

| Role | Access |
|------|--------|
| **Employee** | Submit trips and expense reports, view own history |
| **Manager** | All employee access + approve or send back reports for their direct reports |
| **Admin** | Full access — manage employees, properties, view all reports, export data |

---

## Approval Workflow

Reports move through the following statuses:

| Status | Meaning |
|--------|---------|
| **Draft** | Employee is building the report (trips editable) |
| **Pending Review** | Submitted to manager for approval |
| **Approved** | Manager approved — Excel sent to accounting, report locked |
| **Needs Revision** | Manager sent back for edits (trips editable again) |

### Manager review
1. Open a pending report from the **Approvals** queue
2. Optionally click **Add Note** on any trip to flag specific issues
3. Click **Approve Report** to approve the whole report — the accounting Excel is emailed automatically
4. Or click **Send Back for Revision** — enter an overall explanation (required); per-trip notes are included automatically

### Employee revision
1. The report shows an amber banner with the manager's overall note and any per-trip annotations
2. Edit, add, or delete trips as needed
3. Click **Resubmit for Approval** — the same report is resubmitted (no new report number created)

---

## Getting Started (For Employees)

1. Go to the app URL
2. Click **Sign Up** and use your **exact work email address** (e.g. `jsmith@riverwestproperties.com`)
3. Set your home address in **Settings** — this is used as the default trip origin
4. Start logging trips and submitting expense reports

> Your work email must match the one in the system. Contact an admin if you have trouble signing in.

---

## Admin Guide

### Managing Employees
Go to **Admin → Employees** to add, edit, or deactivate employee accounts and assign managers.

### Managing Properties
Go to **Admin → Properties** to add, edit, or deactivate properties in the destination list.

### Reseeding the Database
If you ever need to reset and reseed all data (⚠️ this wipes everything):
```
GET https://[app-url]/api/seed?secret=[SEED_SECRET]
```

To add/update properties only without affecting other data:
```
POST https://[app-url]/api/properties/seed
```
*(Must be logged in as Admin)*

---

## Environment Variables

The following must be set in Vercel (or `.env.local` for local development):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `GOOGLE_MAPS_API_KEY` | Google Maps Distance Matrix API key |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | SMTP login email |
| `SMTP_PASSWORD` | SMTP password or app password |
| `SMTP_FROM` | From address for outgoing emails |
| `ACCOUNTING_EMAIL` | Email address that receives approved reports |
| `MILEAGE_RATE` | IRS reimbursement rate (e.g. `0.70`) — update annually |
| `SEED_SECRET` | Secret key to protect the `/api/seed` endpoint |

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

To update the mileage rate at the start of each year, update the `MILEAGE_RATE` environment variable in Vercel and redeploy.
