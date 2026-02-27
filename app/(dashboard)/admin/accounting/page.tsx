import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireEmployee } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, ArrowLeft } from 'lucide-react'
import { formatCurrency, formatMiles, formatDate } from '@/lib/utils'

export default async function AccountingLogPage() {
  const employee = await requireEmployee()
  if (employee.role !== Role.ADMIN) redirect('/reports')

  const logs = await db.accountingExportLog.findMany({
    orderBy: { sentAt: 'desc' },
    include: {
      expenseReport: { select: { id: true } },
    },
  })

  const totals = logs.reduce(
    (acc, l) => ({ miles: acc.miles + l.totalMiles, amount: acc.amount + l.totalAmount, trips: acc.trips + l.tripCount }),
    { miles: 0, amount: 0, trips: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy-600">Sent to Accounting</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Log of all accounting reports emailed to the controller
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Reports Sent</p>
            <p className="text-2xl font-bold text-navy-600 mt-1">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Trips Processed</p>
            <p className="text-2xl font-bold text-navy-600 mt-1">{totals.trips}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Reimbursed</p>
            <p className="text-2xl font-bold text-navy-600 mt-1">{formatCurrency(totals.amount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No accounting reports sent yet.</p>
              <p className="text-sm mt-1 opacity-70">Reports appear here when expense reports are approved.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Report #</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Miles</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Sent To</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDate(log.sentAt)}</TableCell>
                    <TableCell className="font-mono text-sm">{log.reportNumber}</TableCell>
                    <TableCell className="text-sm">{log.employeeName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.managerName}</TableCell>
                    <TableCell className="text-sm">{log.tripCount}</TableCell>
                    <TableCell className="text-sm">{formatMiles(log.totalMiles)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(log.totalAmount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.sentToEmail}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={log.fileName}>
                      {log.fileName}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/reports/${log.expenseReport.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
