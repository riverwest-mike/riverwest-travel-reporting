'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Pencil, Loader2, ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'

interface Approver {
  approverId: string
  approver: { id: string; name: string }
}

interface Employee {
  id: string
  name: string
  email: string
  role: string
  status: string
  homeAddress: string | null
  isActive: boolean
  approvers: Approver[]
  _count: { canApproveFor: number }
}

interface Props {
  employees: Employee[]
  allManagers: { id: string; name: string; role: string }[]
  isAO: boolean
}

function roleBadgeVariant(role: string) {
  if (role === 'ADMIN') return 'default'
  if (role === 'MANAGER') return 'info'
  return 'secondary'
}

function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase()
}

export function EmployeesAdmin({ employees: initial, allManagers, isAO }: Props) {
  const [employees, setEmployees] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('EMPLOYEE')
  const [homeAddress, setHomeAddress] = useState('')
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([])

  const ROLES = [
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ADMIN', label: 'Admin' },
  ]

  function openCreate() {
    setEditing(null)
    setName(''); setEmail(''); setRole('EMPLOYEE'); setHomeAddress(''); setSelectedApprovers([])
    setError(''); setShowForm(true)
  }

  function openEdit(emp: Employee) {
    setEditing(emp)
    setName(emp.name); setEmail(emp.email); setRole(emp.role)
    setHomeAddress(emp.homeAddress ?? '')
    setSelectedApprovers(emp.approvers.map((a) => a.approverId))
    setError(''); setShowForm(true)
  }

  function toggleApprover(id: string) {
    setSelectedApprovers((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  async function syncApprovers(employeeId: string, currentApproverIds: string[], targetApproverIds: string[]) {
    const toAdd = targetApproverIds.filter((id) => !currentApproverIds.includes(id))
    const toRemove = currentApproverIds.filter((id) => !targetApproverIds.includes(id))

    await Promise.all([
      ...toAdd.map((approverId) =>
        fetch(`/api/employees/${employeeId}/approvers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approverId }),
        })
      ),
      ...toRemove.map((approverId) =>
        fetch(`/api/employees/${employeeId}/approvers?approverId=${approverId}`, { method: 'DELETE' })
      ),
    ])
  }

  async function handleSave() {
    setLoading(true); setError('')
    try {
      const body = { name, email, role, homeAddress: homeAddress || null }
      let employeeId: string

      if (editing) {
        const res = await fetch(`/api/employees/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed')
        employeeId = editing.id

        // Sync approvers
        const currentApproverIds = editing.approvers.map((a) => a.approverId)
        await syncApprovers(employeeId, currentApproverIds, selectedApprovers)
      } else {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed')
        employeeId = data.id

        // Assign approvers
        await syncApprovers(employeeId, [], selectedApprovers)
      }

      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setLoading(false)
    }
  }

  async function handleToggleActive(emp: Employee) {
    setLoading(true)
    try {
      await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !emp.isActive }),
      })
      window.location.reload()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Admin</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy-600">Employees</h1>
            <p className="text-muted-foreground text-sm">Manage team members, roles, and approvers</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Approvers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className={!emp.isActive ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{emp.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(emp.role)}>
                        {roleLabel(emp.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {emp.approvers.length === 0
                        ? '—'
                        : emp.approvers.map((a) => a.approver.name).join(', ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.status === 'PENDING' ? 'warning' : emp.isActive ? 'success' : 'outline'}>
                        {emp.status === 'PENDING' ? 'Pending' : emp.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(emp)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button asChild variant="ghost" size="sm" title="View reports">
                          <Link href={`/admin/reports?employeeId=${emp.id}`}>
                            <FileText className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => handleToggleActive(emp)}
                          disabled={loading}
                        >
                          {emp.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" type="email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Home Address</Label>
              <Input
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                placeholder="4215 Worth Ave, Columbus, OH 43219"
              />
            </div>
            {(role === 'EMPLOYEE' || role === 'MANAGER') && allManagers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Approvers (who can approve this employee&apos;s reports)</Label>
                <div className="rounded-md border divide-y max-h-44 overflow-y-auto">
                  {allManagers.map((mgr) => (
                    <label key={mgr.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30">
                      <input
                        type="checkbox"
                        checked={selectedApprovers.includes(mgr.id)}
                        onChange={() => toggleApprover(mgr.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {mgr.name}
                        <span className="text-xs text-muted-foreground ml-1.5">({roleLabel(mgr.role)})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !name || !email}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
