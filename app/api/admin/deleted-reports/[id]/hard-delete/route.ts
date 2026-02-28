import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// POST /api/admin/deleted-reports/[id]/hard-delete — permanently delete a soft-deleted report (AO only)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireEmployee()
    if (me.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Forbidden: Application Owner access required' }, { status: 403 })
    }

    const report = await db.expenseReport.findUnique({
      where: { id: params.id },
      select: { deletedAt: true },
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!report.deletedAt) {
      return NextResponse.json({ error: 'Report must be soft-deleted first' }, { status: 409 })
    }

    await db.expenseReport.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
