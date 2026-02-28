'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/reports/status-badge'
import { TripForm } from '@/components/reports/trip-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, PlusCircle, Trash2, Pencil, Send, CheckCircle2, XCircle, RefreshCw, Loader2, AlertTriangle, ShieldAlert
} from 'lucide-react'
import { formatCurrency, formatMiles, formatDate, formatPeriod } from '@/lib/utils'
import { Role, ReportStatus } from '@prisma/client'

interface Property {
  id: string; name: string; address: string; city: string | null; state: string | null
}
interface Trip {
  id: string; date: string | Date; originType: string
  originProperty: Property | null; originAddress: string | null; originPropertyId?: string | null
  destinationType: string; destinationProperty: Property | null; destinationAddress: string | null; destinationPropertyId?: string | null
  roundTrip: boolean; distance: number; purpose: string | null
  tripStatus: string; tripRejectionReason: string | null; managerNote: string | null
}
interface ReportData {
  id: string; reportNumber: string; status: ReportStatus; periodMonth: number; periodYear: number
  totalMiles: number; totalAmount: number; mileageRate: number; notes: string | null
  submittedAt: string | null; approvedAt: string | null; rejectedAt: string | null
  rejectionReason: string | null
  employee: { id: string; name: string; email: string; homeAddress: string | null }
  trips: Trip[]
  approvedBy: { id: string; name: string } | null
  rejectedBy: { id: string; name: string } | null
}

interface Props {
  report: ReportData
  currentEmployee: { id: string; role: Role; homeAddress: string | null }
  isOwner: boolean
}

function tripLabel(type: string, property: Property | null, address: string | null) {
  if (type === 'HOME') return 'Primary Office'
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
  return null
}

export function ReportDetail({ report: initialReport, currentEmployee, isOwner }: Props) {
  const router = useRouter()
  const [report, setReport] = useState(initialReport)
  const [showTripForm, setShowTripForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState('')

  const isDraft = report.status === ReportStatus.DRAFT
  const isNeedsRevision = report.status === ReportStatus.NEEDS_REVISION || report.status === ReportStatus.REJECTED
  const isApproved = report.status === ReportStatus.APPROVED
  const isAdmin = currentEmployee.role === Role.ADMIN
  const canEdit = isOwner && (isDraft || isNeedsRevision)
  const canSubmit = isOwner && isDraft && report.trips.length > 0
  const canResubmit = isOwner && isNeedsRevision && report.trips.length > 0

  // Trips with manager notes (shown when report needs revision)
  const annotatedTrips = isNeedsRevision
    ? report.trips.filter((t) => t.managerNote)
    : []

  // Resubmit message for approvers
  const [resubmitMessage, setResubmitMessage] = useState('')

  // Admin delete state
  const [showAdminDeleteDialog, setShowAdminDeleteDialog] = useState(false)
  const [adminDeleteReason, setAdminDeleteReason] = useState('')

  async function handleAdminDelete() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: adminDeleteReason }),
      })
      if (!res.ok) throw new Error('Failed to delete report')
      router.push('/admin/reports')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setActionLoading(false)
    }
  }

  async function refreshReport() {
    const res = await fetch(`/api/reports/${report.id}`)
    if (res.ok) setReport(await res.json())
  }

  async function handleTripAdded() {
    setShowTripForm(false)
    setEditingTrip(null)
    await refreshReport()
  }

  async function handleDeleteTrip(tripId: string) {
    setDeletingTripId(tripId)
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete trip')
      await refreshReport()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setDeletingTripId(null)
      setConfirmDelete(null)
    }
  }

  async function handleSubmit() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${report.id}/submit`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit')
      setReport({ ...report, status: ReportStatus.SUBMITTED, submittedAt: data.submittedAt })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleResubmit() {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${report.id}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resubmitMessage: resubmitMessage.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to resubmit')
      setResubmitMessage('')
      // Same report, now SUBMITTED — refresh to clear manager notes
      await refreshReport()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteReport() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/reports/${report.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/reports')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setActionLoading(false)
    }
  }

  function startEditTrip(trip: Trip) {
    setShowTripForm(false)
    setEditingTrip(trip)
  }

  const showTripStatuses = false // Per-trip statuses are no longer used in the approval flow

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-navy-600 font-mono">{report.reportNumber}</h1>
              <StatusBadge status={report.status} />
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {formatPeriod(report.periodMonth, report.periodYear)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSubmit && (
            <Button onClick={handleSubmit} disabled={actionLoading} variant="success">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit for Approval
            </Button>
          )}
          {canResubmit && (
            <Button onClick={handleResubmit} disabled={actionLoading} variant="warning">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Resubmit for Approval
            </Button>
          )}
          {isDraft && isOwner && report.trips.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteReport}
              disabled={actionLoading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete Draft
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdminDeleteDialog(true)}
              disabled={actionLoading}
              className="text-destructive hover:text-destructive border-destructive/40"
            >
              <ShieldAlert className="h-4 w-4" /> Admin Delete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Needs revision banner */}
      {isNeedsRevision && (
        <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Sent back for revision by {report.rejectedBy?.name ?? 'Manager'}
          </div>
          {report.rejectionReason && (
            <p className="text-sm text-amber-800 whitespace-pre-line">{report.rejectionReason}</p>
          )}
          {annotatedTrips.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Per-trip notes</p>
              {annotatedTrips.map(t => (
                <p key={t.id} className="text-xs text-amber-800">
                  <span className="font-medium">{formatDate(t.date)} · {tripLabel(t.originType, t.originProperty, t.originAddress)} → {tripLabel(t.destinationType, t.destinationProperty, t.destinationAddress)}:</span>{' '}
                  {t.managerNote}
                </p>
              ))}
            </div>
          )}
          {isOwner && (
            <div className="pt-2 space-y-2">
              <p className="text-sm text-amber-700 font-medium">
                Edit your trips below, then resubmit when ready.
              </p>
              <Textarea
                placeholder="Optional message to your approver (e.g. I&apos;ve corrected the mileage on the Jan 15 trip)..."
                value={resubmitMessage}
                onChange={(e) => setResubmitMessage(e.target.value)}
                rows={2}
                className="text-sm bg-white border-amber-300 focus:border-amber-400"
              />
            </div>
          )}
        </div>
      )}

      {/* Approved notice */}
      {report.status === ReportStatus.APPROVED && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Approved by {report.approvedBy?.name ?? 'Manager'}
            {report.approvedAt && (
              <span className="font-normal text-green-600">on {formatDate(report.approvedAt)}</span>
            )}
          </div>
          <p className="text-sm text-green-600 mt-1">
            The accounting report has been sent to the accounting team.
          </p>
        </div>
      )}

      {/* Summary cards */}
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

      {/* Trips */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">Trips</CardTitle>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => { setEditingTrip(null); setShowTripForm(true) }}
              disabled={showTripForm || Boolean(editingTrip)}
            >
              <PlusCircle className="h-4 w-4" />
              Add Trip
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {showTripForm && (
            <div className="p-6 border-b bg-navy-50/30">
              <h3 className="font-medium mb-4 text-navy-600">New Trip</h3>
              <TripForm
                reportId={report.id}
                onSuccess={handleTripAdded}
                onCancel={() => setShowTripForm(false)}
                hasHomeAddress={true}
                existingTrips={report.trips}
              />
            </div>
          )}

          {report.trips.length === 0 && !showTripForm ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No trips added yet.</p>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowTripForm(true)}
                >
                  <PlusCircle className="h-4 w-4" /> Add First Trip
                </Button>
              )}
            </div>
          ) : (
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
                  {showTripStatuses && <TableHead>Status</TableHead>}
                  {canEdit && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.trips.map((trip) => {
                  const hasManagerNote = isNeedsRevision && Boolean(trip.managerNote)
                  const isEditingThis = editingTrip?.id === trip.id
                  return (
                    <Fragment key={trip.id}>
                      <TableRow className={hasManagerNote ? 'bg-amber-50/60' : undefined}>
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
                        {showTripStatuses && (
                          <TableCell><TripStatusBadge status={trip.tripStatus} /></TableCell>
                        )}
                        {canEdit && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-navy-600"
                                onClick={() => startEditTrip(trip)}
                                disabled={Boolean(editingTrip) || showTripForm}
                                title="Edit trip"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setConfirmDelete(trip.id)}
                                disabled={deletingTripId === trip.id}
                              >
                                {deletingTripId === trip.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Manager note sub-row */}
                      {hasManagerNote && (
                        <TableRow className="bg-amber-50/60">
                          <TableCell colSpan={canEdit ? 9 : 8} className="py-1 pb-2">
                            <p className="text-xs text-amber-800 flex items-start gap-1.5 pl-1">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span><strong>Manager note:</strong> {trip.managerNote}</span>
                            </p>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Inline edit form */}
                      {isEditingThis && (
                        <TableRow>
                          <TableCell colSpan={canEdit ? 9 : 8} className="p-0">
                            <div className="p-6 border-t border-b bg-navy-50/30">
                              <h3 className="font-medium mb-4 text-navy-600">Edit Trip</h3>
                              <TripForm
                                reportId={report.id}
                                onSuccess={handleTripAdded}
                                onCancel={() => setEditingTrip(null)}
                                hasHomeAddress={true}
                                existingTrips={report.trips}
                                editValues={{
                                  tripId: trip.id,
                                  date: new Date(trip.date).toISOString().split('T')[0],
                                  originType: trip.originType,
                                  originPropertyId: trip.originPropertyId ?? '',
                                  originAddress: trip.originAddress ?? '',
                                  destinationType: trip.destinationType,
                                  destinationPropertyId: trip.destinationPropertyId ?? '',
                                  destinationAddress: trip.destinationAddress ?? '',
                                  roundTrip: trip.roundTrip,
                                  purpose: trip.purpose ?? '',
                                }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm delete trip dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trip?</DialogTitle>
            <DialogDescription>
              This will permanently remove the trip and recalculate your report totals.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDeleteTrip(confirmDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin delete report dialog */}
      <Dialog open={showAdminDeleteDialog} onOpenChange={(o) => { if (!o) { setShowAdminDeleteDialog(false); setAdminDeleteReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Admin Delete Report
            </DialogTitle>
            <DialogDescription>
              This soft-deletes <strong>{report.reportNumber}</strong> and removes it from all views. The record is preserved for audit purposes. This action cannot be undone by employees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Reason for deletion (optional)</p>
            <Textarea
              placeholder="e.g. Duplicate submission, test data, entered for wrong employee..."
              value={adminDeleteReason}
              onChange={(e) => setAdminDeleteReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdminDeleteDialog(false); setAdminDeleteReason('') }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAdminDelete}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Delete Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
