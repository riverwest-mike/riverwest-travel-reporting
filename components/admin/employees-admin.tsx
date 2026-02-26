'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Pencil, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Employee {
  id: string; name: string; email: string; role: string; homeAddress: string | null
  isActive: boolean; managerId: string | null
  manager: { id: string; name: string } | null
  _count: { expenseReports: number }
}

interface Props {
  employees: Employee[]
  allEmployees: { id: string; name: string }[]
}

const ROLES = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
]

export function EmployeesAdmin({ employees: initial, allEmployees }: Props) {
  const [employees, setEmployees] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('EMPLOYEE')
  const [managerId, setManagerId] = useState('')
  const [homeAddress, setHomeAddress] = useState('')

  function openCreate() {
    setEditing(null)
    setName(''); setEmail(''); setRole('EMPLOYEE'); setManagerId(''); setHomeAddress('')
    setError(''); setShowForm(true)
  }

  function openEdit(emp: Employee) {
    setEditing(emp)
    setName(emp.name); setEmail(emp.email); setRole(emp.role)
    setManagerId(emp.managerId ?? ''); setHomeAddress(emp.homeAddress ?? '')
    setError(''); setShowForm(true)
  }

  async function handleSave() {
    setLoading(true); setError('')
    try {
      const body = { name, email, role, managerId: managerId || null, homeAddress: homeAddress || null }
      let res: Response
      if (editing) {
        res = await fetch(`/api/employees/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      // Reload
      const listRes = await fetch('/api/employees')
      // For simplicity, refresh the page
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
            <p className="text-muted-foreground text-sm">Manage team members and their roles</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id} className={!emp.isActive ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                  <TableCell>
                    <Badge variant={emp.role === 'ADMIN' ? 'default' : emp.role === 'MANAGER' ? 'info' : 'secondary'}>
                      {emp.role.charAt(0) + emp.role.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{emp.manager?.name ?? '—'}</TableCell>
                  <TableCell>{emp._count.expenseReports}</TableCell>
                  <TableCell>
                    <Badge variant={emp.isActive ? 'success' : 'outline'}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}>
                        <Pencil className="h-3.5 w-3.5" />
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
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Manager</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No manager</SelectItem>
                    {allEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Home Address</Label>
              <Input
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                placeholder="123 Main St, Milwaukee, WI"
              />
            </div>
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
