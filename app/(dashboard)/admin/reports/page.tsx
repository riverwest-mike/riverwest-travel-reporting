import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role, ReportStatus } from '@prisma/client'
import { StatusBadge } from '@/components/reports/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatMiles, formatPeriod } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { status?: string; employeeId?: string }
}) {
  const employee = await requireEmployee()
  if (employee.role !== Role.ADMIN) redirect('/reports')

  const where: Record<string, unknown> = {}
  if (searchParams.status) where.status = searchParams.status as ReportStatus
  if (searchParams.employeeId) where.employeeId = searchParams.employeeId

  const reports = await db.expenseReport.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true } },
      approvedBy: { select: { name: true } },
      _count: { select: { trips: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  const employees = await db.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'Pending Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Admin</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600">All Reports</h1>
          <p className="text-muted-foreground text-sm">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {statusOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/admin/reports${opt.value ? `?status=${opt.value}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              (searchParams.status ?? '') === opt.value
                ? 'bg-navy-600 text-white border-navy-600'
                : 'bg-white text-muted-foreground border-border hover:border-navy-300'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No reports found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report #</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Miles</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.reportNumber}</TableCell>
                    <TableCell className="font-medium">{r.employee.name}</TableCell>
                    <TableCell>{formatPeriod(r.periodMonth, r.periodYear)}</TableCell>
                    <TableCell>{r._count.trips}</TableCell>
                    <TableCell>{formatMiles(r.totalMiles)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(r.totalAmount)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.approvedBy?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/reports/${r.id}`}>View</Link>
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
