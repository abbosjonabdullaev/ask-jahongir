'use client'

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { JahongirAvatar } from '@/components/JahongirAvatar'
import { MessageBubble } from '@/components/MessageBubble'
import { SuggestedQuestions } from '@/components/SuggestedQuestions'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'
import type { SourceLink } from '@/lib/knowledge'
import { Language, QUICK_TOPICS, UI_TEXT } from '@/lib/uiText'

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: SourceLink[]
  followUps?: string[]
}

type ResponseMode = 'text' | 'voice'

function getPreferredRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function getAudioFileName(mimeType: string) {
  if (mimeType.includes('mp4')) return 'question.m4a'
  if (mimeType.includes('ogg')) return 'question.ogg'
  return 'question.webm'
}

function getTopicPrompt(topic: string, lang: Language) {
  const topicMap: Record<string, { en: string; uz: string }> = {
    Cambridge: {
      en: 'What makes Cambridge Learning Center different?',
      uz: 'Cambridge Learning Center nimasi bilan boshqacha?',
    },
    'Jahon School': {
      en: 'What is Jahon School and how does it work?',
      uz: 'Jahon School nima va qanday ishlaydi?',
    },
    Modme: {
      en: 'How does Modme help education centers?',
      uz: "Modme o'quv markazlarga qanday yordam beradi?",
    },
    'Business advice': {
      en: 'What would you advise a young founder in Uzbekistan?',
      uz: "O'zbekistondagi yosh founderga nima maslahat berasiz?",
    },
    Universitet: {
      en: 'What is the biggest risk in entering university without clarity?',
      uz: 'Universitetga topshirishda eng katta tavakkal nima?',
    },
    University: {
      en: 'What is the biggest risk in entering university without clarity?',
      uz: 'Universitetga topshirishda eng katta tavakkal nima?',
    },
    Books: {
      en: 'What is your public reading advice?',
      uz: "Kitob o'qish haqida qanday qaraysiz?",
    },
    Kitoblar: {
      en: 'What is your public reading advice?',
      uz: "Kitob o'qish haqida qanday qaraysiz?",
    },
    'Biznes maslahat': {
      en: 'What would you advise a young founder in Uzbekistan?',
      uz: "O'zbekistondagi yosh founderga nima maslahat berasiz?",
    },
  }

  return topicMap[topic]?.[lang] ?? topic
}

function buildFollowUps(lang: Language, question: string, reply: string, matchedEntities: string[]) {
  if (matchedEntities.includes('Jahon School')) {
    return lang === 'uz'
      ? ['Admission qanday?', "Ota-onalar uchun qanday qulayliklar bor?", 'SkillDev dasturi nima?']
      : ['How does admission work?', 'What do parents get through the app?', 'What is the SkillDev program?']
  }

  if (matchedEntities.includes('Cambridge Learning Center')) {
    return lang === 'uz'
      ? ['IELTSdan tashqari yana nima bor?', 'Cambridge qanday boshlangan?', 'Filiallar va natijalar haqida ayting']
      : ['What exists beyond IELTS classes?', 'How did Cambridge start?', 'Tell me about branches and results']
  }

  if (matchedEntities.includes('Modme')) {
    return lang === 'uz'
      ? ['Modme CRM va LMS sifatida nima qiladi?', 'Kimlar uchun mos?', 'Sotuv funnel haqida nima deysiz?']
      : ['What does Modme do as a CRM and LMS?', 'Who is it for?', 'What is your view on sales funnels?']
  }

  if (/universitet|university|talaba|student|abiturient/i.test(question + ' ' + reply)) {
    return lang === 'uz'
      ? ['Maqsadni qanday aniqlash kerak?', 'Universitet shartmi?', '20 yoshli talaba nimaga fokus qilishi kerak?']
      : ['How should someone define direction?', 'Is university necessary?', 'What should a 20-year-old student focus on?']
  }

  if (/biznes|business|xato|mistake|tizim|system/i.test(question + ' ' + reply)) {
    return lang === 'uz'
      ? ["Tizimni qayerdan boshlash kerak?", "Yosh founderlar eng ko'p nimada adashadi?", "Sotuvni qanday o'lchash kerak?"]
      : ['Where should systems start?', 'What do young founders get wrong most often?', 'How should sales be measured?']
  }

  return lang === 'uz'
    ? ["Shu mavzuni chuqurroq ochib bering", "Bunga amaliy misol bering", "Bu bo'yicha keyingi qadam nima?"]
    : ['Go deeper on this', 'Give a practical example', 'What is the next step here?']
}

export function ChatInterface() {
  const [lang, setLang] = useState<Language>('en')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSpeechPaused, setIsSpeechPaused] = useState(false)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [isCompactHeader, setIsCompactHeader] = useState(false)
  const chatAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastSpokenAssistantRef = useRef<string>('')
  const shouldSpeakReplyRef = useRef(false)
  const t = UI_TEXT[lang]

  useEffect(() => {
    const savedTheme = localStorage.getItem('ask-jahongir-theme')
    const detected =
      savedTheme === 'light' || savedTheme === 'dark'
        ? savedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'

    setTheme(detected)
    document.documentElement.dataset.theme = detected

    const savedLang = localStorage.getItem('ask-jahongir-lang')
    if (savedLang === 'en' || savedLang === 'uz') {
      setLang(savedLang)
    }

    const savedAudio = localStorage.getItem('ask-jahongir-audio-enabled')
    if (savedAudio === 'false') {
      setAudioEnabled(false)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('ask-jahongir-lang', lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem('ask-jahongir-theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    localStorage.setItem('ask-jahongir-audio-enabled', String(audioEnabled))
  }, [audioEnabled])

  useEffect(() => {
    const area = chatAreaRef.current
    if (!area) return
    area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const area = chatAreaRef.current
    if (!area) return
    const onScroll = () => {
      const distanceFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight
      setShowScrollBtn(distanceFromBottom > 120)
      setIsCompactHeader(area.scrollTop > 24)
    }
    area.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => area.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const applyViewportHeight = () => {
      document.documentElement.style.setProperty('--app-vh', `${viewport.height}px`)
    }

    applyViewportHeight()
    viewport.addEventListener('resize', applyViewportHeight)
    viewport.addEventListener('scroll', applyViewportHeight)

    return () => {
      viewport.removeEventListener('resize', applyViewportHeight)
      viewport.removeEventListener('scroll', applyViewportHeight)
    }
  }, [])

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [input, resizeTextarea])

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!audioEnabled || !shouldSpeakReplyRef.current || !lastMessage || lastMessage.role !== 'assistant') {
      return
    }

    shouldSpeakReplyRef.current = false

    if (lastSpokenAssistantRef.current === lastMessage.content) {
      return
    }

    lastSpokenAssistantRef.current = lastMessage.content

    let revokedUrl: string | null = null

    const speak = async () => {
      try {
        setIsSpeaking(true)
        setIsSpeechPaused(false)
        setStatusText(t.speaking)
        const response = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: lastMessage.content,
            locale: lang,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Speech request failed')
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        revokedUrl = url
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          setIsSpeaking(false)
          setIsSpeechPaused(false)
          setStatusText(null)
        }
        audio.onpause = () => {
          if (!audio.ended) {
            setIsSpeechPaused(true)
            setStatusText(null)
          }
        }
        audio.onplay = () => {
          setIsSpeaking(true)
          setIsSpeechPaused(false)
          setStatusText(t.speaking)
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          setIsSpeechPaused(false)
          setStatusText(null)
        }
        await audio.play()
      } catch (speechError) {
        setIsSpeaking(false)
        setIsSpeechPaused(false)
        setStatusText(null)
        setError(speechError instanceof Error ? speechError.message : 'Failed to play speech.')
      }
    }

    void speak()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setStatusText(null)
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl)
      }
    }
  }, [audioEnabled, lang, messages])

  async function submitMessage(text: string, responseMode: ResponseMode = 'text') {
    const question = text.trim()
    if (!question || isLoading) return

    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsSpeaking(false)
    setIsSpeechPaused(false)
    setStatusText(null)
    shouldSpeakReplyRef.current = audioEnabled && responseMode === 'voice'

    const nextMessages = [...messages, { role: 'user' as const, content: question }]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: lang,
          messages: nextMessages,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: data.reply as string,
          sources: Array.isArray(data.sources) ? (data.sources as SourceLink[]) : [],
          followUps: buildFollowUps(
            lang,
            question,
            data.reply as string,
            Array.isArray(data.matchedEntities) ? (data.matchedEntities as string[]) : []
          ),
        },
      ])
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function transcribeBlob(blob: Blob) {
    setIsTranscribing(true)
    setError(null)
    setStatusText(t.transcribing)

    try {
      const formData = new FormData()
      const mimeType = blob.type || 'audio/webm'
      formData.append('audio', new File([blob], getAudioFileName(mimeType), { type: mimeType }))
      formData.append('locale', lang)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed')
      }

      const transcript = (data.text as string).trim()
      if (!transcript) {
        throw new Error('Empty transcription')
      }

      setInput(transcript)
      void submitMessage(transcript, 'voice')
    } catch (transcriptionError) {
      setError(
        transcriptionError instanceof Error
          ? transcriptionError.message
          : 'Voice transcription failed.'
      )
    } finally {
      setIsTranscribing(false)
      if (!shouldSpeakReplyRef.current) {
        setStatusText(null)
      }
    }
  }

  async function handleVoiceToggle() {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = getPreferredRecordingMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        void transcribeBlob(blob)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setStatusText(t.listening)
      setError(null)
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : 'Could not access microphone.')
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void submitMessage(input, 'text')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitMessage(input, 'text')
    }
  }

  function handleNewChat() {
    setMessages([])
    setInput('')
    setError(null)
    setIsLoading(false)
    setIsSpeaking(false)
    setIsSpeechPaused(false)
    setStatusText(null)
    shouldSpeakReplyRef.current = false
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }

  function handleSpeechPlaybackToggle() {
    const audio = audioRef.current
    if (!audio) return

    if (isSpeechPaused) {
      void audio.play()
      return
    }

    if (isSpeaking) {
      audio.pause()
    }
  }

  async function handleSpeakMessage(text: string) {
    if (!audioEnabled) {
      setAudioEnabled(true)
    }
    lastSpokenAssistantRef.current = ''
    shouldSpeakReplyRef.current = false
    if (audioRef.current) {
      audioRef.current.pause()
    }
    try {
      setIsSpeaking(true)
      setStatusText(t.speaking)
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, locale: lang }),
      })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setIsSpeaking(false)
        setIsSpeechPaused(false)
        setStatusText(null)
        URL.revokeObjectURL(url)
      }
      audio.onpause = () => {
        if (!audio.ended) {
          setIsSpeechPaused(true)
          setStatusText(null)
        }
      }
      audio.onplay = () => {
        setIsSpeaking(true)
        setIsSpeechPaused(false)
        setStatusText(t.speaking)
      }
      await audio.play()
    } catch (speakError) {
      setIsSpeaking(false)
      setStatusText(null)
      setError(speakError instanceof Error ? speakError.message : 'Failed to play speech.')
    }
  }

  function handleFollowUp(question: string) {
    setInput(question)
    textareaRef.current?.focus()
  }

  function toggleTheme() {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  function scrollToBottom() {
    chatAreaRef.current?.scrollTo({
      top: chatAreaRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--background)', minHeight: 'var(--app-vh, 100dvh)' }}>
      <header
        className={`sticky top-0 z-10 backdrop-blur-xl transition-all ${isCompactHeader ? 'mobile-header-compact' : ''}`}
        style={{
          background: 'var(--footer-bar)',
          borderBottom: '1px solid var(--border)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:flex-nowrap sm:px-4 sm:py-3">
          <button onClick={handleNewChat} className="flex min-h-[40px] items-center gap-2.5 transition-opacity hover:opacity-75">
            <JahongirAvatar size="sm" lang={lang} />
            <span className={`truncate font-semibold tracking-tight transition-all ${isCompactHeader ? 'text-[12px] sm:text-[13px]' : 'text-[13px] sm:text-sm'}`} style={{ color: 'var(--foreground)' }}>
              Ask Jahongir
            </span>
          </button>
          <div className="mobile-toolbar flex w-full items-center justify-end gap-2 sm:w-auto">
            {(isSpeaking || isSpeechPaused) && (
              <button
                onClick={handleSpeechPlaybackToggle}
                className="flex min-h-[36px] items-center justify-center rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  color: 'var(--foreground)',
                  background: 'var(--ai-bubble)',
                  border: '1px solid var(--border)',
                }}
                type="button"
              >
                {isSpeechPaused ? t.resumeVoice : t.pauseVoice}
              </button>
            )}
            <button
              onClick={() => setAudioEnabled((current) => !current)}
              className="flex min-h-[36px] items-center justify-center rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                color: audioEnabled ? 'var(--user-text)' : 'var(--muted)',
                background: audioEnabled ? 'var(--user-bubble)' : 'transparent',
                border: '1px solid var(--border)',
              }}
            >
              {audioEnabled ? t.voiceOn : t.voiceOff}
            </button>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
              type="button"
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <div className="flex overflow-hidden rounded-lg text-[11px] font-medium" style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setLang('en')}
                className="min-h-[36px] px-2.5 py-1.5 transition-colors"
                style={{
                  background: lang === 'en' ? 'var(--user-bubble)' : 'transparent',
                  color: lang === 'en' ? 'var(--user-text)' : 'var(--muted)',
                }}
                type="button"
              >
                EN
              </button>
              <button
                onClick={() => setLang('uz')}
                className="min-h-[36px] px-2.5 py-1.5 transition-colors"
                style={{
                  background: lang === 'uz' ? 'var(--user-bubble)' : 'transparent',
                  color: lang === 'uz' ? 'var(--user-text)' : 'var(--muted)',
                }}
                type="button"
              >
                UZ
              </button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="flex min-h-[36px] items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
                type="button"
              >
                {t.newChat}
              </button>
            )}
          </div>
        </div>
      </header>

      <div ref={chatAreaRef} className="chat-bg mobile-chat-area flex-1 overflow-y-auto px-3 pb-32 pt-4 sm:px-4 sm:pb-32 sm:pt-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {messages.length === 0 && (
            <div className="hero-glow flex flex-col items-center gap-6 pt-6 sm:gap-10 sm:pt-12">
              <JahongirAvatar size="lg" lang={lang} />
              <div className="max-w-xl pt-4 text-center">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: 'var(--foreground)' }}>
                  {t.title}
                </h1>
                <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
                  {t.subtitle}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium" style={{ background: 'var(--surface-soft)', color: 'var(--foreground)' }}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--user-bubble)' }} />
                  {t.askByText}
                </div>
              </div>
              <div className="mobile-topic-row flex w-full max-w-xl gap-2 overflow-x-auto pb-1">
                {QUICK_TOPICS[lang].map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => void submitMessage(getTopicPrompt(topic, lang), 'text')}
                    className="mobile-chip whitespace-nowrap rounded-full border px-3 py-2 text-[12px] font-medium transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--suggestion-bg)' }}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <SuggestedQuestions onSelect={(question) => void submitMessage(question, 'text')} lang={lang} />
              <div className="space-y-1 text-center">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Powered by public data + OpenAI
                </p>
                <p className="mx-auto max-w-xl text-[11px]" style={{ color: 'var(--muted)', opacity: 0.75 }}>
                  {t.voiceDisclaimer}
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble
              key={`${message.role}-${index}-${message.content.slice(0, 16)}`}
              message={message}
              lang={lang}
              onSpeak={!message.role || message.role === 'assistant' ? handleSpeakMessage : undefined}
              onFollowUp={handleFollowUp}
            />
          ))}

          {(isLoading || isTranscribing) && <ThinkingIndicator lang={lang} />}

          {isSpeaking && (
            <div className="animate-fade-in text-center text-xs" style={{ color: 'var(--muted)' }}>
              {t.speaking}
            </div>
          )}

          {error && (
            <div className="animate-fade-in flex items-start gap-3">
              <div className="mt-1 shrink-0">
                <JahongirAvatar size="sm" lang={lang} />
              </div>
              <div
                className="rounded-2xl rounded-tl-sm border px-4 py-3 text-sm"
                style={{
                  background: 'var(--ai-bubble)',
                  borderColor: 'var(--border)',
                  color: 'var(--ai-text)',
                }}
              >
                {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 sm:bottom-20 sm:h-10 sm:w-10"
          style={{
            background: 'var(--ai-bubble)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2Z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      <div
        className="mobile-composer fixed bottom-0 left-0 right-0 backdrop-blur-xl"
        style={{
          background: 'var(--footer-bar)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl items-end gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <button
            type="button"
            onClick={() => void handleVoiceToggle()}
            disabled={isLoading || isTranscribing}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all hover:scale-105 disabled:opacity-30 sm:h-11 sm:w-11 sm:rounded-xl"
            style={{
              background: isRecording ? '#dc2626' : 'var(--ai-bubble)',
              color: isRecording ? '#ffffff' : 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
            aria-label={isRecording ? t.stopVoice : t.startVoice}
            title={isRecording ? t.stopVoice : t.startVoice}
          >
            {isRecording ? (
              <div className="recording-pulse h-3.5 w-3.5 rounded-sm bg-current" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10 13a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z" />
                <path d="M5.75 9.25a.75.75 0 0 1 .75.75 3.5 3.5 0 1 0 7 0 .75.75 0 0 1 1.5 0 5 5 0 0 1-4.25 4.943V17.5h2a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5h2v-2.557A5 5 0 0 1 4.999 10a.75.75 0 0 1 .75-.75Z" />
              </svg>
            )}
          </button>

          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={isTranscribing ? t.transcribing : input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              rows={1}
              className="min-h-[52px] w-full resize-none rounded-2xl px-3 py-3 text-base outline-none transition-all sm:min-h-[44px] sm:rounded-xl sm:px-4 sm:py-3 sm:text-[14px]"
              style={{
                background: 'var(--input-bg)',
                color: 'var(--foreground)',
                border: '1px solid var(--input-border)',
              }}
              disabled={isLoading || isTranscribing}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isTranscribing || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all hover:scale-105 disabled:opacity-30 sm:h-11 sm:w-11 sm:rounded-xl"
            style={{
              background: 'var(--user-bubble)',
              color: 'var(--user-text)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          </button>
        </form>
        <div className="mx-auto flex max-w-2xl flex-col items-start gap-2 px-3 pb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
          <div className="min-h-[22px]">
            {statusText && (
              <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'var(--surface-soft)', color: 'var(--foreground)' }}>
                <span className={`inline-block h-2 w-2 rounded-full ${isRecording ? 'recording-pulse' : ''}`} style={{ background: isRecording ? '#dc2626' : 'var(--user-bubble)' }} />
                {statusText}
              </div>
            )}
          </div>
          <p className="w-full text-left text-[10px] sm:w-auto sm:text-right sm:text-[11px]" style={{ color: 'var(--muted)', opacity: 0.6 }}>
            {t.inputHint}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pb-2 sm:pb-3">
          <p className="text-center text-[10px] sm:text-[11px]" style={{ color: 'var(--muted)', opacity: 0.6 }}>
            {t.disclaimer}
          </p>
          <span className="text-[10px] sm:text-[11px]" style={{ color: 'var(--muted)', opacity: 0.3 }}>
            |
          </span>
          <span className="text-[10px] sm:text-[11px]" style={{ color: 'var(--muted)', opacity: 0.5 }}>
            {t.builtBy}
          </span>
        </div>
      </div>
    </div>
  )
}
