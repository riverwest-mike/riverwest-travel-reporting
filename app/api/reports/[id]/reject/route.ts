import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus, Role } from '@prisma/client'
import { notifyEmployeeOfDecision } from '@/lib/email'
import { formatPeriod } from '@/lib/utils'
import { tripLocationLabel } from '@/lib/reports'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await requireEmployee()

    const isAdminOrAO =
      manager.role === Role.ADMIN || manager.role === Role.APPLICATION_OWNER

    if (
      manager.role !== Role.MANAGER &&
      manager.role !== Role.ADMIN &&
      manager.role !== Role.APPLICATION_OWNER
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { reason, tripNotes } = body

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
    }

    const report = await db.expenseReport.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          include: {
            approvers: { select: { approverId: true } },
          },
        },
        trips: {
          include: { originProperty: true, destinationProperty: true },
          orderBy: { date: 'asc' },
        },
      },
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (report.status !== ReportStatus.SUBMITTED) {
      return NextResponse.json({ error: 'Only submitted reports can be sent back' }, { status: 409 })
    }

    // Verify approver relationship (admin/AO can reject any)
    if (!isAdminOrAO) {
      const isAllowedApprover = report.employee.approvers.some(
        (a) => a.approverId === manager.id
      )
      if (!isAllowedApprover) {
        return NextResponse.json(
          { error: 'Forbidden: not an allowed approver for this employee' },
          { status: 403 }
        )
      }
    }

    // Clear all existing manager notes on trips
    await db.trip.updateMany({
      where: { reportId: params.id },
      data: { managerNote: null },
    })

    // Set per-trip notes if provided
    if (Array.isArray(tripNotes)) {
      for (const tn of tripNotes as { tripId: string; note: string }[]) {
        if (tn.tripId && tn.note?.trim()) {
          await db.trip.update({
            where: { id: tn.tripId },
            data: { managerNote: tn.note.trim() },
          })
        }
      }
    }

    const updated = await db.expenseReport.update({
      where: { id: params.id },
      data: {
        status: ReportStatus.NEEDS_REVISION,
        rejectedAt: new Date(),
        rejectedById: manager.id,
        rejectionReason: reason.trim(),
      },
    })

    // Build TripNote objects with full date/origin/destination labels
    const resolvedTripNotes = Array.isArray(tripNotes)
      ? (tripNotes as { tripId: string; note: string }[])
          .filter((tn) => tn.note?.trim())
          .map((tn) => {
            const trip = report.trips.find((t) => t.id === tn.tripId)
            if (!trip) return null
            return {
              date: trip.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              origin: tripLocationLabel(trip.originType, trip.originProperty?.name, trip.originAddress, trip.originType === 'HOME'),
              destination: tripLocationLabel(trip.destinationType, trip.destinationProperty?.name, trip.destinationAddress, false),
              note: tn.note.trim(),
            }
          })
          .filter((tn): tn is NonNullable<typeof tn> => tn !== null)
      : undefined

    // Notify employee with per-trip notes (fire-and-forget)
    notifyEmployeeOfDecision({
      employeeEmail: report.employee.email,
      employeeName: report.employee.name,
      reportNumber: report.reportNumber,
      period: formatPeriod(report.periodMonth, report.periodYear),
      approved: false,
      rejectionReason: reason.trim(),
      tripNotes: resolvedTripNotes,
      reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reports/${report.id}`,
    }).catch(console.error)

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
