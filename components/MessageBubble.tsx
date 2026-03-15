'use client'

import { useCallback, useEffect, useState } from 'react'
import { JahongirAvatar } from '@/components/JahongirAvatar'
import type { SourceLink } from '@/lib/knowledge'
import { Language, UI_TEXT } from '@/lib/uiText'

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: SourceLink[]
  followUps?: string[]
  feedback?: 'helpful' | 'not-accurate' | 'too-generic'
}

type Props = {
  message: Message
  lang: Language
  onSpeak?: (text: string) => void
  onFollowUp?: (question: string) => void
  onFeedback?: (value: 'helpful' | 'not-accurate' | 'too-generic') => void
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function sourceKindLabel(source: SourceLink, lang: Language) {
  const t = UI_TEXT[lang]
  switch (source.kind) {
    case 'entity':
      return t.officialSource
    case 'telegram_post':
      return t.telegramSource
    case 'youtube':
    case 'youtube_curated':
    case 'youtube_transcript':
      return t.youtubeSource
    case 'longform':
      return t.interviewSource
    default:
      return t.publicSource
  }
}

export function MessageBubble({ message, lang, onSpeak, onFollowUp, onFeedback }: Props) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [showAllSources, setShowAllSources] = useState(false)
  const [createdAt] = useState(() => Date.now())
  const [, tick] = useState(0)
  const t = UI_TEXT[lang]
  const sourceLabels = Array.from(new Set((message.sources ?? []).map((source) => sourceKindLabel(source, lang)))).slice(0, 3)

  useEffect(() => {
    const timer = setInterval(() => tick((value) => value + 1), 60_000)
    return () => clearInterval(timer)
  }, [])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [message.content])

  const visibleSources = showAllSources ? message.sources ?? [] : (message.sources ?? []).slice(0, 3)

  return (
    <div className={`group animate-fade-in flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="mt-1 shrink-0">
          <JahongirAvatar size="sm" lang={lang} />
        </div>
      )}

      <div className="flex max-w-[88%] flex-col gap-1 sm:max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
          style={
            isUser
              ? { background: 'var(--user-bubble)', color: 'var(--user-text)' }
              : {
                  background: 'var(--ai-bubble)',
                  color: 'var(--ai-text)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }
          }
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {!isUser && sourceLabels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sourceLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                  style={{ background: 'var(--surface-soft)', color: 'var(--muted)' }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          {!isUser && (
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {onSpeak && (
                <button
                  type="button"
                  onClick={() => onSpeak(message.content)}
                  className="min-h-[38px] rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-[11px]"
                  style={{ background: 'var(--surface-soft)', color: 'var(--foreground)' }}
                >
                  {t.listen}
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[38px] rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-[11px]"
                style={{ background: 'var(--surface-soft)', color: 'var(--foreground)' }}
              >
                {copied ? t.copied : t.copy}
              </button>
              {message.followUps && message.followUps.length > 0 && onFollowUp && (
                <button
                  type="button"
                  onClick={() => onFollowUp(message.followUps?.[0] ?? '')}
                  className="min-h-[38px] rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-[11px]"
                  style={{ background: 'var(--surface-soft)', color: 'var(--foreground)' }}
                >
                  {t.askFollowUp}
                </button>
              )}
            </div>
          )}
          {!isUser && onFeedback && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {([
                ['helpful', t.helpful],
                ['not-accurate', t.notAccurate],
                ['too-generic', t.tooGeneric],
              ] as const).map(([value, label]) => {
                const isActive = message.feedback === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onFeedback(value)}
                    className="min-h-[36px] rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors"
                    style={{
                      borderColor: isActive ? 'var(--user-bubble)' : 'var(--border)',
                      background: isActive ? 'var(--surface-soft)' : 'transparent',
                      color: isActive ? 'var(--foreground)' : 'var(--muted)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
          {!isUser && message.followUps && message.followUps.length > 0 && onFollowUp && (
            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--muted)', opacity: 0.72 }}>
                {t.suggestedFollowUps}
              </div>
              <div className="mobile-followup-row flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
                {message.followUps.slice(0, 3).map((followUp) => (
                  <button
                    key={followUp}
                    type="button"
                    onClick={() => onFollowUp(followUp)}
                    className="mobile-chip min-h-[40px] whitespace-nowrap rounded-full border px-3.5 py-2 text-left text-[12px] transition-colors sm:min-h-0 sm:px-3 sm:py-1.5"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    {followUp}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-3 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setSourcesOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'var(--suggestion-hover)'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'transparent'
                }}
              >
                <span>
                  {lang === 'uz' ? 'Manbalar' : 'Sources'} ({Math.min(message.sources.length, 3)})
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-4 w-4 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {sourcesOpen && (
                <div className="mt-2 flex flex-col gap-2">
                  {visibleSources.map((source) => (
                    <a
                      key={`${source.kind}-${source.url}`}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border px-3 py-2.5 text-[12px] transition-colors sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-[11px]"
                      style={{
                        color: 'var(--muted)',
                        borderColor: 'var(--border)',
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = 'var(--suggestion-hover)'
                        event.currentTarget.style.color = 'var(--foreground)'
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = 'transparent'
                        event.currentTarget.style.color = 'var(--muted)'
                      }}
                    >
                      <div className="truncate text-[12px] font-medium" style={{ color: 'var(--foreground)' }}>
                        {source.title}
                      </div>
                      <div className="truncate text-[10px]" style={{ opacity: 0.72 }}>
                        {sourceKindLabel(source, lang)}
                      </div>
                    </a>
                  ))}
                  {message.sources.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSources((current) => !current)}
                      className="min-h-[38px] rounded-lg px-2.5 py-2 text-left text-[12px] font-medium sm:min-h-0 sm:py-1.5 sm:text-[11px]"
                      style={{ color: 'var(--muted)' }}
                    >
                      {showAllSources ? t.showLessSources : t.showAllSources}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-1.5 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-[11px] sm:text-[10px]" style={{ color: 'var(--muted)', opacity: 0.5 }}>
            {timeAgo(new Date(createdAt))}
          </span>
          {!isUser && (
            <span className="text-[11px]" style={{ color: 'var(--muted)', opacity: 0.45 }}>
              {message.sources?.length ? `${message.sources.length} ${(lang === 'uz' ? 'manba' : 'sources')}` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
