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

    // Create a new DRAFT report pre-populated with the rejected report's trips
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
        totalMiles: original.totalMiles,
        totalAmount: original.totalAmount,
        trips: {
          create: original.trips.map((t) => ({
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
          })),
        },
      },
    })

    return NextResponse.json(newReport, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
