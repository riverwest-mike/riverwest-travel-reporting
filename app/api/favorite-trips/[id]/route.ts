import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    const favorite = await db.favoriteTrip.findUnique({ where: { id: params.id } })

    if (!favorite) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (favorite.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.favoriteTrip.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
