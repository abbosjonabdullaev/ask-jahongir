import { NextRequest, NextResponse } from 'next/server'
import { jahongirProfile, systemPromptByLocale } from '@/lib/jahongirProfile'
import { buildKnowledgeContext } from '@/lib/knowledge'
import { appendReview } from '@/lib/reviewStore'
import {
  createChatClient,
  getChatCredentialName,
  isChatProviderConfigured,
  resolveChatModel,
  resolveChatProvider,
} from '@/lib/chatProvider'
import { getReviewWarningsForMode } from '@/lib/reviewInsights'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const replyMaxTokens = Number(process.env.JAHONGIR_REPLY_MAX_TOKENS ?? '420')

function normalizeFirstPersonReply(reply: string, locale: 'en' | 'uz') {
  let normalized = reply.trim()

  if (locale === 'en') {
    normalized = normalized
      .replace(/\bIn your Telegram posts\b/gi, 'In my Telegram posts')
      .replace(/\bYour Telegram posts\b/gi, 'My Telegram posts')
      .replace(/\bYour posts\b/gi, 'My posts')
      .replace(/\bYour content\b/gi, 'My content')
      .replace(/\bYour approach\b/gi, 'My approach')
      .replace(/\bYour view\b/gi, 'My view')
      .replace(/\bYour work\b/gi, 'My work')
      .replace(/\bYour businesses\b/gi, 'My businesses')
      .replace(/\bOverall, your\b/gi, 'Overall, my')
      .replace(/\bYou focus on\b/gi, 'I focus on')
      .replace(/\bYou emphasize\b/gi, 'I emphasize')
      .replace(/\bYou share\b/gi, 'I share')
      .replace(/\bYou talk about\b/gi, 'I talk about')
      .replace(/\bYou publicly\b/gi, 'I publicly')
      .replace(/\bYou built\b/gi, 'I built')
      .replace(/\bYou usually\b/gi, 'I usually')
      .replace(/\bYou tend to\b/gi, 'I tend to')
      .replace(/\bJahongir focuses on\b/gi, 'I focus on')
      .replace(/\bJahongir emphasizes\b/gi, 'I emphasize')
      .replace(/\bJahongir talks about\b/gi, 'I talk about')
      .replace(/\bHis approach\b/gi, 'My approach')
  } else {
    normalized = normalized
      .replace(/\bSizning Telegram postlaringizda\b/gi, 'Telegram postlarimda')
      .replace(/\bSizning Telegram postlaringiz\b/gi, 'Telegram postlarim')
      .replace(/\bSizning postlaringiz\b/gi, 'Postlarim')
      .replace(/\bSizning kontentingiz\b/gi, 'Kontentim')
      .replace(/\bSizning yondashuvingiz\b/gi, 'Yondashuvim')
      .replace(/\bSiz ko'proq\b/gi, "Men ko'proq")
      .replace(/\bSiz urg'u berasiz\b/gi, "Men urg'u beraman")
      .replace(/\bSiz ta'kidlaysiz\b/gi, "Men ta'kidlayman")
      .replace(/\bSiz ulashasiz\b/gi, 'Men ulashaman')
      .replace(/\bJahongir ko'proq\b/gi, "Men ko'proq")
      .replace(/\bJahongir urg'u beradi\b/gi, "Men urg'u beraman")
      .replace(/\bJahongir ta'kidlaydi\b/gi, "Men ta'kidlayman")
  }

  return normalized
}

function trimGenericClosing(
  reply: string,
  mode: ReturnType<typeof buildKnowledgeContext>['responseMode'],
  locale: 'en' | 'uz'
) {
  if (mode !== 'theme_summary') {
    return reply
  }

  const parts = reply
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 2) {
    return reply
  }

  const lastPart = parts.at(-1) ?? ''
  const genericThemeClosing =
    locale === 'uz'
      ? /^(Umuman|Bu mavzular|Maqsadim|Asosiy maqsadim)/i
      : /^(Overall|These themes|This reflects|My aim is|My goal is|The overall idea)/i

  if (!genericThemeClosing.test(lastPart)) {
    return reply
  }

  return parts.slice(0, -1).join(' ')
}

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
  const reviewWarningLines = getReviewWarningsForMode(retrieval.responseMode).map((warning) =>
    locale === 'uz'
      ? `Review signal: ${warning
          .replace('Avoid generic filler and generic mission statements for this mode.', "Bu rejimda umumiy filler va balandparvoz mission gaplaridan qoching.")
          .replace('Keep this mode tighter and avoid bloated multi-paragraph answers.', "Bu rejimda javobni ixchamroq tuting va keraksiz cho'zilgan abzaslardan qoching.")
          .replace('Prefer concrete, direct wording over abstract framing for this mode.', "Bu rejimda abstrakt framing o'rniga aniq va to'g'ridan-to'g'ri iboralarni ishlating.")}`
      : `Review signal: ${warning}`
  )

  const baseRules =
    locale === 'uz'
      ? [
          "Javobni odatda 1-3 qisqa abzasda bering.",
          'Har doim birinchi shaxsda yozing: men, mening, biz.',
          "Avval to'g'ridan-to'g'ri javob bering, keyin kerak bo'lsa qisqa asos qo'shing.",
          "Agar savol follow-up bo'lsa, oldingi kontekstni davom ettiring va mavzuni o'zgartirib yubormang.",
          "Foydalanuvchi ro'yxat so'ramasa, ro'yxat ishlatmang.",
          "Umumiy motivatsion gaplardan qoching.",
          "Savolga aloqasiz umumiy xulosa yoki balandparvoz yakun yozmang.",
          "Customer support uslubida yozmang. 'Agar xohlasangiz yana aytaman' kabi sun'iy yakunlardan qoching.",
          "Foydalanuvchi so'ramasa, saytga kirishni yoki qo'shimcha ma'lumot olishni tavsiya qilmang.",
          "Agar fikr yoki yondashuv public manbada aniq ko'rinib turgan bo'lsa, 'mening fikrimcha' deb yumshatmang, bevosita ayting.",
          "Hech qachon 'Sizning Telegram postlaringiz' yoki 'Jahongir ...' deb tashqaridan gapirmang. 'Telegram postlarimda men ...' deb yozing.",
        ]
      : [
          'Always write in first person: I, my, me.',
          'Usually answer in 1-3 short paragraphs.',
          'Lead with the direct answer, then add brief grounding if useful.',
          'If the question is a follow-up, continue the prior context instead of resetting the topic.',
          'Do not use a list unless the user explicitly asks for one.',
          'Avoid generic motivational filler.',
          'Do not end with a vague mission statement or generic reflection unless the user explicitly asked for it.',
          "Do not sound like customer support. Avoid generic closers such as 'let me know if you want more details'.",
          "Do not tell the user to visit a website unless they explicitly asked for logistics or source links.",
          "If the viewpoint is clearly grounded in the selected public sources, say it directly instead of softening it with 'in my opinion'.",
          "Never write from the outside with phrasing like 'your Telegram posts' or 'Jahongir focuses on'. Say 'in my Telegram posts' or 'I focus on' instead.",
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
        : retrieval.responseMode === 'theme_summary'
          ? "Theme-summary savollarida: 3-6 ta eng ko'p qaytadigan mavzuni bevosita ayting, keyin bitta qisqa amaliy izoh qo'shing. Keraksiz umumlashtirmang."
          : retrieval.responseMode === 'ecosystem'
            ? "Ecosystem savollarida: menga eng aniq bog'langan loyihalarni avval ayting, keyin kerak bo'lsa rasmiyligi pastroq bog'lanishlarni alohida ehtiyotkorlik bilan ajrating. Tanlangan kontekstdan tashqari ortiqcha brand qo'shmang."
        : retrieval.responseMode === 'latest'
          ? "Latest savollarida: to'g'ridan-to'g'ri eng so'nggi public signalni ayting va kerak bo'lsa sanani qo'shing."
          : retrieval.responseMode === 'founder_story'
            ? "Founder story savollarida: javobni qisqa hikoya formatida bering, ortiqcha umumlashtirmang."
            : retrieval.responseMode === 'business'
              ? "Business savollarida: muammo, prinsip, amaliy yechim tartibida javob bering."
              : "Maslahat savollarida: prinsipni ayting, keyin bitta amaliy qadam bering."
      : retrieval.responseMode === 'entity'
        ? 'For entity questions: answer in the order of what it is, how it works, and what makes it different.'
        : retrieval.responseMode === 'theme_summary'
          ? 'For theme-summary questions: name the 3-6 strongest recurring themes directly, then add one short practical explanation. Do not drift into generic reflection.'
          : retrieval.responseMode === 'ecosystem'
            ? 'For ecosystem questions: list the projects most clearly tied to me first, then separate thinner or more secondary public associations carefully. Do not add extra brands beyond the selected context.'
        : retrieval.responseMode === 'latest'
          ? 'For latest questions: give the latest public signal directly and include the date when useful.'
          : retrieval.responseMode === 'founder_story'
            ? 'For founder-story questions: answer in a short story format and avoid abstract generalities.'
            : retrieval.responseMode === 'business'
              ? 'For business questions: answer in the order of problem, principle, and practical solution.'
              : 'For advice questions: state the principle first, then give one practical next step.'

  return [modeLine, ...baseRules, modeRule, formatRule, timeRule, styleLine, ...reviewWarningLines]
    .filter(Boolean)
    .join('\n')
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
    const chatProvider = resolveChatProvider()
    const chatModel = resolveChatModel(chatProvider)

    if (!isChatProviderConfigured(chatProvider)) {
      return NextResponse.json(
        { error: `Missing ${getChatCredentialName(chatProvider)} in environment.` },
        { status: 500 }
      )
    }

    const client = createChatClient(chatProvider)

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
      temperature: 0.25,
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

    const normalizedReply = trimGenericClosing(
      normalizeFirstPersonReply(reply, locale),
      retrieval.responseMode,
      locale
    )

    const question = messages.filter((message) => message.role === 'user').at(-1)?.content ?? ''

    const review = await appendReview({
      locale,
      question,
      reply: normalizedReply,
      matchedEntities: retrieval.matchedEntities,
      sources: retrieval.sources,
      responseMode: retrieval.responseMode,
      isFollowUp: retrieval.isFollowUp,
    })

    return NextResponse.json({
      reply: normalizedReply,
      matchedEntities: retrieval.matchedEntities,
      sources: retrieval.sources,
      provider: chatProvider,
      reviewId: review.id,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error.'

    const isUpstreamAvailabilityIssue =
      /429|503|account is not active|billing|quota|rate limit|resource_exhausted|temporarily unavailable/i.test(
        message
      )

    if (isUpstreamAvailabilityIssue) {
      const locale = body?.locale === 'uz' ? 'uz' : 'en'
      const messages = Array.isArray(body?.messages) ? body.messages.slice(-8) : []
      const retrieval = buildKnowledgeContext(messages)
      const question = messages.filter((message) => message.role === 'user').at(-1)?.content ?? ''
      const fallbackReply = buildFallbackReply(locale, retrieval)

      const review = await appendReview({
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
        provider: 'fallback',
        reviewId: review.id,
      })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
