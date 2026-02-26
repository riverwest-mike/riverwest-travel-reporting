import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus } from '@prisma/client'
import { generateReportNumber } from '@/lib/reports'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()

    const original = await db.expenseReport.findUnique({
      where: { id: params.id },
      include: {
        trips: true,
      },
    })

    if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (original.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (original.status !== ReportStatus.REJECTED) {
      return NextResponse.json({ error: 'Only rejected reports can be resubmitted' }, { status: 409 })
    }

    // Separate rejected trips from trips to carry forward
    const rejectedTrips = original.trips.filter((t) => t.tripStatus === 'REJECTED')
    const tripsToCarry = original.trips.filter((t) => t.tripStatus !== 'REJECTED')

    // Create a new DRAFT report pre-populated with non-rejected trips
    const reportNumber = await generateReportNumber(original.periodMonth, original.periodYear)

    const newReport = await db.expenseReport.create({
      data: {
        reportNumber,
        employeeId: employee.id,
        periodMonth: original.periodMonth,
        periodYear: original.periodYear,
        mileageRate: original.mileageRate,
        notes: original.notes,
        status: ReportStatus.DRAFT,
        parentReportId: original.id,
        totalMiles: tripsToCarry.reduce((sum, t) => sum + (t.roundTrip ? t.distance * 2 : t.distance), 0),
        totalAmount: 0,
        trips: {
          create: tripsToCarry.map((t) => ({
            date: t.date,
            originType: t.originType,
            originPropertyId: t.originPropertyId,
            originAddress: t.originAddress,
            destinationType: t.destinationType,
            destinationPropertyId: t.destinationPropertyId,
            destinationAddress: t.destinationAddress,
            roundTrip: t.roundTrip,
            distance: t.distance,
            purpose: t.purpose,
            tripStatus: 'PENDING',
          })),
        },
      },
    })

    // Recalculate totals for the new report
    const { recalcReportTotals } = await import('@/lib/reports')
    await recalcReportTotals(newReport.id, newReport.mileageRate)

    return NextResponse.json(
      { ...newReport, rejectedTrips },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
