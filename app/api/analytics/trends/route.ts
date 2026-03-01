import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/analytics/trends?year=
export async function GET(request: NextRequest) {
  try {
    const employee = await requireEmployee()
    if (employee.role !== Role.ADMIN && employee.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const yearStr = searchParams.get('year')
    const year = yearStr ? parseInt(yearStr) : undefined

    const trips = await db.trip.findMany({
      where: {
        report: { status: 'APPROVED', deletedAt: null, ...(year && { periodYear: year }) },
      },
      include: {
        report: {
          select: {
            periodMonth: true,
            periodYear: true,
            mileageRate: true,
          },
        },
      },
    })

    const byMonth: Record<
      string,
      { label: string; year: number; month: number; trips: number; miles: number; amount: number }
    > = {}

    for (const t of trips) {
      const key = `${t.report.periodYear}-${String(t.report.periodMonth).padStart(2, '0')}`
      if (!byMonth[key]) {
        byMonth[key] = {
          label: new Date(t.report.periodYear, t.report.periodMonth - 1, 1).toLocaleDateString(
            'en-US',
            { month: 'short', year: 'numeric' },
          ),
          year: t.report.periodYear,
          month: t.report.periodMonth,
          trips: 0,
          miles: 0,
          amount: 0,
        }
      }
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      byMonth[key].trips++
      byMonth[key].miles += miles
      byMonth[key].amount += miles * t.report.mileageRate
    }

    const trends = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        label: v.label,
        year: v.year,
        month: v.month,
        trips: v.trips,
        miles: Math.round(v.miles * 10) / 10,
        amount: Math.round(v.amount * 100) / 100,
      }))

    return NextResponse.json({ trends })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
