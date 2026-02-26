import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Properties ────────────────────────────────────────────────────────────
  const properties = await Promise.all([
    prisma.property.upsert({
      where: { name: 'RiverWest' } as never,
      update: {},
      create: {
        name: 'RiverWest',
        address: '2414 W. North Ave',
        city: 'Milwaukee',
        state: 'WI',
      },
    }),
    prisma.property.upsert({
      where: { name: 'Hobart' } as never,
      update: {},
      create: {
        name: 'Hobart',
        address: '1234 Hobart Rd',   // UPDATE with actual address
        city: 'Hobart',
        state: 'TX',
      },
    }),
    prisma.property.upsert({
      where: { name: 'Wabash' } as never,
      update: {},
      create: {
        name: 'Wabash',
        address: '100 S Wabash Ave',  // UPDATE with actual address
        city: 'Chicago',
        state: 'IL',
      },
    }),
    prisma.property.upsert({
      where: { name: 'Menomonee Falls' } as never,
      update: {},
      create: {
        name: 'Menomonee Falls',
        address: 'N88W16621 Appleton Ave', // UPDATE with actual address
        city: 'Menomonee Falls',
        state: 'WI',
      },
    }),
  ])

  console.log(`Seeded ${properties.length} properties`)

  // ── Employees ─────────────────────────────────────────────────────────────
  // Dan Irwin — ADMIN + manager of all
  const dan = await prisma.employee.upsert({
    where: { email: 'dan@riverwestpartners.com' },
    update: {},
    create: {
      name: 'Dan Irwin',
      email: 'dan@riverwestpartners.com',
      role: Role.ADMIN,
      homeAddress: '', // Employee should update via profile settings
    },
  })

  // Regular employees, all managed by Dan
  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { email: 'laura@riverwestpartners.com' },
      update: {},
      create: {
        name: 'Laura Sievers',
        email: 'laura@riverwestpartners.com',
        role: Role.EMPLOYEE,
        managerId: dan.id,
        homeAddress: '',
      },
    }),
    prisma.employee.upsert({
      where: { email: 'mike@riverwestpartners.com' },
      update: {},
      create: {
        name: 'Mike Kolasa',
        email: 'mike@riverwestpartners.com',
        role: Role.EMPLOYEE,
        managerId: dan.id,
        homeAddress: '',
      },
    }),
    prisma.employee.upsert({
      where: { email: 'nick@riverwestpartners.com' },
      update: {},
      create: {
        name: 'Nick Kolasa',
        email: 'nick@riverwestpartners.com',
        role: Role.EMPLOYEE,
        managerId: dan.id,
        homeAddress: '',
      },
    }),
  ])

  console.log(`Seeded Dan Irwin (ADMIN) + ${employees.length} employees`)
  console.log('\nEmployee emails seeded:')
  console.log(`  dan@riverwestpartners.com  (ADMIN/Manager)`)
  employees.forEach(e => console.log(`  ${e.email}  (Employee)`))
  console.log('\nNOTE: Update property addresses and employee home addresses in the Admin panel.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
