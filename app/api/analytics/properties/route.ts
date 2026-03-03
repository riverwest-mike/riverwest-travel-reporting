import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/analytics/properties?year=
export async function GET(request: NextRequest) {
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

    const trips = await db.trip.findMany({
      where: {
        report: { status: 'APPROVED', deletedAt: null, ...(year && { periodYear: year }), ...(month && { periodMonth: month }) },
        OR: [
          { originType: 'PROPERTY', originPropertyId: { not: null } },
          { destinationType: 'PROPERTY', destinationPropertyId: { not: null } },
        ],
      },
      include: {
        report: { select: { mileageRate: true } },
        originProperty: { select: { id: true, name: true } },
        destinationProperty: { select: { id: true, name: true } },
      },
    })

    const byProp: Record<
      string,
      { name: string; asOrigin: number; asDestination: number; miles: number; amount: number }
    > = {}

    for (const t of trips) {
      const miles = t.roundTrip ? t.distance * 2 : t.distance
      const amt = miles * t.report.mileageRate

      if (t.originType === 'PROPERTY' && t.originProperty) {
        const id = t.originProperty.id
        if (!byProp[id]) byProp[id] = { name: t.originProperty.name, asOrigin: 0, asDestination: 0, miles: 0, amount: 0 }
        byProp[id].asOrigin++
        byProp[id].miles += miles
        byProp[id].amount += amt
      }
      if (t.destinationType === 'PROPERTY' && t.destinationProperty) {
        const id = t.destinationProperty.id
        if (!byProp[id]) byProp[id] = { name: t.destinationProperty.name, asOrigin: 0, asDestination: 0, miles: 0, amount: 0 }
        byProp[id].asDestination++
        // Only count miles/amount once per trip (from origin side already counted)
        if (t.originType !== 'PROPERTY' || t.originPropertyId !== t.destinationPropertyId) {
          if (t.originType !== 'PROPERTY') {
            byProp[id].miles += miles
            byProp[id].amount += amt
          }
        }
      }
    }

    const properties = Object.entries(byProp).map(([id, v]) => ({
      id,
      name: v.name,
      asOrigin: v.asOrigin,
      asDestination: v.asDestination,
      totalVisits: v.asOrigin + v.asDestination,
      miles: Math.round(v.miles * 10) / 10,
      amount: Math.round(v.amount * 100) / 100,
    }))

    return NextResponse.json({ properties })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
