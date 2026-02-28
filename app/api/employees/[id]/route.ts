import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role, EmployeeStatus } from '@prisma/client'
import { notifyUserActivated } from '@/lib/email'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireEmployee()
    const body = await request.json()

    const isAO = me.role === Role.APPLICATION_OWNER
    const isAdminOrAO = me.role === Role.ADMIN || me.role === Role.APPLICATION_OWNER

    if (isAdminOrAO) {
      const { name, email, role, homeAddress, isActive, status } = body

      // Role assignment rules
      if (role !== undefined) {
        // Nobody can change their own role
        if (params.id === me.id) {
          return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 })
        }
        // Only AO can assign AO or change FROM AO
        if (role === Role.APPLICATION_OWNER && !isAO) {
          return NextResponse.json({ error: 'Only the Application Owner can assign that role' }, { status: 403 })
        }
        const target = await db.employee.findUnique({ where: { id: params.id }, select: { role: true } })
        if (target?.role === Role.APPLICATION_OWNER && !isAO) {
          return NextResponse.json({ error: 'Only the Application Owner can change that role' }, { status: 403 })
        }
      }

      // Check if we're activating a pending user
      let wasActivated = false
      if (status === EmployeeStatus.ACTIVE) {
        const target = await db.employee.findUnique({
          where: { id: params.id },
          select: { status: true, email: true, name: true },
        })
        wasActivated = target?.status === EmployeeStatus.PENDING
      }

      const updated = await db.employee.update({
        where: { id: params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(role !== undefined && { role: role as Role }),
          ...(homeAddress !== undefined && { homeAddress }),
          ...(isActive !== undefined && { isActive }),
          ...(status !== undefined && { status: status as EmployeeStatus }),
        },
      })

      // Notify user of activation (fire-and-forget)
      if (wasActivated) {
        notifyUserActivated({
          userEmail: updated.email,
          userName: updated.name,
          appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        }).catch(console.error)
      }

      return NextResponse.json(updated)
    }

    // Regular employee: only own home address
    if (params.id !== me.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { homeAddress } = body
    const updated = await db.employee.update({
      where: { id: params.id },
      data: { homeAddress },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireEmployee()
    const isAdminOrAO = me.role === Role.ADMIN || me.role === Role.APPLICATION_OWNER
    if (!isAdminOrAO) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Soft-delete: mark as inactive
    const updated = await db.employee.update({
      where: { id: params.id },
      data: { isActive: false },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
