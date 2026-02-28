import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus } from '@prisma/client'
import { notifyManagerOfSubmission } from '@/lib/email'
import { formatPeriod } from '@/lib/utils'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employee = await requireEmployee()
    const report = await db.expenseReport.findUnique({
      where: { id: params.id },
      include: { trips: true },
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (report.employeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (report.status !== ReportStatus.DRAFT && report.status !== ReportStatus.REJECTED && report.status !== ReportStatus.NEEDS_REVISION) {
      return NextResponse.json({ error: 'Report cannot be submitted in its current state' }, { status: 409 })
    }
    if (report.trips.length === 0) {
      return NextResponse.json({ error: 'Cannot submit a report with no trips' }, { status: 400 })
    }

    const updated = await db.expenseReport.update({
      where: { id: params.id },
      data: { status: ReportStatus.SUBMITTED, submittedAt: new Date() },
    })

    // Notify manager (fire-and-forget)
    if (employee.managerId) {
      const manager = await db.employee.findUnique({ where: { id: employee.managerId } })
      if (manager?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        notifyManagerOfSubmission({
          employeeName: employee.name,
          reportNumber: report.reportNumber,
          period: formatPeriod(report.periodMonth, report.periodYear),
          managerEmail: manager.email,
          managerName: manager.name,
          reportUrl: `${appUrl}/approvals/${report.id}`,
        }).catch(console.error)
      }
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
