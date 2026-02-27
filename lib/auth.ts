import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

export async function getEmployee() {
  const user = await currentUser()
  if (!user) return null

  const email = user.emailAddresses[0]?.emailAddress
  if (!email) return null

  // Try to find existing employee record
  let employee = await db.employee.findFirst({
    where: {
      OR: [
        { clerkUserId: user.id },
        { email },
      ],
    },
    include: {
      manager: true,
    },
  })

  if (employee) {
    // Link clerkUserId if not set
    if (!employee.clerkUserId) {
      employee = await db.employee.update({
        where: { id: employee.id },
        data: { clerkUserId: user.id },
        include: { manager: true },
      })
    }
  } else {
    // Auto-create employee record for new users
    employee = await db.employee.create({
      data: {
        clerkUserId: user.id,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || email,
        email,
        role: Role.EMPLOYEE,
        homeAddress: '4215 Worth Ave, Columbus, OH 43219',
      },
      include: { manager: true },
    })
  }

  return employee
}

export async function requireEmployee() {
  const employee = await getEmployee()
  if (!employee) throw new Error('Unauthorized')
  return employee
}

export async function requireManager() {
  const employee = await requireEmployee()
  if (employee.role !== Role.MANAGER && employee.role !== Role.ADMIN) {
    throw new Error('Forbidden: Manager access required')
  }
  return employee
}

export async function requireAdmin() {
  const employee = await requireEmployee()
  if (employee.role !== Role.ADMIN) {
    throw new Error('Forbidden: Admin access required')
  }
  return employee
}

export function isManager(role: Role) {
  return role === Role.MANAGER || role === Role.ADMIN
}

export function isAdmin(role: Role) {
  return role === Role.ADMIN
}
