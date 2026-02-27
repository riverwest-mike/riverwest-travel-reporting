import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReportStatus, Role } from '@prisma/client'
import { generateAccountingExcel, AccountingTripRow } from '@/lib/excel'
import { sendReportToAccounting, notifyEmployeeOfDecision } from '@/lib/email'
import { formatPeriod } from '@/lib/utils'
import { tripLocationLabel } from '@/lib/reports'

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
      include: {
        employee: true,
        trips: {
          include: { originProperty: true, destinationProperty: true },
          orderBy: { date: 'asc' },
        },
      },
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

    // If any trips were individually approved before rejection, send those to accounting
    const alreadyApprovedTrips = report.trips.filter((t) => t.tripStatus === 'APPROVED')

    if (alreadyApprovedTrips.length > 0) {
      ;(async () => {
        try {
          const period = formatPeriod(report.periodMonth, report.periodYear)
          const dateApproved = new Date()
          const mileageRate = report.mileageRate

          const tripRows: AccountingTripRow[] = alreadyApprovedTrips.map((t) => {
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
          const fileName = `Accounting_${report.reportNumber}_${report.employee.name.replace(/\s+/g, '_')}_partial.xlsx`
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
        } catch (err) {
          console.error('Partial accounting export error:', err)
        }
      })()
    }

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
