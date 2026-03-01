'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, TrendingUp, Loader2 } from 'lucide-react'
import { formatCurrency, formatMiles } from '@/lib/utils'

interface TrendRow {
  label: string
  year: number
  month: number
  trips: number
  miles: number
  amount: number
}

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function MonthlyTrendsPage() {
  const [trends, setTrends] = useState<TrendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(String(currentYear))

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedYear !== 'all') params.set('year', selectedYear)
    fetch(`/api/analytics/trends?${params}`)
      .then(r => r.json())
      .then(d => setTrends(d.trends ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear])

  useEffect(() => { fetchData() }, [fetchData])

  const maxMiles = Math.max(...trends.map(t => t.miles), 1)

  const totals = trends.reduce(
    (acc, t) => ({ trips: acc.trips + t.trips, miles: acc.miles + t.miles, amount: acc.amount + t.amount }),
    { trips: 0, miles: 0, amount: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/analytics"><ArrowLeft className="h-4 w-4" /> Overview</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Monthly Trends</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Mileage activity over time</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setSelectedYear(String(currentYear))}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-navy-500" />
            {trends.length} period{trends.length !== 1 ? 's' : ''} with approved trips
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : trends.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-6">No data for selected period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">Trips</TableHead>
                  <TableHead className="text-right">Miles</TableHead>
                  <TableHead className="text-right">Reimbursed</TableHead>
                  <TableHead className="w-40">Miles Visualization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trends.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{t.label}</TableCell>
                    <TableCell className="text-sm text-center">{t.trips}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatMiles(t.miles)}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-navy-500 rounded-full transition-all"
                            style={{ width: `${(t.miles / maxMiles) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="border-t-2 font-semibold bg-muted/30">
                  <TableCell className="text-sm">Total</TableCell>
                  <TableCell className="text-sm text-center">{totals.trips}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{formatMiles(totals.miles)}</TableCell>
                  <TableCell className="text-sm text-right">{formatCurrency(totals.amount)}</TableCell>
                  <TableCell />
                </TableRow>
              </tfoot>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
