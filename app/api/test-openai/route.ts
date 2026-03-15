import { NextResponse } from 'next/server'
import {
  createChatClient,
  getChatProviderStatus,
  isChatProviderConfigured,
} from '@/lib/chatProvider'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const providerStatus = getChatProviderStatus()

    if (!isChatProviderConfigured(providerStatus.provider)) {
      return NextResponse.json({
        error: `No ${providerStatus.credentialName} found`,
        status: 'Missing API Key'
      }, { status: 400 })
    }

    console.log(`Testing ${providerStatus.provider} API key...`)

    const client = createChatClient(providerStatus.provider)

    const response = await client.models.list()

    console.log(`${providerStatus.provider} API test successful`)

    return NextResponse.json({
      success: true,
      message: `${providerStatus.provider} API key is working`,
      provider: providerStatus.provider,
      model: providerStatus.model,
      models: response.data.length,
      status: 'Connected'
    })

  } catch (error) {
    console.error('AI provider test failed:', error)

    return NextResponse.json({
      error: 'AI provider test failed',
      details: (error as Error).message,
      status: 'Failed'
    }, { status: 500 })
  }
}
