'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, UserCheck, Users, ArrowLeft } from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

interface ApproverOption {
  id: string
  name: string
  role: string
}

export default function PendingUsersPage() {
  const [pending, setPending] = useState<Employee[]>([])
  const [allEmployees, setAllEmployees] = useState<ApproverOption[]>([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)

  // Activation dialog state
  const [activateTarget, setActivateTarget] = useState<Employee | null>(null)
  const [selectedRole, setSelectedRole] = useState('EMPLOYEE')
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/employees').then((r) => r.json()),
    ]).then(([employees]) => {
      setPending(employees.filter((e: Employee) => e.status === 'PENDING'))
      setAllEmployees(
        employees
          .filter((e: Employee) => e.status === 'ACTIVE' && ['MANAGER', 'ADMIN', 'APPLICATION_OWNER'].includes(e.role))
          .map((e: Employee) => ({ id: e.id, name: e.name, role: e.role }))
      )
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function openActivate(emp: Employee) {
    setActivateTarget(emp)
    setSelectedRole('EMPLOYEE')
    setSelectedApprovers([])
    setError('')
  }

  async function handleActivate() {
    if (!activateTarget) return
    setActivating(activateTarget.id)
    setError('')
    try {
      // Update role and status
      const res = await fetch(`/api/employees/${activateTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, status: 'ACTIVE' }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to activate')
      }

      // Assign approvers if any selected
      for (const approverId of selectedApprovers) {
        await fetch(`/api/employees/${activateTarget.id}/approvers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approverId }),
        })
      }

      setPending((prev) => prev.filter((e) => e.id !== activateTarget.id))
      setActivateTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setActivating(null)
    }
  }

  function toggleApprover(id: string) {
    setSelectedApprovers((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Pending Users</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Review and activate new account requests
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Awaiting Activation
            {pending.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800 text-xs font-bold ml-1">
                {pending.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pending.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No pending users.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Signed Up</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(emp.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openActivate(emp)}>
                        <UserCheck className="h-4 w-4" />
                        Activate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Activation dialog */}
      <Dialog open={Boolean(activateTarget)} onOpenChange={(open) => { if (!open) setActivateTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activate {activateTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Role</p>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="APPLICATION_OWNER">Application Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === 'EMPLOYEE' && allEmployees.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Assign Approvers (optional)</p>
                <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                  {allEmployees.map((mgr) => (
                    <label key={mgr.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30">
                      <input
                        type="checkbox"
                        checked={selectedApprovers.includes(mgr.id)}
                        onChange={() => toggleApprover(mgr.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {mgr.name}
                        <span className="text-xs text-muted-foreground ml-1.5">({mgr.role.toLowerCase()})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateTarget(null)}>Cancel</Button>
            <Button onClick={handleActivate} disabled={activating === activateTarget?.id}>
              {activating === activateTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Activate User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
