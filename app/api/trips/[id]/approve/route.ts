import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role, ReportStatus } from '@prisma/client'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await requireEmployee()

    if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const trip = await db.trip.findUnique({
      where: { id: params.id },
      include: {
        report: {
          include: { employee: true },
        },
      },
    })

    if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (trip.report.status !== ReportStatus.SUBMITTED) {
      return NextResponse.json({ error: 'Cannot approve trips on a non-submitted report' }, { status: 409 })
    }

    if (manager.role !== Role.ADMIN && trip.report.employee.managerId !== manager.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await db.trip.update({
      where: { id: params.id },
      data: {
        tripStatus: 'APPROVED',
        tripRejectionReason: null,
        tripApprovedById: manager.id,
        tripRejectedById: null,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
