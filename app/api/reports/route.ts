import { NextRequest, NextResponse } from 'next/server'
import { requireEmployee, requireActiveEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateReportNumber } from '@/lib/reports'
import { Role, ReportStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const employee = await requireEmployee()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ReportStatus | null
    const employeeId = searchParams.get('employeeId')

    let where: Record<string, unknown> = { deletedAt: null }

    if (employee.role === Role.ADMIN || employee.role === Role.APPLICATION_OWNER) {
      // Admin/AO sees all reports, optionally filtered
      if (employeeId) where.employeeId = employeeId
    } else if (employee.role === Role.MANAGER) {
      // Manager sees own reports + reports of employees they can approve
      where.OR = [
        { employeeId: employee.id },
        { employee: { approvers: { some: { approverId: employee.id } } } },
      ]
      // Filter by employeeId within the manager's visible scope (do not override the OR)
      if (employeeId) where.employeeId = employeeId
    } else {
      where.employeeId = employee.id
    }

    if (status) where.status = status

    const reports = await db.expenseReport.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, email: true } },
        _count: { select: { trips: true } },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(reports)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  let employee
  try {
    employee = await requireActiveEmployee()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'Pending') {
      return NextResponse.json({ error: 'Your account is pending activation by an administrator.' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { periodMonth, periodYear, notes } = body

    if (!periodMonth || !periodYear) {
      return NextResponse.json({ error: 'periodMonth and periodYear are required' }, { status: 400 })
    }

    const month = Number(periodMonth)
    const year = Number(periodYear)
    const currentYear = new Date().getFullYear()
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'periodMonth must be between 1 and 12' }, { status: 400 })
    }
    if (!Number.isInteger(year) || year < currentYear - 5 || year > currentYear) {
      return NextResponse.json({ error: `periodYear must be between ${currentYear - 5} and ${currentYear}` }, { status: 400 })
    }

    // Get the effective mileage rate from the MileageRate table
    const today = new Date()
    const rateRecord = await db.mileageRate.findFirst({
      where: { effectiveDate: { lte: today } },
      orderBy: { effectiveDate: 'desc' },
    })
    const mileageRate = rateRecord?.rate ?? parseFloat(process.env.MILEAGE_RATE ?? '0.70')

    const reportNumber = await generateReportNumber(month, year)

    const report = await db.expenseReport.create({
      data: {
        reportNumber,
        employeeId: employee.id,
        periodMonth: month,
        periodYear: year,
        mileageRate,
        notes: notes ?? null,
        status: ReportStatus.DRAFT,
      },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (err) {
    console.error('[POST /api/reports]', err)
    return NextResponse.json({ error: 'Failed to create report. Please try again.' }, { status: 500 })
  }
}
