import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus } from '@prisma/client'
import { recalcReportTotals } from '@/lib/reports'
import { calculateDistance } from '@/lib/mileage'
import { DEFAULT_OFFICE_ADDRESS } from '@/lib/constants'

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
      roundTrip, purpose,
    } = body

    if (date !== undefined && new Date(date) > new Date()) {
      return NextResponse.json({ error: 'Trip date cannot be in the future' }, { status: 400 })
    }

    // Re-resolve addresses if origin/destination changed
    let newDistance = trip.distance
    const originChanged = originType !== undefined
    const destChanged = destinationType !== undefined

    if (originChanged || destChanged) {
      const effectiveOriginType = originType ?? trip.originType
      const effectiveDestType = destinationType ?? trip.destinationType

      let resolvedOrigin: string
      if (effectiveOriginType === 'HOME') {
        resolvedOrigin = employee.homeAddress ?? DEFAULT_OFFICE_ADDRESS
      } else if (effectiveOriginType === 'PROPERTY') {
        const propId = originPropertyId ?? trip.originPropertyId
        const prop = await db.property.findUnique({ where: { id: propId } })
        if (!prop) throw new Error('Origin property not found')
        resolvedOrigin = `${prop.address}, ${prop.city}, ${prop.state}`
      } else {
        resolvedOrigin = originAddress ?? trip.originAddress ?? ''
      }

      let resolvedDest: string
      if (effectiveDestType === 'PROPERTY') {
        const propId = destinationPropertyId ?? trip.destinationPropertyId
        const prop = await db.property.findUnique({ where: { id: propId } })
        if (!prop) throw new Error('Destination property not found')
        resolvedDest = `${prop.address}, ${prop.city}, ${prop.state}`
      } else {
        resolvedDest = destinationAddress ?? trip.destinationAddress ?? ''
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
