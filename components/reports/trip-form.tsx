'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

interface TripInitialValues {
  tripId: string
  date: string
  originType: string
  originPropertyId: string
  originAddress: string
  destinationType: string
  destinationPropertyId: string
  destinationAddress: string
  roundTrip: boolean
  purpose: string
}

interface TripFormProps {
  reportId: string
  onSuccess: (trip: unknown) => void
  onCancel: () => void
  hasHomeAddress: boolean
  editValues?: TripInitialValues
}

export function TripForm({ reportId, onSuccess, onCancel, hasHomeAddress, editValues }: TripFormProps) {
  const isEdit = Boolean(editValues)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [date, setDate] = useState(() => editValues?.date ?? new Date().toISOString().split('T')[0])
  const [originType, setOriginType] = useState(editValues?.originType ?? 'HOME')
  const [originPropertyId, setOriginPropertyId] = useState(editValues?.originPropertyId ?? '')
  const [originAddress, setOriginAddress] = useState(editValues?.originAddress ?? '')
  const [destType, setDestType] = useState(editValues?.destinationType ?? 'PROPERTY')
  const [destPropertyId, setDestPropertyId] = useState(editValues?.destinationPropertyId ?? '')
  const [destAddress, setDestAddress] = useState(editValues?.destinationAddress ?? '')
  const [roundTrip, setRoundTrip] = useState(editValues?.roundTrip ?? false)
  const [purpose, setPurpose] = useState(editValues?.purpose ?? '')

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
      const payload = {
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
      }

      const url = isEdit ? `/api/trips/${editValues!.tripId}` : '/api/trips'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? (isEdit ? 'Failed to update trip' : 'Failed to add trip'))
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
        <Label>Purpose / Notes <span className="text-destructive">*</span></Label>
        <Input
          placeholder="e.g. Property inspection, tenant meeting..."
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          required
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
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? 'Saving...' : 'Calculating...'}</>
            : isEdit ? 'Save Changes' : 'Add Trip'}
        </Button>
      </div>
    </form>
  )
}

interface PlacesSuggestion {
  description: string
  placeId: string
}

function AddressAutocomplete({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [suggestions, setSuggestions] = useState<PlacesSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback((input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (input.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`)
        const data: PlacesSuggestion[] = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
    }, 300)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
    fetchSuggestions(e.target.value)
  }

  function handleSelect(description: string) {
    onChange(description)
    setSuggestions([])
    setOpen(false)
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
      <Input
        placeholder={placeholder ?? 'Enter full address'}
        value={value}
        onChange={handleChange}
        onFocus={() => value.length >= 3 && suggestions.length > 0 && setOpen(true)}
        className="pl-9"
        required
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto text-sm">
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              className="px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-start gap-2"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s.description) }}
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
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
              {homeDisabled ? 'Primary Office (set address in Settings)' : 'Primary Office'}
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
        <AddressAutocomplete
          value={address}
          onChange={onAddressChange}
          placeholder="Enter full address"
        />
      )}
    </div>
  )
}
