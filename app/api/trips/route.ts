import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus } from '@prisma/client'
import { recalcReportTotals } from '@/lib/reports'
import { calculateDistance, buildAddress } from '@/lib/mileage'
import { DEFAULT_OFFICE_ADDRESS } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const employee = await requireEmployee()
    const body = await request.json()

    const {
      reportId,
      date,
      originType,
      originPropertyId,
      originAddress,
      destinationType,
      destinationPropertyId,
      destinationAddress,
      roundTrip,
      purpose,
    } = body

    if (!reportId || !date || !originType || !destinationType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!purpose?.trim()) {
      return NextResponse.json({ error: 'Purpose / Notes is required for each trip' }, { status: 400 })
    }

    const tripDate = new Date(date)
    if (tripDate > new Date()) {
      return NextResponse.json({ error: 'Trip date cannot be in the future' }, { status: 400 })
    }

    const report = await db.expenseReport.findUnique({ where: { id: reportId } })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    if (report.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (report.status !== ReportStatus.DRAFT && report.status !== ReportStatus.NEEDS_REVISION) {
      return NextResponse.json({ error: 'Cannot add trips to a report in its current state' }, { status: 409 })
    }

    // Duplicate trip check: same date + same origin + same destination on this report
    const existingTrips = await db.trip.findMany({
      where: { reportId },
      select: { date: true, originType: true, originPropertyId: true, originAddress: true, destinationType: true, destinationPropertyId: true, destinationAddress: true },
    })
    const tripDateStr = new Date(date).toDateString()
    const isDuplicate = existingTrips.some(t => {
      if (new Date(t.date).toDateString() !== tripDateStr) return false
      const sameOrigin = t.originType === originType && (
        originType === 'PROPERTY' ? t.originPropertyId === originPropertyId
          : originType === 'HOME' ? true
          : t.originAddress === originAddress
      )
      const sameDest = t.destinationType === destinationType && (
        destinationType === 'PROPERTY' ? t.destinationPropertyId === destinationPropertyId
          : t.destinationAddress === destinationAddress
      )
      return sameOrigin && sameDest
    })
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'A trip with the same date, origin, and destination already exists on this report.' },
        { status: 409 }
      )
    }

    // Resolve addresses
    let resolvedOrigin: string
    let resolvedDestination: string

    if (originType === 'HOME') {
      resolvedOrigin = employee.homeAddress ?? DEFAULT_OFFICE_ADDRESS
    } else if (originType === 'PROPERTY') {
      const prop = await db.property.findUnique({ where: { id: originPropertyId } })
      if (!prop) return NextResponse.json({ error: 'Origin property not found' }, { status: 404 })
      resolvedOrigin = `${prop.address}, ${prop.city}, ${prop.state}`
    } else {
      if (!originAddress) return NextResponse.json({ error: 'Origin address required' }, { status: 400 })
      resolvedOrigin = originAddress
    }

    if (destinationType === 'PROPERTY') {
      const prop = await db.property.findUnique({ where: { id: destinationPropertyId } })
      if (!prop) return NextResponse.json({ error: 'Destination property not found' }, { status: 404 })
      resolvedDestination = `${prop.address}, ${prop.city}, ${prop.state}`
    } else {
      if (!destinationAddress) return NextResponse.json({ error: 'Destination address required' }, { status: 400 })
      resolvedDestination = destinationAddress
    }

    // Calculate distance
    const distance = await calculateDistance(resolvedOrigin, resolvedDestination)

    const trip = await db.trip.create({
      data: {
        reportId,
        date: new Date(date),
        originType,
        originPropertyId: originType === 'PROPERTY' ? originPropertyId : null,
        originAddress: originType === 'OTHER' ? originAddress : null,
        destinationType,
        destinationPropertyId: destinationType === 'PROPERTY' ? destinationPropertyId : null,
        destinationAddress: destinationType === 'OTHER' ? destinationAddress : null,
        roundTrip: Boolean(roundTrip),
        distance,
        purpose: purpose ?? null,
      },
      include: {
        originProperty: true,
        destinationProperty: true,
      },
    })

    // Recalculate report totals
    await recalcReportTotals(reportId, report.mileageRate)

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create trip'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
