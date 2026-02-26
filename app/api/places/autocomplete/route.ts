import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('input')
  if (!input || input.trim().length < 3) {
    return NextResponse.json([])
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', input.trim())
    url.searchParams.set('key', apiKey)
    url.searchParams.set('types', 'address')
    url.searchParams.set('components', 'country:us')

    const res = await fetch(url.toString())
    const data = await res.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json([])
    }

    const suggestions = (data.predictions ?? []).map((p: { description: string; place_id: string }) => ({
      description: p.description,
      placeId: p.place_id,
    }))

    return NextResponse.json(suggestions)
  } catch {
    return NextResponse.json([])
  }
}
