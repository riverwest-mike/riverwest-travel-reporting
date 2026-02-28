import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role, EmployeeStatus } from '@prisma/client'

export default async function AOLayout({ children }: { children: React.ReactNode }) {
  let employee
  try {
    employee = await requireEmployee()
  } catch {
    redirect('/sign-in')
  }

  if (employee.status === EmployeeStatus.PENDING) redirect('/pending')

  // Only AO and Admin can access AO pages
  const isAdminOrAO = employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER
  if (!isAdminOrAO) redirect('/reports')

  const pendingUsersCount = await db.employee.count({
    where: { status: EmployeeStatus.PENDING },
  })

  const pendingCount = await db.expenseReport.count({
    where: {
      status: 'SUBMITTED',
      deletedAt: null,
      employee: { approvers: { some: { approverId: employee.id } } },
    },
  })

  const employeeActionCount = await db.expenseReport.count({
    where: {
      employeeId: employee.id,
      deletedAt: null,
      status: { in: ['DRAFT', 'NEEDS_REVISION', 'REJECTED'] },
    },
  })

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar
        role={employee.role}
        employeeName={employee.name}
        pendingCount={pendingCount}
        employeeActionCount={employeeActionCount}
        pendingUsersCount={pendingUsersCount}
      />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>
    </div>
  )
}
