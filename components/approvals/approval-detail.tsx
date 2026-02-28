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
  ArrowLeft, CheckCircle2, XCircle, Loader2, AlertTriangle, MessageSquare, Copy, User
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
  managerNote: string | null
}
interface ReportData {
  id: string; reportNumber: string; status: ReportStatus; periodMonth: number; periodYear: number
  totalMiles: number; totalAmount: number; mileageRate: number; notes: string | null
  submittedAt: string | null; approvedAt: string | null; rejectedAt: string | null
  rejectionReason: string | null
  employee: { id: string; name: string; email: string }
  trips: Trip[]
  approvedBy: { id: string; name: string } | null
  rejectedBy: { id: string; name: string } | null
}

function tripLabel(type: string, property: Property | null, address: string | null) {
  if (type === 'HOME') return 'Primary Office'
  if (type === 'PROPERTY' && property) return property.name
  return address ?? 'Unknown'
}

export function ApprovalDetail({ report: initial, managerId }: { report: ReportData; managerId: string }) {
  const [report, setReport] = useState(initial)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState('')

  // Per-trip manager notes (local state — sent all at once with rejection)
  const [tripNotes, setTripNotes] = useState<Record<string, string>>({})
  const [notingTripId, setNotingTripId] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState('')

  // Report-level approve/reject dialogs
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isPending = report.status === ReportStatus.SUBMITTED
  const enteredNotes = Object.entries(tripNotes).filter(([, note]) => note.trim())

  // Detect duplicate trips
  const duplicateTripIds = new Set<string>()
  report.trips.forEach((a, i) => {
    report.trips.forEach((b, j) => {
      if (i >= j) return
      const sameDate = new Date(a.date).toDateString() === new Date(b.date).toDateString()
      const sameOrigin = a.originType === b.originType && (
        a.originType === 'HOME' ? true
          : a.originType === 'PROPERTY' ? a.originProperty?.id === b.originProperty?.id
          : a.originAddress === b.originAddress
      )
      const sameDest = a.destinationType === b.destinationType && (
        a.destinationType === 'PROPERTY' ? a.destinationProperty?.id === b.destinationProperty?.id
          : a.destinationAddress === b.destinationAddress
      )
      if (sameDate && sameOrigin && sameDest) {
        duplicateTripIds.add(a.id)
        duplicateTripIds.add(b.id)
      }
    })
  })

  // ── Per-trip note helpers ──

  function startNote(tripId: string) {
    setDraftNote(tripNotes[tripId] ?? '')
    setNotingTripId(tripId)
  }

  function saveNote(tripId: string) {
    if (draftNote.trim()) {
      setTripNotes(prev => ({ ...prev, [tripId]: draftNote.trim() }))
    } else {
      setTripNotes(prev => { const next = { ...prev }; delete next[tripId]; return next })
    }
    setNotingTripId(null)
    setDraftNote('')
  }

  function cancelNote() {
    setNotingTripId(null)
    setDraftNote('')
  }

  // ── Report-level actions ──

  async function handleApprove() {
    setShowApproveDialog(false)
    setReportLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${report.id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to approve')
      setReport({ ...report, status: ReportStatus.APPROVED, approvedAt: data.approvedAt })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setReportLoading(false)
    }
  }

  async function handleSendBack() {
    if (!rejectReason.trim()) return
    setReportLoading(true)
    setError('')
    try {
      const tripNotesPayload = enteredNotes.map(([tripId, note]) => ({ tripId, note }))
      const res = await fetch(`/api/reports/${report.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason, tripNotes: tripNotesPayload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send back')
      setReport({
        ...report,
        status: ReportStatus.NEEDS_REVISION,
        rejectedAt: data.rejectedAt,
        rejectionReason: rejectReason,
      })
      setShowRejectDialog(false)
      setRejectReason('')
      setTripNotes({})
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
            </p>
          </div>
        </div>

        {isPending && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={reportLoading}
              className="text-destructive border-destructive/40 hover:bg-destructive/5"
            >
              <XCircle className="h-4 w-4" />
              Send Back for Revision
            </Button>
            <Button variant="success" onClick={() => setShowApproveDialog(true)} disabled={reportLoading}>
              {reportLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              Approve Report
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

      {(report.status === ReportStatus.NEEDS_REVISION || report.status === ReportStatus.REJECTED) && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive font-medium mb-1">
            <XCircle className="h-4 w-4" />
            Sent back to {report.employee.name} for revision
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

      {/* Review hint */}
      {isPending && (
        <p className="text-sm text-muted-foreground">
          Review each trip below. Optionally use <strong>Add Note</strong> to flag specific trips
          with feedback, then click <strong>Approve Report</strong> or <strong>Send Back for Revision</strong>.
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
                {isPending && <TableHead className="w-36">Manager Note</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicateTripIds.size > 0 && (
                <TableRow>
                  <TableCell colSpan={isPending ? 8 : 7} className="py-2 bg-amber-50 border-b border-amber-200">
                    <p className="text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <strong>Possible duplicates detected</strong> — trips highlighted in amber share the same date, origin, and destination.
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {report.trips.map((trip) => {
                const isDupe = duplicateTripIds.has(trip.id)
                const noteText = tripNotes[trip.id]
                const isNotingThis = notingTripId === trip.id
                return (
                  <Fragment key={trip.id}>
                    <TableRow className={isDupe ? 'bg-amber-50/60' : undefined}>
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
                      {isPending && (
                        <TableCell>
                          {noteText ? (
                            <button
                              type="button"
                              onClick={() => startNote(trip.id)}
                              className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 hover:bg-amber-100 max-w-[130px] truncate block text-left"
                              title={noteText}
                            >
                              {noteText}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startNote(trip.id)}
                              className="text-xs text-muted-foreground hover:text-navy-600 flex items-center gap-1"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Add note
                            </button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Inline note editor */}
                    {isNotingThis && (
                      <TableRow>
                        <TableCell colSpan={isPending ? 8 : 7} className="py-2 bg-amber-50/30 border-t border-amber-100">
                          <div className="flex items-start gap-2">
                            <Textarea
                              placeholder="e.g. Mileage looks higher than expected — please verify the route."
                              value={draftNote}
                              onChange={(e) => setDraftNote(e.target.value)}
                              rows={2}
                              className="text-sm flex-1"
                              autoFocus
                            />
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button size="sm" onClick={() => saveNote(trip.id)}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={cancelNote}>Cancel</Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Duplicate warning */}
                    {isDupe && (
                      <TableRow className="bg-amber-50/60">
                        <TableCell colSpan={isPending ? 8 : 7} className="py-1 pb-2">
                          <p className="text-xs text-amber-700 flex items-center gap-1.5 pl-1">
                            <Copy className="h-3.5 w-3.5 shrink-0" />
                            Possible duplicate — same date, origin, and destination as another trip on this report.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve confirmation dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Report</DialogTitle>
            <DialogDescription>
              Confirm approval of <strong>{report.reportNumber}</strong> for{' '}
              <strong>{report.employee.name}</strong>. An Excel summary will be emailed to accounting
              and the employee will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total miles</span>
              <span className="font-medium">{report.totalMiles.toFixed(1)} mi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reimbursement</span>
              <span className="font-medium">${report.totalAmount.toFixed(2)}</span>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button variant="success" onClick={handleApprove} disabled={reportLoading}>
              {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Back dialog */}
      <Dialog open={showRejectDialog} onOpenChange={(open) => { if (!open) { setShowRejectDialog(false); setRejectReason('') } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Back for Revision</DialogTitle>
            <DialogDescription>
              Provide a clear explanation so {report.employee.name} knows what to correct.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="e.g. Please double-check the mileage on the Jan 15 trip — the distance seems higher than expected for that route."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            {enteredNotes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Per-trip notes ({enteredNotes.length})
                </p>
                <div className="rounded-md border bg-muted/30 divide-y text-sm">
                  {enteredNotes.map(([tripId, note]) => {
                    const trip = report.trips.find(t => t.id === tripId)
                    if (!trip) return null
                    return (
                      <div key={tripId} className="px-3 py-2">
                        <span className="font-medium text-navy-700">
                          {formatDate(trip.date)} · {tripLabel(trip.originType, trip.originProperty, trip.originAddress)} → {tripLabel(trip.destinationType, trip.destinationProperty, trip.destinationAddress)}
                        </span>
                        <p className="text-muted-foreground mt-0.5">{note}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason('') }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleSendBack}
              disabled={reportLoading || !rejectReason.trim()}
            >
              {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
