'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Loader2, MapPin, ArrowRight, AlertTriangle, Star, Trash2 } from 'lucide-react'

interface Property {
  id: string
  name: string
  address: string
  city: string | null
  state: string | null
}

interface ExistingTrip {
  id: string
  date: string | Date
  originType: string
  originPropertyId?: string | null
  originAddress?: string | null
  destinationType: string
  destinationPropertyId?: string | null
  destinationAddress?: string | null
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
  existingTrips?: ExistingTrip[]
}

interface FavoriteTrip {
  id: string
  name: string
  originType: string
  originPropertyId: string | null
  originAddress: string | null
  originProperty: { id: string; name: string } | null
  destinationType: string
  destinationPropertyId: string | null
  destinationAddress: string | null
  destinationProperty: { id: string; name: string } | null
  roundTrip: boolean
}

export function TripForm({ reportId, onSuccess, onCancel, hasHomeAddress, editValues, existingTrips = [] }: TripFormProps) {
  const isEdit = Boolean(editValues)
  const [properties, setProperties] = useState<Property[]>([])
  const [favorites, setFavorites] = useState<FavoriteTrip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState<{ message: string; conflictingReportNumber: string } | null>(null)
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [savingFavorite, setSavingFavorite] = useState(false)
  const [showSaveFavorite, setShowSaveFavorite] = useState(false)
  const [favoriteName, setFavoriteName] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(() => editValues?.date ?? today)
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
    fetch('/api/favorite-trips')
      .then((r) => r.json())
      .then(setFavorites)
      .catch(console.error)
  }, [])

  function applyFavorite(fav: FavoriteTrip) {
    setOriginType(fav.originType)
    setOriginPropertyId(fav.originPropertyId ?? '')
    setOriginAddress(fav.originAddress ?? '')
    setDestType(fav.destinationType)
    setDestPropertyId(fav.destinationPropertyId ?? '')
    setDestAddress(fav.destinationAddress ?? '')
    setRoundTrip(fav.roundTrip)
    setShowFavorites(false)
  }

  async function handleSaveFavorite() {
    if (!favoriteName.trim()) return
    setSavingFavorite(true)
    try {
      const res = await fetch('/api/favorite-trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: favoriteName,
          originType,
          originPropertyId: originType === 'PROPERTY' ? originPropertyId : undefined,
          originAddress: originType === 'OTHER' ? originAddress : undefined,
          destinationType: destType,
          destinationPropertyId: destType === 'PROPERTY' ? destPropertyId : undefined,
          destinationAddress: destType === 'OTHER' ? destAddress : undefined,
          roundTrip,
        }),
      })
      if (res.ok) {
        const newFav = await res.json()
        setFavorites(prev => [...prev, newFav].sort((a, b) => a.name.localeCompare(b.name)))
        setFavoriteName('')
        setShowSaveFavorite(false)
      }
    } catch {
      // silent
    } finally {
      setSavingFavorite(false)
    }
  }

  async function handleDeleteFavorite(id: string) {
    await fetch(`/api/favorite-trips/${id}`, { method: 'DELETE' })
    setFavorites(prev => prev.filter(f => f.id !== id))
  }

  function favLabel(fav: FavoriteTrip) {
    const from = fav.originType === 'HOME' ? 'Office'
      : fav.originProperty?.name ?? fav.originAddress ?? '?'
    const to = fav.destinationProperty?.name ?? fav.destinationAddress ?? '?'
    return `${from} → ${to}${fav.roundTrip ? ' (R/T)' : ''}`
  }

  // Client-side duplicate check against existing trips on this report
  function checkDuplicate(): boolean {
    const tripDateStr = new Date(date).toDateString()
    return existingTrips
      .filter(t => !isEdit || t.id !== editValues?.tripId) // exclude self when editing
      .some(t => {
        if (new Date(t.date).toDateString() !== tripDateStr) return false
        const sameOrigin = t.originType === originType && (
          originType === 'PROPERTY' ? t.originPropertyId === originPropertyId
            : originType === 'HOME' ? true
            : t.originAddress === originAddress
        )
        const sameDest = t.destinationType === destType && (
          destType === 'PROPERTY' ? t.destinationPropertyId === destPropertyId
            : t.destinationAddress === destAddress
        )
        return sameOrigin && sameDest
      })
  }

  const isDuplicate = date && (originType === 'HOME' || originPropertyId || originAddress) && (destPropertyId || destAddress) && checkDuplicate()

  async function submitPayload(payload: Record<string, unknown>) {
    const url = isEdit ? `/api/trips/${editValues!.tripId}` : '/api/trips'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      // Cross-report duplicate warning — show confirmation dialog
      if (data.code === 'DUPLICATE_WARNING') {
        setPendingPayload(payload)
        setDuplicateWarning({
          message: data.error,
          conflictingReportNumber: data.conflictingReportNumber,
        })
        return
      }
      throw new Error(data.error ?? (isEdit ? 'Failed to update trip' : 'Failed to add trip'))
    }

    onSuccess(data)
  }

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

      await submitPayload(payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmDuplicate() {
    if (!pendingPayload) return
    setDuplicateWarning(null)
    setLoading(true)
    setError('')
    try {
      await submitPayload({ ...pendingPayload, confirmed: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setPendingPayload(null)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Saved trips quick-fill */}
      {!isEdit && favorites.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowFavorites(!showFavorites)}
            className="text-sm text-navy-600 hover:underline underline-offset-2 flex items-center gap-1"
          >
            <Star className="h-3.5 w-3.5" />
            {showFavorites ? 'Hide saved trips' : `Use saved trip (${favorites.length})`}
          </button>
          {showFavorites && (
            <div className="rounded-md border border-navy-200 bg-navy-50/30 divide-y divide-navy-100">
              {favorites.map(fav => (
                <div key={fav.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-navy-700">{fav.name}</p>
                    <p className="text-xs text-muted-foreground">{favLabel(fav)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyFavorite(fav)}
                      className="text-xs text-navy-600 border border-navy-300 rounded px-2 py-1 hover:bg-navy-100 transition-colors"
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFavorite(fav.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      title="Delete saved trip"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Date */}
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today} required />
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

      {isDuplicate && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-300 px-3 py-2 rounded-md">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>This looks like a duplicate — a trip with the same date, origin, and destination already exists on this report. You can still save it if intentional.</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}

      {/* Save as favorite */}
      {!isEdit && (
        <div className="border-t pt-3">
          {showSaveFavorite ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Name this saved trip (e.g. Weekly property check)"
                value={favoriteName}
                onChange={(e) => setFavoriteName(e.target.value)}
                className="text-sm h-8"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSaveFavorite}
                disabled={savingFavorite || !favoriteName.trim()}
              >
                {savingFavorite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setShowSaveFavorite(false); setFavoriteName('') }}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSaveFavorite(true)}
              className="text-xs text-muted-foreground hover:text-navy-600 flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <Star className="h-3 w-3" />
              Save this route as a favorite
            </button>
          )}
        </div>
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

      {/* Cross-report duplicate warning dialog */}
      <Dialog open={Boolean(duplicateWarning)} onOpenChange={(open) => { if (!open) { setDuplicateWarning(null); setPendingPayload(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Possible Duplicate Trip
            </DialogTitle>
            <DialogDescription>
              This trip appears to already exist on report{' '}
              <strong>{duplicateWarning?.conflictingReportNumber}</strong>. Are you sure you want to add it again?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDuplicateWarning(null); setPendingPayload(null) }}>
              Cancel
            </Button>
            <Button variant="warning" onClick={handleConfirmDuplicate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            <SelectItem value="HOME">Primary Office</SelectItem>
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
