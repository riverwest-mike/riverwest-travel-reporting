'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, User, FileText, Loader2, ExternalLink } from 'lucide-react'
import { formatCurrency, formatMiles, formatPeriod } from '@/lib/utils'

interface ReportSummary {
  id: string
  reportNumber: string
  periodMonth: number
  periodYear: number
  tripCount: number
  totalMiles: number
  totalAmount: number
  mileageRate: number
  approvedBy: string | null
  approvedAt: string | null
}

interface EmployeeInfo { id: string; name: string; email: string; role: string }
interface Totals { reports: number; trips: number; miles: number; amount: number }

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(String(currentYear))

  const fetchData = useCallback(() => {
    setLoading(true)
    fetch(`/api/analytics/employees/${id}?year=${selectedYear}`)
      .then(r => r.json())
      .then(d => {
        setEmployee(d.employee)
        setReports(d.reports ?? [])
        setTotals(d.totals)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, selectedYear])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/analytics/employees"><ArrowLeft className="h-4 w-4" /> Employee Miles</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600 flex items-center gap-2">
            <User className="h-5 w-5 text-navy-400" />
            {employee?.name ?? 'Employee'}
          </h1>
          {employee && (
            <p className="text-muted-foreground text-sm mt-0.5">{employee.email}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setSelectedYear(String(currentYear))}>
          Reset
        </Button>
      </div>

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Approved Reports', value: String(totals.reports) },
            { label: 'Total Trips', value: String(totals.trips) },
            { label: 'Total Miles', value: formatMiles(totals.miles) },
            { label: 'Total Reimbursed', value: formatCurrency(totals.amount) },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-navy-600">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-navy-500" />
            Approved Reports · {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-6">No approved reports for selected year.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">Trips</TableHead>
                  <TableHead className="text-right">Miles</TableHead>
                  <TableHead className="text-right">Reimbursed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium">
                      {formatPeriod(r.periodMonth, r.periodYear)}
                    </TableCell>
                    <TableCell className="text-sm text-center">{r.tripCount}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatMiles(r.totalMiles)}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatCurrency(r.totalAmount)}</TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">${r.mileageRate}/mi</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.approvedBy ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      <Link
                        href={`/admin/reports/${r.id}`}
                        className="text-navy-500 hover:underline flex items-center gap-1"
                      >
                        {r.reportNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {totals && (
                <tfoot>
                  <TableRow className="border-t-2 font-semibold bg-muted/30">
                    <TableCell className="text-sm">Total</TableCell>
                    <TableCell className="text-sm text-center">{totals.trips}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatMiles(totals.miles)}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(totals.amount)}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </tfoot>
              )}
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
