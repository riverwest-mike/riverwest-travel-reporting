import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { generateAccountingExcel } from '@/lib/excel'

function tripLabel(type: string, property: { name: string } | null, address: string | null) {
  if (type === 'HOME') return 'Primary Office'
  if (type === 'PROPERTY' && property) return property.name
  return address ?? 'Unknown'
}

export async function GET(request: NextRequest) {
  try {
    const employee = await requireEmployee()
    if (employee.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'APPROVED'
    const employeeId = searchParams.get('employeeId') || undefined
    const managerId = searchParams.get('managerId') || undefined
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined

    const reportWhere: Record<string, unknown> = {
      status,
      deletedAt: null,
      ...(employeeId && { employeeId }),
      ...(year && { periodYear: year }),
      ...(month && { periodMonth: month }),
      ...(managerId && { employee: { approvers: { some: { approverId: managerId } } } }),
    }

    const trips = await db.trip.findMany({
      where: { report: reportWhere },
      include: {
        report: {
          include: {
            employee: { select: { name: true } },
            approvedBy: { select: { name: true } },
          },
        },
        originProperty: { select: { name: true } },
        destinationProperty: { select: { name: true } },
      },
      orderBy: [
        { report: { employee: { name: 'asc' } } },
        { date: 'asc' },
      ],
    })

    if (trips.length === 0) {
      return new NextResponse('No trips found for selected filters.', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    const rows = trips.map(t => ({
      employeeName: t.report.employee.name,
      dateApproved: t.report.approvedAt ?? t.report.updatedAt,
      departureLocation: tripLabel(t.originType, t.originProperty, t.originAddress),
      destinationLocation: tripLabel(t.destinationType, t.destinationProperty, t.destinationAddress),
      businessPurpose: t.purpose ?? '',
      approvedMileage: t.roundTrip ? t.distance * 2 : t.distance,
      mileageRate: t.report.mileageRate,
      reimbursementTotal: (t.roundTrip ? t.distance * 2 : t.distance) * t.report.mileageRate,
      managerName: t.report.approvedBy?.name ?? '—',
      reportName: t.report.reportNumber,
    }))

    const buffer = await generateAccountingExcel(rows)

    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const filename = `RiverWest-BulkExport-${dateStr}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
