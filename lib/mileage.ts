export async function calculateDistance(
  origin: string,
  destination: string
): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('Google Maps API key not configured')

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
  url.searchParams.set('origins', origin)
  url.searchParams.set('destinations', destination)
  url.searchParams.set('units', 'imperial')
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error('Failed to fetch distance from Google Maps')

  const data = await response.json()

  if (data.status !== 'OK') {
    throw new Error(`Google Maps error: ${data.status}`)
  }

  const element = data.rows?.[0]?.elements?.[0]
  if (!element || element.status !== 'OK') {
    throw new Error('Could not calculate distance between these addresses')
  }

  // distance.value is in meters, convert to miles
  const meters = element.distance.value as number
  const miles = meters / 1609.344

  return Math.round(miles * 10) / 10 // round to 1 decimal
}

export function buildAddress(
  type: string,
  propertyAddress: string | null | undefined,
  customAddress: string | null | undefined
): string {
  if (type === 'PROPERTY' && propertyAddress) return propertyAddress
  if (customAddress) return customAddress
  throw new Error('No address available for this location')
}
