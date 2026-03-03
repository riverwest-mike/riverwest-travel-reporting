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
    const yearStr = searchParams.get('year')
    const monthStr = searchParams.get('month')
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear()
    const month = monthStr ? parseInt(monthStr) : undefined

    // ── Pipeline (always live — no year filter) ────────────────────────────
    const [submittedReports, needsRevisionCount, draftCount] = await Promise.all([
      db.expenseReport.findMany({
        where: { status: 'SUBMITTED', deletedAt: null },
        select: { totalAmount: true, submittedAt: true },
      }),
      db.expenseReport.count({
        where: { status: { in: ['NEEDS_REVISION', 'REJECTED'] }, deletedAt: null },
      }),
      db.expenseReport.count({ where: { status: 'DRAFT', deletedAt: null } }),
    ])

    const pendingAmount = submittedReports.reduce((s, r) => s + r.totalAmount, 0)
    const now = Date.now()
    const oldestPendingDays =
      submittedReports.length > 0
        ? Math.floor(
            (now - Math.min(...submittedReports.map(r => r.submittedAt!.getTime()))) /
              86400000,
          )
        : null

    // ── Approved trips for selected year/month ────────────────────────────
    const trips = await db.trip.findMany({
      where: {
        report: { status: 'APPROVED', deletedAt: null, periodYear: year, ...(month && { periodMonth: month }) },
      },
      include: {
        report: {
          select: {
            periodMonth: true,
            periodYear: true,
            mileageRate: true,
            employee: { select: { id: true, name: true } },
          },
        },
        destinationProperty: { select: { id: true, name: true } },
      },
    })

    // Top 5 employees by miles
    const byEmp: Record<string, { name: string; miles: number; amount: number; trips: number }> = {}
    for (const t of trips) {
      const eid = t.report.employee.id
      if (!byEmp[eid]) byEmp[eid] = { name: t.report.employee.name, miles: 0, amount: 0, trips: 0 }
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      byEmp[eid].miles += miles
      byEmp[eid].amount += miles * t.report.mileageRate
      byEmp[eid].trips++
    }
    const topEmployees = Object.values(byEmp)
      .map(e => ({ ...e, miles: Math.round(e.miles * 10) / 10, amount: Math.round(e.amount * 100) / 100 }))
      .sort((a, b) => b.miles - a.miles)
      .slice(0, 5)

    // Top 5 destinations
    const destCount: Record<string, { label: string; count: number }> = {}
    for (const t of trips) {
      const key =
        t.destinationType === 'PROPERTY' && t.destinationProperty
          ? `prop:${t.destinationProperty.id}`
          : `addr:${t.destinationAddress ?? ''}`
      const label =
        t.destinationType === 'PROPERTY' && t.destinationProperty
          ? t.destinationProperty.name
          : (t.destinationAddress ?? 'Unknown')
      if (!destCount[key]) destCount[key] = { label, count: 0 }
      destCount[key].count++
    }
    const topDestinations = Object.values(destCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Last 6 months
    const byMonth: Record<string, { label: string; miles: number; amount: number; trips: number }> = {}
    for (const t of trips) {
      const key = `${t.report.periodYear}-${String(t.report.periodMonth).padStart(2, '0')}`
      const label = new Date(t.report.periodYear, t.report.periodMonth - 1, 1).toLocaleDateString(
        'en-US',
        { month: 'short', year: 'numeric' },
      )
      if (!byMonth[key]) byMonth[key] = { label, miles: 0, amount: 0, trips: 0 }
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      byMonth[key].miles += miles
      byMonth[key].amount += miles * t.report.mileageRate
      byMonth[key].trips++
    }
    const recentMonths = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => ({
        ...v,
        miles: Math.round(v.miles * 10) / 10,
        amount: Math.round(v.amount * 100) / 100,
      }))

    // Approval speed for selected year
    const decidedReports = await db.expenseReport.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED'] },
        submittedAt: { not: null },
        deletedAt: null,
        periodYear: year,
        ...(month && { periodMonth: month }),
      },
      select: {
        status: true,
        submittedAt: true,
        approvedAt: true,
        rejectedAt: true,
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
    })

    const managerTimes: Record<string, { name: string; totalDays: number; count: number }> = {}
    let totalDays = 0
    let totalCount = 0
    for (const r of decidedReports) {
      const decisionDate = r.approvedAt ?? r.rejectedAt
      if (!r.submittedAt || !decisionDate) continue
      const days = (decisionDate.getTime() - r.submittedAt.getTime()) / 86400000
      const mgr = r.approvedBy ?? r.rejectedBy
      if (!mgr) continue
      if (!managerTimes[mgr.id]) managerTimes[mgr.id] = { name: mgr.name, totalDays: 0, count: 0 }
      managerTimes[mgr.id].totalDays += days
      managerTimes[mgr.id].count++
      totalDays += days
      totalCount++
    }
    const managerAvgs = Object.entries(managerTimes)
      .map(([id, v]) => ({
        id,
        name: v.name,
        avgDays: Math.round((v.totalDays / v.count) * 10) / 10,
      }))
      .sort((a, b) => a.avgDays - b.avgDays)

    const totalMiles = trips.reduce((s, t) => s + (t.roundTrip ? t.distance * 2 : t.distance), 0)
    const totalAmount = trips.reduce((s, t) => {
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      return s + miles * t.report.mileageRate
    }, 0)

    return NextResponse.json({
      pipeline: {
        pendingCount: submittedReports.length,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        needsRevisionCount,
        draftCount,
        oldestPendingDays,
      },
      yearSummary: {
        year,
        totalTrips: trips.length,
        totalMiles: Math.round(totalMiles * 10) / 10,
        totalAmount: Math.round(totalAmount * 100) / 100,
        uniqueEmployees: Object.keys(byEmp).length,
      },
      topEmployees,
      topDestinations,
      recentMonths,
      approvalSpeed: {
        orgAvgDays: totalCount > 0 ? Math.round((totalDays / totalCount) * 10) / 10 : null,
        fastestManager: managerAvgs[0] ?? null,
        slowestManager: managerAvgs[managerAvgs.length - 1] ?? null,
        totalDecided: totalCount,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
