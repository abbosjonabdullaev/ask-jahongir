'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { AnswerReview, ReviewRating } from '@/lib/reviewStore'

type ReviewsResponse = {
  items?: AnswerReview[]
  canEdit?: boolean
  error?: string
}

export default function ReviewsAdminPage() {
  const [items, setItems] = useState<AnswerReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ReviewRating | 'all'>('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    void loadReviews()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.rating === filter)
  }, [filter, items])

  const summary = useMemo(() => {
    const counts = {
      total: items.length,
      good: items.filter((item) => item.rating === 'good').length,
      bad: items.filter((item) => item.rating === 'bad').length,
      unreviewed: items.filter((item) => item.rating === 'unreviewed').length,
    }

    const badSourceMap = new Map<string, { title: string; count: number }>()
    const issueMap = new Map<string, number>()

    for (const item of items) {
      const noteTags = item.notes
        .split(/\s+/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)

      for (const tag of noteTags) {
        issueMap.set(tag, (issueMap.get(tag) ?? 0) + 1)
      }

      if (item.rating !== 'bad' || !item.notes.toLowerCase().includes('source-mismatch')) {
        continue
      }

      for (const source of item.sources) {
        if (source.kind === 'entity') {
          continue
        }

        const current = badSourceMap.get(source.url)
        if (current) {
          current.count += 1
        } else {
          badSourceMap.set(source.url, { title: source.title, count: 1 })
        }
      }
    }

    const topBadSources = Array.from(badSourceMap.entries())
      .map(([url, value]) => ({ url, ...value }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6)

    const topIssues = Array.from(issueMap.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }))

    return { counts, topBadSources, topIssues }
  }, [items])

  async function loadReviews() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reviews')
      const data = (await response.json()) as ReviewsResponse

      if (!response.ok) {
        throw new Error(data.error || 'Could not load reviews.')
      }

      setItems(data.items ?? [])
      setCanEdit(Boolean(data.canEdit))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load reviews.')
    } finally {
      setIsLoading(false)
    }
  }

  async function updateItem(id: string, patch: { rating?: ReviewRating; notes?: string }) {
    setSavingId(id)

    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })

      const data = (await response.json()) as { item?: AnswerReview; error?: string }

      if (!response.ok || !data.item) {
        throw new Error(data.error || 'Could not update review.')
      }

      setItems((current) => current.map((item) => (item.id === id ? data.item! : item)))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update review.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <main
      className="min-h-screen px-4 py-8 sm:px-6"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--muted)' }}>
              Review Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Answer review loop</h1>
            <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--muted)' }}>
              Review recent Jahongir answers, inspect the matched sources, and mark outputs as
              good or bad so the next data-cleanup pass can use real feedback.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadReviews()}
              className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium"
              style={{ border: '1px solid var(--border)', background: 'var(--ai-bubble)' }}
            >
              Refresh
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium"
              style={{ border: '1px solid var(--border)', background: 'var(--ai-bubble)' }}
            >
              Back to chat
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'unreviewed', 'good', 'bad'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className="rounded-full px-3.5 py-2 text-sm font-medium"
              style={{
                border: '1px solid var(--border)',
                background: filter === value ? 'var(--user-bubble)' : 'var(--ai-bubble)',
                color: filter === value ? 'var(--user-text)' : 'var(--foreground)',
              }}
            >
              {value}
            </button>
          ))}
        </div>

        {isLoading && <p style={{ color: 'var(--muted)' }}>Loading reviews...</p>}
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {!canEdit && !isLoading && (
          <p style={{ color: 'var(--muted)' }}>
            This environment is read-only for reviews. You can inspect the bundled snapshot here, but edits only persist locally.
          </p>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total', summary.counts.total],
            ['Good', summary.counts.good],
            ['Bad', summary.counts.bad],
            ['Unreviewed', summary.counts.unreviewed],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--ai-bubble)' }}
            >
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--border)', background: 'var(--ai-bubble)' }}
          >
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
              Repeated bad-source signals
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {summary.topBadSources.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  No bad source mismatches marked yet.
                </p>
              ) : (
                summary.topBadSources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="font-medium">{source.title}</div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                      flagged {source.count} time(s)
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--border)', background: 'var(--ai-bubble)' }}
          >
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
              Review tags
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.topIssues.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  No review tags yet.
                </p>
              ) : (
                summary.topIssues.map((issue) => (
                  <span
                    key={issue.tag}
                    className="rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{ background: 'var(--surface-soft)' }}
                  >
                    {issue.tag} · {issue.count}
                  </span>
                ))
              )}
            </div>
            <p className="mt-4 text-xs" style={{ color: 'var(--muted)' }}>
              Suggested tags: <code>source-mismatch</code>, <code>generic</code>, <code>too-long</code>, <code>abstract</code>.
            </p>
          </div>
        </section>

        <div className="grid gap-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border p-5"
              style={{ borderColor: 'var(--border)', background: 'var(--ai-bubble)' }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span>{item.locale.toUpperCase()}</span>
                    <span>•</span>
                    <span>{item.responseMode}</span>
                    {item.isFollowUp && (
                      <>
                        <span>•</span>
                        <span>follow-up</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-base font-semibold">{item.question}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['good', 'bad', 'unreviewed'] as const).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      disabled={savingId === item.id || !canEdit}
                      onClick={() => void updateItem(item.id, { rating })}
                      className="rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      style={{
                        border: '1px solid var(--border)',
                        background: item.rating === rating ? 'var(--user-bubble)' : 'var(--background)',
                        color: item.rating === rating ? 'var(--user-text)' : 'var(--foreground)',
                      }}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section
                  className="rounded-2xl border p-4"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                    Reply
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.reply}</p>
                  {item.matchedEntities.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.matchedEntities.map((entity) => (
                        <span
                          key={entity}
                          className="rounded-full px-3 py-1.5 text-xs font-medium"
                          style={{ background: 'var(--surface-soft)' }}
                        >
                          {entity}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                      Notes
                    </p>
                    <textarea
                      defaultValue={item.notes}
                      rows={4}
                      disabled={!canEdit}
                      className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: 'var(--ai-bubble)', border: '1px solid var(--border)' }}
                      onBlur={(event) => {
                        if (event.target.value !== item.notes) {
                          void updateItem(item.id, { notes: event.target.value })
                        }
                      }}
                    />
                    <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                      Use short review tags like <code>source-mismatch</code>, <code>generic</code>, or <code>too-long</code>.
                    </p>
                  </div>

                  <div
                    className="rounded-2xl border p-4"
                    style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                      Sources
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      {item.sources.map((source) => (
                        <a
                          key={`${item.id}-${source.kind}-${source.url}`}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border px-3 py-2 text-sm"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <div className="font-medium">{source.title}</div>
                          <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                            {source.kind}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
