import { db } from '@/lib/db'

export async function generateReportNumber(month: number, year: number): Promise<string> {
  const count = await db.expenseReport.count({
    where: { periodYear: year, periodMonth: month },
  })
  const seq = String(count + 1).padStart(4, '0')
  const mm = String(month).padStart(2, '0')
  return `EXP-${year}-${mm}-${seq}`
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
  if (isHome || type === 'HOME') return 'Home'
  if (type === 'PROPERTY' && propertyName) return propertyName
  return customAddress ?? 'Unknown'
}
