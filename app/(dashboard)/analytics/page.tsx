'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  Users,
  MapPin,
  TrendingUp,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import { formatCurrency, formatMiles } from '@/lib/utils'

interface OverviewData {
  pipeline: {
    pendingCount: number
    pendingAmount: number
    needsRevisionCount: number
    draftCount: number
    oldestPendingDays: number | null
  }
  yearSummary: {
    year: number
    totalTrips: number
    totalMiles: number
    totalAmount: number
    uniqueEmployees: number
  }
  topEmployees: Array<{ name: string; miles: number; amount: number; trips: number }>
  topDestinations: Array<{ label: string; count: number }>
  recentMonths: Array<{ label: string; trips: number; miles: number; amount: number }>
  approvalSpeed: {
    orgAvgDays: number | null
    fastestManager: { name: string; avgDays: number } | null
    slowestManager: { name: string; avgDays: number } | null
    totalDecided: number
  }
}

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function AnalyticsOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(String(currentYear))

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/overview?year=${selectedYear}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Analytics Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Organization-wide mileage and reimbursement intelligence
          </p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Pipeline status */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Live Pipeline
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PipelineCard
                icon={Clock}
                label="Awaiting Approval"
                value={data.pipeline.pendingCount}
                sub={formatCurrency(data.pipeline.pendingAmount)}
                accent="amber"
                extra={
                  data.pipeline.oldestPendingDays !== null
                    ? `Oldest: ${data.pipeline.oldestPendingDays}d`
                    : undefined
                }
              />
              <PipelineCard
                icon={AlertTriangle}
                label="Needs Revision"
                value={data.pipeline.needsRevisionCount}
                accent="red"
              />
              <PipelineCard
                icon={FileText}
                label="In Draft"
                value={data.pipeline.draftCount}
                accent="gray"
              />
              <PipelineCard
                icon={CheckCircle2}
                label="Decided This Year"
                value={data.approvalSpeed.totalDecided}
                sub={
                  data.approvalSpeed.orgAvgDays !== null
                    ? `Avg ${data.approvalSpeed.orgAvgDays}d to decide`
                    : undefined
                }
                accent="green"
              />
            </div>
          </div>

          {/* Year summary */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {data.yearSummary.year} Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard icon={BarChart3} label="Approved Trips" value={String(data.yearSummary.totalTrips)} />
              <SummaryCard icon={TrendingUp} label="Total Miles" value={formatMiles(data.yearSummary.totalMiles)} />
              <SummaryCard icon={TrendingUp} label="Total Reimbursed" value={formatCurrency(data.yearSummary.totalAmount)} />
              <SummaryCard icon={Users} label="Active Employees" value={String(data.yearSummary.uniqueEmployees)} />
            </div>
          </div>

          {/* Four mini-preview sections */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top employees */}
            <PreviewCard
              title="Top Employees by Miles"
              icon={Users}
              href="/analytics/employees"
              empty={data.topEmployees.length === 0}
            >
              {data.topEmployees.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="font-medium truncate max-w-[160px]">{e.name}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{formatMiles(e.miles)}</span>
                </div>
              ))}
            </PreviewCard>

            {/* Top destinations */}
            <PreviewCard
              title="Most Visited Destinations"
              icon={MapPin}
              href="/analytics/properties"
              empty={data.topDestinations.length === 0}
            >
              {data.topDestinations.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="truncate max-w-[200px]" title={d.label}>{d.label}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{d.count} visit{d.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </PreviewCard>

            {/* Recent months */}
            <PreviewCard
              title="Recent Monthly Activity"
              icon={TrendingUp}
              href="/analytics/trends"
              empty={data.recentMonths.length === 0}
            >
              {data.recentMonths.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="font-medium w-24 shrink-0">{m.label}</span>
                  <span className="tabular-nums text-muted-foreground">{m.trips} trip{m.trips !== 1 ? 's' : ''}</span>
                  <span className="tabular-nums">{formatMiles(m.miles)}</span>
                  <span className="tabular-nums font-medium">{formatCurrency(m.amount)}</span>
                </div>
              ))}
            </PreviewCard>

            {/* Approval speed */}
            <PreviewCard
              title="Approval Speed"
              icon={Clock}
              href="/analytics/approvals"
              empty={data.approvalSpeed.totalDecided === 0}
            >
              <div className="space-y-3 text-sm py-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Org average</span>
                  <span className="font-bold text-navy-600">
                    {data.approvalSpeed.orgAvgDays !== null
                      ? `${data.approvalSpeed.orgAvgDays} days`
                      : '—'}
                  </span>
                </div>
                {data.approvalSpeed.fastestManager && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fastest</span>
                    <span className="text-green-600 font-medium">
                      {data.approvalSpeed.fastestManager.name} · {data.approvalSpeed.fastestManager.avgDays}d
                    </span>
                  </div>
                )}
                {data.approvalSpeed.slowestManager &&
                  data.approvalSpeed.slowestManager.name !== data.approvalSpeed.fastestManager?.name && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Slowest</span>
                      <span className="text-amber-600 font-medium">
                        {data.approvalSpeed.slowestManager.name} · {data.approvalSpeed.slowestManager.avgDays}d
                      </span>
                    </div>
                  )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reports decided</span>
                  <span>{data.approvalSpeed.totalDecided}</span>
                </div>
              </div>
            </PreviewCard>
          </div>
        </>
      ) : null}
    </div>
  )
}

function PipelineCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  extra,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  sub?: string
  accent: 'amber' | 'red' | 'gray' | 'green'
  extra?: string
}) {
  const colors: Record<string, string> = {
    amber: 'text-amber-600',
    red: 'text-destructive',
    gray: 'text-muted-foreground',
    green: 'text-green-600',
  }
  const iconColors: Record<string, string> = {
    amber: 'text-amber-400',
    red: 'text-destructive/70',
    gray: 'text-muted-foreground/60',
    green: 'text-green-400',
  }
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <Icon className={`h-7 w-7 shrink-0 mt-0.5 ${iconColors[accent]}`} />
        <div className="min-w-0">
          <p className={`text-2xl font-bold ${colors[accent]}`}>{value}</p>
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          {sub && <p className="text-xs font-medium mt-0.5">{sub}</p>}
          {extra && <p className="text-xs text-muted-foreground mt-0.5">{extra}</p>}
        </div>
      </CardContent>
    </Card>
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

function PreviewCard({
  title,
  icon: Icon,
  href,
  empty,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-navy-500" />
          {title}
          <Button asChild variant="ghost" size="sm" className="ml-auto h-7 text-xs text-navy-500">
            <Link href={href}>
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {empty ? (
          <p className="text-sm text-muted-foreground py-2">No data for selected year.</p>
        ) : (
          <div className="divide-y">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}
