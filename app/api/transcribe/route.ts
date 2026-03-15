import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const transcribeModel =
  process.env.JAHONGIR_TRANSCRIBE_MODEL ?? 'gpt-4o-mini-transcribe'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY in environment.' }, { status: 500 })
    }

    const formData = await request.formData()
    const audio = formData.get('audio')
    const locale = formData.get('locale')

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'Missing audio file.' }, { status: 400 })
    }

    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: transcribeModel,
      prompt:
        locale === 'uz'
          ? "This audio is likely in Uzbek. Return a clean, natural Uzbek transcript using Uzbek Latin where appropriate."
          : 'This audio may be an English question. Return a clean, natural English transcript.',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown transcription error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
