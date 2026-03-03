'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, TrendingUp, Users, Loader2, ExternalLink } from 'lucide-react'
import { formatCurrency, formatMiles, formatDate } from '@/lib/utils'

interface TripRow {
  id: string
  date: string
  reportId: string
  reportNumber: string
  employeeId: string
  employeeName: string
  originName: string
  destinationName: string
  roundTrip: boolean
  miles: number
  amount: number
  purpose: string
}

interface EmployeeSummary {
  id: string
  name: string
  trips: number
  miles: number
  amount: number
}

const MONTH_NAMES = [
  '','January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function TrendMonthDetailPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = use(params)
  const [trips, setTrips] = useState<TripRow[]>([])
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/analytics/trends/${year}/${month}`)
      .then(r => r.json())
      .then(d => { setTrips(d.trips ?? []); setEmployees(d.employees ?? []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  const monthName = MONTH_NAMES[parseInt(month)] ?? month
  const totals = trips.reduce(
    (acc, t) => ({ miles: acc.miles + t.miles, amount: acc.amount + t.amount }),
    { miles: 0, amount: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/analytics/trends"><ArrowLeft className="h-4 w-4" /> Monthly Trends</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600">{monthName} {year}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">All approved trips for this period</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Employees', value: String(employees.length) },
              { label: 'Trips', value: String(trips.length) },
              { label: 'Total Miles', value: formatMiles(Math.round(totals.miles * 10) / 10) },
              { label: 'Total Reimbursed', value: formatCurrency(Math.round(totals.amount * 100) / 100) },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-navy-600">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Employee breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-navy-500" />
                By Employee
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-4">No data.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-center">Trips</TableHead>
                      <TableHead className="text-right">Miles</TableHead>
                      <TableHead className="text-right">Reimbursed</TableHead>
                      <TableHead>Drill-Down</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm font-medium">{e.name}</TableCell>
                        <TableCell className="text-sm text-center">{e.trips}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums">{formatMiles(e.miles)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                        <TableCell>
                          <Link
                            href={`/analytics/employees/${e.id}?year=${year}`}
                            className="text-xs text-navy-500 hover:underline flex items-center gap-1"
                          >
                            View all <ExternalLink className="h-3 w-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Trip detail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-navy-500" />
                All Trips ({trips.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {trips.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-4">No trips.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Miles</TableHead>
                      <TableHead className="text-right">Reimbursed</TableHead>
                      <TableHead>Report</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(t.date)}</TableCell>
                        <TableCell className="text-sm font-medium">{t.employeeName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          <span className="truncate block" title={`${t.originName} → ${t.destinationName}`}>
                            {t.originName} → {t.destinationName}
                          </span>
                          {t.roundTrip && <span className="text-xs text-navy-400">Round trip</span>}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums">{formatMiles(t.miles)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                        <TableCell className="text-sm">
                          <Link
                            href={`/admin/reports/${t.reportId}`}
                            className="text-navy-500 hover:underline flex items-center gap-1"
                          >
                            {t.reportNumber}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <TableRow className="border-t-2 font-semibold bg-muted/30">
                      <TableCell colSpan={3} className="text-sm">Total</TableCell>
                      <TableCell className="text-sm text-right tabular-nums">{formatMiles(Math.round(totals.miles * 10) / 10)}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(Math.round(totals.amount * 100) / 100)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </tfoot>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
