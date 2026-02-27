import { notFound, redirect } from 'next/navigation'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { ReportDetail } from '@/components/reports/report-detail'

const tripInclude = {
  originProperty: true,
  destinationProperty: true,
} as const

export default async function ReportPage({ params }: { params: { id: string } }) {
  const employee = await requireEmployee()

  const report = await db.expenseReport.findUnique({
    where: { id: params.id },
    include: {
      employee: { select: { id: true, name: true, email: true, homeAddress: true, managerId: true } },
      trips: {
        include: tripInclude,
        orderBy: { date: 'asc' },
      },
      approvedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } },
      parentReport: { select: { id: true, reportNumber: true } },
    },
  })

  if (!report) notFound()

  // Access control
  const isOwner = report.employeeId === employee.id
  const isManagerOfOwner =
    (employee.role === Role.MANAGER || employee.role === Role.ADMIN) &&
    report.employee.managerId === employee.id
  const isAdmin = employee.role === Role.ADMIN

  if (!isOwner && !isManagerOfOwner && !isAdmin) {
    redirect('/reports')
  }

  return (
    <ReportDetail
      report={report as never}
      currentEmployee={{ id: employee.id, role: employee.role, homeAddress: employee.homeAddress }}
      isOwner={isOwner}
    />
  )
}
