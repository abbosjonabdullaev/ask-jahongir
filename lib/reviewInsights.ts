import reviewData from '@/data/jahongir-answer-reviews.json'
import type { ResponseMode, SourceLink } from '@/lib/knowledge'

type ReviewItem = {
  rating: 'unreviewed' | 'good' | 'bad'
  notes: string
  responseMode: ResponseMode
  sources: SourceLink[]
}

type ReviewFile = {
  items: ReviewItem[]
}

type ReviewSignals = {
  sourceAdjustments: Map<string, number>
  hardFilteredSources: Set<string>
  modeStyleWarnings: Map<ResponseMode, string[]>
}

const SOURCE_MISMATCH_TAGS = ['source-mismatch', 'noisy-sources', 'irrelevant-source']
const STYLE_TAGS = ['generic', 'too-long', 'abstract']

function hasAnyTag(notes: string, tags: string[]) {
  const normalized = notes.toLowerCase()
  return tags.some((tag) => normalized.includes(tag))
}

function buildReviewSignals() {
  const data = reviewData as ReviewFile
  const sourceAdjustments = new Map<string, number>()
  const hardFilteredSources = new Set<string>()
  const modeWarnings = new Map<ResponseMode, Set<string>>()

  for (const item of data.items) {
    const notes = item.notes || ''

    if (item.rating === 'bad') {
      if (hasAnyTag(notes, SOURCE_MISMATCH_TAGS)) {
        for (const source of item.sources) {
          if (source.kind === 'entity') {
            continue
          }

          const current = sourceAdjustments.get(source.url) ?? 0
          const next = current - 4
          sourceAdjustments.set(source.url, next)
          if (next <= -4) {
            hardFilteredSources.add(source.url)
          }
        }
      }

      if (hasAnyTag(notes, STYLE_TAGS)) {
        const current = modeWarnings.get(item.responseMode) ?? new Set<string>()

        if (notes.toLowerCase().includes('generic')) {
          current.add('Avoid generic filler and generic mission statements for this mode.')
        }
        if (notes.toLowerCase().includes('too-long')) {
          current.add('Keep this mode tighter and avoid bloated multi-paragraph answers.')
        }
        if (notes.toLowerCase().includes('abstract')) {
          current.add('Prefer concrete, direct wording over abstract framing for this mode.')
        }

        modeWarnings.set(item.responseMode, current)
      }
    }

    if (item.rating === 'good') {
      for (const source of item.sources) {
        const current = sourceAdjustments.get(source.url) ?? 0
        sourceAdjustments.set(source.url, current + 1)
      }
    }
  }

  return {
    sourceAdjustments,
    hardFilteredSources,
    modeStyleWarnings: new Map(
      Array.from(modeWarnings.entries()).map(([mode, warnings]) => [
        mode,
        Array.from(warnings),
      ])
    ),
  } satisfies ReviewSignals
}

const reviewSignals = buildReviewSignals()

export function getReviewSourceAdjustment(source: SourceLink) {
  return reviewSignals.sourceAdjustments.get(source.url) ?? 0
}

export function isHardFilteredByReview(source: SourceLink) {
  return reviewSignals.hardFilteredSources.has(source.url)
}

export function getReviewWarningsForMode(mode: ResponseMode) {
  return reviewSignals.modeStyleWarnings.get(mode) ?? []
}
