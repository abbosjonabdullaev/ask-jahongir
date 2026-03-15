import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { jahongirProfile, systemPromptByLocale } from '@/lib/jahongirProfile'
import { buildKnowledgeContext } from '@/lib/knowledge'
import { appendReview } from '@/lib/reviewStore'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const chatModel = process.env.JAHONGIR_CHAT_MODEL ?? 'gpt-4.1-mini'
const replyMaxTokens = Number(process.env.JAHONGIR_REPLY_MAX_TOKENS ?? '420')

function buildResponseContract(
  locale: 'en' | 'uz',
  retrieval: ReturnType<typeof buildKnowledgeContext>
) {
  const hasEntity = retrieval.matchedEntities.length > 0
  const modeLine =
    locale === 'uz'
      ? `Javob rejimi: ${retrieval.responseMode}.`
      : `Response mode: ${retrieval.responseMode}.`
  const styleLine =
    retrieval.styleSignals.length > 0
      ? locale === 'uz'
        ? `Tanlangan ohang signallari: ${retrieval.styleSignals.join('; ')}.`
        : `Selected tone cues: ${retrieval.styleSignals.join('; ')}.`
      : null

  const baseRules =
    locale === 'uz'
      ? [
          "Javobni odatda 1-3 qisqa abzasda bering.",
          "Avval to'g'ridan-to'g'ri javob bering, keyin kerak bo'lsa qisqa asos qo'shing.",
          "Agar savol follow-up bo'lsa, oldingi kontekstni davom ettiring va mavzuni o'zgartirib yubormang.",
          "Foydalanuvchi ro'yxat so'ramasa, ro'yxat ishlatmang.",
          "Umumiy motivatsion gaplardan qoching.",
          "Customer support uslubida yozmang. 'Agar xohlasangiz yana aytaman' kabi sun'iy yakunlardan qoching.",
          "Foydalanuvchi so'ramasa, saytga kirishni yoki qo'shimcha ma'lumot olishni tavsiya qilmang.",
          "Agar fikr yoki yondashuv public manbada aniq ko'rinib turgan bo'lsa, 'mening fikrimcha' deb yumshatmang, bevosita ayting.",
        ]
      : [
          'Usually answer in 1-3 short paragraphs.',
          'Lead with the direct answer, then add brief grounding if useful.',
          'If the question is a follow-up, continue the prior context instead of resetting the topic.',
          'Do not use a list unless the user explicitly asks for one.',
          'Avoid generic motivational filler.',
          "Do not sound like customer support. Avoid generic closers such as 'let me know if you want more details'.",
          "Do not tell the user to visit a website unless they explicitly asked for logistics or source links.",
          "If the viewpoint is clearly grounded in the selected public sources, say it directly instead of softening it with 'in my opinion'.",
        ]

  const modeRule = hasEntity
    ? locale === 'uz'
      ? `Joriy savolda asosiy fokus: ${retrieval.matchedEntities.join(', ')}. Shu entity bo'yicha amaliy tafsilotlardan boshlang.`
      : `Primary focus for this question: ${retrieval.matchedEntities.join(', ')}. Start with concrete operational details about that entity.`
    : locale === 'uz'
      ? "Agar savol dunyoqarash, maslahat yoki yondashuv haqida bo'lsa, javobni Jahongirning public signallariga yaqin, lekin juda aniq va amaliy qiling."
      : "If the question is about worldview, advice, or approach, make the answer sound close to Jahongir's public signals while staying concrete and practical."

  const timeRule =
    locale === 'uz'
      ? "Agar foydalanuvchi 'hozir', 'ayni payt', 'eng so'nggi' kabi vaqtga bog'liq savol bersa, faqat tanlangan manbada shu narsa bor bo'lsa shunday deb javob bering. Aks holda 'mening qo'limdagi eng so'nggi public signal' deb sanani ayting."
      : "If the user asks a time-sensitive question such as current, now, or latest, only present it as current if the selected source actually supports that. Otherwise say it is the latest public signal you have and include the date."
  const formatRule =
    locale === 'uz'
      ? retrieval.responseMode === 'entity'
        ? "Entity savollarida: bu nima, qanday ishlaydi, nimasi bilan farq qiladi degan tartibda javob bering."
        : retrieval.responseMode === 'latest'
          ? "Latest savollarida: to'g'ridan-to'g'ri eng so'nggi public signalni ayting va kerak bo'lsa sanani qo'shing."
          : retrieval.responseMode === 'founder_story'
            ? "Founder story savollarida: javobni qisqa hikoya formatida bering, ortiqcha umumlashtirmang."
            : retrieval.responseMode === 'business'
              ? "Business savollarida: muammo, prinsip, amaliy yechim tartibida javob bering."
              : "Maslahat savollarida: prinsipni ayting, keyin bitta amaliy qadam bering."
      : retrieval.responseMode === 'entity'
        ? 'For entity questions: answer in the order of what it is, how it works, and what makes it different.'
        : retrieval.responseMode === 'latest'
          ? 'For latest questions: give the latest public signal directly and include the date when useful.'
          : retrieval.responseMode === 'founder_story'
            ? 'For founder-story questions: answer in a short story format and avoid abstract generalities.'
            : retrieval.responseMode === 'business'
              ? 'For business questions: answer in the order of problem, principle, and practical solution.'
              : 'For advice questions: state the principle first, then give one practical next step.'

  return [modeLine, ...baseRules, modeRule, formatRule, timeRule, styleLine].filter(Boolean).join('\n')
}

function buildFallbackReply(
  locale: 'en' | 'uz',
  retrieval: ReturnType<typeof buildKnowledgeContext>
) {
  const intro =
    locale === 'uz'
      ? "Hozir AI modeli ishlamayapti, shuning uchun men javobni o'zim haqimdagi ochiq knowledge bazadan tuzyapman."
      : 'The AI model is unavailable right now, so I am answering from the public knowledge base about my work.'

  const entityLine =
    retrieval.matchedEntities.length > 0
      ? locale === 'uz'
        ? `Savolingizga eng yaqin mavzular: ${retrieval.matchedEntities.join(', ')}.`
        : `The closest matched topics for your question are: ${retrieval.matchedEntities.join(', ')}.`
      : locale === 'uz'
        ? "Aniq entity topilmadi, shuning uchun eng yaqin public kontekstga tayandim."
        : 'No exact entity match was found, so I relied on the closest public context.'

  return `${intro}\n\n${entityLine}\n\n${retrieval.context}`
}

export async function POST(request: NextRequest) {
  let body:
    | {
        locale?: 'en' | 'uz'
        messages?: Message[]
      }
    | undefined

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY in environment.' },
        { status: 500 }
      )
    }

    body = (await request.json()) as {
      locale?: 'en' | 'uz'
      messages?: Message[]
    }

    const locale = body.locale === 'uz' ? 'uz' : 'en'
    const messages = Array.isArray(body.messages) ? body.messages.slice(-6) : []

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided.' },
        { status: 400 }
      )
    }

    const retrieval = buildKnowledgeContext(messages)

    const completion = await client.chat.completions.create({
      model: chatModel,
      temperature: 0.35,
      max_tokens: replyMaxTokens,
      messages: [
        {
          role: 'system',
          content: systemPromptByLocale[locale],
        },
        {
          role: 'system',
          content: jahongirProfile,
        },
        {
          role: 'system',
          content:
            locale === 'uz'
              ? "Agar foydalanuvchi aniq fakt so'rasa, javob ichida kerak bo'lsa 'Manbaga tayangan fakt:' va 'Xulosa:' formatidan foydalan. Tashkilot haqidagi savollarda avval aniq biznes tafsilotlarini ber, keyin kerak bo'lsa qisqa izoh qo'sh. Maslahat yoki dunyoqarash savollarida esa tanlangan style cues ga mos, ammo faqat public materialga tayangan holda javob ber. Agar voice bank yoki curated YouTube insight berilgan bo'lsa, o'sha framing va gap qurilishiga yaqinroq yozing."
              : "If the user asks for factual background, you may structure the answer as 'Source-backed fact:' and 'Inference:' when helpful. For organization questions, answer with concrete business details first. For advice or worldview questions, follow the selected style cues while staying grounded in the public material. If a voice-bank or curated YouTube insight is present, borrow that framing and sentence style before falling back to generic summaries.",
        },
        {
          role: 'system',
          content:
            locale === 'uz'
              ? `Quyida joriy savolga mos tanlangan knowledge context bor. Mos bo'lsa undan foydalaning. Mos kelmasa, umumiy public-profile kontekstiga qayting. Agar style cues berilgan bo'lsa, javob ohangini shunga moslashtiring.\n\n${retrieval.context}`
              : `Below is the selected knowledge context for the current question. Use it when relevant. If it is not relevant, fall back to the broader public-profile context. If style cues are present, let them shape the tone of the answer.\n\n${retrieval.context}`,
        },
        {
          role: 'system',
          content: buildResponseContract(locale, retrieval),
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    })

    const reply = completion.choices[0]?.message?.content?.trim()

    if (!reply) {
      return NextResponse.json(
        { error: 'OpenAI returned an empty response.' },
        { status: 502 }
      )
    }

    const question = messages.filter((message) => message.role === 'user').at(-1)?.content ?? ''

    await appendReview({
      locale,
      question,
      reply,
      matchedEntities: retrieval.matchedEntities,
      sources: retrieval.sources,
      responseMode: retrieval.responseMode,
      isFollowUp: retrieval.isFollowUp,
    })

    return NextResponse.json({
      reply,
      matchedEntities: retrieval.matchedEntities,
      sources: retrieval.sources,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error.'

    const isUpstreamAvailabilityIssue =
      /429|account is not active|billing|quota|rate limit/i.test(message)

    if (isUpstreamAvailabilityIssue) {
      const locale = body?.locale === 'uz' ? 'uz' : 'en'
      const messages = Array.isArray(body?.messages) ? body.messages.slice(-8) : []
      const retrieval = buildKnowledgeContext(messages)
      const question = messages.filter((message) => message.role === 'user').at(-1)?.content ?? ''
      const fallbackReply = buildFallbackReply(locale, retrieval)

      await appendReview({
        locale,
        question,
        reply: fallbackReply,
        matchedEntities: retrieval.matchedEntities,
        sources: retrieval.sources,
        responseMode: retrieval.responseMode,
        isFollowUp: retrieval.isFollowUp,
      })

      return NextResponse.json({
        reply: fallbackReply,
        matchedEntities: retrieval.matchedEntities,
        sources: retrieval.sources,
        fallback: true,
      })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
