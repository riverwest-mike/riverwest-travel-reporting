import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee, requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    await requireEmployee()
    const properties = await db.property.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(properties)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { name, address, city, state } = body

    if (!name || !address) {
      return NextResponse.json({ error: 'name and address are required' }, { status: 400 })
    }

    const property = await db.property.create({
      data: { name, address, city: city ?? null, state: state ?? null },
    })

    return NextResponse.json(property, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
