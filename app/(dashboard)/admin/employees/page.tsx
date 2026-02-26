import { redirect } from 'next/navigation'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { EmployeesAdmin } from '@/components/admin/employees-admin'

export default async function AdminEmployeesPage() {
  const employee = await requireEmployee()
  if (employee.role !== Role.ADMIN) redirect('/reports')

  const employees = await db.employee.findMany({
    include: {
      manager: { select: { id: true, name: true } },
      _count: { select: { expenseReports: true } },
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  })

  const allEmployees = await db.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <EmployeesAdmin
      employees={employees as never}
      allEmployees={allEmployees}
    />
  )
}
