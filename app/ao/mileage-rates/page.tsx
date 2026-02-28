'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, DollarSign, PlusCircle, Trash2, ArrowLeft } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'

interface MileageRate {
  id: string
  rate: number
  effectiveDate: string
  createdAt: string
  createdBy: { id: string; name: string }
}

export default function MileageRatesPage() {
  const [rates, setRates] = useState<MileageRate[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newRate, setNewRate] = useState('')
  const [newDate, setNewDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/mileage-rates')
      .then((r) => r.json())
      .then(setRates)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/mileage-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: parseFloat(newRate), effectiveDate: newDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add rate')
      setRates((prev) => [data, ...prev].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()))
      setNewRate('')
      setNewDate('')
      setShowAdd(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/mileage-rates/${deleteTarget}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete')
      setRates((prev) => prev.filter((r) => r.id !== deleteTarget))
      setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setDeleting(false)
    }
  }

  const currentRate = rates[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy-600">Mileage Rates</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage date-effective reimbursement rates
            </p>
          </div>
        </div>
        <Button onClick={() => { setShowAdd(true); setError('') }}>
          <PlusCircle className="h-4 w-4" />
          Add Rate
        </Button>
      </div>

      {currentRate && (
        <Card className="border-navy-200 bg-navy-50/30">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-navy-600">${currentRate.rate.toFixed(3)}</p>
              <p className="text-muted-foreground">per mile</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Effective {new Date(currentRate.effectiveDate).toLocaleDateString()} · set by {currentRate.createdBy.name}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Rate History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rates.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No rates configured yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate ($/mile)</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Set By</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r, i) => (
                  <TableRow key={r.id} className={i === 0 ? 'bg-navy-50/30 font-medium' : ''}>
                    <TableCell className="tabular-nums">
                      ${r.rate.toFixed(3)}
                      {i === 0 && <span className="ml-2 text-xs bg-navy-100 text-navy-700 px-1.5 py-0.5 rounded">Current</span>}
                    </TableCell>
                    <TableCell>{new Date(r.effectiveDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">{r.createdBy.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { setDeleteTarget(r.id); setError('') }}
                        disabled={rates.length <= 1}
                        title={rates.length <= 1 ? 'Cannot delete the only rate' : 'Delete rate'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add rate dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setError('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Mileage Rate</DialogTitle>
            <DialogDescription>
              New reports created on or after the effective date will use this rate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Rate ($ per mile)</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="e.g. 0.700"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setError('') }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !newRate || !newDate}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              Add Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Rate?</DialogTitle>
            <DialogDescription>
              This rate will be removed from the history. Existing reports are unaffected.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
