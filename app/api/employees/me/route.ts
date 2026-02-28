import { NextResponse } from 'next/server'
import { requireEmployee } from '@/lib/auth'

export async function GET() {
  try {
    const employee = await requireEmployee()
    return NextResponse.json(employee)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
