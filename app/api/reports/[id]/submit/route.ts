import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus, EmployeeStatus } from '@prisma/client'
import { notifyApproversOfSubmission } from '@/lib/email'
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
    if (
      report.status !== ReportStatus.DRAFT &&
      report.status !== ReportStatus.REJECTED &&
      report.status !== ReportStatus.NEEDS_REVISION
    ) {
      return NextResponse.json({ error: 'Report cannot be submitted in its current state' }, { status: 409 })
    }
    if (report.trips.length === 0) {
      return NextResponse.json({ error: 'Cannot submit a report with no trips' }, { status: 400 })
    }

    const updated = await db.expenseReport.update({
      where: { id: params.id },
      data: { status: ReportStatus.SUBMITTED, submittedAt: new Date() },
    })

    // Notify all approvers (fire-and-forget)
    ;(async () => {
      try {
        const approverLinks = await db.employeeApprover.findMany({
          where: { employeeId: employee.id },
          include: { approver: { select: { email: true, name: true, status: true } } },
        })
        const activeApprovers = approverLinks
          .filter((a) => a.approver.status === EmployeeStatus.ACTIVE)
          .map((a) => ({ email: a.approver.email, name: a.approver.name }))

        if (activeApprovers.length > 0) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          await notifyApproversOfSubmission({
            employeeName: employee.name,
            reportNumber: report.reportNumber,
            period: formatPeriod(report.periodMonth, report.periodYear),
            approvers: activeApprovers,
            reportUrl: `${appUrl}/approvals/${report.id}`,
          })
        }
      } catch (err) {
        console.error('Submit notification error:', err)
      }
    })()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
