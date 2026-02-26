import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

// One-time seed endpoint — protected by SEED_SECRET env var
// Call: GET /api/seed?secret=YOUR_SEED_SECRET
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.SEED_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'SEED_SECRET environment variable is not set' },
      { status: 500 }
    )
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  try {
    // ── Properties ────────────────────────────────────────────────────────
    const propData = [
      { name: 'RiverWest', address: '2414 W. North Ave', city: 'Milwaukee', state: 'WI' },
      { name: 'Hobart', address: '1234 Hobart Rd', city: 'Hobart', state: 'TX' },
      { name: 'Wabash', address: '100 S Wabash Ave', city: 'Chicago', state: 'IL' },
      { name: 'Menomonee Falls', address: 'N88W16621 Appleton Ave', city: 'Menomonee Falls', state: 'WI' },
    ]

    const properties = []
    for (const p of propData) {
      const existing = await db.property.findFirst({ where: { name: p.name } })
      if (!existing) {
        properties.push(await db.property.create({ data: p }))
      } else {
        properties.push(existing)
      }
    }

    // ── Employees ─────────────────────────────────────────────────────────
    let dan = await db.employee.findFirst({ where: { email: 'dan@riverwestpartners.com' } })
    if (!dan) {
      dan = await db.employee.create({
        data: {
          name: 'Dan Irwin',
          email: 'dan@riverwestpartners.com',
          role: Role.ADMIN,
        },
      })
    }

    const employeeData = [
      { name: 'Laura Sievers', email: 'laura@riverwestpartners.com' },
      { name: 'Mike Kolasa', email: 'mike@riverwestpartners.com' },
      { name: 'Nick Kolasa', email: 'nick@riverwestpartners.com' },
    ]

    const employees = []
    for (const e of employeeData) {
      const existing = await db.employee.findFirst({ where: { email: e.email } })
      if (!existing) {
        employees.push(
          await db.employee.create({
            data: { ...e, role: Role.EMPLOYEE, managerId: dan.id },
          })
        )
      } else {
        employees.push(existing)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      seeded: {
        properties: properties.map((p) => p.name),
        employees: [dan, ...employees].map((e) => `${e.name} (${e.email})`),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Seed failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
