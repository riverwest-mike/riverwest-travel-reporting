import { PrismaClient, Role, EmployeeStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Properties ────────────────────────────────────────────────────────────
  const propData = [
    { name: '105 Lake Street', address: '105 Lake Street', city: 'Delaware', state: 'OH' },
    { name: '15 Flax LLC', address: '4215 Worth Ave STE 310', city: 'Columbus', state: 'OH' },
    { name: '15 West Cherry', address: '15 W. Cherry St.', city: 'Columbus', state: 'OH' },
    { name: '168 E. Central', address: '168 E Central Ave', city: 'Delaware', state: 'OH' },
    { name: '174 Lake', address: '174 Lake St.', city: 'Delaware', state: 'OH' },
    { name: '201 E Winter Street', address: '201 E Winter Street', city: 'Delaware', state: 'OH' },
    { name: '205 E. Central', address: '205 E. Central Ave.', city: 'Delaware', state: 'OH' },
    { name: '249 E. Central', address: '249 E. Central Ave.', city: 'Delaware', state: 'OH' },
    { name: '28 Estelle', address: '28 Estelle St.', city: 'Delaware', state: 'OH' },
    { name: '28 Oak', address: '28 Oak St.', city: 'Delaware', state: 'OH' },
    { name: '28 Parsons LLC', address: '28 Parsons', city: 'Delaware', state: 'OH' },
    { name: '31 Smith', address: '31 Smith St.', city: 'Delaware', state: 'OH' },
    { name: '349 E. Central', address: '349 E. Central Ave.', city: 'Delaware', state: 'OH' },
    { name: '351 E. Central', address: '351 E. Central Ave.', city: 'Delaware', state: 'OH' },
    { name: '360 E. Central', address: '360 E. Central Ave.', city: 'Delaware', state: 'OH' },
    { name: '37 Carlisle Avenue', address: '37 Carlisle Avenue', city: 'Delaware', state: 'OH' },
    { name: '50 Fair', address: '50 Fair Ave.', city: 'Delaware', state: 'OH' },
    { name: '55 Chamberlain Street', address: '55 Chamberlain Street', city: 'Delaware', state: 'OH' },
    { name: '56 East Main LLC', address: '56 E. Main St.', city: 'Wakeman', state: 'OH' },
    { name: '58 Flax', address: '58 Flax St.', city: 'Delaware', state: 'OH' },
    { name: '60 Lake St LLC', address: '60 Lake St.', city: 'Delaware', state: 'OH' },
    { name: '65 East William', address: '65 E. William St.', city: 'Delaware', state: 'OH' },
    { name: '697 East Broad', address: '697A E. Broad St.', city: 'Columbus', state: 'OH' },
    { name: '860-870 S Parsons LLC', address: '4215 Worth Ave STE 310', city: 'Columbus', state: 'OH' },
    { name: '97 Lake Street', address: '97 Lake Street', city: 'Delaware', state: 'OH' },
    { name: 'Arbor Village Condominium Association', address: '4215 Worth Ave STE 310', city: 'Columbus', state: 'OH' },
    { name: 'Arlington Pointe', address: '2565-2599 Riverside Drive', city: 'Columbus', state: 'OH' },
    { name: 'Austin Manor', address: '95 Elizabeth Street', city: 'Delaware', state: 'OH' },
    { name: 'Berkshire Campground Party House LLC', address: '1848 Alexander Rd.', city: 'Delaware', state: 'OH' },
    { name: 'Berkshire Campground LLC', address: '1848 Alexander Rd.', city: 'Delaware', state: 'OH' },
    { name: 'Bridgeview Estates FKA Waterford Glen', address: '25 Waterford Glen', city: 'Bucyrus', state: 'OH' },
    { name: 'Celina Campground Assets LLC', address: '4215 Worth Ave STE 310', city: 'Columbus', state: 'OH' },
    { name: 'Celina Investors LLC', address: '4215 Worth Ave STE 310', city: 'Columbus', state: 'OH' },
    { name: 'Columbus Corporate Office', address: '4215 Worth Ave STE 310', city: 'Columbus', state: 'OH' },
    { name: 'Country Village', address: '101 Canal Rd.', city: 'Hebron', state: 'OH' },
    { name: 'Exflax LLC', address: '4215 Worth Ave STE 310', city: 'Columbus', state: 'OH' },
    { name: 'Flats of Clintonville', address: '4991-5003 Arbor Village Drive', city: 'Columbus', state: 'OH' },
    { name: 'Forest Hills', address: '710 Ashland Rd.', city: 'Mansfield', state: 'OH' },
    { name: 'Huron MHP', address: '4215 Worth Ave STE 310', city: 'Columbus', state: 'OH' },
    { name: 'Kozy Camping Resort LLC', address: "5134 It's It Rd.", city: 'Celina', state: 'OH' },
    { name: 'Kozy Restaurant LLC', address: "5134 It's It Rd.", city: 'Celina', state: 'OH' },
    { name: 'Mohawk Estates', address: '397 S Delaware Street', city: 'Mount Gilead', state: 'OH' },
    { name: 'Morris MHP', address: '510 Renick Ave.', city: 'Circleville', state: 'OH' },
    { name: 'Oakwood Acres', address: '707 W Main St.', city: 'West Jefferson', state: 'OH' },
    { name: 'Paradise Point Camping Resort LLC', address: '3965 W 550 S', city: 'Portland', state: 'IN' },
    { name: 'Park Grand Camping Resort LLC', address: '6620 Bruce Rd.', city: 'Celina', state: 'OH' },
    { name: 'Park Grand Restaurant LLC', address: '6620 Bruce Rd.', city: 'Celina', state: 'OH' },
    { name: 'Parsons Storage', address: '25 Parsons Ave', city: 'Delaware', state: 'OH' },
    { name: 'Pine Creek Campground Holding LLC', address: '4215 Worth Ave STE 310', city: 'Columbus', state: 'OH' },
    { name: 'Pine Creek Campground LLC', address: '23937 Big Pine Rd.', city: 'South Bloomingville', state: 'OH' },
    { name: 'Pine Grove Camping Resort LLC', address: '8896 US Highway 6', city: 'Conneaut Lake', state: 'PA' },
    { name: "Quarry's Edge FKA Colony Village", address: '3650 Logan-Lancaster Rd.', city: 'Lancaster', state: 'OH' },
    { name: 'RiverWest RV Sales LLC', address: '1848 Alexander Rd.', city: 'Delaware', state: 'OH' },
    { name: 'Shelby', address: '1 Lee St.', city: 'Shelby', state: 'OH' },
    { name: 'Sunnyview Estates', address: '1496 W Fourth St.', city: 'Mansfield', state: 'OH' },
    { name: 'The Mill on Flax', address: '35 Flax Street', city: 'Delaware', state: 'OH' },
    { name: 'Twin Lakes Campground LLC', address: '47675 New London Eastern Rd.', city: 'New London', state: 'OH' },
    { name: 'Valley', address: '5925 Youngstown Hubbard Road', city: 'Hubbard', state: 'OH' },
    { name: 'Western Reserve Campground LLC', address: '10580 W Western Reserve Rd.', city: 'Canfield', state: 'OH' },
    { name: 'Will-O-Brook', address: '112 State Route 61 E', city: 'Norwalk', state: 'OH' },
  ]

  const properties = await Promise.all(
    propData.map((p) =>
      prisma.property.upsert({
        where: { name: p.name },
        update: { address: p.address, city: p.city, state: p.state },
        create: p,
      })
    )
  )

  console.log(`Seeded ${properties.length} properties`)

  // ── Employees ─────────────────────────────────────────────────────────────

  // Mike Pisano — APPLICATION_OWNER
  const mikePisano = await prisma.employee.upsert({
    where: { email: 'mpisano@riverwestpartners.com' },
    update: { role: Role.APPLICATION_OWNER, status: EmployeeStatus.ACTIVE },
    create: {
      name: 'Mike Pisano',
      email: 'mpisano@riverwestpartners.com',
      role: Role.APPLICATION_OWNER,
      status: EmployeeStatus.ACTIVE,
      homeAddress: '',
    },
  })

  // Dan Irwin — ADMIN
  const dan = await prisma.employee.upsert({
    where: { email: 'dan@riverwestpartners.com' },
    update: { status: EmployeeStatus.ACTIVE },
    create: {
      name: 'Dan Irwin',
      email: 'dan@riverwestpartners.com',
      role: Role.ADMIN,
      status: EmployeeStatus.ACTIVE,
      homeAddress: '',
    },
  })

  // Regular employees
  const laura = await prisma.employee.upsert({
    where: { email: 'laura@riverwestpartners.com' },
    update: { status: EmployeeStatus.ACTIVE },
    create: {
      name: 'Laura Sievers',
      email: 'laura@riverwestpartners.com',
      role: Role.EMPLOYEE,
      status: EmployeeStatus.ACTIVE,
      homeAddress: '',
    },
  })

  const mikeKolasa = await prisma.employee.upsert({
    where: { email: 'mike@riverwestpartners.com' },
    update: { status: EmployeeStatus.ACTIVE },
    create: {
      name: 'Mike Kolasa',
      email: 'mike@riverwestpartners.com',
      role: Role.EMPLOYEE,
      status: EmployeeStatus.ACTIVE,
      homeAddress: '',
    },
  })

  const nick = await prisma.employee.upsert({
    where: { email: 'nick@riverwestpartners.com' },
    update: { status: EmployeeStatus.ACTIVE },
    create: {
      name: 'Nick Kolasa',
      email: 'nick@riverwestpartners.com',
      role: Role.EMPLOYEE,
      status: EmployeeStatus.ACTIVE,
      homeAddress: '',
    },
  })

  // ── EmployeeApprover relationships ────────────────────────────────────────
  // Dan approves for: Laura, Mike K, Nick
  const approverPairs = [
    { employeeId: laura.id, approverId: dan.id },
    { employeeId: mikeKolasa.id, approverId: dan.id },
    { employeeId: nick.id, approverId: dan.id },
  ]

  for (const pair of approverPairs) {
    await prisma.employeeApprover.upsert({
      where: { employeeId_approverId: pair },
      update: {},
      create: pair,
    })
  }

  console.log(`Seeded EmployeeApprover relationships (Dan approves for Laura, Mike K, Nick)`)

  // ── Seed initial mileage rate ──────────────────────────────────────────────
  const existingRate = await prisma.mileageRate.findFirst({
    orderBy: { effectiveDate: 'desc' },
  })
  if (!existingRate) {
    const envRate = parseFloat(process.env.MILEAGE_RATE ?? '0.70')
    await prisma.mileageRate.create({
      data: {
        rate: envRate,
        effectiveDate: new Date('2025-01-01'),
        createdById: mikePisano.id,
      },
    })
    console.log(`Seeded initial mileage rate: $${envRate}/mile (effective 2025-01-01)`)
  }

  console.log('\nEmployee accounts seeded:')
  console.log(`  mpisano@riverwestpartners.com  (APPLICATION_OWNER)`)
  console.log(`  dan@riverwestpartners.com      (ADMIN / approver for team)`)
  console.log(`  laura@riverwestpartners.com    (EMPLOYEE, approved by Dan)`)
  console.log(`  mike@riverwestpartners.com     (EMPLOYEE, approved by Dan)`)
  console.log(`  nick@riverwestpartners.com     (EMPLOYEE, approved by Dan)`)
  console.log('\nNOTE: Set employee home addresses in the Admin panel or via the Settings page.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
