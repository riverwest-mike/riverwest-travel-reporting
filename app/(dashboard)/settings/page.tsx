'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, MapPin, User } from 'lucide-react'
import { DEFAULT_OFFICE_ADDRESS } from '@/lib/constants'

interface Employee {
  id: string
  name: string
  email: string
  homeAddress: string | null
  role: string
}

export default function SettingsPage() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [homeAddress, setHomeAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/employees')
      .then((r) => r.json())
      .then((data: Employee[]) => {
        if (data.length > 0) {
          setEmployee(data[0])
          setHomeAddress(data[0].homeAddress ?? DEFAULT_OFFICE_ADDRESS)
        }
      })
      .catch(console.error)
  }, [])

  async function handleSave() {
    if (!employee) return
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeAddress }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving')
    } finally {
      setLoading(false)
    }
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-600">Profile & Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Account Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-muted-foreground text-xs">Name</Label>
            <p className="font-medium">{employee.name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="font-medium">{employee.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Role</Label>
            <p className="font-medium capitalize">{employee.role.toLowerCase()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Primary Office Location
          </CardTitle>
          <CardDescription>
            Used as the &ldquo;Primary Office&rdquo; origin when adding trips. Defaults to the Columbus corporate office — update if you work from a different location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Primary Office Address</Label>
            <Input
              placeholder="4215 Worth Ave, Columbus, OH 43219"
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Address saved successfully
            </p>
          )}
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save Address'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
