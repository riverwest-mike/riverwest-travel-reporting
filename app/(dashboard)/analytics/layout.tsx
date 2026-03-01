import { redirect } from 'next/navigation'
import { requireEmployee } from '@/lib/auth'
import { Role } from '@prisma/client'

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const employee = await requireEmployee()
  if (employee.role !== Role.ADMIN && employee.role !== Role.APPLICATION_OWNER) {
    redirect('/reports')
  }
  return <>{children}</>
}
