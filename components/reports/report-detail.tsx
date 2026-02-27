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
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, PlusCircle, Trash2, Send, CheckCircle2, XCircle, RefreshCw, Loader2, AlertTriangle
} from 'lucide-react'
import { formatCurrency, formatMiles, formatDate, formatPeriod } from '@/lib/utils'
import { Role, ReportStatus } from '@prisma/client'

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
interface RejectedParentTrip {
  id: string; date: string | Date; originType: string
  originProperty: Property | null; originAddress: string | null
  destinationType: string; destinationProperty: Property | null; destinationAddress: string | null
  roundTrip: boolean; distance: number; purpose: string | null
  tripRejectionReason: string | null
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
  parentReport: { id: string; reportNumber: string } | null
}

interface Props {
  report: ReportData
  currentEmployee: { id: string; role: Role; homeAddress: string | null }
  isOwner: boolean
  rejectedParentTrips?: RejectedParentTrip[]
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
  return null
}

export function ReportDetail({ report: initialReport, currentEmployee, isOwner, rejectedParentTrips = [] }: Props) {
  const router = useRouter()
  const [report, setReport] = useState(initialReport)
  const [showTripForm, setShowTripForm] = useState(false)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState('')

  const isDraft = report.status === ReportStatus.DRAFT
  const isRejected = report.status === ReportStatus.REJECTED
  const canEdit = isOwner && isDraft
  const canSubmit = isOwner && isDraft && report.trips.length > 0
  const canResubmit = isOwner && isRejected

  async function refreshReport() {
    const res = await fetch(`/api/reports/${report.id}`)
    if (res.ok) setReport(await res.json())
  }

  async function handleTripAdded() {
    setShowTripForm(false)
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
      const res = await fetch(`/api/reports/${report.id}/resubmit`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create resubmission')
      router.push(`/reports/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
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

  const showTripStatuses = report.status !== ReportStatus.DRAFT

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
              {report.parentReport && (
                <span className="ml-2 text-amber-600">
                  · Resubmission of{' '}
                  <Link href={`/reports/${report.parentReport.id}`} className="underline">
                    {report.parentReport.reportNumber}
                  </Link>
                </span>
              )}
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
              Resubmit
            </Button>
          )}
          {canEdit && report.trips.length === 0 && (
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
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Rejection notice */}
      {report.status === ReportStatus.REJECTED && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive font-medium mb-1">
            <XCircle className="h-4 w-4" />
            Sent back by {report.rejectedBy?.name ?? 'Manager'}
          </div>
          {report.rejectionReason && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{report.rejectionReason}</p>
          )}
          {isOwner && (
            <p className="text-sm mt-2 text-navy-600 font-medium">
              Click &ldquo;Resubmit&rdquo; above to create a corrected draft. Any rejected trips below will not be carried over.
            </p>
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
            The Excel report has been emailed to accounting.
          </p>
        </div>
      )}

      {/* Rejected parent trips reference */}
      {rejectedParentTrips.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Trips rejected from {report.parentReport?.reportNumber} — please re-add corrected versions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">From</TableHead>
                  <TableHead className="text-xs">To</TableHead>
                  <TableHead className="text-xs">Miles</TableHead>
                  <TableHead className="text-xs">Purpose</TableHead>
                  <TableHead className="text-xs">Rejection Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedParentTrips.map((trip) => (
                  <TableRow key={trip.id} className="bg-amber-50/30">
                    <TableCell className="text-xs">{formatDate(trip.date)}</TableCell>
                    <TableCell className="text-xs">
                      {tripLabel(trip.originType, trip.originProperty, trip.originAddress)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {tripLabel(trip.destinationType, trip.destinationProperty, trip.destinationAddress)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {(trip.roundTrip ? trip.distance * 2 : trip.distance).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{trip.purpose ?? '—'}</TableCell>
                    <TableCell className="text-xs text-destructive">{trip.tripRejectionReason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
            <Button size="sm" onClick={() => setShowTripForm(true)} disabled={showTripForm}>
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
                hasHomeAddress={Boolean(currentEmployee.homeAddress)}
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
                  {canEdit && <TableHead className="w-12" />}
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
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                        {trip.purpose ?? '—'}
                      </TableCell>
                      {showTripStatuses && (
                        <TableCell><TripStatusBadge status={trip.tripStatus} /></TableCell>
                      )}
                      {canEdit && (
                        <TableCell>
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
                        </TableCell>
                      )}
                    </TableRow>
                    {showTripStatuses && trip.tripStatus === 'REJECTED' && trip.tripRejectionReason && (
                      <TableRow className="bg-red-50/50">
                        <TableCell colSpan={canEdit ? 9 : 8} className="py-1 pb-2">
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
    </div>
  )
}
