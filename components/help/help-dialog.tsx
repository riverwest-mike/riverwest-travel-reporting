'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  HelpCircle, FileText, PlusCircle, CheckSquare,
  LayoutDashboard, ClipboardList, Users, Building2, UserCheck,
  DollarSign, Trash2, BarChart3, TrendingUp, Clock, MapPin,
  CalendarRange, Settings, BookOpen,
} from 'lucide-react'

interface HelpSection {
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  tips: string[]
}

const HELP: Record<string, HelpSection> = {
  overview: {
    title: 'RiverWest Travel Reporting — Quick Guide',
    icon: BookOpen,
    description:
      'This app lets employees log trips, build monthly mileage reports, and submit them for manager approval. Mileage is calculated automatically via Google Maps and reimbursed at the current rate.',
    tips: [
      'Start by setting your Primary Office address in Profile & Settings — it\'s used as the default trip origin.',
      'Each report covers one calendar month. Create a new report under "New Report" in the sidebar.',
      'Add trips as you go or all at once before submitting — reports stay as drafts until you submit them.',
      'Save frequently-used routes as favorites inside the trip form and reuse them in one click.',
      'Once you submit, your approver is notified automatically. If they send it back, an amber banner explains what to fix.',
      'Approved reports are sent to the accounting team as an Excel workbook — no manual export needed.',
    ],
  },
  reports: {
    title: 'My Reports',
    icon: FileText,
    description:
      'Your full expense report history with year-to-date stats at the top.',
    tips: [
      'The amber "needs attention" card at the top highlights reports that are in draft or have been sent back for revision.',
      '"YTD Reimbursed" shows all reports approved so far this calendar year.',
      '"Awaiting Approval" shows the dollar value of reports currently under manager review.',
      'Click a report row or the View button to open it and see its trips.',
    ],
  },
  'reports/new': {
    title: 'New Report',
    icon: PlusCircle,
    description:
      'Creates a blank expense report for a specific calendar month. You can only have one report per period.',
    tips: [
      'Select the month and year the travel took place — you\'ll add individual trip dates inside the report.',
      'The report number (e.g. RW-2026-003-M) is generated automatically.',
      'After creating the report you\'ll land on it immediately — go ahead and add your first trip.',
    ],
  },
  'reports/[id]': {
    title: 'Report Detail',
    icon: FileText,
    description:
      'View all trips on this report, add or edit trips, and submit for approval when ready.',
    tips: [
      'Click "Add Trip" to log a trip — origin, destination, date, and purpose are all required.',
      'The date field starts blank — you must fill it in each time to avoid accidentally logging trips on today\'s date.',
      'Mileage is calculated automatically; check the "Round trip" box to double the distance.',
      'Use "Use saved trip" at the top of the trip form to pre-fill a route you\'ve saved before.',
      'Save a new route as a favorite via the star link at the bottom of the trip form.',
      'Once submitted, the report is locked — your manager must send it back before you can make changes.',
      'If sent back, an amber banner at the top explains the feedback. You can type a reply note before resubmitting.',
    ],
  },
  approvals: {
    title: 'Approvals',
    icon: CheckSquare,
    description:
      'Reports from your team waiting for review, sorted oldest-first to encourage timely turnaround.',
    tips: [
      '"Waiting" shows how many days a report has been sitting — aim to review within a few business days.',
      'Click Review to open a report and inspect every trip before making a decision.',
      '"Team History" below the queue shows all past approval decisions for your team.',
      'Admins see all pending reports across the organization; managers see only their assigned employees.',
    ],
  },
  'approvals/[id]': {
    title: 'Approval Detail',
    icon: CheckSquare,
    description:
      'Review every trip on this report, optionally annotate specific trips, then approve or send back.',
    tips: [
      'Click "Add Note" next to any trip to flag a specific issue — notes appear in the revision email.',
      'Before approving, the confirmation dialog shows total miles and total reimbursement for a final check.',
      'If sending back, your overall note is required and will display as an amber banner on the employee\'s report.',
      'Approving sends the accounting Excel to the accounting team automatically — no follow-up needed.',
    ],
  },
  'admin/accounting': {
    title: 'Sent to Accounting',
    icon: FileText,
    description:
      'A log of every report that has been approved and emailed to the accounting team.',
    tips: [
      'Reports appear here automatically when approved — there is no manual export step.',
      'Managers see only their team\'s approved reports; Admins see the full organization.',
      'Use this page to verify that a specific month\'s report was sent before following up with accounting.',
    ],
  },
  'admin': {
    title: 'Admin Dashboard',
    icon: LayoutDashboard,
    description:
      'Organization-wide overview of the report pipeline, employee activity, and recent actions.',
    tips: [
      'Use this as a quick pulse check — pending reports, active employees, and recent approvals at a glance.',
      'Click through to Employees or All Reports to take action on specific items.',
    ],
  },
  'admin/reports': {
    title: 'All Reports',
    icon: ClipboardList,
    description:
      'Every expense report in the system, regardless of employee or status.',
    tips: [
      'Filter or sort by status to find all pending or draft reports across the organization.',
      'Admins can open and read any report — useful for auditing or helping employees troubleshoot.',
      'Use the "Admin Delete" button (red, inside a report) to soft-delete a report submitted in error.',
    ],
  },
  'admin/employees': {
    title: 'Employees',
    icon: Users,
    description:
      'Manage all employee accounts — roles, approver assignments, and account status.',
    tips: [
      'Each employee can have multiple approvers — any one of them can approve their reports.',
      'Deactivating an employee prevents login but preserves their full report history.',
      'Admins cannot change their own role — another admin must do it.',
      'Click "View Reports" on any employee to jump directly to their report history.',
    ],
  },
  'admin/properties': {
    title: 'Properties',
    icon: Building2,
    description:
      'The list of RiverWest properties available as trip origins and destinations.',
    tips: [
      'Deactivated properties no longer appear in the trip form\'s property picker.',
      'Existing trips that reference a deactivated property are not affected.',
      'Keep property names consistent — they appear on reports, the accounting export, and analytics.',
    ],
  },
  'ao/pending-users': {
    title: 'Pending Users',
    icon: UserCheck,
    description:
      'New sign-ups waiting to be activated — they cannot access the app until approved.',
    tips: [
      'Employees sign up with their work email and land here until you activate them.',
      'Select their role and assign at least one approver before clicking Activate.',
      'The employee receives an activation email with a link to the app once approved.',
    ],
  },
  'ao/mileage-rates': {
    title: 'Mileage Rates',
    icon: DollarSign,
    description:
      'Set the per-mile reimbursement rate applied to new reports. No deployment required.',
    tips: [
      'The current rate applies to every report created on or after its effective date.',
      'Old reports keep the rate that was in effect when they were created — changing the rate is not retroactive.',
      'IRS standard mileage rates typically update in January — update here before employees start the new year.',
    ],
  },
  'ao/deleted-reports': {
    title: 'Deleted Reports',
    icon: Trash2,
    description:
      'Soft-deleted reports hidden from normal views but preserved for audit purposes.',
    tips: [
      'Reports are soft-deleted by admins when they were submitted in error.',
      'The deletion reason (if provided) is shown alongside each entry.',
      '"Hard Delete" permanently removes a report — this cannot be undone.',
    ],
  },
  analytics: {
    title: 'Analytics Overview',
    icon: BarChart3,
    description:
      'High-level view of the organization\'s mileage activity — pipeline status, top employees, and top destinations.',
    tips: [
      '"Pipeline" shows the current state of all reports (draft → submitted → approved) at a glance.',
      'Top employees and top destinations are ranked by total miles from approved reports only.',
      'Recent monthly activity bars show reporting volume trends across the last several months.',
    ],
  },
  'analytics/employees': {
    title: 'Employee Miles',
    icon: Users,
    description:
      'Mileage and reimbursement breakdown per employee from approved reports.',
    tips: [
      'Click any column header to sort ascending or descending.',
      'Filter by year to compare annual totals across employees.',
      'Filter by manager to focus on a specific team\'s mileage.',
      'Click an employee row to drill into their individual trip history.',
    ],
  },
  'analytics/properties': {
    title: 'Properties Analytics',
    icon: MapPin,
    description:
      'How often each property appears in approved trips — as an origin, a destination, or both.',
    tips: [
      '"As Origin" counts trips that started at a property; "As Destination" counts arrivals.',
      'High-traffic properties indicate where staff spends the most travel time.',
      'Click a property row to see which employees visit it most often.',
    ],
  },
  'analytics/trends': {
    title: 'Monthly Trends',
    icon: TrendingUp,
    description:
      'Month-by-month mileage and reimbursement totals with inline bar charts.',
    tips: [
      'Click a month row to drill into that specific month\'s trip-level breakdown.',
      'Filter by year to compare the same months across different years.',
      'Months with zero activity may mean employees forgot to submit — check the Approvals queue.',
    ],
  },
  'analytics/approvals': {
    title: 'Approval Metrics',
    icon: Clock,
    description:
      'Manager turnaround time — how quickly reports are being reviewed and decided.',
    tips: [
      'Green bars indicate fast turnaround; longer bars point to a bottleneck.',
      '"Returned" percentage shows how often reports are sent back vs. approved on the first pass.',
      'Filter by year and manager to identify trends over time.',
    ],
  },
  'analytics/yoy': {
    title: 'Year-over-Year',
    icon: CalendarRange,
    description:
      'Side-by-side comparison of annual mileage and reimbursement totals across years.',
    tips: [
      'Compares the last several years to identify growth or decline in travel activity.',
      'Useful for budget planning and forecasting reimbursement costs.',
    ],
  },
  settings: {
    title: 'Profile & Settings',
    icon: Settings,
    description:
      'Your profile details and primary office address used for trip origin.',
    tips: [
      'Set your Primary Office address here — it\'s used as the default "From" location when adding trips.',
      'If your office address is missing, the "Primary Office" option will be disabled in the trip form.',
      'Your name and email are managed through your sign-in account and cannot be changed here.',
    ],
  },
}

function derivePageKey(pathname: string): string {
  // Strip leading slash and match against known keys
  const clean = pathname.replace(/^\//, '')

  // Exact or prefix matches — most specific first
  if (clean === '' || clean === 'reports') return 'reports'
  if (clean === 'reports/new') return 'reports/new'
  if (clean.startsWith('reports/')) return 'reports/[id]'
  if (clean === 'approvals') return 'approvals'
  if (clean.startsWith('approvals/')) return 'approvals/[id]'
  if (clean === 'admin/accounting') return 'admin/accounting'
  if (clean === 'admin/reports') return 'admin/reports'
  if (clean === 'admin/employees') return 'admin/employees'
  if (clean === 'admin/properties') return 'admin/properties'
  if (clean === 'admin') return 'admin'
  if (clean === 'ao/pending-users') return 'ao/pending-users'
  if (clean === 'ao/mileage-rates') return 'ao/mileage-rates'
  if (clean === 'ao/deleted-reports') return 'ao/deleted-reports'
  if (clean === 'analytics/employees' || clean.startsWith('analytics/employees/')) return 'analytics/employees'
  if (clean === 'analytics/properties' || clean.startsWith('analytics/properties/')) return 'analytics/properties'
  if (clean === 'analytics/trends' || clean.startsWith('analytics/trends/')) return 'analytics/trends'
  if (clean === 'analytics/approvals') return 'analytics/approvals'
  if (clean === 'analytics/yoy') return 'analytics/yoy'
  if (clean === 'analytics') return 'analytics'
  if (clean === 'settings') return 'settings'
  return 'overview'
}

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageKey?: string
}

export function HelpDialog({ open, onOpenChange, pageKey = 'overview' }: HelpDialogProps) {
  const section = HELP[pageKey] ?? HELP.overview
  const Icon = section.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy-700">
            <Icon className="h-5 w-5 shrink-0" />
            {section.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {section.description}
          </p>

          <div className="space-y-2">
            {section.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-navy-100 text-navy-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-foreground/80 leading-snug">{tip}</span>
              </div>
            ))}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

export { derivePageKey }
