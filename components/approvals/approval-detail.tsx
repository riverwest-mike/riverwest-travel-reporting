'use client'

import { useState, Fragment } from 'react'
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
  ArrowLeft, CheckCircle2, XCircle, Loader2, AlertTriangle, Check, X, User
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
  tripStatus: string; tripRejectionReason: string | null
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

function TripStatusBadge({ status }: { status: string }) {
  if (status === 'APPROVED') {
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Approved</Badge>
  }
  if (status === 'REJECTED') {
    return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Rejected</Badge>
  }
  return <Badge variant="secondary" className="text-xs">Pending</Badge>
}

export function ApprovalDetail({ report: initial, managerId }: { report: ReportData; managerId: string }) {
  const [report, setReport] = useState(initial)
  const [tripLoadingId, setTripLoadingId] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState('')

  // Trip reject dialog
  const [rejectTripTarget, setRejectTripTarget] = useState<string | null>(null)
  const [rejectTripReason, setRejectTripReason] = useState('')

  // Report-level reject dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isPending = report.status === ReportStatus.SUBMITTED
  const rejectedTrips = report.trips.filter((t) => t.tripStatus === 'REJECTED')
  const hasRejectedTrips = rejectedTrips.length > 0

  // ── Trip-level actions ──

  async function handleApproveTrip(tripId: string) {
    setTripLoadingId(tripId)
    setError('')
    try {
      const res = await fetch(`/api/trips/${tripId}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to approve trip')
      setReport((prev) => ({
        ...prev,
        trips: prev.trips.map((t) =>
          t.id === tripId ? { ...t, tripStatus: 'APPROVED', tripRejectionReason: null } : t
        ),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setTripLoadingId(null)
    }
  }

  async function handleRejectTripSubmit() {
    if (!rejectTripTarget || !rejectTripReason.trim()) return
    setTripLoadingId(rejectTripTarget)
    setError('')
    try {
      const res = await fetch(`/api/trips/${rejectTripTarget}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectTripReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to reject trip')
      const savedReason = rejectTripReason
      const savedId = rejectTripTarget
      setReport((prev) => ({
        ...prev,
        trips: prev.trips.map((t) =>
          t.id === savedId ? { ...t, tripStatus: 'REJECTED', tripRejectionReason: savedReason } : t
        ),
      }))
      setRejectTripTarget(null)
      setRejectTripReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setTripLoadingId(null)
    }
  }

  // ── Report-level actions ──

  async function handleApproveAll() {
    setReportLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${report.id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to approve')
      setReport({
        ...report,
        status: ReportStatus.APPROVED,
        approvedAt: data.approvedAt,
        trips: report.trips.map((t) => ({ ...t, tripStatus: 'APPROVED' })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setReportLoading(false)
    }
  }

  async function handleSendBack() {
    // Build the rejection reason from rejected trips
    const autoReason = rejectedTrips
      .map(
        (t) =>
          `• Trip on ${formatDate(t.date)} (${tripLabel(t.originType, t.originProperty, t.originAddress)} → ${tripLabel(t.destinationType, t.destinationProperty, t.destinationAddress)}): ${t.tripRejectionReason}`
      )
      .join('\n')

    setReportLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${report.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: autoReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send back')
      setReport({
        ...report,
        status: ReportStatus.REJECTED,
        rejectedAt: data.rejectedAt,
        rejectionReason: autoReason,
      })
      setShowRejectDialog(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setReportLoading(false)
    }
  }

  async function handleRejectReport() {
    if (!rejectReason.trim()) return
    setReportLoading(true)
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
      setReportLoading(false)
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
            {hasRejectedTrips ? (
              <Button
                onClick={handleSendBack}
                disabled={reportLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Send Back to Employee ({rejectedTrips.length} rejected)
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                disabled={reportLoading}
                className="text-destructive border-destructive/40 hover:bg-destructive/5"
              >
                <XCircle className="h-4 w-4" />
                Reject Report
              </Button>
            )}
            <Button variant="success" onClick={handleApproveAll} disabled={reportLoading}>
              {reportLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              Approve All
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
            Approved by {report.approvedBy?.name ?? 'Manager'}
            {report.approvedAt && (
              <span className="font-normal text-green-600">on {formatDate(report.approvedAt)}</span>
            )}
            — Excel sent to accounting
          </div>
          <div className="flex items-center gap-1.5 text-sm text-green-700 mt-1">
            <User className="h-3.5 w-3.5" />
            <span>Employee: <strong>{report.employee.name}</strong> ({report.employee.email})</span>
          </div>
        </div>
      )}

      {report.status === ReportStatus.REJECTED && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive font-medium mb-1">
            <XCircle className="h-4 w-4" />
            Sent back to {report.employee.name}
          </div>
          {report.rejectionReason && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{report.rejectionReason}</p>
          )}
        </div>
      )}

      {/* Submission info */}
      {report.submittedAt && (
        <p className="text-sm text-muted-foreground">
          Submitted by <strong>{report.employee.name}</strong> on {formatDate(report.submittedAt)}
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

      {/* Trip-level review hint */}
      {isPending && (
        <p className="text-sm text-muted-foreground">
          Use the <Check className="h-3.5 w-3.5 inline text-green-600" /> and{' '}
          <X className="h-3.5 w-3.5 inline text-destructive" /> buttons to approve or reject individual
          trips, then click <strong>Approve All</strong> or <strong>Send Back to Employee</strong>.
        </p>
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
                <TableHead>Status</TableHead>
                {isPending && <TableHead className="w-24 text-right">Review</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.trips.map((trip) => (
                <Fragment key={trip.id}>
                  <TableRow
                    className={trip.tripStatus === 'REJECTED' ? 'bg-red-50/50' : undefined}
                  >
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
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {trip.purpose ?? '—'}
                    </TableCell>
                    <TableCell>
                      <TripStatusBadge status={trip.tripStatus} />
                    </TableCell>
                    {isPending && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApproveTrip(trip.id)}
                            disabled={tripLoadingId === trip.id || trip.tripStatus === 'APPROVED'}
                            title="Approve trip"
                          >
                            {tripLoadingId === trip.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setRejectTripTarget(trip.id); setRejectTripReason('') }}
                            disabled={tripLoadingId === trip.id}
                            title="Reject trip"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {trip.tripStatus === 'REJECTED' && trip.tripRejectionReason && (
                    <TableRow className="bg-red-50/50">
                      <TableCell colSpan={isPending ? 9 : 8} className="py-1 pb-2">
                        <p className="text-xs text-destructive flex items-start gap-1.5 pl-1">
                          <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span><strong>Rejection reason:</strong> {trip.tripRejectionReason}</span>
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trip reject dialog */}
      <Dialog open={!!rejectTripTarget} onOpenChange={(open) => { if (!open) setRejectTripTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Trip</DialogTitle>
            <DialogDescription>
              Provide a reason so {report.employee.name} knows what to correct for this trip.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Destination address appears incorrect. Please verify and resubmit."
            value={rejectTripReason}
            onChange={(e) => setRejectTripReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTripTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRejectTripSubmit}
              disabled={tripLoadingId !== null || !rejectTripReason.trim()}
            >
              {tripLoadingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report-level reject dialog */}
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
              onClick={handleRejectReport}
              disabled={reportLoading || !rejectReason.trim()}
            >
              {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reject Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
