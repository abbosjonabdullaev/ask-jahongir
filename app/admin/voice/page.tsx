'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'

type VoiceStatus = {
  provider: 'openai' | 'elevenlabs'
  hasOpenAI: boolean
  hasElevenLabs: boolean
  voiceId: string | null
  modelId: string
}

type CloneResponse = {
  provider?: string
  voiceId?: string | null
  name?: string
  message?: string
  error?: string
}

const defaultTestText =
  'Assalomu alaykum. Men Jahongirman. Bu custom voice test. Agar ovoz toza va tabiiy chiqsa, shu voice id ni ilovaga ulash mumkin.'

export default function VoiceAdminPage() {
  const [status, setStatus] = useState<VoiceStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  const [voiceName, setVoiceName] = useState('Jahongir Pulatov')
  const [description, setDescription] = useState(
    'Approved Jahongir Pulatov voice samples for the Ask Jahongir app.'
  )
  const [removeNoise, setRemoveNoise] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [isCreatingVoice, setIsCreatingVoice] = useState(false)
  const [cloneResult, setCloneResult] = useState<CloneResponse | null>(null)

  const [testVoiceId, setTestVoiceId] = useState('')
  const [testText, setTestText] = useState(defaultTestText)
  const [isTestingVoice, setIsTestingVoice] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const effectiveVoiceId = useMemo(
    () => cloneResult?.voiceId || testVoiceId || status?.voiceId || '',
    [cloneResult?.voiceId, status?.voiceId, testVoiceId]
  )

  useEffect(() => {
    void loadStatus()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  useEffect(() => {
    if (cloneResult?.voiceId) {
      setTestVoiceId(cloneResult.voiceId)
    }
  }, [cloneResult?.voiceId])

  async function loadStatus() {
    setIsLoadingStatus(true)
    setStatusError(null)

    try {
      const response = await fetch('/api/voice/status')
      const data = (await response.json()) as VoiceStatus & { error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Could not load voice status.')
      }

      setStatus(data)
      if (data.voiceId) {
        setTestVoiceId(data.voiceId)
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Could not load voice status.')
    } finally {
      setIsLoadingStatus(false)
    }
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files || []))
  }

  async function handleCreateVoice() {
    if (files.length === 0 || isCreatingVoice) return

    setIsCreatingVoice(true)
    setCloneResult(null)
    setTestError(null)

    try {
      const formData = new FormData()
      formData.append('name', voiceName.trim())
      formData.append('description', description.trim())
      formData.append('remove_background_noise', String(removeNoise))

      for (const file of files) {
        formData.append('files', file, file.name)
      }

      const response = await fetch('/api/voice/clone', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as CloneResponse

      if (!response.ok) {
        throw new Error(data.error || 'Voice creation failed.')
      }

      setCloneResult(data)
      await loadStatus()
    } catch (error) {
      setCloneResult({
        error: error instanceof Error ? error.message : 'Voice creation failed.',
      })
    } finally {
      setIsCreatingVoice(false)
    }
  }

  async function handleCopyVoiceId() {
    if (!effectiveVoiceId) return
    await navigator.clipboard.writeText(effectiveVoiceId)
    setCopyState('copied')
    window.setTimeout(() => setCopyState('idle'), 1500)
  }

  async function handleTestVoice() {
    if (!effectiveVoiceId || !testText.trim() || isTestingVoice) return

    setIsTestingVoice(true)
    setTestError(null)

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText.trim(),
          locale: 'uz',
          voiceId: effectiveVoiceId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Voice test failed.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }

      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
      }
      await audio.play()
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Voice test failed.')
    } finally {
      setIsTestingVoice(false)
    }
  }

  return (
    <main
      className="min-h-screen px-4 py-8 sm:px-6"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--muted)' }}>
              Voice Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Custom voice setup</h1>
            <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--muted)' }}>
              Upload approved Jahongir voice samples, create a provider voice ID, and test it
              against the live app voice route.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--ai-bubble)',
              color: 'var(--foreground)',
            }}
          >
            Back to chat
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.2fr]">
          <section
            className="rounded-3xl border p-5 sm:p-6"
            style={{ borderColor: 'var(--border)', background: 'var(--ai-bubble)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Provider status</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                  Which voice backend the app will use right now.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadStatus()}
                className="rounded-xl px-3 py-2 text-sm font-medium"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {isLoadingStatus && <p style={{ color: 'var(--muted)' }}>Loading status...</p>}
              {statusError && <p style={{ color: '#dc2626' }}>{statusError}</p>}
              {status && (
                <>
                  <StatusRow label="Active provider" value={status.provider} />
                  <StatusRow label="OpenAI ready" value={status.hasOpenAI ? 'yes' : 'no'} />
                  <StatusRow label="ElevenLabs ready" value={status.hasElevenLabs ? 'yes' : 'no'} />
                  <StatusRow label="Voice ID" value={status.voiceId || 'not set'} mono />
                  <StatusRow label="Model ID" value={status.modelId} mono />
                </>
              )}
            </div>

            <div
              className="mt-5 rounded-2xl border p-4 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
            >
              <p className="font-medium">How to make the custom voice live</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5" style={{ color: 'var(--muted)' }}>
                <li>Upload approved samples below and create the voice.</li>
                <li>Copy the returned voice ID.</li>
                <li>Put it in `.env.local` as `ELEVENLABS_VOICE_ID=...`.</li>
                <li>Restart the dev server.</li>
              </ol>
            </div>
          </section>

          <section
            className="rounded-3xl border p-5 sm:p-6"
            style={{ borderColor: 'var(--border)', background: 'var(--ai-bubble)' }}
          >
            <h2 className="text-lg font-semibold">Create cloned voice</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              Use only audio files Jahongir explicitly approved for voice cloning.
            </p>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Voice name</span>
                <input
                  value={voiceName}
                  onChange={(event) => setVoiceName(event.target.value)}
                  className="rounded-xl px-3 py-2.5 outline-none"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                  }}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="rounded-xl px-3 py-2.5 outline-none"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                  }}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Voice samples</span>
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFilesChange}
                  className="rounded-xl border px-3 py-2.5 text-sm"
                  style={{ borderColor: 'var(--input-border)' }}
                />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  Recommended: 3-10 clean speech files, 30-120 seconds each, low background noise.
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={removeNoise}
                  onChange={(event) => setRemoveNoise(event.target.checked)}
                />
                Remove background noise before training
              </label>

              {files.length > 0 && (
                <div
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
                >
                  <p className="font-medium">Selected files</p>
                  <div className="mt-2 flex flex-col gap-1" style={{ color: 'var(--muted)' }}>
                    {files.map((file) => (
                      <span key={`${file.name}-${file.size}`}>
                        {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleCreateVoice()}
                disabled={isCreatingVoice || files.length === 0 || !voiceName.trim()}
                className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--user-bubble)', color: 'var(--user-text)' }}
              >
                {isCreatingVoice ? 'Creating voice...' : 'Create custom voice'}
              </button>

              {cloneResult && (
                <div
                  className="rounded-2xl border p-4 text-sm"
                  style={{
                    borderColor: cloneResult.error ? '#dc2626' : 'var(--border)',
                    background: 'var(--background)',
                  }}
                >
                  {cloneResult.error ? (
                    <p style={{ color: '#dc2626' }}>{cloneResult.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium">{cloneResult.message || 'Voice created.'}</p>
                      <p>
                        Voice ID:{' '}
                        <span className="font-mono text-xs">{cloneResult.voiceId || 'missing'}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopyVoiceId()}
                          className="rounded-xl px-3 py-2 text-sm font-medium"
                          style={{ border: '1px solid var(--border)' }}
                        >
                          {copyState === 'copied' ? 'Copied' : 'Copy voice ID'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <section
          className="rounded-3xl border p-5 sm:p-6"
          style={{ borderColor: 'var(--border)', background: 'var(--ai-bubble)' }}
        >
          <h2 className="text-lg font-semibold">Test voice ID</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            This calls the same `/api/speak` route the chat UI uses.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Voice ID</span>
              <input
                value={testVoiceId}
                onChange={(event) => setTestVoiceId(event.target.value)}
                placeholder="Enter ElevenLabs voice ID"
                className="rounded-xl px-3 py-2.5 font-mono text-sm outline-none"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                }}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Test text</span>
              <textarea
                value={testText}
                onChange={(event) => setTestText(event.target.value)}
                rows={4}
                className="rounded-xl px-3 py-2.5 outline-none"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                }}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleTestVoice()}
                disabled={isTestingVoice || !effectiveVoiceId || !testText.trim()}
                className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--user-bubble)', color: 'var(--user-text)' }}
              >
                {isTestingVoice ? 'Generating audio...' : 'Test custom voice'}
              </button>
              {effectiveVoiceId && (
                <button
                  type="button"
                  onClick={() => void handleCopyVoiceId()}
                  className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-medium"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {copyState === 'copied' ? 'Copied' : 'Copy current voice ID'}
                </button>
              )}
            </div>

            {testError && <p style={{ color: '#dc2626' }}>{testError}</p>}

            <div
              className="rounded-2xl border p-4 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
            >
              <p className="font-medium">Suggested `.env.local` entry</p>
              <pre
                className="mt-2 overflow-x-auto rounded-xl p-3 text-xs"
                style={{ background: 'var(--ai-bubble)', color: 'var(--foreground)' }}
              >
                <code>{`ELEVENLABS_API_KEY=your_key_here\nELEVENLABS_VOICE_ID=${effectiveVoiceId || 'paste_voice_id_here'}`}</code>
              </pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function StatusRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-2xl border px-4 py-3"
      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
    >
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className={mono ? 'font-mono text-xs' : 'font-medium'}>{value}</span>
    </div>
  )
}
