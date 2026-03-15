import OpenAI from 'openai'

export type ChatProvider = 'openai' | 'gemini'

const GEMINI_OPENAI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/'

function normalizeProvider(value: string | undefined): ChatProvider | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'openai' || normalized === 'gemini') {
    return normalized
  }

  return null
}

export function resolveChatProvider(): ChatProvider {
  const configuredProvider = normalizeProvider(process.env.JAHONGIR_CHAT_PROVIDER)
  if (configuredProvider) {
    return configuredProvider
  }

  return process.env.GEMINI_API_KEY ? 'gemini' : 'openai'
}

export function resolveChatModel(provider: ChatProvider): string {
  if (provider === 'gemini') {
    return process.env.JAHONGIR_GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash-lite'
  }

  return (
    process.env.JAHONGIR_OPENAI_CHAT_MODEL ??
    process.env.JAHONGIR_CHAT_MODEL ??
    'gpt-4o-mini'
  )
}

export function getChatApiKey(provider: ChatProvider): string | undefined {
  return provider === 'gemini'
    ? process.env.GEMINI_API_KEY
    : process.env.OPENAI_API_KEY
}

export function getChatCredentialName(provider: ChatProvider): string {
  return provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'
}

export function isChatProviderConfigured(provider: ChatProvider): boolean {
  return Boolean(getChatApiKey(provider))
}

export function createChatClient(provider: ChatProvider): OpenAI {
  const apiKey = getChatApiKey(provider)

  if (!apiKey) {
    throw new Error(`Missing ${getChatCredentialName(provider)} in environment.`)
  }

  return new OpenAI({
    apiKey,
    baseURL: provider === 'gemini' ? GEMINI_OPENAI_BASE_URL : undefined,
  })
}

export function getChatProviderStatus() {
  const provider = resolveChatProvider()

  return {
    provider,
    model: resolveChatModel(provider),
    credentialName: getChatCredentialName(provider),
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
    hasGemini: Boolean(process.env.GEMINI_API_KEY),
  }
}
