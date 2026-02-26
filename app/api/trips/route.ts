import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus } from '@prisma/client'
import { recalcReportTotals } from '@/lib/reports'
import { calculateDistance, buildAddress } from '@/lib/mileage'

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

    const report = await db.expenseReport.findUnique({ where: { id: reportId } })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    if (report.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (report.status !== ReportStatus.DRAFT) {
      return NextResponse.json({ error: 'Cannot add trips to a non-draft report' }, { status: 409 })
    }

    // Resolve addresses
    let resolvedOrigin: string
    let resolvedDestination: string

    if (originType === 'HOME') {
      if (!employee.homeAddress) {
        return NextResponse.json(
          { error: 'Your home address is not set. Please update it in Profile & Settings.' },
          { status: 400 }
        )
      }
      resolvedOrigin = employee.homeAddress
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
