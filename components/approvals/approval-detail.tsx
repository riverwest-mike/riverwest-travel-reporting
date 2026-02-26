'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/reports/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, AlertTriangle
} from 'lucide-react'
import { formatCurrency, formatMiles, formatDate, formatPeriod } from '@/lib/utils'
import { ReportStatus } from '@prisma/client'

interface Property {
  id: string; name: string; address: string; city: string | null; state: string | null
}
interface Trip {
  id: string; date: string | Date; originType: string
  originProperty: Property | null; originAddress: string | null
  destinationType: string; destinationProperty: Property | null; destinationAddress: string | null
  roundTrip: boolean; distance: number; purpose: string | null
}
interface ReportData {
  id: string; reportNumber: string; status: ReportStatus; periodMonth: number; periodYear: number
  totalMiles: number; totalAmount: number; mileageRate: number; notes: string | null
  submittedAt: string | null; approvedAt: string | null; rejectedAt: string | null
  rejectionReason: string | null
  employee: { id: string; name: string; email: string; managerId: string | null }
  trips: Trip[]
  approvedBy: { id: string; name: string } | null
  rejectedBy: { id: string; name: string } | null
  parentReport: { id: string; reportNumber: string } | null
}

function tripLabel(type: string, property: Property | null, address: string | null) {
  if (type === 'HOME') return 'Home'
  if (type === 'PROPERTY' && property) return property.name
  return address ?? 'Unknown'
}

export function ApprovalDetail({ report: initial, managerId }: { report: ReportData; managerId: string }) {
  const router = useRouter()
  const [report, setReport] = useState(initial)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPending = report.status === ReportStatus.SUBMITTED

  async function handleApprove() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${report.id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to approve')
      setReport({ ...report, status: ReportStatus.APPROVED, approvedAt: data.approvedAt })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${report.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to reject')
      setReport({
        ...report,
        status: ReportStatus.REJECTED,
        rejectedAt: data.rejectedAt,
        rejectionReason: rejectReason,
      })
      setShowRejectDialog(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/approvals"><ArrowLeft className="h-4 w-4" /> Approvals</Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-navy-600 font-mono">{report.reportNumber}</h1>
              <StatusBadge status={report.status} />
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {report.employee.name} · {formatPeriod(report.periodMonth, report.periodYear)}
              {report.parentReport && (
                <span className="ml-2 text-amber-600">
                  · Resubmission of {report.parentReport.reportNumber}
                </span>
              )}
            </p>
          </div>
        </div>

        {isPending && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={loading}
              className="text-destructive border-destructive/40 hover:bg-destructive/5"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button variant="success" onClick={handleApprove} disabled={loading}>
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              Approve
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Decision notice */}
      {report.status === ReportStatus.APPROVED && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Approved — Excel sent to accounting
          </div>
        </div>
      )}

      {report.status === ReportStatus.REJECTED && report.rejectionReason && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive font-medium mb-1">
            <XCircle className="h-4 w-4" />
            Rejected
          </div>
          <p className="text-sm text-muted-foreground">{report.rejectionReason}</p>
        </div>
      )}

      {/* Submission info */}
      {report.submittedAt && (
        <p className="text-sm text-muted-foreground">
          Submitted on {formatDate(report.submittedAt)}
        </p>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Trips</p>
            <p className="text-2xl font-bold text-navy-600 mt-1">{report.trips.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Miles</p>
            <p className="text-2xl font-bold text-navy-600 mt-1">{formatMiles(report.totalMiles)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Reimbursement ({report.mileageRate.toFixed(2)}/mi)
            </p>
            <p className="text-2xl font-bold text-navy-600 mt-1">{formatCurrency(report.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {report.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm">{report.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Trips table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trips</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Miles</TableHead>
                <TableHead>R/T</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.trips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="text-sm">{formatDate(trip.date)}</TableCell>
                  <TableCell className="text-sm">
                    {tripLabel(trip.originType, trip.originProperty, trip.originAddress)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {tripLabel(trip.destinationType, trip.destinationProperty, trip.destinationAddress)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{trip.distance.toFixed(1)}</TableCell>
                  <TableCell className="text-sm">
                    {trip.roundTrip ? <Badge variant="secondary" className="text-xs">R/T</Badge> : '—'}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums font-medium">
                    {(trip.roundTrip ? trip.distance * 2 : trip.distance).toFixed(1)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                    {trip.purpose ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Report</DialogTitle>
            <DialogDescription>
              Please provide a clear reason so {report.employee.name} knows what to correct.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Missing purpose for trip on Feb 3rd. Please add destination details."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !rejectReason.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
