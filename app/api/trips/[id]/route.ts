import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus } from '@prisma/client'
import { recalcReportTotals } from '@/lib/reports'
import { calculateDistance } from '@/lib/mileage'
import { DEFAULT_OFFICE_ADDRESS } from '@/lib/constants'

function tripMatchesKey(
  t: {
    originType: string
    originPropertyId: string | null
    originAddress: string | null
    destinationType: string
    destinationPropertyId: string | null
    destinationAddress: string | null
  },
  key: {
    originType: string
    originPropertyId?: string | null
    originAddress?: string | null
    destinationType: string
    destinationPropertyId?: string | null
    destinationAddress?: string | null
  }
) {
  const sameOrigin =
    t.originType === key.originType &&
    (key.originType === 'PROPERTY'
      ? t.originPropertyId === key.originPropertyId
      : key.originType === 'HOME'
      ? true
      : t.originAddress === key.originAddress)
  const sameDest =
    t.destinationType === key.destinationType &&
    (key.destinationType === 'PROPERTY'
      ? t.destinationPropertyId === key.destinationPropertyId
      : t.destinationAddress === key.destinationAddress)
  return sameOrigin && sameDest
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    const trip = await db.trip.findUnique({
      where: { id: params.id },
      include: { report: true },
    })

    if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (trip.report.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (trip.report.status !== ReportStatus.DRAFT && trip.report.status !== ReportStatus.NEEDS_REVISION) {
      return NextResponse.json({ error: 'Cannot edit trips on a report in its current state' }, { status: 409 })
    }

    const body = await request.json()
    const {
      date, originType, originPropertyId, originAddress,
      destinationType, destinationPropertyId, destinationAddress,
      roundTrip, purpose, confirmed,
    } = body

    if (date !== undefined && new Date(date) > new Date()) {
      return NextResponse.json({ error: 'Trip date cannot be in the future' }, { status: 400 })
    }

    // Build effective values after patch
    const effectiveDate = date !== undefined ? new Date(date) : trip.date
    const effectiveOriginType = originType ?? trip.originType
    const effectiveOriginPropertyId = originPropertyId !== undefined ? originPropertyId : trip.originPropertyId
    const effectiveOriginAddress = originAddress !== undefined ? originAddress : trip.originAddress
    const effectiveDestType = destinationType ?? trip.destinationType
    const effectiveDestPropertyId = destinationPropertyId !== undefined ? destinationPropertyId : trip.destinationPropertyId
    const effectiveDestAddress = destinationAddress !== undefined ? destinationAddress : trip.destinationAddress

    const tripDateStr = effectiveDate.toDateString()
    const tripKey = {
      originType: effectiveOriginType,
      originPropertyId: effectiveOriginType === 'PROPERTY' ? effectiveOriginPropertyId : null,
      originAddress: effectiveOriginType === 'OTHER' ? effectiveOriginAddress : null,
      destinationType: effectiveDestType,
      destinationPropertyId: effectiveDestType === 'PROPERTY' ? effectiveDestPropertyId : null,
      destinationAddress: effectiveDestType === 'OTHER' ? effectiveDestAddress : null,
    }

    // Hard block: same date + same route on THIS report (excluding this trip)
    const sameReportTrips = await db.trip.findMany({
      where: { reportId: trip.reportId, id: { not: params.id } },
      select: { date: true, originType: true, originPropertyId: true, originAddress: true, destinationType: true, destinationPropertyId: true, destinationAddress: true },
    })
    const isDuplicateOnReport = sameReportTrips.some(
      (t) => new Date(t.date).toDateString() === tripDateStr && tripMatchesKey(t, tripKey)
    )
    if (isDuplicateOnReport) {
      return NextResponse.json(
        { error: 'A trip with the same date, origin, and destination already exists on this report.' },
        { status: 409 }
      )
    }

    // Soft warning: cross-report duplicate (unless confirmed)
    if (!confirmed) {
      const startOfDay = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate())
      const startOfNextDay = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate() + 1)
      const otherReportTrips = await db.trip.findMany({
        where: {
          id: { not: params.id },
          reportId: { not: trip.reportId },
          report: { employeeId: employee.id },
          date: { gte: startOfDay, lt: startOfNextDay },
        },
        select: {
          originType: true,
          originPropertyId: true,
          originAddress: true,
          destinationType: true,
          destinationPropertyId: true,
          destinationAddress: true,
          report: { select: { reportNumber: true, id: true } },
        },
      })
      const crossDuplicate = otherReportTrips.find((t) => tripMatchesKey(t, tripKey))
      if (crossDuplicate) {
        return NextResponse.json(
          {
            code: 'DUPLICATE_WARNING',
            error: `This trip appears to already exist on report ${crossDuplicate.report.reportNumber}. Save it anyway?`,
            conflictingReportNumber: crossDuplicate.report.reportNumber,
            conflictingReportId: crossDuplicate.report.id,
          },
          { status: 409 }
        )
      }
    }

    // Re-resolve addresses if origin/destination changed
    let newDistance = trip.distance
    const originChanged = originType !== undefined
    const destChanged = destinationType !== undefined

    if (originChanged || destChanged) {
      let resolvedOrigin: string
      if (effectiveOriginType === 'HOME') {
        resolvedOrigin = employee.homeAddress ?? DEFAULT_OFFICE_ADDRESS
      } else if (effectiveOriginType === 'PROPERTY') {
        const propId = effectiveOriginPropertyId
        const prop = await db.property.findUnique({ where: { id: propId! } })
        if (!prop) throw new Error('Origin property not found')
        resolvedOrigin = `${prop.address}, ${prop.city}, ${prop.state}`
      } else {
        resolvedOrigin = effectiveOriginAddress ?? ''
      }

      let resolvedDest: string
      if (effectiveDestType === 'PROPERTY') {
        const propId = effectiveDestPropertyId
        const prop = await db.property.findUnique({ where: { id: propId! } })
        if (!prop) throw new Error('Destination property not found')
        resolvedDest = `${prop.address}, ${prop.city}, ${prop.state}`
      } else {
        resolvedDest = effectiveDestAddress ?? ''
      }

      newDistance = await calculateDistance(resolvedOrigin, resolvedDest)
    }

    const updated = await db.trip.update({
      where: { id: params.id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(originType !== undefined && { originType }),
        ...(originPropertyId !== undefined && { originPropertyId: originType === 'PROPERTY' ? originPropertyId : null }),
        ...(originAddress !== undefined && { originAddress: originType === 'OTHER' ? originAddress : null }),
        ...(destinationType !== undefined && { destinationType }),
        ...(destinationPropertyId !== undefined && { destinationPropertyId: destinationType === 'PROPERTY' ? destinationPropertyId : null }),
        ...(destinationAddress !== undefined && { destinationAddress: destinationType === 'OTHER' ? destinationAddress : null }),
        ...(roundTrip !== undefined && { roundTrip: Boolean(roundTrip) }),
        ...(purpose !== undefined && { purpose }),
        distance: newDistance,
      },
      include: {
        originProperty: true,
        destinationProperty: true,
      },
    })

    await recalcReportTotals(trip.reportId, trip.report.mileageRate)

    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update trip'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    const trip = await db.trip.findUnique({
      where: { id: params.id },
      include: { report: true },
    })

    if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (trip.report.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (trip.report.status !== ReportStatus.DRAFT && trip.report.status !== ReportStatus.NEEDS_REVISION) {
      return NextResponse.json({ error: 'Cannot delete trips from a report in its current state' }, { status: 409 })
    }

    await db.trip.delete({ where: { id: params.id } })
    await recalcReportTotals(trip.reportId, trip.report.mileageRate)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
