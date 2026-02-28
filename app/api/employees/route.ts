import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role, EmployeeStatus } from '@prisma/client'

export async function GET() {
  try {
    const employee = await requireEmployee()
    const isAdminOrAO =
      employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER

    const employees = await db.employee.findMany({
      where: isAdminOrAO ? {} : { id: employee.id },
      include: {
        approvers: {
          include: { approver: { select: { id: true, name: true } } },
        },
        _count: { select: { canApproveFor: true, expenseReports: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(employees)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const me = await requireEmployee()
    const isAdminOrAO =
      me.role === Role.ADMIN || me.role === Role.APPLICATION_OWNER
    if (!isAdminOrAO) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, role, homeAddress, status } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    // Only APPLICATION_OWNER can assign APPLICATION_OWNER role
    if (role === Role.APPLICATION_OWNER && me.role !== Role.APPLICATION_OWNER) {
      return NextResponse.json({ error: 'Only the Application Owner can assign that role' }, { status: 403 })
    }

    const employee = await db.employee.create({
      data: {
        name,
        email,
        role: (role as Role) ?? Role.EMPLOYEE,
        status: (status as EmployeeStatus) ?? EmployeeStatus.ACTIVE,
        homeAddress: homeAddress ?? '4215 Worth Ave, Columbus, OH 43219',
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'P2002') {
      return NextResponse.json({ error: 'An employee with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
