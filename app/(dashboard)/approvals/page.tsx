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

export default async function ApprovalsPage() {
  const employee = await requireEmployee()

  if (employee.role !== Role.MANAGER && employee.role !== Role.ADMIN) {
    redirect('/reports')
  }

  const pending = await db.expenseReport.findMany({
    where: {
      status: ReportStatus.SUBMITTED,
      employee: { managerId: employee.id },
    },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      _count: { select: { trips: true } },
    },
    orderBy: { submittedAt: 'asc' },
  })

  const recentlyDecided = await db.expenseReport.findMany({
    where: {
      status: { in: [ReportStatus.APPROVED, ReportStatus.REJECTED] },
      OR: [
        { approvedById: employee.id },
        { rejectedById: employee.id },
      ],
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Report #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Miles</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employee.name}</TableCell>
                    <TableCell className="font-mono text-sm">{r.reportNumber}</TableCell>
                    <TableCell>{formatPeriod(r.periodMonth, r.periodYear)}</TableCell>
                    <TableCell>{r._count.trips}</TableCell>
                    <TableCell>{formatMiles(r.totalMiles)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(r.totalAmount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.submittedAt
                        ? new Date(r.submittedAt).toLocaleDateString()
                        : '—'}
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
          )}
        </CardContent>
      </Card>

      {/* Recently decided */}
      {recentlyDecided.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Decided</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Report #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentlyDecided.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.employee.name}</TableCell>
                    <TableCell className="font-mono text-sm">{r.reportNumber}</TableCell>
                    <TableCell>{formatPeriod(r.periodMonth, r.periodYear)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/approvals/${r.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
