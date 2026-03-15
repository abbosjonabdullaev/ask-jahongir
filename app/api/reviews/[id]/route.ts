import { NextRequest, NextResponse } from 'next/server'
import { canEditReviews, updateReview } from '@/lib/reviewStore'

export const dynamic = 'force-dynamic'

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    if (!canEditReviews) {
      return NextResponse.json({ error: 'Review editing is disabled in this environment.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = (await request.json()) as {
      rating?: 'unreviewed' | 'good' | 'bad'
      notes?: string
    }

    const updated = await updateReview(id, {
      rating: body.rating,
      notes: body.notes,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 })
    }

    return NextResponse.json({ item: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update review.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
