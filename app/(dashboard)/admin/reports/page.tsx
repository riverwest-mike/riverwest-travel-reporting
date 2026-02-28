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
import { ArrowLeft, Download, X } from 'lucide-react'

const PAGE_SIZE = 25

const MONTHS = [
  { value: '1', label: 'Jan' }, { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' }, { value: '4', label: 'Apr' },
  { value: '5', label: 'May' }, { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' }, { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' }, { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
]

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: {
    status?: string
    employeeId?: string
    managerId?: string
    year?: string
    month?: string
    page?: string
  }
}) {
  const employee = await requireEmployee()
  if (employee.role !== Role.ADMIN) redirect('/reports')

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const currentYear = new Date().getFullYear()
  const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

  const where: Record<string, unknown> = { deletedAt: null }
  if (searchParams.status) where.status = searchParams.status as ReportStatus
  if (searchParams.employeeId) where.employeeId = searchParams.employeeId
  if (searchParams.year) where.periodYear = parseInt(searchParams.year)
  if (searchParams.month) where.periodMonth = parseInt(searchParams.month)
  if (searchParams.managerId) where.employee = { managerId: searchParams.managerId }

  const [allMatchingReports, employees, managers] = await Promise.all([
    db.expenseReport.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true } },
        approvedBy: { select: { name: true } },
        _count: { select: { trips: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    db.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.employee.findMany({
      where: { isActive: true, role: { in: [Role.MANAGER, Role.ADMIN] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const total = allMatchingReports.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const reports = allMatchingReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Build query string for bulk export (same filters, no pagination)
  const exportParams = new URLSearchParams()
  if (searchParams.status) exportParams.set('status', searchParams.status)
  if (searchParams.employeeId) exportParams.set('employeeId', searchParams.employeeId)
  if (searchParams.managerId) exportParams.set('managerId', searchParams.managerId)
  if (searchParams.year) exportParams.set('year', searchParams.year)
  if (searchParams.month) exportParams.set('month', searchParams.month)
  const exportHref = `/api/admin/bulk-export?${exportParams.toString()}`

  // Merge new filter params while preserving others, reset to page 1
  function filterHref(overrides: Record<string, string>) {
    const merged: Record<string, string> = {}
    if (searchParams.status) merged.status = searchParams.status
    if (searchParams.employeeId) merged.employeeId = searchParams.employeeId
    if (searchParams.managerId) merged.managerId = searchParams.managerId
    if (searchParams.year) merged.year = searchParams.year
    if (searchParams.month) merged.month = searchParams.month
    Object.assign(merged, overrides)
    // Remove empty overrides
    Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k] })
    const p = new URLSearchParams(merged)
    const qs = p.toString()
    return `/admin/reports${qs ? `?${qs}` : ''}`
  }

  const activeEmployee = employees.find(e => e.id === searchParams.employeeId)
  const activeManager = managers.find(m => m.id === searchParams.managerId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Admin</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy-600">All Reports</h1>
            <p className="text-muted-foreground text-sm">{total} report{total !== 1 ? 's' : ''} match current filters</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={exportHref} download>
            <Download className="h-4 w-4" />
            Export to Excel
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Status */}
          <FilterRow label="Status">
            {[
              { value: '', label: 'All' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'SUBMITTED', label: 'Pending Review' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'NEEDS_REVISION', label: 'Needs Revision' },
              { value: 'REJECTED', label: 'Rejected (Legacy)' },
            ].map((opt) => (
              <FilterPill
                key={opt.value}
                href={filterHref({ status: opt.value, page: '1' })}
                active={(searchParams.status ?? '') === opt.value}
              >
                {opt.label}
              </FilterPill>
            ))}
          </FilterRow>

          {/* Year */}
          <FilterRow label="Year">
            <FilterPill href={filterHref({ year: '', page: '1' })} active={!searchParams.year}>All</FilterPill>
            {YEARS.map(y => (
              <FilterPill key={y} href={filterHref({ year: y, page: '1' })} active={searchParams.year === y}>{y}</FilterPill>
            ))}
          </FilterRow>

          {/* Month */}
          <FilterRow label="Month">
            <FilterPill href={filterHref({ month: '', page: '1' })} active={!searchParams.month}>All</FilterPill>
            {MONTHS.map(m => (
              <FilterPill key={m.value} href={filterHref({ month: m.value, page: '1' })} active={searchParams.month === m.value}>{m.label}</FilterPill>
            ))}
          </FilterRow>

          {/* Employee — shown as active chip + dropdown link list */}
          <FilterRow label="Employee">
            {activeEmployee ? (
              <span className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-sm font-medium bg-navy-600 text-white">
                {activeEmployee.name}
                <Link href={filterHref({ employeeId: '', page: '1' })} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </Link>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">All</span>
            )}
            <span className="text-muted-foreground text-xs">·</span>
            {employees.map(e => (
              <FilterPill key={e.id} href={filterHref({ employeeId: e.id, page: '1' })} active={searchParams.employeeId === e.id}>
                {e.name}
              </FilterPill>
            ))}
          </FilterRow>

          {/* Manager */}
          <FilterRow label="Manager">
            {activeManager ? (
              <span className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-sm font-medium bg-navy-600 text-white">
                {activeManager.name}
                <Link href={filterHref({ managerId: '', page: '1' })} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </Link>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">All</span>
            )}
            <span className="text-muted-foreground text-xs">·</span>
            {managers.map(m => (
              <FilterPill key={m.id} href={filterHref({ managerId: m.id, page: '1' })} active={searchParams.managerId === m.id}>
                {m.name}
              </FilterPill>
            ))}
          </FilterRow>

          {/* Clear all */}
          {(searchParams.status || searchParams.employeeId || searchParams.managerId || searchParams.year || searchParams.month) && (
            <div>
              <Link href="/admin/reports" className="text-xs text-destructive hover:underline underline-offset-2">
                Clear all filters
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No reports match the selected filters.</p>
          ) : (
            <>
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
                      <TableCell className="text-sm text-muted-foreground">{r.approvedBy?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/reports/${r.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} · {total} total
                  </p>
                  <div className="flex items-center gap-2">
                    {page > 1 && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={filterHref({ page: String(page - 1) })}>Previous</Link>
                      </Button>
                    )}
                    {page < totalPages && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={filterHref({ page: String(page + 1) })}>Next</Link>
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

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20 shrink-0">{label}</span>
      {children}
    </div>
  )
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-navy-600 text-white border-navy-600'
          : 'bg-white text-muted-foreground border-border hover:border-navy-300 hover:text-navy-700'
      }`}
    >
      {children}
    </Link>
  )
}
