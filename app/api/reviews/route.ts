import { NextResponse } from 'next/server'
import { canEditReviews, listReviews } from '@/lib/reviewStore'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await listReviews()
    return NextResponse.json({ items, canEdit: canEditReviews })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load reviews.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
