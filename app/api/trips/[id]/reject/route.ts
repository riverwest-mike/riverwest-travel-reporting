import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role, ReportStatus } from '@prisma/client'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await requireEmployee()

    if (
      manager.role !== Role.MANAGER &&
      manager.role !== Role.ADMIN &&
      manager.role !== Role.APPLICATION_OWNER
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isAdminOrAO = manager.role === Role.ADMIN || manager.role === Role.APPLICATION_OWNER

    const body = await request.json()
    const { reason } = body

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
    }

    const trip = await db.trip.findUnique({
      where: { id: params.id },
      include: {
        report: {
          include: {
            employee: { include: { approvers: { select: { approverId: true } } } },
          },
        },
      },
    })

    if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (trip.report.status !== ReportStatus.SUBMITTED) {
      return NextResponse.json({ error: 'Cannot reject trips on a non-submitted report' }, { status: 409 })
    }

    if (!isAdminOrAO) {
      const isAllowedApprover = trip.report.employee.approvers.some(
        (a) => a.approverId === manager.id
      )
      if (!isAllowedApprover) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const updated = await db.trip.update({
      where: { id: params.id },
      data: {
        tripStatus: 'REJECTED',
        tripRejectionReason: reason.trim(),
        tripRejectedById: manager.id,
        tripApprovedById: null,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
