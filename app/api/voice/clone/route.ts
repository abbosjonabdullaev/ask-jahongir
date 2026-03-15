import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing ELEVENLABS_API_KEY in environment.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const name = formData.get('name')
    const description = formData.get('description')
    const removeBackgroundNoise = formData.get('remove_background_noise')
    const files = formData.getAll('files').filter((item): item is File => item instanceof File)

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Missing voice name.' }, { status: 400 })
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one audio sample is required.' }, { status: 400 })
    }

    const upstreamForm = new FormData()
    upstreamForm.append('name', name.trim())

    if (typeof description === 'string' && description.trim()) {
      upstreamForm.append('description', description.trim())
    }

    if (typeof removeBackgroundNoise === 'string') {
      upstreamForm.append('remove_background_noise', removeBackgroundNoise)
    }

    for (const file of files) {
      upstreamForm.append('files', file, file.name || 'sample.wav')
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: upstreamForm,
    })

    const text = await response.text()
    const data = text ? JSON.parse(text) : {}

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.detail?.message || data.message || 'Voice clone request failed.',
          provider: 'elevenlabs',
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      provider: 'elevenlabs',
      voiceId: data.voice_id ?? null,
      name: data.name ?? name.trim(),
      message: 'Voice created successfully. Set ELEVENLABS_VOICE_ID or pass this voiceId to /api/speak.',
      raw: data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown voice clone error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
