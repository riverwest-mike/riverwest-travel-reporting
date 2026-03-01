import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const employee = await requireEmployee()
    if (employee.role !== Role.ADMIN && employee.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId') || undefined
    const propertyId = searchParams.get('propertyId') || undefined
    const yearStr = searchParams.get('year')
    const year = yearStr ? parseInt(yearStr) : undefined

    // Build filter for trips on approved reports
    const tripWhere: Record<string, unknown> = {
      report: {
        status: 'APPROVED',
        deletedAt: null,
        ...(employeeId && { employeeId }),
        ...(year && { periodYear: year }),
      },
      ...(propertyId && {
        OR: [
          { originPropertyId: propertyId },
          { destinationPropertyId: propertyId },
        ],
      }),
    }

    // Fetch all matching approved trips with relations
    const trips = await db.trip.findMany({
      where: tripWhere,
      include: {
        report: {
          select: {
            id: true,
            reportNumber: true,
            periodMonth: true,
            periodYear: true,
            mileageRate: true,
            employee: { select: { id: true, name: true } },
          },
        },
        originProperty: { select: { id: true, name: true } },
        destinationProperty: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    })

    // ── Summary stats ──────────────────────────────────────────────────────────
    const totalTrips = trips.length
    const totalMiles = trips.reduce((s, t) => s + (t.roundTrip ? t.distance * 2 : t.distance), 0)
    const totalAmount = trips.reduce((s, t) => {
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      return s + miles * t.report.mileageRate
    }, 0)

    // ── Miles by employee ──────────────────────────────────────────────────────
    const byEmployee: Record<string, { name: string; trips: number; miles: number; amount: number }> = {}
    for (const t of trips) {
      const eid = t.report.employee.id
      if (!byEmployee[eid]) byEmployee[eid] = { name: t.report.employee.name, trips: 0, miles: 0, amount: 0 }
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      byEmployee[eid].trips++
      byEmployee[eid].miles += miles
      byEmployee[eid].amount += miles * t.report.mileageRate
    }
    const employeeStats = Object.entries(byEmployee)
      .map(([id, v]) => ({ id, ...v, miles: Math.round(v.miles * 10) / 10, amount: Math.round(v.amount * 100) / 100 }))
      .sort((a, b) => b.miles - a.miles)

    // ── Most visited destinations ──────────────────────────────────────────────
    const destCount: Record<string, { label: string; count: number; miles: number }> = {}
    for (const t of trips) {
      let key: string
      let label: string
      if (t.destinationType === 'PROPERTY' && t.destinationProperty) {
        key = `prop:${t.destinationProperty.id}`
        label = t.destinationProperty.name
      } else {
        key = `addr:${t.destinationAddress ?? 'unknown'}`
        label = t.destinationAddress ?? 'Unknown'
      }
      if (!destCount[key]) destCount[key] = { label, count: 0, miles: 0 }
      destCount[key].count++
      destCount[key].miles += t.roundTrip ? t.distance * 2 : t.distance
    }
    const topDestinations = Object.entries(destCount)
      .map(([, v]) => ({ ...v, miles: Math.round(v.miles * 10) / 10 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    // ── Monthly trend ──────────────────────────────────────────────────────────
    const byMonth: Record<string, { label: string; trips: number; miles: number; amount: number }> = {}
    for (const t of trips) {
      const key = `${t.report.periodYear}-${String(t.report.periodMonth).padStart(2, '0')}`
      const label = new Date(t.report.periodYear, t.report.periodMonth - 1, 1)
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (!byMonth[key]) byMonth[key] = { label, trips: 0, miles: 0, amount: 0 }
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      byMonth[key].trips++
      byMonth[key].miles += miles
      byMonth[key].amount += miles * t.report.mileageRate
    }
    const monthlyTrend = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, miles: Math.round(v.miles * 10) / 10, amount: Math.round(v.amount * 100) / 100 }))

    // ── Approval time metrics ──────────────────────────────────────────────────
    // Fetch all decided reports (approved or rejected) that were also submitted
    const decidedReports = await db.expenseReport.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED'] },
        submittedAt: { not: null },
        deletedAt: null,
        ...(year && { periodYear: year }),
        ...(employeeId && { employeeId }),
      },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        approvedAt: true,
        rejectedAt: true,
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
    })

    // Compute avg days from submission to decision per manager
    const managerTimes: Record<string, { name: string; totalDays: number; count: number; approved: number; rejected: number }> = {}
    let overallTotalDays = 0
    let overallCount = 0

    for (const r of decidedReports) {
      const decisionDate = r.approvedAt ?? r.rejectedAt
      if (!r.submittedAt || !decisionDate) continue
      const daysToDecide = (decisionDate.getTime() - r.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
      const mgr = r.approvedBy ?? r.rejectedBy
      if (!mgr) continue
      if (!managerTimes[mgr.id]) {
        managerTimes[mgr.id] = { name: mgr.name, totalDays: 0, count: 0, approved: 0, rejected: 0 }
      }
      managerTimes[mgr.id].totalDays += daysToDecide
      managerTimes[mgr.id].count++
      if (r.status === 'APPROVED') managerTimes[mgr.id].approved++
      else managerTimes[mgr.id].rejected++
      overallTotalDays += daysToDecide
      overallCount++
    }

    const approvalMetrics = {
      overallAvgDays: overallCount > 0 ? Math.round((overallTotalDays / overallCount) * 10) / 10 : null,
      totalDecided: overallCount,
      byManager: Object.entries(managerTimes)
        .map(([id, v]) => ({
          id,
          name: v.name,
          avgDays: Math.round((v.totalDays / v.count) * 10) / 10,
          count: v.count,
          approved: v.approved,
          rejected: v.rejected,
        }))
        .sort((a, b) => a.avgDays - b.avgDays),
    }

    return NextResponse.json({
      summary: {
        totalTrips,
        totalMiles: Math.round(totalMiles * 10) / 10,
        totalAmount: Math.round(totalAmount * 100) / 100,
        uniqueEmployees: Object.keys(byEmployee).length,
      },
      employeeStats,
      topDestinations,
      monthlyTrend,
      approvalMetrics,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
