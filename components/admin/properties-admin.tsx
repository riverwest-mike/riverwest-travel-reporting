'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Pencil, Loader2, ArrowLeft, MapPin } from 'lucide-react'

interface Property {
  id: string; name: string; address: string; city: string | null; state: string | null
  isActive: boolean
}

export function PropertiesAdmin({ properties: initial }: { properties: Property[] }) {
  const [properties, setProperties] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  function openCreate() {
    setEditing(null); setName(''); setAddress(''); setCity(''); setState('')
    setError(''); setShowForm(true)
  }

  function openEdit(p: Property) {
    setEditing(p); setName(p.name); setAddress(p.address)
    setCity(p.city ?? ''); setState(p.state ?? '')
    setError(''); setShowForm(true)
  }

  async function handleSave() {
    setLoading(true); setError('')
    try {
      const body = { name, address, city: city || null, state: state || null }
      let res: Response
      if (editing) {
        res = await fetch(`/api/properties/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setLoading(false)
    }
  }

  async function handleToggle(p: Property) {
    await fetch(`/api/properties/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    window.location.reload()
  }

  const fullAddress = (p: Property) =>
    [p.address, p.city, p.state].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Admin</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-navy-600">Properties</h1>
            <p className="text-muted-foreground text-sm">
              Manage property addresses used for mileage calculation
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="h-4 w-4" /> Add Property
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start gap-2">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Ensure all property addresses are complete and accurate — they are used for Google Maps
          mileage calculations. Include street address, city, and state.
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id} className={!p.isActive ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fullAddress(p) || <span className="text-destructive italic">No address set</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? 'success' : 'outline'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => handleToggle(p)}>
                        {p.isActive ? 'Hide' : 'Show'}
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
            <DialogTitle>{editing ? 'Edit Property' : 'Add Property'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Property Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. RiverWest" />
            </div>
            <div className="space-y-1.5">
              <Label>Street Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="2414 W North Ave" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Milwaukee" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="WI" maxLength={2} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !name || !address}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Add Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
