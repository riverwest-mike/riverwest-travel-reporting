import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// GET /api/employees/[id]/approvers — list approvers for an employee
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireEmployee()
    const isAdminOrAO = me.role === Role.ADMIN || me.role === Role.APPLICATION_OWNER
    if (!isAdminOrAO && me.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const approvers = await db.employeeApprover.findMany({
      where: { employeeId: params.id },
      include: { approver: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(approvers.map((a) => a.approver))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST /api/employees/[id]/approvers — add an approver
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireEmployee()
    const isAdminOrAO = me.role === Role.ADMIN || me.role === Role.APPLICATION_OWNER
    if (!isAdminOrAO) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { approverId } = await request.json()
    if (!approverId) {
      return NextResponse.json({ error: 'approverId is required' }, { status: 400 })
    }
    if (approverId === params.id) {
      return NextResponse.json({ error: 'An employee cannot approve their own reports' }, { status: 400 })
    }

    const record = await db.employeeApprover.create({
      data: { employeeId: params.id, approverId },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'P2002') {
      return NextResponse.json({ error: 'That approver is already assigned' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE /api/employees/[id]/approvers?approverId=xxx — remove an approver
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireEmployee()
    const isAdminOrAO = me.role === Role.ADMIN || me.role === Role.APPLICATION_OWNER
    if (!isAdminOrAO) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const approverId = searchParams.get('approverId')
    if (!approverId) {
      return NextResponse.json({ error: 'approverId query param is required' }, { status: 400 })
    }

    await db.employeeApprover.deleteMany({
      where: { employeeId: params.id, approverId },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
