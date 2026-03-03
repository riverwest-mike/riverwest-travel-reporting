'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2, CalendarRange } from 'lucide-react'
import { formatCurrency, formatMiles } from '@/lib/utils'

interface YearSummary { year: number; trips: number; miles: number; amount: number; employees: number }
interface MonthRow {
  month: number
  current: { trips: number; miles: number; amount: number }
  prior: { trips: number; miles: number; amount: number }
}

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

function pct(curr: number, prior: number): number | null {
  if (prior === 0) return curr > 0 ? null : 0
  return Math.round(((curr - prior) / prior) * 1000) / 10
}

function Delta({ curr, prior }: { curr: number; prior: number }) {
  const p = pct(curr, prior)
  if (p === null) return <span className="text-xs text-green-600 font-medium">New</span>
  if (p === 0) return <Minus className="h-3 w-3 text-muted-foreground inline" />
  const up = p > 0
  return (
    <span className={`text-xs font-medium inline-flex items-center gap-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(p)}%
    </span>
  )
}

export default function YoYPage() {
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [current, setCurrent] = useState<YearSummary | null>(null)
  const [prior, setPrior] = useState<YearSummary | null>(null)
  const [monthly, setMonthly] = useState<MonthRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/yoy?year=${selectedYear}`)
      .then(r => r.json())
      .then(d => { setCurrent(d.current); setPrior(d.prior); setMonthly(d.monthly ?? []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear])

  const priorYearLabel = String(parseInt(selectedYear) - 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/analytics"><ArrowLeft className="h-4 w-4" /> Overview</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy-600">Year-over-Year</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {selectedYear} vs {priorYearLabel}
            </p>
          </div>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-36">
            <CalendarRange className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={String(y)}>{y} vs {y - 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : current && prior ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Approved Trips', curr: current.trips, prev: prior.trips, fmt: String },
              { label: 'Total Miles', curr: current.miles, prev: prior.miles, fmt: (v: number) => formatMiles(v) },
              { label: 'Total Reimbursed', curr: current.amount, prev: prior.amount, fmt: (v: number) => formatCurrency(v) },
              { label: 'Active Employees', curr: current.employees, prev: prior.employees, fmt: String },
            ].map(({ label, curr, prev, fmt }) => (
              <Card key={label}>
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-navy-600">{fmt(curr)}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{fmt(prev)} prior</span>
                    <Delta curr={curr} prior={prev} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Monthly comparison table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monthly Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Month</TableHead>
                    <TableHead className="text-center text-navy-600 font-semibold" colSpan={3}>
                      {selectedYear}
                    </TableHead>
                    <TableHead className="text-center text-muted-foreground font-semibold" colSpan={3}>
                      {priorYearLabel}
                    </TableHead>
                    <TableHead className="text-center">Miles Δ</TableHead>
                  </TableRow>
                  <TableRow className="bg-muted/20">
                    <TableHead />
                    <TableHead className="text-center text-xs font-medium">Trips</TableHead>
                    <TableHead className="text-right text-xs font-medium">Miles</TableHead>
                    <TableHead className="text-right text-xs font-medium">Reimb.</TableHead>
                    <TableHead className="text-center text-xs font-medium text-muted-foreground">Trips</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Miles</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Reimb.</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.map(row => {
                    const noData = row.current.trips === 0 && row.prior.trips === 0
                    return (
                      <TableRow
                        key={row.month}
                        className={noData ? 'opacity-40' : ''}
                      >
                        <TableCell className="text-sm font-medium">{MONTHS[row.month - 1]}</TableCell>
                        {/* Current year */}
                        <TableCell className="text-sm text-center">{row.current.trips || '—'}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums">
                          {row.current.miles > 0 ? formatMiles(row.current.miles) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {row.current.amount > 0 ? formatCurrency(row.current.amount) : '—'}
                        </TableCell>
                        {/* Prior year */}
                        <TableCell className="text-sm text-center text-muted-foreground">{row.prior.trips || '—'}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-muted-foreground">
                          {row.prior.miles > 0 ? formatMiles(row.prior.miles) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-right text-muted-foreground">
                          {row.prior.amount > 0 ? formatCurrency(row.prior.amount) : '—'}
                        </TableCell>
                        {/* Delta */}
                        <TableCell className="text-center">
                          {!noData && <Delta curr={row.current.miles} prior={row.prior.miles} />}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <tfoot>
                  <TableRow className="border-t-2 font-semibold bg-muted/30">
                    <TableCell className="text-sm">Total</TableCell>
                    <TableCell className="text-sm text-center">{current.trips}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatMiles(current.miles)}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(current.amount)}</TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground">{prior.trips}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums text-muted-foreground">{formatMiles(prior.miles)}</TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">{formatCurrency(prior.amount)}</TableCell>
                    <TableCell className="text-center">
                      <Delta curr={current.miles} prior={prior.miles} />
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
