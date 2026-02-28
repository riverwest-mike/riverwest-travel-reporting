import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role, ReportStatus } from '@prisma/client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    const report = await db.expenseReport.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            homeAddress: true,
            approvers: { select: { approverId: true } },
          },
        },
        trips: {
          include: {
            originProperty: true,
            destinationProperty: true,
          },
          orderBy: { date: 'asc' },
        },
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdminOrAO =
      employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER
    const isOwner = report.employeeId === employee.id
    const isApprover = report.employee.approvers.some((a) => a.approverId === employee.id)

    if (!isAdminOrAO && !isOwner && !isApprover) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(report)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    const report = await db.expenseReport.findUnique({ where: { id: params.id } })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdminOrAO =
      employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER

    if (report.employeeId !== employee.id && !isAdminOrAO) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (report.status !== ReportStatus.DRAFT && !isAdminOrAO) {
      return NextResponse.json({ error: 'Only draft reports can be edited' }, { status: 409 })
    }

    const body = await request.json()
    const { notes, mileageRate } = body

    const updated = await db.expenseReport.update({
      where: { id: params.id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(mileageRate !== undefined && { mileageRate: Number(mileageRate) }),
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    const report = await db.expenseReport.findUnique({ where: { id: params.id } })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (report.deletedAt) return NextResponse.json({ error: 'Already deleted' }, { status: 410 })

    const isAdminOrAO =
      employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER

    if (isAdminOrAO) {
      // Admins/AO soft-delete any report with an optional reason
      const body = await req.json().catch(() => ({}))
      const reason = typeof body.reason === 'string' ? body.reason.trim() : null
      await db.expenseReport.update({
        where: { id: params.id },
        data: {
          deletedAt: new Date(),
          deletedById: employee.id,
          deletionReason: reason || null,
        },
      })
      return NextResponse.json({ success: true })
    }

    // Non-admins: only their own DRAFT reports, hard delete
    if (report.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (report.status !== ReportStatus.DRAFT) {
      return NextResponse.json({ error: 'Only draft reports can be deleted' }, { status: 409 })
    }

    await db.expenseReport.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
