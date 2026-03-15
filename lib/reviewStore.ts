import 'server-only'

import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { SourceLink, ResponseMode } from '@/lib/knowledge'

export type ReviewRating = 'unreviewed' | 'good' | 'bad'

export type AnswerReview = {
  id: string
  createdAt: string
  locale: 'en' | 'uz'
  question: string
  reply: string
  matchedEntities: string[]
  sources: SourceLink[]
  responseMode: ResponseMode
  isFollowUp: boolean
  rating: ReviewRating
  notes: string
}

type ReviewFile = {
  generated_at: string
  items: AnswerReview[]
}

const reviewFilePath = path.join(
  process.cwd(),
  'data',
  'jahongir-answer-reviews.json'
)
export const canEditReviews =
  !process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL

async function readReviewFile(): Promise<ReviewFile> {
  const raw = await fs.readFile(reviewFilePath, 'utf8')
  return JSON.parse(raw) as ReviewFile
}

async function writeReviewFile(data: ReviewFile) {
  await fs.writeFile(reviewFilePath, JSON.stringify(data, null, 2), 'utf8')
}

export async function listReviews() {
  try {
    const data = await readReviewFile()
    return data.items.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }

    throw error
  }
}

export async function appendReview(input: Omit<AnswerReview, 'id' | 'createdAt' | 'rating' | 'notes'>) {
  const item: AnswerReview = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    rating: 'unreviewed',
    notes: '',
    ...input,
  }

  if (!canEditReviews) {
    return item
  }

  const data = await readReviewFile()
  data.generated_at = new Date().toISOString()
  data.items.unshift(item)
  data.items = data.items.slice(0, 300)
  await writeReviewFile(data)
  return item
}

export async function updateReview(
  id: string,
  patch: Partial<Pick<AnswerReview, 'rating' | 'notes'>>
) {
  if (!canEditReviews) {
    return null
  }

  const data = await readReviewFile()
  const item = data.items.find((entry) => entry.id === id)

  if (!item) {
    return null
  }

  if (patch.rating) {
    item.rating = patch.rating
  }

  if (typeof patch.notes === 'string') {
    item.notes = patch.notes
  }

  data.generated_at = new Date().toISOString()
  await writeReviewFile(data)
  return item
}
