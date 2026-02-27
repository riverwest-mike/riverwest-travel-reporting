import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const employee = await requireEmployee()
    const favorites = await db.favoriteTrip.findMany({
      where: { employeeId: employee.id },
      include: {
        originProperty: { select: { id: true, name: true } },
        destinationProperty: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(favorites)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await requireEmployee()
    const body = await request.json()
    const {
      name,
      originType, originPropertyId, originAddress,
      destinationType, destinationPropertyId, destinationAddress,
      roundTrip,
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!originType || !destinationType) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 })
    }

    const favorite = await db.favoriteTrip.create({
      data: {
        employeeId: employee.id,
        name: name.trim(),
        originType,
        originPropertyId: originType === 'PROPERTY' ? originPropertyId : null,
        originAddress: originType === 'OTHER' ? originAddress : null,
        destinationType,
        destinationPropertyId: destinationType === 'PROPERTY' ? destinationPropertyId : null,
        destinationAddress: destinationType === 'OTHER' ? destinationAddress : null,
        roundTrip: Boolean(roundTrip),
      },
      include: {
        originProperty: { select: { id: true, name: true } },
        destinationProperty: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(favorite, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
