'use client'

import { JahongirAvatar } from '@/components/JahongirAvatar'
import { Language, UI_TEXT } from '@/lib/uiText'

type Props = {
  lang: Language
}

export function ThinkingIndicator({ lang }: Props) {
  return (
    <div className="animate-fade-in flex gap-3">
      <div className="mt-1 shrink-0">
        <JahongirAvatar size="sm" lang={lang} />
      </div>
      <div
        className="flex items-center gap-2 rounded-2xl rounded-tl-sm border px-4 py-3 text-sm"
        style={{
          background: 'var(--ai-bubble)',
          borderColor: 'var(--border)',
          color: 'var(--ai-text)',
        }}
      >
        <div className="thinking-spinner h-3.5 w-3.5 rounded-full border-2 border-[var(--border)] border-t-[var(--input-focus)]" />
        <span>{UI_TEXT[lang].thinking}</span>
      </div>
    </div>
  )
}
