'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Navigation2, Loader2 } from 'lucide-react'
import { formatCurrency, formatMiles } from '@/lib/utils'

interface RouteRow {
  origin: string
  destination: string
  count: number
  miles: number
  amount: number
}

interface Employee { id: string; name: string }

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function RouteFrequencyPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [canFilterByEmployee, setCanFilterByEmployee] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedEmployee, setSelectedEmployee] = useState('all')

  const fetchData = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams({ year: selectedYear })
    if (selectedMonth !== 'all') p.set('month', selectedMonth)
    if (selectedEmployee !== 'all') p.set('employeeId', selectedEmployee)
    fetch(`/api/routes?${p}`)
      .then(r => r.json())
      .then(d => {
        setRoutes(d.routes ?? [])
        setEmployees(d.employees ?? [])
        setCanFilterByEmployee(d.canFilterByEmployee ?? false)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear, selectedMonth, selectedEmployee])

  useEffect(() => { fetchData() }, [fetchData])

  const maxCount = Math.max(...routes.map(r => r.count), 1)

  const totals = routes.reduce(
    (acc, r) => ({ count: acc.count + r.count, miles: acc.miles + r.miles, amount: acc.amount + r.amount }),
    { count: 0, miles: 0, amount: 0 },
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-600">Route Frequency</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Most common origin → destination pairs from approved reports
        </p>
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
            {canFilterByEmployee && (
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-52"><SelectValue placeholder="All Employees" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedYear(String(currentYear)); setSelectedMonth('all'); setSelectedEmployee('all') }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation2 className="h-4 w-4 text-navy-500" />
            {routes.length} unique route{routes.length !== 1 ? 's' : ''}
            {selectedEmployee !== 'all' && employees.length > 0
              ? ` · ${employees.find(e => e.id === selectedEmployee)?.name ?? ''}`
              : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : routes.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-6">
              No approved trips found for the selected filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-center">Trips</TableHead>
                  <TableHead className="text-right">Total Miles</TableHead>
                  <TableHead className="text-right">Total Reimb.</TableHead>
                  <TableHead className="w-36">Frequency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((r, i) => (
                  <TableRow key={`${r.origin}|||${r.destination}`}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[180px]">
                      <span className="block truncate" title={r.origin}>{r.origin}</span>
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px]">
                      <span className="block truncate" title={r.destination}>{r.destination}</span>
                    </TableCell>
                    <TableCell className="text-sm text-center font-medium">{r.count}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatMiles(r.miles)}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(r.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(r.count / maxCount) * 100}%`,
                              background: `hsl(${220 - Math.round((r.count / maxCount) * 40)}, 60%, ${45 + Math.round((1 - r.count / maxCount) * 20)}%)`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{r.count}×</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="border-t-2 font-semibold bg-muted/30">
                  <TableCell colSpan={3} className="text-sm">Total</TableCell>
                  <TableCell className="text-sm text-center">{totals.count}</TableCell>
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
