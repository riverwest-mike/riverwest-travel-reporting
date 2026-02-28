import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { Role, EmployeeStatus } from '@prisma/client'

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
  })

  if (employee) {
    // Link clerkUserId if not set
    if (!employee.clerkUserId) {
      employee = await db.employee.update({
        where: { id: employee.id },
        data: { clerkUserId: user.id },
      })
    }
  } else {
    // Auto-create employee record for new users — PENDING until activated by AO/Admin
    employee = await db.employee.create({
      data: {
        clerkUserId: user.id,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || email,
        email,
        role: Role.EMPLOYEE,
        status: EmployeeStatus.PENDING,
        homeAddress: '4215 Worth Ave, Columbus, OH 43219',
      },
    })

    // Notify Application Owner(s) of new sign-up (fire-and-forget)
    notifyAOOfNewSignup(employee.name, employee.email).catch(console.error)
  }

  return employee
}

async function notifyAOOfNewSignup(name: string, email: string) {
  const { notifyApplicationOwnerOfNewUser } = await import('@/lib/email')
  const owners = await db.employee.findMany({
    where: { role: Role.APPLICATION_OWNER, isActive: true },
    select: { email: true, name: true },
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  await Promise.all(
    owners.map((owner) =>
      notifyApplicationOwnerOfNewUser({
        ownerEmail: owner.email,
        ownerName: owner.name,
        newUserName: name,
        newUserEmail: email,
        pendingUsersUrl: `${appUrl}/ao/pending-users`,
      })
    )
  )
}

export async function requireEmployee() {
  const employee = await getEmployee()
  if (!employee) throw new Error('Unauthorized')
  return employee
}

export async function requireActiveEmployee() {
  const employee = await requireEmployee()
  if (employee.status === EmployeeStatus.PENDING) throw new Error('Pending')
  return employee
}

export async function requireManager() {
  const employee = await requireActiveEmployee()
  if (
    employee.role !== Role.MANAGER &&
    employee.role !== Role.ADMIN &&
    employee.role !== Role.APPLICATION_OWNER
  ) {
    throw new Error('Forbidden: Manager access required')
  }
  return employee
}

export async function requireAdmin() {
  const employee = await requireActiveEmployee()
  if (employee.role !== Role.ADMIN && employee.role !== Role.APPLICATION_OWNER) {
    throw new Error('Forbidden: Admin access required')
  }
  return employee
}

export async function requireApplicationOwner() {
  const employee = await requireActiveEmployee()
  if (employee.role !== Role.APPLICATION_OWNER) {
    throw new Error('Forbidden: Application Owner access required')
  }
  return employee
}

export function isManager(role: Role) {
  return role === Role.MANAGER || role === Role.ADMIN || role === Role.APPLICATION_OWNER
}

export function isAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.APPLICATION_OWNER
}

export function isApplicationOwner(role: Role) {
  return role === Role.APPLICATION_OWNER
}
