'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, MapPin, ArrowRight } from 'lucide-react'

interface Property {
  id: string
  name: string
  address: string
  city: string | null
  state: string | null
}

interface TripFormProps {
  reportId: string
  onSuccess: (trip: unknown) => void
  onCancel: () => void
  hasHomeAddress: boolean
}

export function TripForm({ reportId, onSuccess, onCancel, hasHomeAddress }: TripFormProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [originType, setOriginType] = useState('HOME')
  const [originPropertyId, setOriginPropertyId] = useState('')
  const [originAddress, setOriginAddress] = useState('')
  const [destType, setDestType] = useState('PROPERTY')
  const [destPropertyId, setDestPropertyId] = useState('')
  const [destAddress, setDestAddress] = useState('')
  const [roundTrip, setRoundTrip] = useState(false)
  const [purpose, setPurpose] = useState('')

  useEffect(() => {
    fetch('/api/properties')
      .then((r) => r.json())
      .then(setProperties)
      .catch(console.error)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          date,
          originType,
          originPropertyId: originType === 'PROPERTY' ? originPropertyId : undefined,
          originAddress: originType === 'OTHER' ? originAddress : undefined,
          destinationType: destType,
          destinationPropertyId: destType === 'PROPERTY' ? destPropertyId : undefined,
          destinationAddress: destType === 'OTHER' ? destAddress : undefined,
          roundTrip,
          purpose,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add trip')
      onSuccess(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      {/* Origin / Destination */}
      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-start">
        {/* Origin */}
        <LocationPicker
          label="From"
          type={originType}
          onTypeChange={setOriginType}
          propertyId={originPropertyId}
          onPropertyChange={setOriginPropertyId}
          address={originAddress}
          onAddressChange={setOriginAddress}
          properties={properties}
          includeHome
          homeDisabled={!hasHomeAddress}
        />

        <div className="pt-8 flex justify-center">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Destination */}
        <LocationPicker
          label="To"
          type={destType}
          onTypeChange={setDestType}
          propertyId={destPropertyId}
          onPropertyChange={setDestPropertyId}
          address={destAddress}
          onAddressChange={setDestAddress}
          properties={properties}
          includeHome={false}
        />
      </div>

      {/* Round trip */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={roundTrip}
          onChange={(e) => setRoundTrip(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span className="text-sm font-medium">Round trip (distance × 2)</span>
      </label>

      {/* Purpose */}
      <div className="space-y-1.5">
        <Label>Purpose / Notes (optional)</Label>
        <Input
          placeholder="e.g. Property inspection, tenant meeting..."
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculating...</> : 'Add Trip'}
        </Button>
      </div>
    </form>
  )
}

function LocationPicker({
  label,
  type,
  onTypeChange,
  propertyId,
  onPropertyChange,
  address,
  onAddressChange,
  properties,
  includeHome,
  homeDisabled,
}: {
  label: string
  type: string
  onTypeChange: (t: string) => void
  propertyId: string
  onPropertyChange: (id: string) => void
  address: string
  onAddressChange: (a: string) => void
  properties: Property[]
  includeHome: boolean
  homeDisabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {includeHome && (
            <SelectItem value="HOME" disabled={homeDisabled}>
              {homeDisabled ? 'Home (set address in Settings)' : 'Home'}
            </SelectItem>
          )}
          <SelectItem value="PROPERTY">Property</SelectItem>
          <SelectItem value="OTHER">Other Address</SelectItem>
        </SelectContent>
      </Select>

      {type === 'PROPERTY' && (
        <Select value={propertyId} onValueChange={onPropertyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === 'OTHER' && (
        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter full address"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            className="pl-9"
            required
          />
        </div>
      )}
    </div>
  )
}
