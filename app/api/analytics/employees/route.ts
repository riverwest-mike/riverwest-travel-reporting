import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/analytics/employees?year=&managerId=
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

    const trips = await db.trip.findMany({
      where: {
        report: {
          status: 'APPROVED',
          deletedAt: null,
          ...(year && { periodYear: year }),
          ...(managerId && {
            employee: { approvers: { some: { approverId: managerId } } },
          }),
        },
      },
      include: {
        report: {
          select: {
            mileageRate: true,
            employee: { select: { id: true, name: true } },
          },
        },
      },
    })

    // Aggregate by employee
    const byEmp: Record<
      string,
      { name: string; trips: number; miles: number; amount: number }
    > = {}
    for (const t of trips) {
      const eid = t.report.employee.id
      if (!byEmp[eid]) byEmp[eid] = { name: t.report.employee.name, trips: 0, miles: 0, amount: 0 }
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      byEmp[eid].trips++
      byEmp[eid].miles += miles
      byEmp[eid].amount += miles * t.report.mileageRate
    }

    const employees = Object.entries(byEmp).map(([id, v]) => ({
      id,
      name: v.name,
      trips: v.trips,
      miles: Math.round(v.miles * 10) / 10,
      amount: Math.round(v.amount * 100) / 100,
      avgMilesPerTrip: v.trips > 0 ? Math.round((v.miles / v.trips) * 10) / 10 : 0,
    }))

    // Available managers for filter dropdown
    const managers = await db.employee.findMany({
      where: { isActive: true, role: { in: [Role.MANAGER, Role.ADMIN, Role.APPLICATION_OWNER] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ employees, managers })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
