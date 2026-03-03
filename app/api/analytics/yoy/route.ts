import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/analytics/yoy?year=   (year = the "current" year; compares against year-1)
export async function GET(request: NextRequest) {
  try {
    const employee = await requireEmployee()
    if (employee.role !== Role.ADMIN && employee.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const yearStr = searchParams.get('year')
    const currentYear = yearStr ? parseInt(yearStr) : new Date().getFullYear()
    const priorYear = currentYear - 1

    const trips = await db.trip.findMany({
      where: {
        report: {
          status: 'APPROVED',
          deletedAt: null,
          periodYear: { in: [currentYear, priorYear] },
        },
      },
      include: {
        report: {
          select: {
            periodYear: true,
            periodMonth: true,
            mileageRate: true,
            employee: { select: { id: true } },
          },
        },
      },
    })

    const summarise = (yr: number) => {
      const t = trips.filter(x => x.report.periodYear === yr)
      const miles = t.reduce((s, x) => s + (x.roundTrip ? x.distance * 2 : x.distance), 0)
      const amount = t.reduce((s, x) => {
        const m = x.roundTrip ? x.distance * 2 : x.distance
        return s + m * x.report.mileageRate
      }, 0)
      const employees = new Set(t.map(x => x.report.employee.id)).size
      return { year: yr, trips: t.length, miles: Math.round(miles * 10) / 10, amount: Math.round(amount * 100) / 100, employees }
    }

    const current = summarise(currentYear)
    const prior = summarise(priorYear)

    // Monthly breakdown (all 12 months)
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const monthSum = (yr: number) => {
        const t = trips.filter(x => x.report.periodYear === yr && x.report.periodMonth === month)
        const miles = t.reduce((s, x) => s + (x.roundTrip ? x.distance * 2 : x.distance), 0)
        const amount = t.reduce((s, x) => {
          const m = x.roundTrip ? x.distance * 2 : x.distance
          return s + m * x.report.mileageRate
        }, 0)
        return { trips: t.length, miles: Math.round(miles * 10) / 10, amount: Math.round(amount * 100) / 100 }
      }
      return { month, current: monthSum(currentYear), prior: monthSum(priorYear) }
    })

    return NextResponse.json({ current, prior, monthly })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
