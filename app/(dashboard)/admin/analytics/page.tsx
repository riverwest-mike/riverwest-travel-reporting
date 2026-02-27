'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, BarChart3, Users, MapPin, TrendingUp, Loader2 } from 'lucide-react'
import { formatCurrency, formatMiles } from '@/lib/utils'

interface Employee { id: string; name: string }
interface Property { id: string; name: string }

interface AnalyticsData {
  summary: {
    totalTrips: number
    totalMiles: number
    totalAmount: number
    uniqueEmployees: number
  }
  employeeStats: Array<{ id: string; name: string; trips: number; miles: number; amount: number }>
  topDestinations: Array<{ label: string; count: number; miles: number }>
  monthlyTrend: Array<{ label: string; trips: number; miles: number; amount: number }>
}

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function AnalyticsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear))
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [selectedProperty, setSelectedProperty] = useState<string>('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch('/api/properties').then(r => r.json()),
    ]).then(([emps, props]) => {
      setEmployees(emps)
      setProperties(props)
    }).catch(console.error)
  }, [])

  const fetchAnalytics = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedYear !== 'all') params.set('year', selectedYear)
    if (selectedEmployee !== 'all') params.set('employeeId', selectedEmployee)
    if (selectedProperty !== 'all') params.set('propertyId', selectedProperty)

    fetch(`/api/admin/analytics?${params}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear, selectedEmployee, selectedProperty])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy-600">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Mileage and reimbursement insights across the team
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground">Filter by:</span>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedYear(String(currentYear))
                setSelectedEmployee('all')
                setSelectedProperty('all')
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard icon={BarChart3} label="Total Trips" value={data.summary.totalTrips.toString()} />
            <SummaryCard icon={TrendingUp} label="Total Miles" value={formatMiles(data.summary.totalMiles)} />
            <SummaryCard icon={TrendingUp} label="Total Reimbursed" value={formatCurrency(data.summary.totalAmount)} />
            <SummaryCard icon={Users} label="Employees Active" value={data.summary.uniqueEmployees.toString()} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Miles by employee */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-navy-500" />
                  Miles by Employee
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.employeeStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-5 py-4">No data for selected filters.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-center">Trips</TableHead>
                        <TableHead className="text-right">Miles</TableHead>
                        <TableHead className="text-right">Reimbursed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.employeeStats.map((e, i) => (
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Most visited destinations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-navy-500" />
                  Most Visited Destinations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.topDestinations.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-5 py-4">No data for selected filters.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-center">Visits</TableHead>
                        <TableHead className="text-right">Total Miles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topDestinations.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                              <span className="max-w-[200px] truncate" title={d.label}>{d.label}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-center">{d.count}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{formatMiles(d.miles)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly trend */}
          {data.monthlyTrend.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-navy-500" />
                  Monthly Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-center">Trips</TableHead>
                      <TableHead className="text-right">Miles</TableHead>
                      <TableHead className="text-right">Reimbursed</TableHead>
                      <TableHead className="w-48">Miles Visualization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const maxMiles = Math.max(...data.monthlyTrend.map(m => m.miles), 1)
                      return data.monthlyTrend.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium">{m.label}</TableCell>
                          <TableCell className="text-sm text-center">{m.trips}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{formatMiles(m.miles)}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{formatCurrency(m.amount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-navy-500 rounded-full"
                                  style={{ width: `${(m.miles / maxMiles) * 100}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-8 w-8 text-navy-400 shrink-0" />
        <div>
          <p className="text-2xl font-bold text-navy-600">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
