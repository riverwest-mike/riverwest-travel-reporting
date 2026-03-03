import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/analytics/employees/[id]?year=
// Returns an employee's approved reports with trip details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    if (employee.role !== Role.ADMIN && employee.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const yearStr = searchParams.get('year')
    const year = yearStr ? parseInt(yearStr) : undefined

    const subject = await db.employee.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, role: true },
    })
    if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const reports = await db.expenseReport.findMany({
      where: {
        employeeId: params.id,
        status: 'APPROVED',
        deletedAt: null,
        ...(year && { periodYear: year }),
      },
      include: {
        trips: {
          include: {
            originProperty: { select: { id: true, name: true } },
            destinationProperty: { select: { id: true, name: true } },
          },
          orderBy: { date: 'asc' },
        },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    })

    const reportSummaries = reports.map(r => {
      const totalMiles = r.trips.reduce(
        (s, t) => s + (t.roundTrip ? t.distance * 2 : t.distance),
        0,
      )
      const totalAmount = totalMiles * r.mileageRate
      return {
        id: r.id,
        reportNumber: r.reportNumber,
        periodMonth: r.periodMonth,
        periodYear: r.periodYear,
        tripCount: r.trips.length,
        totalMiles: Math.round(totalMiles * 10) / 10,
        totalAmount: Math.round(totalAmount * 100) / 100,
        mileageRate: r.mileageRate,
        approvedBy: r.approvedBy?.name ?? null,
        approvedAt: r.approvedAt,
      }
    })

    const grandTotals = reportSummaries.reduce(
      (acc, r) => ({
        trips: acc.trips + r.tripCount,
        miles: acc.miles + r.totalMiles,
        amount: acc.amount + r.totalAmount,
      }),
      { trips: 0, miles: 0, amount: 0 },
    )

    return NextResponse.json({
      employee: subject,
      reports: reportSummaries,
      totals: {
        reports: reportSummaries.length,
        trips: grandTotals.trips,
        miles: Math.round(grandTotals.miles * 10) / 10,
        amount: Math.round(grandTotals.amount * 100) / 100,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
