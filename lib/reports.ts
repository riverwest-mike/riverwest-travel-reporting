import { db } from '@/lib/db'

export async function generateReportNumber(month: number, year: number): Promise<string> {
  const mm = String(month).padStart(2, '0')
  const prefix = `EXP-${year}-${mm}-`

  // Use the highest existing sequence number rather than count, so gaps from
  // deleted reports never produce a number that already exists in the DB.
  const existing = await db.expenseReport.findMany({
    where: { periodYear: year, periodMonth: month },
    select: { reportNumber: true },
  })

  const maxSeq = existing.reduce((max, r) => {
    const seq = parseInt(r.reportNumber.slice(prefix.length), 10)
    return isNaN(seq) ? max : Math.max(max, seq)
  }, 0)

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

export async function recalcReportTotals(reportId: string, mileageRate: number) {
  const trips = await db.trip.findMany({ where: { reportId } })
  const totalMiles = trips.reduce(
    (sum, t) => sum + (t.roundTrip ? t.distance * 2 : t.distance),
    0
  )
  const totalAmount = Math.round(totalMiles * mileageRate * 100) / 100

  await db.expenseReport.update({
    where: { id: reportId },
    data: { totalMiles, totalAmount },
  })

  return { totalMiles, totalAmount }
}

export function tripLocationLabel(
  type: string,
  propertyName: string | null | undefined,
  customAddress: string | null | undefined,
  isHome: boolean
): string {
  if (isHome || type === 'HOME') return 'Primary Office'
  if (type === 'PROPERTY' && propertyName) return propertyName
  return customAddress ?? 'Unknown'
}
