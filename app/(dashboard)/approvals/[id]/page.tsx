import { notFound, redirect } from 'next/navigation'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { ApprovalDetail } from '@/components/approvals/approval-detail'

export default async function ApprovalDetailPage({ params }: { params: { id: string } }) {
  const manager = await requireEmployee()

  const isAdminOrAO = manager.role === Role.ADMIN || manager.role === Role.APPLICATION_OWNER

  if (
    manager.role !== Role.MANAGER &&
    manager.role !== Role.ADMIN &&
    manager.role !== Role.APPLICATION_OWNER
  ) {
    redirect('/reports')
  }

  const report = await db.expenseReport.findUnique({
    where: { id: params.id },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          approvers: { select: { approverId: true } },
        },
      },
      trips: {
        include: { originProperty: true, destinationProperty: true },
        orderBy: { date: 'asc' },
      },
      approvedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } },
    },
  })

  if (!report) notFound()

  // Verify approver relationship (admin/AO can view any)
  if (!isAdminOrAO) {
    const isAllowed = report.employee.approvers.some((a) => a.approverId === manager.id)
    if (!isAllowed) redirect('/approvals')
  }

  return <ApprovalDetail report={report as never} managerId={manager.id} />
}
