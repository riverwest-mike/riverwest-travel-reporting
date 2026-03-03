import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/routes?year=&month=&employeeId=
// Role-aware: employees see only their routes; managers see their team; admins see all
export async function GET(request: NextRequest) {
  try {
    const me = await requireEmployee()
    const { searchParams } = new URL(request.url)

    const yearStr = searchParams.get('year')
    const monthStr = searchParams.get('month')
    const employeeId = searchParams.get('employeeId') || undefined

    const year = yearStr ? parseInt(yearStr) : undefined
    const month = monthStr ? parseInt(monthStr) : undefined

    const isAdminOrAO = me.role === Role.ADMIN || me.role === Role.APPLICATION_OWNER
    const isManager = me.role === Role.MANAGER
    const canFilterByEmployee = isAdminOrAO || isManager

    // Build the employee scope
    let scopedEmployeeIds: string[] | undefined

    if (isAdminOrAO) {
      // Admin: see all — or filter to one specific person
      scopedEmployeeIds = employeeId ? [employeeId] : undefined
    } else if (isManager) {
      // Manager: see their direct reports + optionally filter to one
      const links = await db.employeeApprover.findMany({
        where: { approverId: me.id },
        select: { employeeId: true },
      })
      const teamIds = links.map(l => l.employeeId)
      scopedEmployeeIds = employeeId && teamIds.includes(employeeId) ? [employeeId] : teamIds
    } else {
      // Employee: only own data
      scopedEmployeeIds = [me.id]
    }

    const trips = await db.trip.findMany({
      where: {
        report: {
          status: 'APPROVED',
          deletedAt: null,
          ...(scopedEmployeeIds && { employeeId: { in: scopedEmployeeIds } }),
          ...(year && { periodYear: year }),
          ...(month && { periodMonth: month }),
        },
      },
      include: {
        report: { select: { mileageRate: true } },
        originProperty: { select: { name: true } },
        destinationProperty: { select: { name: true } },
      },
    })

    // Build route pairs
    const byRoute: Record<
      string,
      { origin: string; destination: string; count: number; miles: number; amount: number }
    > = {}

    for (const t of trips) {
      const origin =
        t.originType === 'HOME'
          ? 'Primary Office'
          : t.originType === 'PROPERTY' && t.originProperty
            ? t.originProperty.name
            : (t.originAddress ?? 'Unknown')
      const destination =
        t.destinationType === 'PROPERTY' && t.destinationProperty
          ? t.destinationProperty.name
          : (t.destinationAddress ?? 'Unknown')

      const key = `${origin}|||${destination}`
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      if (!byRoute[key]) byRoute[key] = { origin, destination, count: 0, miles: 0, amount: 0 }
      byRoute[key].count++
      byRoute[key].miles += miles
      byRoute[key].amount += miles * t.report.mileageRate
    }

    const routes = Object.values(byRoute)
      .map(r => ({
        origin: r.origin,
        destination: r.destination,
        count: r.count,
        miles: Math.round(r.miles * 10) / 10,
        amount: Math.round(r.amount * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)

    // Build employee list for filter dropdown (manager/admin only)
    let employees: { id: string; name: string }[] = []
    if (canFilterByEmployee) {
      if (isAdminOrAO) {
        employees = await db.employee.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      } else {
        // Manager: only their team
        const links = await db.employeeApprover.findMany({
          where: { approverId: me.id },
          include: { employee: { select: { id: true, name: true, isActive: true } } },
        })
        employees = links
          .filter(l => l.employee.isActive)
          .map(l => ({ id: l.employee.id, name: l.employee.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }
    }

    return NextResponse.json({ routes, employees, canFilterByEmployee })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
