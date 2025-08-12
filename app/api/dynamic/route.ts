import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ 
    message: 'Dynamic API route',
    timestamp: new Date().toISOString(),
    dynamic: true
  })
}

