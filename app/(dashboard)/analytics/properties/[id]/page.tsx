'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building2, Loader2, ExternalLink } from 'lucide-react'
import { formatCurrency, formatMiles, formatDate } from '@/lib/utils'

interface TripRow {
  id: string
  date: string
  reportId: string
  reportNumber: string
  period: string
  employeeId: string
  employeeName: string
  role: 'origin' | 'destination'
  originType: string
  originName: string
  destinationType: string
  destinationName: string
  roundTrip: boolean
  distance: number
  miles: number
  amount: number
  purpose: string
}

interface Property { id: string; name: string; address: string; city: string | null; state: string | null }

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function PropertyTripsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [property, setProperty] = useState<Property | null>(null)
  const [trips, setTrips] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [selectedMonth, setSelectedMonth] = useState('all')

  const fetchData = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams({ year: selectedYear })
    if (selectedMonth !== 'all') p.set('month', selectedMonth)
    fetch(`/api/analytics/properties/${id}?${p}`)
      .then(r => r.json())
      .then(d => { setProperty(d.property); setTrips(d.trips ?? []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, selectedYear, selectedMonth])

  useEffect(() => { fetchData() }, [fetchData])

  const totals = trips.reduce(
    (acc, t) => ({ miles: acc.miles + t.miles, amount: acc.amount + t.amount }),
    { miles: 0, amount: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/analytics/properties"><ArrowLeft className="h-4 w-4" /> Properties</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-navy-400" />
            {property?.name ?? 'Property'}
          </h1>
          {property && (
            <p className="text-muted-foreground text-sm mt-0.5">
              {property.address}{property.city ? `, ${property.city}` : ''}{property.state ? `, ${property.state}` : ''}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Months" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { setSelectedYear(String(currentYear)); setSelectedMonth('all') }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {trips.length} trip{trips.length !== 1 ? 's' : ''} · {formatMiles(Math.round(totals.miles * 10) / 10)} · {formatCurrency(Math.round(totals.amount * 100) / 100)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : trips.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-6">No trips for selected filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
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
                    <TableCell className="text-sm">
                      <Badge variant={t.role === 'origin' ? 'secondary' : 'outline'} className="text-xs">
                        {t.role === 'origin' ? 'Origin' : 'Destination'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[220px]">
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
                  <TableCell colSpan={4} className="text-sm">Total</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{formatMiles(Math.round(totals.miles * 10) / 10)}</TableCell>
                  <TableCell className="text-sm text-right">{formatCurrency(Math.round(totals.amount * 100) / 100)}</TableCell>
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
