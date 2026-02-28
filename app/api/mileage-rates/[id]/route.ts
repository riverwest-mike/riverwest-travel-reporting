import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// DELETE /api/mileage-rates/[id] — remove a rate (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireEmployee()
    if (me.role !== Role.ADMIN && me.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Prevent deleting if it's the only rate
    const count = await db.mileageRate.count()
    if (count <= 1) {
      return NextResponse.json({ error: 'Cannot delete the only mileage rate' }, { status: 409 })
    }

    await db.mileageRate.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
