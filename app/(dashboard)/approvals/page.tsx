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
import { Clock } from 'lucide-react'

function daysAgo(date: Date | string | null): string {
  if (!date) return '—'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default async function ApprovalsPage() {
  const employee = await requireEmployee()

  const isAdminOrAO = employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER

  if (
    employee.role !== Role.MANAGER &&
    employee.role !== Role.ADMIN &&
    employee.role !== Role.APPLICATION_OWNER
  ) {
    redirect('/reports')
  }

  // Build the "reports for my team" where clause
  const myTeamFilter = isAdminOrAO
    ? {}
    : { employee: { approvers: { some: { approverId: employee.id } } } }

  const pending = await db.expenseReport.findMany({
    where: {
      status: ReportStatus.SUBMITTED,
      ...myTeamFilter,
    },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      _count: { select: { trips: true } },
    },
    orderBy: { submittedAt: 'asc' },
  })

  // Team history: all statuses for my team (last 50)
  const teamHistory = await db.expenseReport.findMany({
    where: {
      status: { in: [ReportStatus.APPROVED, ReportStatus.NEEDS_REVISION, ReportStatus.REJECTED] },
      ...myTeamFilter,
    },
    include: {
      employee: { select: { id: true, name: true } },
      approvedBy: { select: { name: true } },
      rejectedBy: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-600">Approvals</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Review and approve expense reports from your team
        </p>
      </div>

      {/* Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Pending Review
            {pending.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              No reports pending review.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden sm:table-cell">Report #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="hidden md:table-cell">Trips</TableHead>
                    <TableHead className="hidden md:table-cell">Miles</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Waiting</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employee.name}</TableCell>
                      <TableCell className="font-mono text-sm hidden sm:table-cell">{r.reportNumber}</TableCell>
                      <TableCell>{formatPeriod(r.periodMonth, r.periodYear)}</TableCell>
                      <TableCell className="hidden md:table-cell">{r._count.trips}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatMiles(r.totalMiles)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(r.totalAmount)}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {daysAgo(r.submittedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm">
                          <Link href={`/approvals/${r.id}`}>Review</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team history */}
      {teamHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden sm:table-cell">Report #</TableHead>
                    <TableHead className="hidden sm:table-cell">Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Decided By</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamHistory.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.employee.name}</TableCell>
                      <TableCell className="font-mono text-sm hidden sm:table-cell">{r.reportNumber}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatPeriod(r.periodMonth, r.periodYear)}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                        {r.approvedBy?.name ?? r.rejectedBy?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/approvals/${r.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
