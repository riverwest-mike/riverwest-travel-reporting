import ExcelJS from 'exceljs'
import { formatDate, formatPeriod } from '@/lib/utils'

interface TripRow {
  date: Date
  originLabel: string
  destinationLabel: string
  distance: number
  roundTrip: boolean
  totalDistance: number
  purpose: string | null
}

interface ReportData {
  reportNumber: string
  employeeName: string
  periodMonth: number
  periodYear: number
  mileageRate: number
  totalMiles: number
  totalAmount: number
  trips: TripRow[]
  parentReportNumber?: string | null
}

export async function generateExpenseReportExcel(data: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'RiverWest Travel Reporting'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Expense Report', {
    pageSetup: {
      paperSize: 1 as unknown as undefined, // Letter (PaperSize.Letter = 1)
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
    },
  })

  // ── Column widths ─────────────────────────────────────────────────────────
  sheet.columns = [
    { key: 'date', width: 14 },
    { key: 'origin', width: 28 },
    { key: 'destination', width: 28 },
    { key: 'oneWay', width: 12 },
    { key: 'rt', width: 8 },
    { key: 'total', width: 14 },
    { key: 'purpose', width: 32 },
  ]

  // ── Header block ──────────────────────────────────────────────────────────
  const navy = '1E3A5F'
  const gold = 'C5A028'
  const lightBlue = 'D9E4F0'
  const white = 'FFFFFF'

  // Row 1: Company name
  sheet.mergeCells('A1:G1')
  const titleCell = sheet.getCell('A1')
  titleCell.value = 'RiverWest Partners'
  titleCell.font = { bold: true, size: 16, color: { argb: white } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  sheet.getRow(1).height = 28

  // Row 2: Report title
  sheet.mergeCells('A2:G2')
  const subtitleCell = sheet.getCell('A2')
  subtitleCell.value = 'Mileage Reimbursement Report'
  subtitleCell.font = { bold: true, size: 13, color: { argb: white } }
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  sheet.getRow(2).height = 22

  // Row 3: Meta info labels
  sheet.getRow(3).height = 20
  const metaLabelStyle = {
    font: { bold: true, size: 10, color: { argb: navy } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: lightBlue } },
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
  }
  const metaValueStyle = {
    font: { size: 10 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'F8F9FA' } },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
  }

  sheet.mergeCells('A3:B3')
  Object.assign(sheet.getCell('A3'), { value: 'Employee:', ...metaLabelStyle })
  sheet.mergeCells('C3:D3')
  Object.assign(sheet.getCell('C3'), { value: data.employeeName, ...metaValueStyle })
  sheet.getCell('E3').value = 'Report #:'
  Object.assign(sheet.getCell('E3'), metaLabelStyle)
  sheet.mergeCells('F3:G3')
  Object.assign(sheet.getCell('F3'), { value: data.reportNumber, ...metaValueStyle })

  // Row 4: Period
  sheet.getRow(4).height = 20
  sheet.mergeCells('A4:B4')
  Object.assign(sheet.getCell('A4'), { value: 'Period:', ...metaLabelStyle })
  sheet.mergeCells('C4:D4')
  Object.assign(sheet.getCell('C4'), {
    value: formatPeriod(data.periodMonth, data.periodYear),
    ...metaValueStyle,
  })
  if (data.parentReportNumber) {
    sheet.getCell('E4').value = 'Resubmission of:'
    Object.assign(sheet.getCell('E4'), metaLabelStyle)
    sheet.mergeCells('F4:G4')
    Object.assign(sheet.getCell('F4'), { value: data.parentReportNumber, ...metaValueStyle })
  }

  // Row 5: blank spacer
  sheet.getRow(5).height = 6

  // ── Column headers ────────────────────────────────────────────────────────
  const headerRow = sheet.getRow(6)
  headerRow.height = 22
  const headers = ['Date', 'Origin', 'Destination', 'One-Way (mi)', 'R/T?', 'Total (mi)', 'Purpose']
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 10, color: { argb: white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
    cell.alignment = { horizontal: i < 3 ? 'left' : 'center', vertical: 'middle' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: gold } },
    }
  })

  // ── Trip rows ─────────────────────────────────────────────────────────────
  let rowIdx = 7
  data.trips.forEach((trip, idx) => {
    const row = sheet.getRow(rowIdx)
    row.height = 18
    const bg = idx % 2 === 0 ? 'FFFFFF' : 'F0F4F9'

    const values = [
      formatDate(trip.date),
      trip.originLabel,
      trip.destinationLabel,
      trip.distance,
      trip.roundTrip ? 'Yes' : 'No',
      trip.totalDistance,
      trip.purpose ?? '',
    ]

    values.forEach((v, i) => {
      const cell = row.getCell(i + 1)
      cell.value = v
      cell.font = { size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      cell.alignment = { horizontal: i < 2 || i === 6 ? 'left' : 'center', vertical: 'middle' }
      if (i === 3 || i === 5) {
        cell.numFmt = '0.0'
      }
    })
    rowIdx++
  })

  // ── Totals row ────────────────────────────────────────────────────────────
  const totalRow = sheet.getRow(rowIdx)
  totalRow.height = 22
  sheet.mergeCells(`A${rowIdx}:E${rowIdx}`)
  const totalLabel = totalRow.getCell(1)
  totalLabel.value = 'TOTAL MILES'
  totalLabel.font = { bold: true, size: 10, color: { argb: white } }
  totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  totalLabel.alignment = { horizontal: 'right', vertical: 'middle' }

  totalRow.getCell(6).value = data.totalMiles
  totalRow.getCell(6).numFmt = '0.0'
  totalRow.getCell(6).font = { bold: true, size: 10 }
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } }
  totalRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }

  rowIdx++

  // ── Reimbursement row ─────────────────────────────────────────────────────
  const reimRow = sheet.getRow(rowIdx)
  reimRow.height = 22
  sheet.mergeCells(`A${rowIdx}:D${rowIdx}`)
  const reimLabel = reimRow.getCell(1)
  reimLabel.value = `Reimbursement Rate: $${data.mileageRate.toFixed(2)}/mile`
  reimLabel.font = { bold: true, size: 10, color: { argb: white } }
  reimLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  reimLabel.alignment = { horizontal: 'right', vertical: 'middle' }

  reimRow.getCell(5).value = 'AMOUNT DUE:'
  reimRow.getCell(5).font = { bold: true, size: 10, color: { argb: white } }
  reimRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  reimRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }

  reimRow.getCell(6).value = data.totalAmount
  reimRow.getCell(6).numFmt = '"$"#,##0.00'
  reimRow.getCell(6).font = { bold: true, size: 12, color: { argb: navy } }
  reimRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9E6' } }
  reimRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
  reimRow.getCell(6).border = {
    top: { style: 'medium', color: { argb: gold } },
    bottom: { style: 'medium', color: { argb: gold } },
  }

  rowIdx += 2

  // ── Signature block ───────────────────────────────────────────────────────
  sheet.getRow(rowIdx).height = 20
  sheet.mergeCells(`A${rowIdx}:C${rowIdx}`)
  sheet.getCell(`A${rowIdx}`).value = 'Employee Signature: ___________________________'
  sheet.getCell(`A${rowIdx}`).font = { size: 10 }

  sheet.mergeCells(`E${rowIdx}:G${rowIdx}`)
  sheet.getCell(`E${rowIdx}`).value = `Date: ${formatDate(new Date())}`
  sheet.getCell(`E${rowIdx}`).font = { size: 10 }

  rowIdx += 2

  sheet.mergeCells(`A${rowIdx}:C${rowIdx}`)
  sheet.getCell(`A${rowIdx}`).value = 'Approved By: ___________________________'
  sheet.getCell(`A${rowIdx}`).font = { size: 10 }

  sheet.mergeCells(`E${rowIdx}:G${rowIdx}`)
  sheet.getCell(`E${rowIdx}`).value = 'Date: _______________'
  sheet.getCell(`E${rowIdx}`).font = { size: 10 }

  // ── Freeze header rows ────────────────────────────────────────────────────
  sheet.views = [{ state: 'frozen', ySplit: 6 }]

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ── Accounting Export Excel ───────────────────────────────────────────────────
// One row per approved trip — sent to the accounting team upon report approval.

export interface AccountingTripRow {
  employeeName: string
  dateApproved: Date
  departureLocation: string
  destinationLocation: string
  businessPurpose: string
  approvedMileage: number
  reimbursementTotal: number
  managerName: string
  reportName: string
}

export async function generateAccountingExcel(trips: AccountingTripRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'RiverWest Travel Reporting'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Accounting Report', {
    pageSetup: {
      paperSize: 1 as unknown as undefined,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
    },
  })

  const navy = '1E3A5F'
  const gold = 'C5A028'
  const lightBlue = 'D9E4F0'
  const white = 'FFFFFF'

  // Column widths
  sheet.columns = [
    { key: 'employeeName', width: 22 },
    { key: 'dateApproved', width: 16 },
    { key: 'departureLocation', width: 28 },
    { key: 'destinationLocation', width: 28 },
    { key: 'businessPurpose', width: 32 },
    { key: 'approvedMileage', width: 18 },
    { key: 'reimbursementTotal', width: 20 },
    { key: 'managerName', width: 22 },
    { key: 'reportName', width: 24 },
  ]

  // Row 1: Company header
  sheet.mergeCells('A1:I1')
  const titleCell = sheet.getCell('A1')
  titleCell.value = 'RiverWest Partners'
  titleCell.font = { bold: true, size: 16, color: { argb: white } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  sheet.getRow(1).height = 28

  // Row 2: Report title
  sheet.mergeCells('A2:I2')
  const subtitleCell = sheet.getCell('A2')
  subtitleCell.value = `Mileage Reimbursement — Accounting Report  |  Generated: ${new Date().toLocaleDateString()}`
  subtitleCell.font = { bold: true, size: 12, color: { argb: white } }
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  sheet.getRow(2).height = 20

  // Row 3: blank spacer
  sheet.getRow(3).height = 6

  // Row 4: Column headers
  const colHeaders = [
    'Employee Name',
    'Date Approved',
    'Departure Location',
    'Destination Location',
    'Business Purpose',
    'Approved Mileage',
    'Reimbursement Total',
    'Manager',
    'Report Name',
  ]
  const headerRow = sheet.getRow(4)
  headerRow.height = 22
  colHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 10, color: { argb: white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
    cell.alignment = { horizontal: i >= 5 ? 'center' : 'left', vertical: 'middle' }
    cell.border = { bottom: { style: 'thin', color: { argb: gold } } }
  })

  // Data rows
  let totalMiles = 0
  let totalAmount = 0
  trips.forEach((trip, idx) => {
    const row = sheet.getRow(5 + idx)
    row.height = 18
    const bg = idx % 2 === 0 ? 'FFFFFF' : 'F0F4F9'

    const values = [
      trip.employeeName,
      trip.dateApproved.toLocaleDateString(),
      trip.departureLocation,
      trip.destinationLocation,
      trip.businessPurpose,
      trip.approvedMileage,
      trip.reimbursementTotal,
      trip.managerName,
      trip.reportName,
    ]

    values.forEach((v, i) => {
      const cell = row.getCell(i + 1)
      cell.value = v
      cell.font = { size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      cell.alignment = { horizontal: i >= 5 ? 'center' : 'left', vertical: 'middle' }
      if (i === 5) cell.numFmt = '0.0'
      if (i === 6) cell.numFmt = '"$"#,##0.00'
    })

    totalMiles += trip.approvedMileage
    totalAmount += trip.reimbursementTotal
  })

  // Totals row
  const totalsRowIdx = 5 + trips.length
  const totalsRow = sheet.getRow(totalsRowIdx)
  totalsRow.height = 22
  sheet.mergeCells(`A${totalsRowIdx}:E${totalsRowIdx}`)
  const totalsLabel = totalsRow.getCell(1)
  totalsLabel.value = `TOTALS  (${trips.length} trip${trips.length !== 1 ? 's' : ''})`
  totalsLabel.font = { bold: true, size: 10, color: { argb: white } }
  totalsLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  totalsLabel.alignment = { horizontal: 'right', vertical: 'middle' }

  const milesCell = totalsRow.getCell(6)
  milesCell.value = totalMiles
  milesCell.numFmt = '0.0'
  milesCell.font = { bold: true, size: 10 }
  milesCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } }
  milesCell.alignment = { horizontal: 'center', vertical: 'middle' }

  const amountCell = totalsRow.getCell(7)
  amountCell.value = totalAmount
  amountCell.numFmt = '"$"#,##0.00'
  amountCell.font = { bold: true, size: 10, color: { argb: navy } }
  amountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9E6' } }
  amountCell.alignment = { horizontal: 'center', vertical: 'middle' }
  amountCell.border = {
    top: { style: 'medium', color: { argb: gold } },
    bottom: { style: 'medium', color: { argb: gold } },
  }

  sheet.views = [{ state: 'frozen', ySplit: 4 }]

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
