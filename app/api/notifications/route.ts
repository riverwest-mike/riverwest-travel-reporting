import { NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role, ReportStatus } from '@prisma/client'

// GET /api/notifications
// Returns pending action items for the current user
export async function GET() {
  try {
    const employee = await requireEmployee()
    const isAdminOrAO = employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER
    const isManagerOrAbove =
      employee.role === Role.MANAGER || employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER

    const items: Array<{
      type: string
      label: string
      href: string
      count: number
      reports?: Array<{ id: string; reportNumber: string; employeeName: string }>
    }> = []

    // Pending approval reports (manager+ only)
    if (isManagerOrAbove) {
      const pendingFilter = isAdminOrAO
        ? { status: ReportStatus.SUBMITTED, deletedAt: null }
        : {
            status: ReportStatus.SUBMITTED,
            deletedAt: null,
            employee: { approvers: { some: { approverId: employee.id } } },
          }

      const pending = await db.expenseReport.findMany({
        where: pendingFilter,
        select: {
          id: true,
          reportNumber: true,
          employee: { select: { name: true } },
          submittedAt: true,
        },
        orderBy: { submittedAt: 'asc' },
        take: 10,
      })

      if (pending.length > 0) {
        items.push({
          type: 'pending_approval',
          label: `${pending.length} report${pending.length !== 1 ? 's' : ''} awaiting approval`,
          href: '/approvals',
          count: pending.length,
          reports: pending.map(r => ({
            id: r.id,
            reportNumber: r.reportNumber,
            employeeName: r.employee.name,
          })),
        })
      }
    }

    // Employee's own reports needing revision
    const needsRevision = await db.expenseReport.findMany({
      where: {
        employeeId: employee.id,
        status: { in: [ReportStatus.NEEDS_REVISION, ReportStatus.REJECTED] },
        deletedAt: null,
      },
      select: { id: true, reportNumber: true },
    })
    if (needsRevision.length > 0) {
      items.push({
        type: 'needs_revision',
        label: `${needsRevision.length} report${needsRevision.length !== 1 ? 's' : ''} returned for revision`,
        href: '/reports',
        count: needsRevision.length,
        reports: needsRevision.map(r => ({
          id: r.id,
          reportNumber: r.reportNumber,
          employeeName: 'You',
        })),
      })
    }

    // Pending users (admin only)
    if (isAdminOrAO) {
      const pendingUsers = await db.employee.count({
        where: { status: 'PENDING' },
      })
      if (pendingUsers > 0) {
        items.push({
          type: 'pending_users',
          label: `${pendingUsers} user${pendingUsers !== 1 ? 's' : ''} awaiting activation`,
          href: '/ao/pending-users',
          count: pendingUsers,
        })
      }
    }

    const total = items.reduce((s, i) => s + i.count, 0)
    return NextResponse.json({ items, total })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
