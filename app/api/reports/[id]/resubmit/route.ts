import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus } from '@prisma/client'
import { notifyApproversOfSubmission } from '@/lib/email'
import { formatPeriod } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Accept NEEDS_REVISION (new flow) or REJECTED (legacy records)
    if (report.status !== ReportStatus.NEEDS_REVISION && report.status !== ReportStatus.REJECTED) {
      return NextResponse.json({ error: 'Only reports needing revision can be resubmitted' }, { status: 409 })
    }

    if (report.trips.length === 0) {
      return NextResponse.json({ error: 'Cannot resubmit a report with no trips' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const resubmitMessage = typeof body.resubmitMessage === 'string' ? body.resubmitMessage.trim() : null

    // Clear all manager notes on trips
    await db.trip.updateMany({
      where: { reportId: report.id },
      data: { managerNote: null },
    })

    // Flip the same report back to SUBMITTED — no new report created
    const updated = await db.expenseReport.update({
      where: { id: report.id },
      data: {
        status: ReportStatus.SUBMITTED,
        submittedAt: new Date(),
        resubmitMessage: resubmitMessage || null,
      },
    })

    // Notify all approvers (fire-and-forget)
    ;(async () => {
      try {
        const approverLinks = await db.employeeApprover.findMany({
          where: { employeeId: employee.id },
          include: { approver: { select: { email: true, name: true, isActive: true } } },
        })
        const activeApprovers = approverLinks
          .filter((a) => a.approver.isActive)
          .map((a) => ({ email: a.approver.email, name: a.approver.name }))

        if (activeApprovers.length > 0) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          await notifyApproversOfSubmission({
            employeeName: employee.name,
            reportNumber: report.reportNumber,
            period: formatPeriod(report.periodMonth, report.periodYear),
            approvers: activeApprovers,
            resubmitMessage: resubmitMessage || undefined,
            isResubmission: true,
            reportUrl: `${appUrl}/approvals/${report.id}`,
          })
        }
      } catch (err) {
        console.error('Resubmit notification error:', err)
      }
    })()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
