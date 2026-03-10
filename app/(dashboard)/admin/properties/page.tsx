import { redirect } from 'next/navigation'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { PropertiesAdmin } from '@/components/admin/properties-admin'

export default async function AdminPropertiesPage() {
  const employee = await requireEmployee()
  if (employee.role !== Role.ADMIN) redirect('/reports')

  const properties = await db.property.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  })

  return <PropertiesAdmin properties={properties as never} />
}
