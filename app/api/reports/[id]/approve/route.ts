import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus, Role } from '@prisma/client'
import { generateExpenseReportExcel } from '@/lib/excel'
import { sendReportToAccounting, notifyEmployeeOfDecision } from '@/lib/email'
import { formatPeriod, formatCurrency } from '@/lib/utils'
import { tripLocationLabel } from '@/lib/reports'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await requireEmployee()

    if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const report = await db.expenseReport.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
        trips: {
          include: { originProperty: true, destinationProperty: true },
          orderBy: { date: 'asc' },
        },
        parentReport: { select: { reportNumber: true } },
      },
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (report.status !== ReportStatus.SUBMITTED) {
      return NextResponse.json({ error: 'Only submitted reports can be approved' }, { status: 409 })
    }

    // Verify manager relationship (admin can approve any)
    if (manager.role !== Role.ADMIN) {
      if (report.employee.managerId !== manager.id) {
        return NextResponse.json({ error: 'Forbidden: not this employee\'s manager' }, { status: 403 })
      }
    }

    const updated = await db.expenseReport.update({
      where: { id: params.id },
      data: {
        status: ReportStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: manager.id,
      },
    })

    // Generate Excel and send email (fire-and-forget)
    ;(async () => {
      try {
        const period = formatPeriod(report.periodMonth, report.periodYear)

        const tripRows = report.trips.map((t) => {
          const oneWay = t.distance
          const total = t.roundTrip ? oneWay * 2 : oneWay
          return {
            date: t.date,
            originLabel: tripLocationLabel(
              t.originType,
              t.originProperty?.name,
              t.originAddress,
              t.originType === 'HOME'
            ),
            destinationLabel: tripLocationLabel(
              t.destinationType,
              t.destinationProperty?.name,
              t.destinationAddress,
              false
            ),
            distance: oneWay,
            roundTrip: t.roundTrip,
            totalDistance: total,
            purpose: t.purpose,
          }
        })

        const excelBuffer = await generateExpenseReportExcel({
          reportNumber: report.reportNumber,
          employeeName: report.employee.name,
          periodMonth: report.periodMonth,
          periodYear: report.periodYear,
          mileageRate: report.mileageRate,
          totalMiles: report.totalMiles,
          totalAmount: report.totalAmount,
          trips: tripRows,
          parentReportNumber: report.parentReport?.reportNumber,
        })

        const mm = String(report.periodMonth).padStart(2, '0')
        const fileName = `${report.reportNumber}_${report.employee.name.replace(/\s+/g, '_')}.xlsx`

        await sendReportToAccounting({
          employeeName: report.employee.name,
          reportNumber: report.reportNumber,
          period,
          managerEmail: manager.email,
          managerName: manager.name,
          excelBuffer,
          fileName,
        })

        await notifyEmployeeOfDecision({
          employeeEmail: report.employee.email,
          employeeName: report.employee.name,
          reportNumber: report.reportNumber,
          period,
          approved: true,
          reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reports/${report.id}`,
        })
      } catch (err) {
        console.error('Post-approval email error:', err)
      }
    })()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
