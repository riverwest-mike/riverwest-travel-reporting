import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Building2, ClipboardList, CheckSquare, BarChart3, FileSpreadsheet } from 'lucide-react'

export default async function AdminDashboardPage() {
  const employee = await requireEmployee()
  const isAdminOrAO = employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER
  if (!isAdminOrAO) redirect('/reports')

  const [employees, properties, reports] = await Promise.all([
    db.employee.count({ where: { isActive: true } }),
    db.property.count({ where: { isActive: true } }),
    db.expenseReport.groupBy({ by: ['status'], _count: true }),
  ])

  const statusCounts = Object.fromEntries(reports.map((r) => [r.status, r._count]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-600">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          System overview and management
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Employees" value={employees} href="/admin/employees" />
        <StatCard icon={Building2} label="Properties" value={properties} href="/admin/properties" />
        <StatCard
          icon={CheckSquare}
          label="Pending Approval"
          value={statusCounts['SUBMITTED'] ?? 0}
          href="/admin/reports?status=SUBMITTED"
          highlight
        />
        <StatCard
          icon={ClipboardList}
          label="Total Reports"
          value={Object.values(statusCounts).reduce((a, b) => a + b, 0)}
          href="/admin/reports"
        />
      </div>

      {/* Status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {(['DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION', 'REJECTED'] as const).map((s) => (
              <div key={s} className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-navy-600">{statusCounts[s] ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{s === 'NEEDS_REVISION' ? 'Needs Revision' : s.charAt(0) + s.slice(1).toLowerCase()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        <QuickLink href="/admin/employees" icon={Users} label="Manage Employees" description="Add, edit, or deactivate team members" />
        <QuickLink href="/admin/properties" icon={Building2} label="Manage Properties" description="Update property addresses for mileage calculation" />
        <QuickLink href="/admin/reports" icon={ClipboardList} label="All Reports" description="View all expense reports across the team" />
        <QuickLink href="/admin/analytics" icon={BarChart3} label="Analytics" description="Miles by employee, top destinations, monthly trends" />
        <QuickLink href="/admin/accounting" icon={FileSpreadsheet} label="Sent to Accounting" description="Log of all accounting reports emailed to the controller" />
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, href, highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string; value: number; href: string; highlight?: boolean
}) {
  return (
    <Link href={href}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${highlight && value > 0 ? 'border-amber-300' : ''}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <Icon className={`h-8 w-8 ${highlight && value > 0 ? 'text-amber-500' : 'text-navy-400'}`} />
          <div>
            <p className={`text-2xl font-bold ${highlight && value > 0 ? 'text-amber-600' : 'text-navy-600'}`}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function QuickLink({
  href, icon: Icon, label, description,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string; description: string
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-5">
          <Icon className="h-6 w-6 text-navy-500 mb-3" />
          <p className="font-semibold text-navy-600">{label}</p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
