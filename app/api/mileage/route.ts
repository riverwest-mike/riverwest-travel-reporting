import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { calculateDistance } from '@/lib/mileage'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')

  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 })
  }

  try {
    const miles = await calculateDistance(origin, destination)
    return NextResponse.json({ miles })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate distance'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
