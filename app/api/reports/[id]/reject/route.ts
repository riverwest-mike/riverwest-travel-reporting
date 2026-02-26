import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus, Role } from '@prisma/client'
import { notifyEmployeeOfDecision } from '@/lib/email'
import { formatPeriod } from '@/lib/utils'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await requireEmployee()

    if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { reason } = body

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
    }

    const report = await db.expenseReport.findUnique({
      where: { id: params.id },
      include: { employee: true },
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (report.status !== ReportStatus.SUBMITTED) {
      return NextResponse.json({ error: 'Only submitted reports can be rejected' }, { status: 409 })
    }

    if (manager.role !== Role.ADMIN && report.employee.managerId !== manager.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark any still-pending trips as rejected with the same reason
    await db.trip.updateMany({
      where: { reportId: params.id, tripStatus: 'PENDING' },
      data: { tripStatus: 'REJECTED', tripRejectionReason: reason.trim(), tripRejectedById: manager.id },
    })

    const updated = await db.expenseReport.update({
      where: { id: params.id },
      data: {
        status: ReportStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedById: manager.id,
        rejectionReason: reason.trim(),
      },
    })

    // Notify employee (fire-and-forget)
    notifyEmployeeOfDecision({
      employeeEmail: report.employee.email,
      employeeName: report.employee.name,
      reportNumber: report.reportNumber,
      period: formatPeriod(report.periodMonth, report.periodYear),
      approved: false,
      rejectionReason: reason.trim(),
      reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reports/${report.id}`,
    }).catch(console.error)

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
