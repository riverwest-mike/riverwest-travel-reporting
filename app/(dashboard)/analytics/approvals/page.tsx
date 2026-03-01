'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Clock, Loader2, ChevronUp, ChevronDown } from 'lucide-react'

interface ManagerRow {
  id: string
  name: string
  avgDays: number
  count: number
  approved: number
  rejected: number
}

interface ManagerListItem { id: string; name: string }

type SortCol = 'name' | 'avgDays' | 'count' | 'approved' | 'rejected'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function ApprovalsPage() {
  const [managers, setManagers] = useState<ManagerRow[]>([])
  const [managerList, setManagerList] = useState<ManagerListItem[]>([])
  const [overallAvgDays, setOverallAvgDays] = useState<number | null>(null)
  const [totalDecided, setTotalDecided] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [selectedManager, setSelectedManager] = useState('all')
  const [sortCol, setSortCol] = useState<SortCol>('avgDays')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ year: selectedYear })
    if (selectedManager !== 'all') params.set('managerId', selectedManager)
    fetch(`/api/analytics/approvals?${params}`)
      .then(r => r.json())
      .then(d => {
        setManagers(d.managers ?? [])
        setManagerList(d.managerList ?? [])
        setOverallAvgDays(d.overallAvgDays ?? null)
        setTotalDecided(d.totalDecided ?? 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear, selectedManager])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else {
      setSortCol(col)
      // Default: avgDays asc (faster = better), others desc
      setSortDir(col === 'avgDays' ? 'asc' : 'desc')
    }
  }

  const sorted = [...managers].sort((a, b) => {
    const v = sortDir === 'asc' ? 1 : -1
    if (sortCol === 'name') return v * a.name.localeCompare(b.name)
    return v * (a[sortCol] - b[sortCol])
  })

  // For bar visualization: slower = longer bar (inverted — green for fast, amber for slow)
  const maxDays = Math.max(...managers.map(m => m.avgDays), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/analytics"><ArrowLeft className="h-4 w-4" /> Overview</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Approval Metrics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manager turnaround time on expense reports</p>
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
                {managerList.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
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
            <Clock className="h-4 w-4 text-navy-500" />
            Approval Speed by Manager
            {totalDecided > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground bg-navy-50 border border-navy-200 px-2 py-0.5 rounded-full">
                {totalDecided} reports decided
                {overallAvgDays !== null && ` · Org avg: ${overallAvgDays}d`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : managers.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-6">No approval data for selected filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead col="name" current={sortCol} dir={sortDir} onSort={handleSort}>Manager</SortHead>
                  <SortHead col="avgDays" current={sortCol} dir={sortDir} onSort={handleSort} align="center">Avg Days to Decision</SortHead>
                  <SortHead col="count" current={sortCol} dir={sortDir} onSort={handleSort} align="center">Reports Reviewed</SortHead>
                  <SortHead col="approved" current={sortCol} dir={sortDir} onSort={handleSort} align="center">Approved</SortHead>
                  <SortHead col="rejected" current={sortCol} dir={sortDir} onSort={handleSort} align="center">Returned</SortHead>
                  <TableHead className="w-36">Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((m) => {
                  // Bar: proportion of maxDays. Shorter bar = faster. Color: green if ≤ org avg, amber if above.
                  const pct = (m.avgDays / maxDays) * 100
                  const isFast = overallAvgDays === null || m.avgDays <= overallAvgDays
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm font-medium">{m.name}</TableCell>
                      <TableCell className="text-sm text-center tabular-nums font-medium">
                        {m.avgDays} day{m.avgDays !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-sm text-center">{m.count}</TableCell>
                      <TableCell className="text-sm text-center text-green-600">{m.approved}</TableCell>
                      <TableCell className="text-sm text-center text-amber-600">{m.rejected}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isFast ? 'bg-green-500' : 'bg-amber-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
