import Link from 'next/link'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { StatusBadge } from '@/components/reports/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PlusCircle, FileText } from 'lucide-react'
import { formatCurrency, formatMiles, formatPeriod } from '@/lib/utils'

export default async function ReportsPage() {
  const employee = await requireEmployee()

  const reports = await db.expenseReport.findMany({
    where: { employeeId: employee.id },
    include: { _count: { select: { trips: true } } },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
  })

  const stats = {
    draft: reports.filter(r => r.status === 'DRAFT').length,
    submitted: reports.filter(r => r.status === 'SUBMITTED').length,
    approved: reports.filter(r => r.status === 'APPROVED').length,
    rejected: reports.filter(r => r.status === 'REJECTED').length,
    totalReimbursed: reports
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.totalAmount, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">My Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track and submit your mileage reimbursement reports
          </p>
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <PlusCircle className="h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Draft" value={stats.draft} color="text-muted-foreground" />
        <StatCard label="Pending Review" value={stats.submitted} color="text-amber-600" />
        <StatCard label="Approved" value={stats.approved} color="text-green-600" />
        <StatCard
          label="Total Reimbursed"
          value={formatCurrency(stats.totalReimbursed)}
          color="text-navy-600"
        />
      </div>

      {/* Reports table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No reports yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Create your first mileage report to get started
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/reports/new">Create Report</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Miles</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono text-sm">{report.reportNumber}</TableCell>
                    <TableCell>{formatPeriod(report.periodMonth, report.periodYear)}</TableCell>
                    <TableCell>{report._count.trips}</TableCell>
                    <TableCell>{formatMiles(report.totalMiles)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(report.totalAmount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={report.status} />
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/reports/${report.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
