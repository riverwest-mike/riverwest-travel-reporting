import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { FloatingHelpButton } from '@/components/help/floating-help-button'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role, EmployeeStatus } from '@prisma/client'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let employee
  try {
    employee = await requireEmployee()
  } catch {
    redirect('/sign-in')
  }

  // Redirect pending users to the holding page
  if (employee.status === EmployeeStatus.PENDING) {
    redirect('/pending')
  }

  const isApproverRole =
    employee.role === Role.MANAGER ||
    employee.role === Role.ADMIN ||
    employee.role === Role.APPLICATION_OWNER

  // Pending approval count: SUBMITTED reports where this employee is an allowed approver
  let pendingCount = 0
  if (isApproverRole) {
    pendingCount = await db.expenseReport.count({
      where: {
        status: 'SUBMITTED',
        deletedAt: null,
        employee: {
          approvers: { some: { approverId: employee.id } },
        },
      },
    })
  }

  // AO/Admin: pending user activations count
  let pendingUsersCount = 0
  if (employee.role === Role.APPLICATION_OWNER || employee.role === Role.ADMIN) {
    pendingUsersCount = await db.employee.count({
      where: { status: EmployeeStatus.PENDING },
    })
  }

  // Employee notification: DRAFT + NEEDS_REVISION (+ legacy REJECTED) reports that need action
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
      <main className="flex-1 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>
      <FloatingHelpButton />
    </div>
  )
}
