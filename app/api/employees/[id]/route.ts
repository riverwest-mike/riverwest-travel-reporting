import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee, requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireEmployee()

    // Employees can only update their own homeAddress
    // Admins can update any field
    const body = await request.json()

    if (me.role === Role.ADMIN) {
      const { name, email, role, managerId, homeAddress, isActive } = body
      const updated = await db.employee.update({
        where: { id: params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(role !== undefined && { role: role as Role }),
          ...(managerId !== undefined && { managerId }),
          ...(homeAddress !== undefined && { homeAddress }),
          ...(isActive !== undefined && { isActive }),
        },
      })
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
    await requireAdmin()
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
