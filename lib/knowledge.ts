import businessKnowledge from '@/data/jahongir-business-knowledge.json'
import longformContentData from '@/data/jahongir-longform-content.json'
import publicSnippetsData from '@/data/jahongir-public-snippets.json'
import transcriptSnippetsData from '@/data/jahongir-transcript-snippets.json'
import voiceBankData from '@/data/jahongir-voice-bank.json'
import voiceSetData from '@/data/jahongir-voice-set.json'
import youtubeCuratedInsightsData from '@/data/jahongir-youtube-curated-insights.json'
import youtubeTranscriptSnippetsData from '@/data/jahongir-youtube-transcript-snippets.json'
import youtubeSnippetsData from '@/data/jahongir-youtube-snippets.json'
import telegramKnowledge from '@/data/jahongir-telegram-knowledge.json'

type KnowledgeEntity = {
  name: string
  type: string
  relation_to_jahongir: string
  aliases?: string[]
  facts: string[]
  faq_like_details?: string[]
  admissions_and_operations?: string[]
  sources: string[]
}

type BusinessKnowledge = {
  fetched_at: string
  subject: string
  entities: KnowledgeEntity[]
}

type TelegramPost = {
  post_id: number
  datetime: string
  url: string
  type: string
  themes: string[]
  text: string
}

type TelegramKnowledge = {
  fetched_at: string
  posts: TelegramPost[]
}

type PublicSnippet = {
  id: string
  type: string
  topics: string[]
  summary: string
  style_signal: string
  source_title: string
  source_url: string
}

type PublicSnippetsData = {
  fetched_at: string
  subject: string
  snippets: PublicSnippet[]
}

type LongformItem = {
  id: string
  source_type: string
  title: string
  topics: string[]
  summary: string
  segments: string[]
  source_url: string
}

type LongformContentData = {
  fetched_at: string
  subject: string
  items: LongformItem[]
}

type TranscriptSnippet = {
  id: string
  source_type: string
  title: string
  topics: string[]
  summary: string
  excerpt: string
  source_file: string
}

type TranscriptSnippetsData = {
  generated_at: string
  subject: string
  items: TranscriptSnippet[]
}

type VoiceBankEntry = {
  id: string
  topics: string[]
  voice_traits: string[]
  guidance: string
  anchor_text: string
  source_title: string
  source_url: string
}

type VoiceBankData = {
  generated_at: string
  subject: string
  entries: VoiceBankEntry[]
}

type VoiceSetItem = {
  id: string
  topics: string[]
  intent: string
  voice_traits: string[]
  guidance: string
  anchor_text: string
  source_title: string
  source_url: string
}

type VoiceSetData = {
  generated_at: string
  subject: string
  items: VoiceSetItem[]
}

type YouTubeCuratedInsight = {
  id: string
  type: string
  topics: string[]
  summary: string
  style_signal: string
  source_title: string
  source_url: string
}

type YouTubeCuratedInsightsData = {
  generated_at: string
  subject: string
  items: YouTubeCuratedInsight[]
}

type YouTubeSnippet = {
  id: string
  source_type: string
  title: string
  topics: string[]
  summary: string
  excerpt: string
  segments: string[]
  source_url: string
}

type YouTubeSnippetsData = {
  generated_at: string
  subject: string
  items: YouTubeSnippet[]
}

type YouTubeTranscriptSnippet = {
  id: string
  source_type: string
  title: string
  topics: string[]
  summary: string
  excerpt: string
  source_file: string
  source_url: string
}

type YouTubeTranscriptSnippetsData = {
  generated_at: string
  subject: string
  items: YouTubeTranscriptSnippet[]
}

export type SourceLink = {
  title: string
  url: string
  kind:
    | 'entity'
    | 'telegram_post'
    | 'public_snippet'
    | 'longform'
    | 'local_transcript'
    | 'voice_set'
    | 'voice_bank'
    | 'youtube'
    | 'youtube_curated'
    | 'youtube_transcript'
}

export type ResponseMode =
  | 'entity'
  | 'theme_summary'
  | 'ecosystem'
  | 'advice'
  | 'latest'
  | 'founder_story'
  | 'business'
  | 'general'

const knowledge = businessKnowledge as BusinessKnowledge
const longform = longformContentData as LongformContentData
const telegram = telegramKnowledge as TelegramKnowledge
const publicSnippets = publicSnippetsData as PublicSnippetsData
const transcriptSnippets = transcriptSnippetsData as TranscriptSnippetsData
const voiceBank = voiceBankData as VoiceBankData
const voiceSet = voiceSetData as VoiceSetData
const youtubeCuratedInsights = youtubeCuratedInsightsData as YouTubeCuratedInsightsData
const youtubeSnippets = youtubeSnippetsData as YouTubeSnippetsData
const youtubeTranscriptSnippets = youtubeTranscriptSnippetsData as YouTubeTranscriptSnippetsData

function normalize(text: string) {
  return text.toLowerCase()
}

function tokenize(text: string) {
  return normalize(text)
    .split(/[^a-z0-9']+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
}

function uniqueTokenRatio(text: string) {
  const tokens = tokenize(text)
  if (tokens.length === 0) return 1
  return new Set(tokens).size / tokens.length
}

function uniqueSources(sources: SourceLink[]) {
  const seen = new Set<string>()
  return sources.filter((source) => {
    const key = `${source.kind}:${source.url}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sourcePriority(source: SourceLink) {
  switch (source.kind) {
    case 'entity':
      return 100
    case 'voice_set':
      return 95
    case 'voice_bank':
      return 85
    case 'youtube_curated':
      return 80
    case 'public_snippet':
      return 70
    case 'longform':
      return 60
    case 'youtube_transcript':
      return 50
    case 'local_transcript':
      return 45
    case 'telegram_post':
      return 40
    case 'youtube':
      return 20
    default:
      return 0
  }
}

function prioritizeSources(sources: SourceLink[]) {
  return uniqueSources(sources)
    .sort((left, right) => sourcePriority(right) - sourcePriority(left))
    .slice(0, 6)
}

function isWeakCrossTopicSource(source: SourceLink, matchedEntities: string[], responseMode: ResponseMode) {
  if (responseMode === 'ecosystem') {
    if (
      source.kind === 'voice_set' &&
      !/Jahon School official about page/i.test(source.title)
    ) {
      return true
    }

    if (
      source.kind === 'youtube_curated' ||
      source.kind === 'youtube' ||
      source.kind === 'youtube_transcript' ||
      source.kind === 'longform' ||
      source.kind === 'voice_bank' ||
      source.kind === 'local_transcript'
    ) {
      return true
    }
  }

  if (matchedEntities.includes('Jahon School')) {
    if (
      source.kind === 'youtube_curated' &&
      !/Jahon School|Katta g'oyalar|Kanalimga xush kelibsiz/i.test(source.title)
    ) {
      return true
    }
  }

  if (matchedEntities.includes('Cambridge Learning Center')) {
    if (
      source.kind === 'youtube_curated' &&
      !/Jakhongir Pulatov - Tanishuv|Kanalimga xush kelibsiz|Katta g'oyalar/i.test(source.title)
    ) {
      return true
    }
  }

  if (matchedEntities.includes('Modme')) {
    if (
      source.kind === 'youtube_curated'
    ) {
      return true
    }

    if (
      (source.kind === 'voice_set' || source.kind === 'voice_bank') &&
      !/Modme|sales|funnel|CRM|LMS|operator|startup/i.test(source.title)
    ) {
      return true
    }
  }

  if (responseMode === 'business' || responseMode === 'entity') {
    if (source.kind === 'voice_set' && /Spot books interview|Osmondagi Bolalar podcast page/i.test(source.title)) {
      return true
    }
  }

  return false
}

function cleanSources(sources: SourceLink[], matchedEntities: string[], responseMode: ResponseMode) {
  return prioritizeSources(
    sources.filter((source) => !isWeakCrossTopicSource(source, matchedEntities, responseMode))
  )
}

function findMentionedEntities(text: string) {
  const haystack = normalize(text)
  return knowledge.entities.filter((entity) => {
    const terms = [entity.name, ...(entity.aliases ?? [])]
    return terms.some((term) => haystack.includes(normalize(term)))
  })
}

function isFollowUpQuery(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return false

  if (trimmed.length <= 80 && /^(what about|and |how about|chi\??$|yana|unda|xo'sh|xo`sh|demak|keyinchi|qani|admissions\??|pricing\??|tuition\??)/i.test(trimmed)) {
    return true
  }

  return /(what about|how about|and what|and how|unda-?chi|bu-?chi|yana|shu haqda|o'sha haqida|o‘sha haqida)/i.test(trimmed)
}

function inferResponseMode(query: string, matchedEntitiesCount: number): ResponseMode {
  if (/(what themes|which themes|telegram posts|telegram content|what do you post about|content themes|mavzu|mavzular|nimalar ko'p uchraydi|nimani ko'p yozasiz|postlarimda)/i.test(query)) {
    return 'theme_summary'
  }

  if (/(what businesses|what projects|your businesses|your projects|business ecosystem|project ecosystem|qanday loyihalar|qaysi loyihalar|qanday bizneslar|qaysi bizneslar|nima ishlar qilasiz|nima bizneslaringiz bor|ekotizim|ecosystem)/i.test(query)) {
    return 'ecosystem'
  }

  if (/(current|currently|latest|recent|now|hozir|ayni payt|eng so'nggi|oxirgi)/i.test(query)) {
    return 'latest'
  }

  if (matchedEntitiesCount > 0) {
    return 'entity'
  }

  if (/(how did.*start|qanday boshl|how did cambridge start|founder story|journey|hikoya|yo'l)/i.test(query)) {
    return 'founder_story'
  }

  if (/(sales|crm|conversion|funnel|kpi|lead|scale|scaling|operations|biznes|business|xato|mistake|systems|tizim)/i.test(query)) {
    return 'business'
  }

  if (/(advice|maslahat|qanday|fikr|think|view|approach|university|universitet|goal|maqsad|discipline|intizom|reading|kitob)/i.test(query)) {
    return 'advice'
  }

  return 'general'
}

function entityKeywordBoost(entity: KnowledgeEntity, query: string) {
  if (
    entity.type.includes('school') &&
    /(school|maktab|admission|admissions|apply|tuition|fee|uniform|dorm|parent|skilldev|app|apps|student app|parent app|o'quvchi|ota-ona|grades|homework|timetable)/i.test(query)
  ) {
    return 3
  }

  if (
    entity.name === 'Modme' &&
    /(crm|lms|software|platform|automation|edtech|edu ?tech|lead|report|payment|finance|demo|support|pricing|price|gamification|vacancy|sales|b2b)/i.test(query)
  ) {
    return 4
  }

  if (
    entity.name === 'Cambridge Learning Center' &&
    /(ielts|english|branch|branches|certificate|cambridge|teacher|student|learning center|app|hybrid|cashback|coin|reward|movie day|speaking club)/i.test(query)
  ) {
    return 4
  }

  if (entity.name === 'Selfmade' && /(community|entrepreneur|network|startup|youth)/i.test(query)) {
    return 3
  }

  return 0
}

function scoreEntity(query: string, entity: KnowledgeEntity) {
  const haystack = normalize(query)
  let score = entityKeywordBoost(entity, query)

  const terms = [entity.name, ...(entity.aliases ?? [])]
  for (const term of terms) {
    const needle = normalize(term)
    if (needle && haystack.includes(needle)) {
      score += needle === normalize(entity.name) ? 8 : 5
    }
  }

  const entityText = normalize(
    [
      entity.name,
      entity.type,
      entity.relation_to_jahongir,
      ...entity.facts,
      ...(entity.faq_like_details ?? []),
      ...(entity.admissions_and_operations ?? []),
    ].join(' ')
  )

  for (const token of tokenize(query)) {
    if (entityText.includes(token)) {
      score += 1
    }
  }

  return score
}

function boostFollowUpEntityScore(
  entity: KnowledgeEntity,
  currentQuery: string,
  previousUserQuery: string | null
) {
  if (!previousUserQuery) return 0
  if (!isFollowUpQuery(currentQuery)) return 0

  const previousMentions = findMentionedEntities(previousUserQuery)
  if (previousMentions.some((previous) => previous.name === entity.name)) {
    return 6
  }

  return 0
}

function scorePost(query: string, post: TelegramPost) {
  const haystack = normalize(`${post.text} ${post.themes.join(' ')} ${post.type}`)
  let score = 0

  for (const token of tokenize(query)) {
    if (haystack.includes(token)) {
      score += 1
    }
  }

  if (post.type === 'belief_or_advice' && /(advice|maslahat|discipline|intizom|result|natija|habit|book)/i.test(query)) {
    score += 2
  }

  if (/(jahon|jaxon|school|maktab)/i.test(query) && /jahon|school|maktab|skilldev/i.test(post.text)) {
    score += 4
  }
  if (/(cambridge|ielts|english)/i.test(query) && /cambridge|ielts|english/i.test(post.text)) {
    score += 4
  }
  if (/(modme|crm|lms|platform|software)/i.test(query) && /modme|crm|lms|platform|software/i.test(post.text)) {
    score += 4
  }
  if (/(selfmade|community|entrepreneur)/i.test(query) && /selfmade|entrepreneur/i.test(post.text)) {
    score += 3
  }

  return score
}

function scoreSnippet(query: string, snippet: PublicSnippet) {
  const haystack = normalize(
    `${snippet.summary} ${snippet.topics.join(' ')} ${snippet.type} ${snippet.style_signal} ${snippet.source_title}`
  )
  let score = 0

  for (const token of tokenize(query)) {
    if (haystack.includes(token)) {
      score += 2
    }
  }

  if (snippet.type === 'direct_statement' && /(advice|position|view|think|believe|maslahat|fikr|pozitsiya)/i.test(query)) {
    score += 3
  }

  if (
    snippet.type === 'aggregate_signal' &&
    /(what themes|which themes|telegram posts|telegram content|what do you post about|content themes|mavzu|mavzular|nimalar ko'p uchraydi|nimani ko'p yozasiz|postlarimda)/i.test(query)
  ) {
    score += 8
  }

  if (
    snippet.type === 'aggregate_signal' &&
    /(what businesses|what projects|your businesses|your projects|business ecosystem|project ecosystem|qanday loyihalar|qaysi loyihalar|qanday bizneslar|qaysi bizneslar|nima bizneslaringiz bor|ekotizim)/i.test(query)
  ) {
    score += 8
  }

  if (
    snippet.type === 'public_interview_signal' &&
    /(interview|podcast|episode|suhbat|webinar|books|reading|mistakes|crisis|systems|leadership|founder)/i.test(query)
  ) {
    score += 3
  }

  if (
    snippet.type === 'current_signal' &&
    /(current|currently|latest|recent|now|hozir|ayni payt|oxirgi|eng so'nggi)/i.test(query)
  ) {
    score += 6
  }

  if (/(price|pricing|cost|tariff|narx|narxlar|qancha turadi|tarif)/i.test(query) && /pricing|current|saas/.test(snippet.topics.join(' '))) {
    score += 6
  }

  if (/(demo|support|contact|contacts|telegram support|video lesson|documentation|onboarding|legal|legal entity|entrepreneur|b2b|consumer)/i.test(query) && /demo|support|operations|legal|b2b/.test(snippet.topics.join(' '))) {
    score += 6
  }

  if (/(app|apps|hybrid|cashback|coin|reward|rewards|student app|parent app|o'quvchi|ota-ona|leaderboard|grades|homework|timetable)/i.test(query) && /app|apps|hybrid_learning|cashback|student_rewards|parent_app|student_app/.test(snippet.topics.join(' '))) {
    score += 6
  }

  if (/(partner|partners|ecosystem|what makes.*different|nima bilan farq qiladi|qanday ajraladi|hamkor|hamkorlar|qadriyat|values)/i.test(query) && /partners|ecosystem|values/.test(snippet.topics.join(' '))) {
    score += 5
  }

  if (/(what businesses|what projects|your businesses|your projects|business ecosystem|project ecosystem|qanday loyihalar|qaysi loyihalar|qanday bizneslar|qaysi bizneslar|nima bizneslaringiz bor|ekotizim)/i.test(query) && /ecosystem|brand_ecosystem/.test(snippet.topics.join(' '))) {
    score += 5
  }

  if (/(book|books|reading|kitob|o'qish)/i.test(query) && /books|reading|self_development/.test(snippet.topics.join(' '))) {
    score += 4
  }

  if (/(crisis|mistake|mistakes|system|systems|xato|inqiroz|tizim)/i.test(query) && /systems|mistakes|crisis_management|business_growth/.test(snippet.topics.join(' '))) {
    score += 4
  }

  if (
    /(how would you answer|how do you think|your style|your approach|how would jahongir|qanday fikrdasiz|qanday qaraysiz)/i.test(query)
  ) {
    score += 2
  }

  return score
}

function scoreLongform(query: string, item: LongformItem) {
  const haystack = normalize(
    `${item.title} ${item.summary} ${item.topics.join(' ')} ${item.segments.join(' ')} ${item.source_type}`
  )
  let score = 0

  for (const token of tokenize(query)) {
    if (haystack.includes(token)) {
      score += 2
    }
  }

  if (/(podcast|interview|suhbat|episode|webinar|training|talk)/i.test(query)) {
    score += 2
  }

  if (/(mistake|mistakes|system|systems|crisis|team|scale|scaling|parent|vision|goal|goals|kitob|book|books)/i.test(query)) {
    score += 3
  }

  return score
}

function scoreTranscriptSnippet(query: string, item: TranscriptSnippet) {
  const haystack = normalize(`${item.title} ${item.summary} ${item.excerpt} ${item.topics.join(' ')}`)
  let score = 0

  for (const token of tokenize(query)) {
    if (haystack.includes(token)) {
      score += 2
    }
  }

  if (/(english|cambridge|teacher|teaching|network|speaker|entrepreneur)/i.test(query) && /english|cambridge|teaching|networking|entrepreneurship/.test(item.topics.join(' '))) {
    score += 4
  }

  if (/(goal|goals|planning|resource|resources|mindset|execution|maqsad|reja|resurs)/i.test(query) && /goals|planning|resources|execution|mindset/.test(item.topics.join(' '))) {
    score += 4
  }

  return score
}

function scoreVoiceBankEntry(query: string, entry: VoiceBankEntry) {
  const haystack = normalize(
    `${entry.topics.join(' ')} ${entry.voice_traits.join(' ')} ${entry.guidance} ${entry.anchor_text}`
  )
  let score = 0

  for (const token of tokenize(query)) {
    if (haystack.includes(token)) {
      score += 3
    }
  }

  if (
    /(how do you think|your view|your approach|what would you say|maslahat|fikr|qanday qaraysiz|qanday maslahat)/i.test(query)
  ) {
    score += 3
  }

  if (/(goal|goals|resource|resources|maqsad|resurs|planning|reja)/i.test(query) && /goals|planning|resources/.test(entry.topics.join(' '))) {
    score += 5
  }

  if (/(sales|lead|leads|conversion|crm|funnel)/i.test(query) && /sales|conversion|leads|crm/.test(entry.topics.join(' '))) {
    score += 5
  }

  if (/(english|cambridge|entrepreneur|network|teacher)/i.test(query) && /english|cambridge|entrepreneurship/.test(entry.topics.join(' '))) {
    score += 5
  }

  if (/(book|books|reading|kitob|o'qish)/i.test(query) && /reading|books/.test(entry.topics.join(' '))) {
    score += 5
  }

  if (/(system|systems|mistake|mistakes|xato|tizim)/i.test(query) && /systems|mistakes/.test(entry.topics.join(' '))) {
    score += 5
  }

  return score
}

function scoreVoiceSetItem(query: string, item: VoiceSetItem) {
  const haystack = normalize(
    `${item.topics.join(' ')} ${item.intent} ${item.voice_traits.join(' ')} ${item.guidance} ${item.anchor_text} ${item.source_title}`
  )
  let score = 0

  for (const token of tokenize(query)) {
    if (haystack.includes(token)) {
      score += 4
    }
  }

  if (/(how do you think|your view|your approach|what would you say|maslahat|fikr|qanday qaraysiz|qanday maslahat)/i.test(query)) {
    score += 3
  }

  if (/(what themes|which themes|telegram posts|telegram content|what do you post about|content themes|mavzu|mavzular|nimalar ko'p uchraydi|nimani ko'p yozasiz|postlarimda)/i.test(query) && /telegram|themes|content/.test(item.topics.join(' '))) {
    score += 8
  }

  if (/(what businesses|what projects|your businesses|your projects|business ecosystem|project ecosystem|qanday loyihalar|qaysi loyihalar|qanday bizneslar|qaysi bizneslar|nima bizneslaringiz bor|ekotizim)/i.test(query) && /businesses|projects|ecosystem/.test(item.topics.join(' '))) {
    score += 8
  }

  if (/(app|apps|hybrid|cashback|coin|reward|rewards|student app|parent app|o'quvchi|ota-ona|leaderboard|grades|homework|timetable)/i.test(query) && /app|apps|hybrid_learning|student_experience|ielts|parent_app|student_app/.test(item.topics.join(' '))) {
    score += 7
  }

  if (/(demo|support|contact|contacts|onboarding|sales|b2b|crm|legal|entrepreneur|consumer)/i.test(query) && /modme|b2b|demo|support|crm|sales/.test(item.topics.join(' '))) {
    score += 7
  }

  if (/(jahon school|jahon|maktab|school|parent|ota-ona|skilldev)/i.test(query) && /jahon_school|parents|life_skills/.test(item.topics.join(' '))) {
    score += 7
  }

  if (/(cambridge|how did you start|founder|boshlagansiz|qanday boshlagansiz|english|ingliz)/i.test(query) && /cambridge|founder_journey|english/.test(item.topics.join(' '))) {
    score += 7
  }

  if (/(university|universitet|student|talaba|abiturient|career)/i.test(query) && /university|career|youth/.test(item.topics.join(' '))) {
    score += 7
  }

  if (/(book|books|reading|kitob|o'qish)/i.test(query) && /reading|books/.test(item.topics.join(' '))) {
    score += 7
  }

  if (/(goal|goals|maqsad|purpose|mission|resurs|resource|planning|reja)/i.test(query) && /goals|mission|purpose|planning|resources/.test(item.topics.join(' '))) {
    score += 7
  }

  if (/(business|biznes|mistake|mistakes|xato|halal|ethics|tizim|system|sales|crm|conversion|funnel)/i.test(query) && /business_mistakes|ethics|systems|sales|crm|conversion/.test(item.topics.join(' '))) {
    score += 7
  }

  return score
}

function scoreYouTubeCuratedInsight(query: string, item: YouTubeCuratedInsight) {
  const haystack = normalize(`${item.summary} ${item.topics.join(' ')} ${item.style_signal} ${item.source_title}`)
  let score = 0

  for (const token of tokenize(query)) {
    if (haystack.includes(token)) {
      score += 3
    }
  }

  if (/(youtube|video|kanal|channel)/i.test(query)) {
    score += 2
  }

  if (/(network|networking|tanish-bilish)/i.test(query) && /networking/.test(item.topics.join(' '))) {
    score += 5
  }

  if (/(university|universitet|abiturient|student|talaba|career)/i.test(query) && /university|career|students|abiturient/.test(item.topics.join(' '))) {
    score += 5
  }

  if (/(confidence|o'ziga ishonch|productivity|samaradorlik|focus|discipline|intizom)/i.test(query) && /confidence|productivity|discipline|planning/.test(item.topics.join(' '))) {
    score += 5
  }

  if (/(cambridge|founder|origin|english|teacher|teaching)/i.test(query) && /cambridge|founder_journey|english|education/.test(item.topics.join(' '))) {
    score += 5
  }

  if (/(business|biznes|mistake|xato|halal|ethic|selfmade)/i.test(query) && /business_mistakes|halal_business|selfmade|entrepreneurship/.test(item.topics.join(' '))) {
    score += 5
  }

  return score
}

function scoreYouTubeSnippet(query: string, item: YouTubeSnippet) {
  const haystack = normalize(
    `${item.title} ${item.summary} ${item.excerpt} ${item.topics.join(' ')} ${item.segments.join(' ')}`
  )
  let score = 0

  for (const token of tokenize(query)) {
    if (haystack.includes(token)) {
      score += 2
    }
  }

  if (/(youtube|video|kanal|channel|short|shorts)/i.test(query)) {
    score += 2
  }

  if (/(network|networking|tanish-bilish)/i.test(query) && /networking/.test(item.topics.join(' '))) {
    score += 5
  }

  if (/(university|universitet|abiturient|student|talaba)/i.test(query) && /career|education/.test(item.topics.join(' '))) {
    score += 4
  }

  if (/(confidence|o'ziga ishonch|motivation|motivatsiya|samaradorlik|productivity|efficiency)/i.test(query)) {
    score += 4
  }

  if (/(business|biznes|mistake|xato|restaurant|it|team|selfmade)/i.test(query)) {
    score += 3
  }

  return score
}

function scoreYouTubeTranscriptSnippet(query: string, item: YouTubeTranscriptSnippet) {
  const haystack = normalize(`${item.title} ${item.summary} ${item.excerpt} ${item.topics.join(' ')}`)
  let score = 0

  for (const token of tokenize(query)) {
    if (haystack.includes(token)) {
      score += 3
    }
  }

  if (/(youtube|video|kanal|channel)/i.test(query)) {
    score += 2
  }

  if (/(university|universitet|abiturient|talaba|student)/i.test(query) && /career|education/.test(item.topics.join(' '))) {
    score += 5
  }

  if (/(goal|goals|maqsad|planning|discipline|intizom|motivation|samaradorlik|confidence|o'ziga ishonch)/i.test(query)) {
    score += 5
  }

  if (/(network|networking|tanish-bilish)/i.test(query) && /networking/.test(item.topics.join(' '))) {
    score += 5
  }

  const excerpt = item.excerpt
  const ratio = uniqueTokenRatio(excerpt)
  if (ratio < 0.5) {
    score -= 6
  } else if (ratio < 0.62) {
    score -= 3
  }

  if (/[ÃÅâ€]/.test(excerpt)) {
    score -= 4
  }

  return score
}

function renderEntitySection(entity: KnowledgeEntity, sources: SourceLink[]) {
  entity.sources.forEach((source) => {
    sources.push({
      title: entity.name,
      url: source,
      kind: 'entity',
    })
  })

  const lines = [
    `Entity: ${entity.name}`,
    `Type: ${entity.type}`,
    `Relation: ${entity.relation_to_jahongir}`,
    'High-signal facts:',
    ...entity.facts.slice(0, 4).map((fact) => `- ${fact}`),
  ]

  if (entity.faq_like_details?.length) {
    lines.push('FAQ-like details:')
    lines.push(...entity.faq_like_details.slice(0, 2).map((fact) => `- ${fact}`))
  }

  if (entity.admissions_and_operations?.length) {
    lines.push('Admissions and operations:')
    lines.push(...entity.admissions_and_operations.slice(0, 3).map((fact) => `- ${fact}`))
  }

  return lines.join('\n')
}

function renderTelegramSection(post: TelegramPost, sources: SourceLink[]) {
  const excerpt = post.text.length > 220 ? `${post.text.slice(0, 220)}...` : post.text
  sources.push({
    title: `Telegram post #${post.post_id}`,
    url: post.url,
    kind: 'telegram_post',
  })

  return [
    `Relevant Telegram post: #${post.post_id}`,
    `Date: ${post.datetime}`,
    `Type: ${post.type}`,
    `Themes: ${post.themes.join(', ') || 'none listed'}`,
    `Excerpt: ${excerpt}`,
    `Source: ${post.url}`,
  ].join('\n')
}

function renderSnippetSection(snippet: PublicSnippet, sources: SourceLink[]) {
  sources.push({
    title: snippet.source_title,
    url: snippet.source_url,
    kind: 'public_snippet',
  })

  return [
    `Public snippet type: ${snippet.type}`,
    `Topics: ${snippet.topics.join(', ')}`,
    `Summary: ${snippet.summary}`,
    `Style signal: ${snippet.style_signal}`,
    `Source: ${snippet.source_url}`,
  ].join('\n')
}

function renderLongformSection(item: LongformItem, sources: SourceLink[]) {
  sources.push({
    title: item.title,
    url: item.source_url,
    kind: 'longform',
  })

  return [
    `Longform source: ${item.title}`,
    `Type: ${item.source_type}`,
    `Topics: ${item.topics.join(', ')}`,
    `Summary: ${item.summary}`,
    'Relevant segments:',
    ...item.segments.slice(0, 3).map((segment) => `- ${segment}`),
    `Source: ${item.source_url}`,
  ].join('\n')
}

function renderTranscriptSection(item: TranscriptSnippet, sources: SourceLink[]) {
  const excerpt = item.excerpt.length > 220 ? `${item.excerpt.slice(0, 220)}...` : item.excerpt
  sources.push({
    title: item.title,
    url: item.source_file,
    kind: 'local_transcript',
  })

  return [
    `Local transcript source: ${item.title}`,
    `Topics: ${item.topics.join(', ')}`,
    `Summary: ${item.summary}`,
    `Excerpt: ${excerpt}`,
    `Source file: ${item.source_file}`,
  ].join('\n')
}

function renderVoiceBankSection(entry: VoiceBankEntry, sources: SourceLink[]) {
  const anchorText =
    entry.anchor_text.length > 220 ? `${entry.anchor_text.slice(0, 220)}...` : entry.anchor_text
  sources.push({
    title: entry.source_title,
    url: entry.source_url,
    kind: 'voice_bank',
  })

  return [
    `Voice bank entry: ${entry.id}`,
    `Topics: ${entry.topics.join(', ')}`,
    `Voice traits: ${entry.voice_traits.join(', ')}`,
    `Guidance: ${entry.guidance}`,
    `Anchor text: ${anchorText}`,
    `Source: ${entry.source_url}`,
  ].join('\n')
}

function renderVoiceSetSection(item: VoiceSetItem, sources: SourceLink[]) {
  const anchorText =
    item.anchor_text.length > 220 ? `${item.anchor_text.slice(0, 220)}...` : item.anchor_text
  sources.push({
    title: item.source_title,
    url: item.source_url,
    kind: 'voice_set',
  })

  return [
    `High-priority voice set: ${item.id}`,
    `Intent: ${item.intent}`,
    `Topics: ${item.topics.join(', ')}`,
    `Voice traits: ${item.voice_traits.join(', ')}`,
    `Guidance: ${item.guidance}`,
    `Anchor text: ${anchorText}`,
    `Source: ${item.source_url}`,
  ].join('\n')
}

function renderYouTubeSection(item: YouTubeSnippet, sources: SourceLink[]) {
  const excerpt = item.excerpt.length > 220 ? `${item.excerpt.slice(0, 220)}...` : item.excerpt
  sources.push({
    title: item.title,
    url: item.source_url,
    kind: 'youtube',
  })

  return [
    `YouTube source: ${item.title}`,
    `Type: ${item.source_type}`,
    `Topics: ${item.topics.join(', ')}`,
    `Summary: ${item.summary}`,
    `Excerpt: ${excerpt}`,
    'Relevant segments:',
    ...item.segments.slice(0, 2).map((segment) => `- ${segment}`),
    `Source: ${item.source_url}`,
  ].join('\n')
}

function renderYouTubeCuratedSection(item: YouTubeCuratedInsight, sources: SourceLink[]) {
  sources.push({
    title: item.source_title,
    url: item.source_url,
    kind: 'youtube_curated',
  })

  return [
    `Curated YouTube insight: ${item.source_title}`,
    `Topics: ${item.topics.join(', ')}`,
    `Summary: ${item.summary}`,
    `Style signal: ${item.style_signal}`,
    `Source: ${item.source_url}`,
  ].join('\n')
}

function renderYouTubeTranscriptSection(item: YouTubeTranscriptSnippet, sources: SourceLink[]) {
  const excerpt = item.excerpt.length > 220 ? `${item.excerpt.slice(0, 220)}...` : item.excerpt
  sources.push({
    title: item.title,
    url: item.source_url,
    kind: 'youtube_transcript',
  })

  return [
    `YouTube transcript source: ${item.title}`,
    `Type: ${item.source_type}`,
    `Topics: ${item.topics.join(', ')}`,
    `Summary: ${item.summary}`,
    `Excerpt: ${excerpt}`,
    `Source file: ${item.source_file}`,
    `Source: ${item.source_url}`,
  ].join('\n')
}

export function buildKnowledgeContext(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const recentMessages = messages.slice(-4)
  const recentUserMessages = recentMessages.filter((message) => message.role === 'user')
  const currentQuery = recentUserMessages.at(-1)?.content ?? ''
  const previousUserQuery = recentUserMessages.length > 1 ? recentUserMessages.at(-2)?.content ?? null : null
  const query = recentUserMessages.slice(-2).map((message) => message.content).join('\n')
  const isFollowUp = isFollowUpQuery(currentQuery)

  const rankedEntities = knowledge.entities
    .map((entity) => ({
      entity,
      score:
        scoreEntity(query, entity) +
        boostFollowUpEntityScore(entity, currentQuery, previousUserQuery),
    }))
    .filter((item) => item.score >= 4)
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)

  const rankedPosts = telegram.posts
    .map((post) => ({ post, score: scorePost(query, post) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)

  const rankedSnippets = publicSnippets.snippets
    .map((snippet) => ({ snippet, score: scoreSnippet(query, snippet) }))
    .filter((item) => item.score >= 4)
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)

  const rankedLongform = longform.items
    .map((item) => ({ item, score: scoreLongform(query, item) }))
    .filter((entry) => entry.score >= 4)
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)

  const rankedTranscriptSnippets = transcriptSnippets.items
    .map((item) => ({ item, score: scoreTranscriptSnippet(query, item) }))
    .filter((entry) => entry.score >= 4)
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)

  const rankedVoiceBank = voiceBank.entries
    .map((entry) => ({ entry, score: scoreVoiceBankEntry(query, entry) }))
    .filter((item) => item.score >= 5)
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)

  const rankedVoiceSet = voiceSet.items
    .map((item) => ({ item, score: scoreVoiceSetItem(query, item) }))
    .filter((entry) => entry.score >= 6)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)

  const rankedYouTubeCurated = youtubeCuratedInsights.items
    .map((item) => ({ item, score: scoreYouTubeCuratedInsight(query, item) }))
    .filter((entry) => entry.score >= 5)
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)

  const rankedYouTube = youtubeSnippets.items
    .map((item) => ({ item, score: scoreYouTubeSnippet(query, item) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)

  const rankedYouTubeTranscripts = youtubeTranscriptSnippets.items
    .map((item) => ({ item, score: scoreYouTubeTranscriptSnippet(query, item) }))
    .filter((entry) => entry.score >= 6)
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)

  const sources: SourceLink[] = []
  const sections: string[] = []
  const includeYouTubeOutline = /(youtube|video|kanal|channel|short|shorts)/i.test(query)
  const styleSignals = [
    ...rankedVoiceSet.flatMap(({ item }) => item.voice_traits),
    ...rankedVoiceBank.flatMap(({ entry }) => entry.voice_traits),
    ...rankedSnippets.map(({ snippet }) => snippet.style_signal),
    ...rankedYouTubeCurated.map(({ item }) => item.style_signal),
  ].filter(Boolean).slice(0, 5)

  if (rankedEntities.length > 0) {
    sections.push(
      [
        'Selected organization context:',
        ...rankedEntities.map(({ entity }) => renderEntitySection(entity, sources)),
      ].join('\n\n')
    )
  }

  if (rankedVoiceSet.length > 0) {
    sections.push(
      [
        'Selected high-priority Jahongir voice set:',
        ...rankedVoiceSet.map(({ item }) => renderVoiceSetSection(item, sources)),
      ].join('\n\n')
    )
  }

  if (rankedVoiceBank.length > 0) {
    sections.push(
      [
        'Selected Jahongir voice bank guidance:',
        ...rankedVoiceBank.map(({ entry }) => renderVoiceBankSection(entry, sources)),
      ].join('\n\n')
    )
  }

  if (rankedSnippets.length > 0) {
    sections.push(
      [
        'Selected public snippets and voice cues:',
        ...rankedSnippets.map(({ snippet }) => renderSnippetSection(snippet, sources)),
      ].join('\n\n')
    )
  }

  if (rankedLongform.length > 0) {
    sections.push(
      [
        'Selected longform interview and podcast cues:',
        ...rankedLongform.map(({ item }) => renderLongformSection(item, sources)),
      ].join('\n\n')
    )
  }

  if (rankedYouTubeCurated.length > 0) {
    sections.push(
      [
        'Selected curated YouTube insights:',
        ...rankedYouTubeCurated.map(({ item }) => renderYouTubeCuratedSection(item, sources)),
      ].join('\n\n')
    )
  }

  if (includeYouTubeOutline && rankedYouTube.length > 0) {
    sections.push(
      [
        'Selected YouTube channel context:',
        ...rankedYouTube.map(({ item }) => renderYouTubeSection(item, sources)),
      ].join('\n\n')
    )
  }

  if (rankedYouTubeTranscripts.length > 0) {
    sections.push(
      [
        'Selected YouTube transcript context:',
        ...rankedYouTubeTranscripts.map(({ item }) => renderYouTubeTranscriptSection(item, sources)),
      ].join('\n\n')
    )
  }

  if (rankedTranscriptSnippets.length > 0) {
    sections.push(
      [
        'Selected local transcript evidence:',
        ...rankedTranscriptSnippets.map(({ item }) => renderTranscriptSection(item, sources)),
      ].join('\n\n')
    )
  }

  if (rankedPosts.length > 0) {
    sections.push(
      [
        'Selected Telegram context:',
        ...rankedPosts.map(({ post }) => renderTelegramSection(post, sources)),
      ].join('\n\n')
    )
  }

  if (sections.length === 0) {
    sections.push(
      `No specific match was strong. Available business entities in the knowledge base: ${knowledge.entities
        .map((entity) => entity.name)
        .join(', ')}.`
    )
  }

  if (styleSignals.length > 0) {
    sections.push(`Preferred answer style cues for this question: ${styleSignals.join('; ')}.`)
  }

  const responseMode = inferResponseMode(currentQuery || query, rankedEntities.length)

  return {
    context: sections.join('\n\n'),
    matchedEntities: rankedEntities.map(({ entity }) => entity.name),
    styleSignals,
    responseMode,
    isFollowUp,
    sources: cleanSources(sources, rankedEntities.map(({ entity }) => entity.name), responseMode),
  }
}
