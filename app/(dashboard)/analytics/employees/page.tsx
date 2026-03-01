'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Users, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { formatCurrency, formatMiles } from '@/lib/utils'

interface EmployeeRow {
  id: string
  name: string
  trips: number
  miles: number
  amount: number
  avgMilesPerTrip: number
}

interface Manager { id: string; name: string }

type SortCol = 'name' | 'trips' | 'miles' | 'amount' | 'avgMilesPerTrip'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function EmployeeMilesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [selectedManager, setSelectedManager] = useState('all')
  const [sortCol, setSortCol] = useState<SortCol>('miles')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ year: selectedYear })
    if (selectedManager !== 'all') params.set('managerId', selectedManager)
    fetch(`/api/analytics/employees?${params}`)
      .then(r => r.json())
      .then(d => {
        setEmployees(d.employees ?? [])
        setManagers(d.managers ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear, selectedManager])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const sorted = [...employees].sort((a, b) => {
    const v = sortDir === 'asc' ? 1 : -1
    if (sortCol === 'name') return v * a.name.localeCompare(b.name)
    return v * (a[sortCol] - b[sortCol])
  })

  const totals = employees.reduce(
    (acc, e) => ({ trips: acc.trips + e.trips, miles: acc.miles + e.miles, amount: acc.amount + e.amount }),
    { trips: 0, miles: 0, amount: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/analytics"><ArrowLeft className="h-4 w-4" /> Overview</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Employee Miles</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Mileage and reimbursement by employee</p>
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
            <Select value={selectedManager} onValueChange={setSelectedManager}>
              <SelectTrigger className="w-52"><SelectValue placeholder="All Managers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { setSelectedYear(String(currentYear)); setSelectedManager('all') }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-navy-500" />
            {employees.length} employee{employees.length !== 1 ? 's' : ''}
            {selectedManager !== 'all' && ' · filtered by manager'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-6">No data for selected filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead col="name" current={sortCol} dir={sortDir} onSort={handleSort}>Employee</SortHead>
                  <SortHead col="trips" current={sortCol} dir={sortDir} onSort={handleSort} align="center">Trips</SortHead>
                  <SortHead col="miles" current={sortCol} dir={sortDir} onSort={handleSort} align="right">Miles</SortHead>
                  <SortHead col="amount" current={sortCol} dir={sortDir} onSort={handleSort} align="right">Reimbursed</SortHead>
                  <SortHead col="avgMilesPerTrip" current={sortCol} dir={sortDir} onSort={handleSort} align="right">Avg Mi/Trip</SortHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e, i) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        {e.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-center">{e.trips}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatMiles(e.miles)}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums text-muted-foreground">{formatMiles(e.avgMilesPerTrip)}</TableCell>
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
