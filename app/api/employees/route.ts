import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee, requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

export async function GET() {
  try {
    const employee = await requireEmployee()
    const isAdmin = employee.role === Role.ADMIN

    const employees = await db.employee.findMany({
      where: isAdmin ? {} : { id: employee.id },
      include: {
        manager: { select: { id: true, name: true } },
        _count: { select: { directReports: true, expenseReports: true } },
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
    await requireAdmin()
    const body = await request.json()
    const { name, email, role, managerId, homeAddress } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    const employee = await db.employee.create({
      data: {
        name,
        email,
        role: (role as Role) ?? Role.EMPLOYEE,
        managerId: managerId ?? null,
        homeAddress: homeAddress ?? null,
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
