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
        employee: { select: { id: true, name: true, email: true, homeAddress: true, managerId: true } },
        trips: {
          include: {
            originProperty: true,
            destinationProperty: true,
          },
          orderBy: { date: 'asc' },
        },
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
        parentReport: { select: { id: true, reportNumber: true } },
      },
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Access check
    const canView =
      employee.role === Role.ADMIN ||
      report.employeeId === employee.id ||
      (employee.role === Role.MANAGER && report.employee.managerId === employee.id) // checked via query

    if (!canView) {
      // Re-check with manager relationship
      const reportEmployee = await db.employee.findUnique({ where: { id: report.employeeId } })
      if (reportEmployee?.managerId !== employee.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
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
    if (report.employeeId !== employee.id && employee.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (report.status !== ReportStatus.DRAFT && employee.role !== Role.ADMIN) {
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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    const report = await db.expenseReport.findUnique({ where: { id: params.id } })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (report.employeeId !== employee.id && employee.role !== Role.ADMIN) {
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
