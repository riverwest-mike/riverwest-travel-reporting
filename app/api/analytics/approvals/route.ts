import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/analytics/approvals?year=&managerId=
export async function GET(request: NextRequest) {
  try {
    const employee = await requireEmployee()
    if (employee.role !== Role.ADMIN && employee.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const yearStr = searchParams.get('year')
    const year = yearStr ? parseInt(yearStr) : undefined
    const managerId = searchParams.get('managerId') || undefined

    const decidedReports = await db.expenseReport.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED'] },
        submittedAt: { not: null },
        deletedAt: null,
        ...(year && { periodYear: year }),
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

    const managerTimes: Record<
      string,
      { name: string; totalDays: number; count: number; approved: number; rejected: number }
    > = {}
    let overallTotalDays = 0
    let overallCount = 0

    for (const r of decidedReports) {
      const decisionDate = r.approvedAt ?? r.rejectedAt
      if (!r.submittedAt || !decisionDate) continue
      const days = (decisionDate.getTime() - r.submittedAt.getTime()) / 86400000
      const mgr = r.approvedBy ?? r.rejectedBy
      if (!mgr) continue
      if (!managerTimes[mgr.id]) {
        managerTimes[mgr.id] = { name: mgr.name, totalDays: 0, count: 0, approved: 0, rejected: 0 }
      }
      managerTimes[mgr.id].totalDays += days
      managerTimes[mgr.id].count++
      if (r.status === 'APPROVED') managerTimes[mgr.id].approved++
      else managerTimes[mgr.id].rejected++
      overallTotalDays += days
      overallCount++
    }

    let managers = Object.entries(managerTimes).map(([id, v]) => ({
      id,
      name: v.name,
      avgDays: Math.round((v.totalDays / v.count) * 10) / 10,
      count: v.count,
      approved: v.approved,
      rejected: v.rejected,
    }))

    // Apply managerId filter after aggregation
    if (managerId) {
      managers = managers.filter(m => m.id === managerId)
    }

    managers.sort((a, b) => a.avgDays - b.avgDays)

    // Fetch manager list for filter dropdown
    const managerList = await db.employee.findMany({
      where: { role: { in: [Role.MANAGER, Role.ADMIN, Role.APPLICATION_OWNER] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      managers,
      managerList,
      overallAvgDays:
        overallCount > 0 ? Math.round((overallTotalDays / overallCount) * 10) / 10 : null,
      totalDecided: overallCount,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
