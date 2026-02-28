import { NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/admin/deleted-reports — list soft-deleted reports (admin only)
export async function GET() {
  try {
    const me = await requireEmployee()
    if (me.role !== Role.ADMIN && me.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const reports = await db.expenseReport.findMany({
      where: { deletedAt: { not: null } },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        deletedBy: { select: { id: true, name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    })

    return NextResponse.json(reports)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
