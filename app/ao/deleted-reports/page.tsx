'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, FileX, ArrowLeft, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { formatDate, formatCurrency, formatMiles, formatPeriod } from '@/lib/utils'

interface DeletedReport {
  id: string
  reportNumber: string
  periodMonth: number
  periodYear: number
  totalMiles: number
  totalAmount: number
  deletedAt: string
  deletionReason: string | null
  employee: { id: string; name: string; email: string }
  deletedBy: { id: string; name: string } | null
}

export default function DeletedReportsPage() {
  const [reports, setReports] = useState<DeletedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<DeletedReport | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/deleted-reports')
      .then((r) => r.json())
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleHardDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/deleted-reports/${deleteTarget.id}/hard-delete`, {
        method: 'POST',
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to delete')
      }
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Deleted Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Soft-deleted reports preserved for audit. Hard delete permanently removes them.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileX className="h-4 w-4" />
            Soft-Deleted Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileX className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No deleted reports.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report #</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="hidden sm:table-cell">Miles</TableHead>
                    <TableHead className="hidden sm:table-cell">Amount</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="hidden md:table-cell">Deleted By</TableHead>
                    <TableHead className="hidden md:table-cell">Reason</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.reportNumber}</TableCell>
                      <TableCell className="text-sm">{r.employee.name}</TableCell>
                      <TableCell className="text-sm">{formatPeriod(r.periodMonth, r.periodYear)}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{formatMiles(r.totalMiles)}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{formatCurrency(r.totalAmount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(r.deletedAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {r.deletedBy?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate hidden md:table-cell" title={r.deletionReason ?? ''}>
                        {r.deletionReason ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/40 hover:bg-destructive/5"
                          onClick={() => { setDeleteTarget(r); setError('') }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hard Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hard delete confirmation dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Report
            </DialogTitle>
            <DialogDescription>
              This will permanently and irreversibly delete report{' '}
              <strong>{deleteTarget?.reportNumber}</strong> for{' '}
              <strong>{deleteTarget?.employee.name}</strong>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleHardDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
