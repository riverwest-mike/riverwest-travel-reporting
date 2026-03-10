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
      confirmed,
    } = body

    if (!reportId || !date || !originType || !destinationType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!purpose?.trim()) {
      return NextResponse.json({ error: 'Purpose / Notes is required for each trip' }, { status: 400 })
    }

    // Compare date strings to avoid UTC midnight vs local timezone issues
    const today = new Date().toISOString().split('T')[0]
    if (date > today) {
      return NextResponse.json({ error: 'Trip date cannot be in the future' }, { status: 400 })
    }

    const report = await db.expenseReport.findUnique({ where: { id: reportId } })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    if (report.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (
      report.status !== ReportStatus.DRAFT &&
      report.status !== ReportStatus.NEEDS_REVISION &&
      report.status !== ReportStatus.REJECTED
    ) {
      return NextResponse.json({ error: 'Cannot add trips to a report in its current state' }, { status: 409 })
    }

    const tripDate = new Date(date)
    const tripDateStr = tripDate.toDateString()
    const tripKey = { originType, originPropertyId, originAddress, destinationType, destinationPropertyId, destinationAddress }

    // Hard block: same date + same route on THIS report
    const sameReportTrips = await db.trip.findMany({
      where: { reportId },
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

    // Soft warning: same date + same route on OTHER reports for this employee (unless confirmed)
    if (!confirmed) {
      const otherReportTrips = await db.trip.findMany({
        where: {
          reportId: { not: reportId },
          report: { employeeId: employee.id },
          date: {
            gte: new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate()),
            lt: new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate() + 1),
          },
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
            error: `This trip appears to already exist on report ${crossDuplicate.report.reportNumber}. Add it anyway?`,
            conflictingReportNumber: crossDuplicate.report.reportNumber,
            conflictingReportId: crossDuplicate.report.id,
          },
          { status: 409 }
        )
      }
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
