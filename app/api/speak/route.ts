import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type SpeakRequest = {
  text?: string
  locale?: 'en' | 'uz'
  voiceId?: string
}

function getRequestedVoiceId(body: SpeakRequest) {
  return body.voiceId?.trim() || process.env.ELEVENLABS_VOICE_ID?.trim() || null
}

async function speakWithElevenLabs({
  text,
  voiceId,
}: {
  text: string
  voiceId: string
}) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('Missing ELEVENLABS_API_KEY in environment.')
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2'
  const stability = Number(process.env.ELEVENLABS_STABILITY ?? '0.45')
  const similarityBoost = Number(process.env.ELEVENLABS_SIMILARITY_BOOST ?? '0.82')
  const style = Number(process.env.ELEVENLABS_STYLE ?? '0.2')
  const useSpeakerBoost = (process.env.ELEVENLABS_SPEAKER_BOOST ?? 'true').toLowerCase() !== 'false'

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs request failed (${response.status}): ${errorText}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function speakWithOpenAI({
  text,
  locale,
}: {
  text: string
  locale: 'en' | 'uz'
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY in environment.')
  }

  const speech = await client.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: 'onyx',
    input: text,
    instructions:
      locale === 'uz'
        ? "Speak in a calm, confident Uzbek founder style. Natural, steady, direct."
        : 'Speak in a calm, confident founder style. Natural, steady, direct.',
  })

  return Buffer.from(await speech.arrayBuffer())
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SpeakRequest
    const text = body.text?.trim()
    const locale = body.locale === 'uz' ? 'uz' : 'en'

    if (!text) {
      return NextResponse.json({ error: 'Missing text.' }, { status: 400 })
    }

    const requestedVoiceId = getRequestedVoiceId(body)

    if (requestedVoiceId && process.env.ELEVENLABS_API_KEY) {
      const buffer = await speakWithElevenLabs({
        text,
        voiceId: requestedVoiceId,
      })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
          'X-Voice-Provider': 'elevenlabs',
          'X-Voice-Id': requestedVoiceId,
        },
      })
    }

    const buffer = await speakWithOpenAI({ text, locale })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Voice-Provider': 'openai',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown speech error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
