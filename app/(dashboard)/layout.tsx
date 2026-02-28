import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let employee
  try {
    employee = await requireEmployee()
  } catch {
    redirect('/sign-in')
  }

  // Manager/Admin: reports from their direct reports awaiting approval
  let pendingCount = 0
  if (employee.role === Role.MANAGER || employee.role === Role.ADMIN) {
    pendingCount = await db.expenseReport.count({
      where: {
        status: 'SUBMITTED',
        deletedAt: null,
        employee: { managerId: employee.id },
      },
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
    <div className="flex min-h-screen">
      <Sidebar
        role={employee.role}
        employeeName={employee.name}
        pendingCount={pendingCount}
        employeeActionCount={employeeActionCount}
      />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
