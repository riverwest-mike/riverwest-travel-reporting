import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/analytics/properties/[id]?year=&month=
// Returns trips that make up a property's totals
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    if (employee.role !== Role.ADMIN && employee.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const yearStr = searchParams.get('year')
    const monthStr = searchParams.get('month')
    const year = yearStr ? parseInt(yearStr) : undefined
    const month = monthStr ? parseInt(monthStr) : undefined

    const property = await db.property.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, address: true, city: true, state: true },
    })
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const periodFilter = {
      ...(year && { periodYear: year }),
      ...(month && { periodMonth: month }),
    }

    const trips = await db.trip.findMany({
      where: {
        report: { status: 'APPROVED', deletedAt: null, ...periodFilter },
        OR: [
          { originType: 'PROPERTY', originPropertyId: params.id },
          { destinationType: 'PROPERTY', destinationPropertyId: params.id },
        ],
      },
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
      orderBy: [{ report: { periodYear: 'desc' } }, { report: { periodMonth: 'desc' } }, { date: 'desc' }],
    })

    const result = trips.map(t => {
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      const role = t.originPropertyId === params.id ? 'origin' : 'destination'
      return {
        id: t.id,
        date: t.date,
        reportId: t.report.id,
        reportNumber: t.report.reportNumber,
        period: `${t.report.periodYear}-${String(t.report.periodMonth).padStart(2, '0')}`,
        employeeId: t.report.employee.id,
        employeeName: t.report.employee.name,
        role,
        originType: t.originType,
        originName:
          t.originType === 'PROPERTY' ? (t.originProperty?.name ?? '') : (t.originAddress ?? 'Primary Office'),
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

    return NextResponse.json({ property, trips: result })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
