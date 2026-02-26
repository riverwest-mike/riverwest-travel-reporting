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
    // ── Clear existing data ────────────────────────────────────────────────
    await db.trip.deleteMany()
    await db.expenseReport.deleteMany()
    await db.employee.deleteMany()
    await db.property.deleteMany()

    // ── Properties ────────────────────────────────────────────────────────
    const propData = [
      { name: 'RiverWest', address: '2414 W. North Ave', city: 'Milwaukee', state: 'WI' },
      { name: 'Hobart', address: '1234 Hobart Rd', city: 'Hobart', state: 'TX' },
      { name: 'Wabash', address: '100 S Wabash Ave', city: 'Chicago', state: 'IL' },
      { name: 'Menomonee Falls', address: 'N88W16621 Appleton Ave', city: 'Menomonee Falls', state: 'WI' },
    ]

    const properties = await Promise.all(
      propData.map((p) => db.property.create({ data: p }))
    )

    // ── Level 1: Admins (no manager) ──────────────────────────────────────
    const frank = await db.employee.create({
      data: { name: 'Frank Tice', email: 'ftice@riverwestpartners.com', role: Role.ADMIN },
    })
    const michael = await db.employee.create({
      data: { name: 'Michael Pisano', email: 'mpisano@riverwestpartners.com', role: Role.ADMIN },
    })
    const kelly = await db.employee.create({
      data: { name: 'Kelly Meeder', email: 'kmeeder@riverwestpartners.com', role: Role.ADMIN },
    })

    // ── Level 2: Managers (report to Frank Tice) ──────────────────────────
    const erica = await db.employee.create({
      data: { name: 'Erica Schork', email: 'eschork@riverwestproperties.com', role: Role.MANAGER, managerId: frank.id },
    })
    const richard = await db.employee.create({
      data: { name: 'Richard Kellermann', email: 'rkellermann@riverwestproperties.com', role: Role.MANAGER, managerId: frank.id },
    })
    const dan = await db.employee.create({
      data: { name: 'Dan Irwin', email: 'dirwin@riverwestproperties.com', role: Role.MANAGER, managerId: frank.id },
    })

    // ── Level 3: Employees ────────────────────────────────────────────────
    const employeeData = [
      // Under Erica Schork
      { name: 'Jessica Handa', email: 'jhanda@riverwestproperties.com', managerId: erica.id },
      { name: 'Madisyn Campos', email: 'mcampos@riverwestproperties.com', managerId: erica.id },
      // Under Richard Kellermann
      { name: 'Dustin Palma', email: 'dpalma@riverwestproperties.com', managerId: richard.id },
      { name: 'Stephen Stertzbach', email: 'sstertzbach@riverwestproperties.com', managerId: richard.id },
      // Under Dan Irwin
      { name: 'Aaron Rodriguez', email: 'arodriguez@riverwestproperties.com', managerId: dan.id },
      { name: 'Benjamin Bowman', email: 'bbowman@riverwestproperties.com', managerId: dan.id },
      { name: 'Chris Keller', email: 'ckeller@riverwestproperties.com', managerId: dan.id },
      { name: 'Russ Milburn', email: 'rmilburn@riverwestproperties.com', managerId: dan.id },
      { name: 'Ryan Marlowe', email: 'rmarlowe@riverwestproperties.com', managerId: dan.id },
      { name: 'Leon Woodfork', email: 'lwoodfork@riverwestproperties.com', managerId: dan.id },
      // Under Michael Pisano
      { name: 'Tyler Milliren', email: 'tmilliren@riverwestpartners.com', managerId: michael.id },
      { name: 'Renee Rawlins', email: 'rrawlins@riverwestpartners.com', managerId: michael.id },
      { name: 'Jessica Hagans', email: 'jhagans@riverwestpartners.com', managerId: michael.id },
      { name: 'Controller Test', email: 'controller@riverwestpartners.com', managerId: michael.id },
      // Under Kelly Meeder
      { name: 'Brittany Gates', email: 'bgates@riverwestproperties.com', managerId: kelly.id },
      { name: 'Niki Deal', email: 'ndeal@riverwestproperties.com', managerId: kelly.id },
      // Under Frank Tice (direct reports)
      { name: 'Brady Sapp', email: 'bsapp@riverwestproperties.com', managerId: frank.id },
      { name: 'Abbey Spence', email: 'aspence@riverwestproperties.com', managerId: frank.id },
      { name: 'Jeremy Freeman', email: 'jfreeman@riverwestproperties.com', managerId: frank.id },
    ]

    const employees = await Promise.all(
      employeeData.map((e) =>
        db.employee.create({ data: { ...e, role: Role.EMPLOYEE } })
      )
    )

    const allEmployees = [frank, michael, kelly, erica, richard, dan, ...employees]

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      seeded: {
        properties: properties.map((p) => p.name),
        employees: allEmployees.map((e) => `${e.name} (${e.email}) — ${e.role}`),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Seed failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
