import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/mileage-rates — list all rates (admin/AO only)
export async function GET() {
  try {
    const me = await requireEmployee()
    const isAdminOrAO = me.role === Role.ADMIN || me.role === Role.APPLICATION_OWNER
    if (!isAdminOrAO) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rates = await db.mileageRate.findMany({
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { effectiveDate: 'desc' },
    })

    return NextResponse.json(rates)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST /api/mileage-rates — create a new rate (admin only)
export async function POST(request: NextRequest) {
  try {
    const me = await requireEmployee()
    if (me.role !== Role.ADMIN && me.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { rate, effectiveDate } = body

    if (rate === undefined || !effectiveDate) {
      return NextResponse.json({ error: 'rate and effectiveDate are required' }, { status: 400 })
    }

    const rateNum = Number(rate)
    if (isNaN(rateNum) || rateNum <= 0) {
      return NextResponse.json({ error: 'rate must be a positive number' }, { status: 400 })
    }

    const record = await db.mileageRate.create({
      data: {
        rate: rateNum,
        effectiveDate: new Date(effectiveDate),
        createdById: me.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json(record, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
