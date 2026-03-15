import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    provider: process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'openai',
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
    hasElevenLabs: Boolean(process.env.ELEVENLABS_API_KEY),
    voiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || null,
    modelId: process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2',
  })
}
