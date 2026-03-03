import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/analytics/trends/[year]/[month]
// Returns all trips and employees that make up a specific month's totals
export async function GET(
  _request: NextRequest,
  { params }: { params: { year: string; month: string } },
) {
  try {
    const employee = await requireEmployee()
    if (employee.role !== Role.ADMIN && employee.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const year = parseInt(params.year)
    const month = parseInt(params.month)
    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: 'Invalid year/month' }, { status: 400 })
    }

    const trips = await db.trip.findMany({
      where: {
        report: {
          status: 'APPROVED',
          deletedAt: null,
          periodYear: year,
          periodMonth: month,
        },
      },
      include: {
        report: {
          select: {
            id: true,
            reportNumber: true,
            mileageRate: true,
            employee: { select: { id: true, name: true } },
          },
        },
        originProperty: { select: { id: true, name: true } },
        destinationProperty: { select: { id: true, name: true } },
      },
      orderBy: [{ report: { employee: { name: 'asc' } } }, { date: 'asc' }],
    })

    const tripRows = trips.map(t => {
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      return {
        id: t.id,
        date: t.date,
        reportId: t.report.id,
        reportNumber: t.report.reportNumber,
        employeeId: t.report.employee.id,
        employeeName: t.report.employee.name,
        originType: t.originType,
        originName:
          t.originType === 'PROPERTY'
            ? (t.originProperty?.name ?? '')
            : (t.originAddress ?? 'Primary Office'),
        destinationType: t.destinationType,
        destinationName:
          t.destinationType === 'PROPERTY'
            ? (t.destinationProperty?.name ?? '')
            : (t.destinationAddress ?? 'Unknown'),
        roundTrip: t.roundTrip,
        distance: t.distance,
        miles: Math.round(miles * 10) / 10,
        amount: Math.round(miles * t.report.mileageRate * 100) / 100,
        purpose: t.purpose ?? '',
      }
    })

    // Employee summaries
    const byEmp: Record<string, { name: string; trips: number; miles: number; amount: number }> = {}
    for (const t of tripRows) {
      if (!byEmp[t.employeeId]) byEmp[t.employeeId] = { name: t.employeeName, trips: 0, miles: 0, amount: 0 }
      byEmp[t.employeeId].trips++
      byEmp[t.employeeId].miles += t.miles
      byEmp[t.employeeId].amount += t.amount
    }
    const employeeSummaries = Object.entries(byEmp)
      .map(([id, v]) => ({
        id,
        name: v.name,
        trips: v.trips,
        miles: Math.round(v.miles * 10) / 10,
        amount: Math.round(v.amount * 100) / 100,
      }))
      .sort((a, b) => b.miles - a.miles)

    return NextResponse.json({
      year,
      month,
      trips: tripRows,
      employees: employeeSummaries,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
