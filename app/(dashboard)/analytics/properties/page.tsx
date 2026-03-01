'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Building2, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { formatCurrency, formatMiles } from '@/lib/utils'

interface PropertyRow {
  id: string
  name: string
  asOrigin: number
  asDestination: number
  totalVisits: number
  miles: number
  amount: number
}

type SortCol = 'name' | 'asOrigin' | 'asDestination' | 'totalVisits' | 'miles' | 'amount'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function PropertiesAnalyticsPage() {
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [sortCol, setSortCol] = useState<SortCol>('totalVisits')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fetchData = useCallback(() => {
    setLoading(true)
    fetch(`/api/analytics/properties?year=${selectedYear}`)
      .then(r => r.json())
      .then(d => setProperties(d.properties ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const sorted = [...properties].sort((a, b) => {
    const v = sortDir === 'asc' ? 1 : -1
    if (sortCol === 'name') return v * a.name.localeCompare(b.name)
    return v * (a[sortCol] - b[sortCol])
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/analytics"><ArrowLeft className="h-4 w-4" /> Overview</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Properties</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Trip activity and spend by property</p>
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
            <Button variant="outline" size="sm" onClick={() => setSelectedYear(String(currentYear))}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-navy-500" />
            {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} with trip activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : properties.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-6">No property trip data for selected year.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead col="name" current={sortCol} dir={sortDir} onSort={handleSort}>Property</SortHead>
                  <SortHead col="asOrigin" current={sortCol} dir={sortDir} onSort={handleSort} align="center">As Origin</SortHead>
                  <SortHead col="asDestination" current={sortCol} dir={sortDir} onSort={handleSort} align="center">As Destination</SortHead>
                  <SortHead col="totalVisits" current={sortCol} dir={sortDir} onSort={handleSort} align="center">Total Trips</SortHead>
                  <SortHead col="miles" current={sortCol} dir={sortDir} onSort={handleSort} align="right">Miles</SortHead>
                  <SortHead col="amount" current={sortCol} dir={sortDir} onSort={handleSort} align="right">Reimbursed</SortHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        {p.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-center">{p.asOrigin}</TableCell>
                    <TableCell className="text-sm text-center">{p.asDestination}</TableCell>
                    <TableCell className="text-sm text-center font-medium">{p.totalVisits}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatMiles(p.miles)}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatCurrency(p.amount)}</TableCell>
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

function SortHead({
  col,
  current,
  dir,
  onSort,
  align = 'left',
  children,
}: {
  col: SortCol
  current: SortCol
  dir: 'asc' | 'desc'
  onSort: (col: SortCol) => void
  align?: 'left' | 'center' | 'right'
  children: React.ReactNode
}) {
  const active = col === current
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''
  return (
    <TableHead className={`${alignClass} cursor-pointer select-none hover:text-navy-600`} onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {active ? (
          dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  )
}
