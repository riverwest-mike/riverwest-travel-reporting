import { notFound, redirect } from 'next/navigation'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { ApprovalDetail } from '@/components/approvals/approval-detail'

export default async function ApprovalDetailPage({ params }: { params: { id: string } }) {
  const manager = await requireEmployee()

  if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) {
    redirect('/reports')
  }

  const report = await db.expenseReport.findUnique({
    where: { id: params.id },
    include: {
      employee: { select: { id: true, name: true, email: true, managerId: true } },
      trips: {
        include: { originProperty: true, destinationProperty: true },
        orderBy: { date: 'asc' },
      },
      approvedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } },
      parentReport: { select: { id: true, reportNumber: true } },
    },
  })

  if (!report) notFound()

  // Verify manager relationship (admin can view any)
  if (manager.role !== Role.ADMIN && report.employee.managerId !== manager.id) {
    redirect('/approvals')
  }

  return <ApprovalDetail report={report as never} managerId={manager.id} />
}
