import { redirect } from 'next/navigation'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { EmployeesAdmin } from '@/components/admin/employees-admin'

export default async function AdminEmployeesPage() {
  const employee = await requireEmployee()

  const isAdmin = employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER
  if (!isAdmin) redirect('/reports')

  const employees = await db.employee.findMany({
    include: {
      approvers: {
        include: { approver: { select: { id: true, name: true } } },
      },
      _count: { select: { canApproveFor: true } },
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  })

  // All active managers/admins/AOs who can be assigned as approvers
  const allManagers = await db.employee.findMany({
    where: {
      isActive: true,
      role: { in: [Role.MANAGER, Role.ADMIN] },
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return (
    <EmployeesAdmin
      employees={employees as never}
      allManagers={allManagers}
      isAO={false}
    />
  )
}
