import Link from 'next/link'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { StatusBadge } from '@/components/reports/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PlusCircle, FileText, AlertTriangle, RefreshCw, Pencil, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatMiles, formatPeriod } from '@/lib/utils'

const PAGE_SIZE = 25

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const employee = await requireEmployee()
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))

  // Fetch all non-deleted reports for this employee (needed for stats + action-needed logic)
  const allReports = await db.expenseReport.findMany({
    where: { employeeId: employee.id, deletedAt: null },
    select: {
      id: true,
      reportNumber: true,
      status: true,
      periodMonth: true,
      periodYear: true,
      totalMiles: true,
      totalAmount: true,
      approvedAt: true,
      parentReportId: true,
      _count: { select: { trips: true } },
    },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
  })

  const now = new Date()
  const ytdStart = new Date(now.getFullYear(), 0, 1)

  // YTD & summary stats
  const stats = {
    draft: allReports.filter(r => r.status === 'DRAFT').length,
    submitted: allReports.filter(r => r.status === 'SUBMITTED').length,
    approved: allReports.filter(r => r.status === 'APPROVED').length,
    ytdReimbursed: allReports
      .filter(r => r.status === 'APPROVED' && r.approvedAt && new Date(r.approvedAt) >= ytdStart)
      .reduce((sum, r) => sum + r.totalAmount, 0),
    pendingAmount: allReports
      .filter(r => r.status === 'SUBMITTED')
      .reduce((sum, r) => sum + r.totalAmount, 0),
    lastApproved: allReports
      .filter(r => r.status === 'APPROVED' && r.approvedAt)
      .sort((a, b) => new Date(b.approvedAt!).getTime() - new Date(a.approvedAt!).getTime())[0] ?? null,
  }

  // Rejected reports that already have an active child (DRAFT or SUBMITTED) are locked —
  // the employee already resubmitted and the manager hasn't acted yet.
  const activeChildParentIds = new Set(
    allReports
      .filter(r => r.parentReportId && (r.status === 'DRAFT' || r.status === 'SUBMITTED'))
      .map(r => r.parentReportId!)
  )

  // Reports that need the employee's action
  const actionNeeded = allReports.filter(r => {
    if (r.status === 'DRAFT') return true
    if (r.status === 'REJECTED') return !activeChildParentIds.has(r.id)
    return false
  })

  // Paginate the full report list
  const total = allReports.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const paginatedReports = allReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

      {/* YTD Summary widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-navy-200">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-navy-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-navy-600">{formatCurrency(stats.ytdReimbursed)}</p>
              <p className="text-xs text-muted-foreground">{now.getFullYear()} YTD Reimbursed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.pendingAmount)}</p>
              <p className="text-xs text-muted-foreground">
                Awaiting Approval ({stats.submitted} report{stats.submitted !== 1 ? 's' : ''})
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-400 shrink-0" />
            <div>
              {stats.lastApproved ? (
                <>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.lastApproved.totalAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last Approved · {formatPeriod(stats.lastApproved.periodMonth, stats.lastApproved.periodYear)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-green-600">—</p>
                  <p className="text-xs text-muted-foreground">No approved reports yet</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action needed banner */}
      {actionNeeded.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {actionNeeded.length} report{actionNeeded.length > 1 ? 's' : ''} need{actionNeeded.length === 1 ? 's' : ''} your attention
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-2">
              {actionNeeded.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-white rounded-md border border-amber-200 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <span className="font-mono text-sm font-medium">{r.reportNumber}</span>
                    <span className="text-sm text-muted-foreground">{formatPeriod(r.periodMonth, r.periodYear)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{r._count.trips} trip{r._count.trips !== 1 ? 's' : ''}</span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/reports/${r.id}`}>
                        {r.status === 'REJECTED'
                          ? <><RefreshCw className="h-3.5 w-3.5" /> Review &amp; Resubmit</>
                          : <><Pencil className="h-3.5 w-3.5" /> Edit &amp; Submit</>
                        }
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Draft" value={stats.draft} color="text-muted-foreground" />
        <StatCard label="Pending Review" value={stats.submitted} color="text-amber-600" />
        <StatCard label="Approved" value={stats.approved} color="text-green-600" />
      </div>

      {/* Reports table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">All Reports</CardTitle>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              {total} report{total !== 1 ? 's' : ''}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {allReports.length === 0 ? (
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
            <>
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
                  {paginatedReports.map((report) => (
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    {page > 1 && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/reports?page=${page - 1}`}>Previous</Link>
                      </Button>
                    )}
                    {page < totalPages && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/reports?page=${page + 1}`}>Next</Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
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
