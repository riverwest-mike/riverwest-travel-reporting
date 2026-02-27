import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus, Role } from '@prisma/client'
import { generateAccountingExcel, AccountingTripRow } from '@/lib/excel'
import { sendReportToAccounting, notifyEmployeeOfDecision } from '@/lib/email'
import { formatPeriod } from '@/lib/utils'
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

    // Mark all pending/approved trips as APPROVED
    await db.trip.updateMany({
      where: { reportId: params.id, tripStatus: { not: 'REJECTED' } },
      data: { tripStatus: 'APPROVED', tripApprovedById: manager.id },
    })

    const updated = await db.expenseReport.update({
      where: { id: params.id },
      data: {
        status: ReportStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: manager.id,
      },
    })

    // Re-fetch trips after status update to get final approved set
    const approvedTrips = await db.trip.findMany({
      where: { reportId: params.id, tripStatus: 'APPROVED' },
      include: { originProperty: true, destinationProperty: true },
      orderBy: { date: 'asc' },
    })

    // Generate accounting Excel and send (fire-and-forget)
    ;(async () => {
      try {
        const period = formatPeriod(report.periodMonth, report.periodYear)
        const dateApproved = new Date()
        const mileageRate = report.mileageRate

        const tripRows: AccountingTripRow[] = approvedTrips.map((t) => {
          const miles = t.roundTrip ? t.distance * 2 : t.distance
          return {
            employeeName: report.employee.name,
            dateApproved,
            departureLocation: tripLocationLabel(t.originType, t.originProperty?.name, t.originAddress, t.originType === 'HOME'),
            destinationLocation: tripLocationLabel(t.destinationType, t.destinationProperty?.name, t.destinationAddress, false),
            businessPurpose: t.purpose ?? '',
            approvedMileage: miles,
            reimbursementTotal: Math.round(miles * mileageRate * 100) / 100,
            managerName: manager.name,
            reportName: report.reportNumber,
          }
        })

        const totalMiles = tripRows.reduce((s, t) => s + t.approvedMileage, 0)
        const totalAmount = Math.round(totalMiles * mileageRate * 100) / 100

        const excelBuffer = await generateAccountingExcel(tripRows)
        const fileName = `Accounting_${report.reportNumber}_${report.employee.name.replace(/\s+/g, '_')}.xlsx`
        const accountingEmail = process.env.ACCOUNTING_EMAIL ?? 'controller@riverwestpartners.com'

        await sendReportToAccounting({
          employeeName: report.employee.name,
          reportNumber: report.reportNumber,
          period,
          managerEmail: manager.email,
          managerName: manager.name,
          excelBuffer,
          fileName,
        })

        // Log the export in the admin accounting log
        await db.accountingExportLog.create({
          data: {
            fileName,
            sentToEmail: accountingEmail,
            tripCount: tripRows.length,
            totalMiles,
            totalAmount,
            employeeName: report.employee.name,
            managerName: manager.name,
            reportNumber: report.reportNumber,
            expenseReportId: report.id,
          },
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
        console.error('Post-approval email/log error:', err)
      }
    })()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
