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
    const approver = await requireEmployee()

    const isAdminOrAO =
      approver.role === Role.ADMIN || approver.role === Role.APPLICATION_OWNER

    if (
      approver.role !== Role.MANAGER &&
      approver.role !== Role.ADMIN &&
      approver.role !== Role.APPLICATION_OWNER
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const report = await db.expenseReport.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          include: {
            approvers: { select: { approverId: true } },
          },
        },
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

    // Verify approver relationship (admin/AO can approve any)
    if (!isAdminOrAO) {
      const isAllowedApprover = report.employee.approvers.some(
        (a) => a.approverId === approver.id
      )
      if (!isAllowedApprover) {
        return NextResponse.json(
          { error: 'Forbidden: not an allowed approver for this employee' },
          { status: 403 }
        )
      }
    }

    const updated = await db.expenseReport.update({
      where: { id: params.id },
      data: {
        status: ReportStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: approver.id,
      },
    })

    // Generate accounting Excel and send (fire-and-forget)
    ;(async () => {
      try {
        const period = formatPeriod(report.periodMonth, report.periodYear)
        const dateApproved = new Date()
        const mileageRate = report.mileageRate

        const tripRows: AccountingTripRow[] = report.trips.map((t) => {
          const miles = t.roundTrip ? t.distance * 2 : t.distance
          return {
            employeeName: report.employee.name,
            dateApproved,
            departureLocation: tripLocationLabel(
              t.originType,
              t.originProperty?.name,
              t.originAddress,
              t.originType === 'HOME'
            ),
            destinationLocation: tripLocationLabel(
              t.destinationType,
              t.destinationProperty?.name,
              t.destinationAddress,
              false
            ),
            businessPurpose: t.purpose ?? '',
            approvedMileage: miles,
            reimbursementTotal: Math.round(miles * mileageRate * 100) / 100,
            managerName: approver.name,
            reportName: report.reportNumber,
            mileageRate,
          }
        })

        const totalMiles = tripRows.reduce((s, t) => s + t.approvedMileage, 0)
        const totalAmount = Math.round(totalMiles * mileageRate * 100) / 100

        const excelBuffer = await generateAccountingExcel(tripRows)
        const fileName = `Accounting_${report.reportNumber}_${report.employee.name.replace(/\s+/g, '_')}.xlsx`
        const accountingEmail = process.env.ACCOUNTING_EMAIL ?? 'controller@riverwestpartners.com'

        // Create the audit log first — if email fails we still have a record
        await db.accountingExportLog.create({
          data: {
            fileName,
            sentToEmail: accountingEmail,
            tripCount: tripRows.length,
            totalMiles,
            totalAmount,
            employeeName: report.employee.name,
            managerName: approver.name,
            reportNumber: report.reportNumber,
            expenseReportId: report.id,
          },
        })

        await sendReportToAccounting({
          employeeName: report.employee.name,
          reportNumber: report.reportNumber,
          period,
          managerEmail: approver.email,
          managerName: approver.name,
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
        console.error('Post-approval email/log error:', err)
      }
    })()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
