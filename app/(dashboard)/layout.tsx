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

  let pendingCount = 0
  if (employee.role === Role.MANAGER || employee.role === Role.ADMIN) {
    pendingCount = await db.expenseReport.count({
      where: {
        status: 'SUBMITTED',
        employee: {
          managerId: employee.id,
        },
      },
    })
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={employee.role}
        employeeName={employee.name}
        pendingCount={pendingCount}
      />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
