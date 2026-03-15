export type Language = 'en' | 'uz'

export const UI_TEXT = {
  en: {
    title: 'Ask Jahongir',
    subtitle: "Ask by text or voice about Jahongir, Cambridge, Jahon School, Modme, or business lessons.",
    placeholder: 'Ask a direct question...',
    thinking: 'Thinking...',
    disclaimer: 'Answers are based on public Telegram posts and public web sources.',
    voiceDisclaimer: "Voice replies are AI-generated and styled for the experience. They are not verified original recordings of Jahongir Pulatov.",
    builtBy: 'Built for Jahongir clone',
    newChat: 'New chat',
    send: 'Send',
    moreSuggestions: 'More suggestions',
    startVoice: 'Start voice question',
    stopVoice: 'Stop recording',
    transcribing: 'Transcribing voice...',
    voiceOn: 'Voice on',
    voiceOff: 'Voice off',
    pauseVoice: 'Pause voice',
    resumeVoice: 'Resume voice',
    speaking: 'Speaking...',
    listening: 'Listening...',
    askByText: 'Type or tap the mic',
    examplePrompt: 'Examples people ask most',
    suggestedFollowUps: 'Suggested follow-ups',
    quickTopics: 'Popular topics',
    listen: 'Listen',
    copy: 'Copy',
    copied: 'Copied',
    askFollowUp: 'Ask follow-up',
    helpful: 'Helpful',
    notAccurate: 'Not accurate',
    tooGeneric: 'Too generic',
    feedbackSaved: 'Feedback saved',
    showAllSources: 'Show all',
    showLessSources: 'Show less',
    officialSource: 'Official site',
    telegramSource: 'Telegram',
    youtubeSource: 'YouTube',
    interviewSource: 'Interview',
    publicSource: 'Public source',
    inputHint: 'Press Enter to send. Shift+Enter for a new line.',
  },
  uz: {
    title: "Jahongirdan so'rang",
    subtitle: "Jahongir, Cambridge, Jahon School, Modme yoki biznes saboqlari haqida matn yoki ovoz orqali so'rang.",
    placeholder: "Savolingizni aniq yozing...",
    thinking: 'Yozmoqda...',
    disclaimer: "Javoblar ochiq Telegram postlari va ommaviy manbalarga tayangan.",
    voiceDisclaimer: "Ovozli javoblar AI tomonidan yaratiladi. Bu Jahongir Pulatovning tasdiqlangan original yozuvi emas.",
    builtBy: 'Jahongir clone uchun qurildi',
    newChat: 'Yangi chat',
    send: 'Yuborish',
    moreSuggestions: 'Yana savollar',
    startVoice: "Ovozli savolni boshlash",
    stopVoice: "Yozishni to'xtatish",
    transcribing: "Ovozni matnga o'tkazmoqda...",
    voiceOn: 'Ovoz yoqilgan',
    voiceOff: "Ovoz o'chirilgan",
    pauseVoice: 'Ovozni pauza qilish',
    resumeVoice: 'Ovozni davom ettirish',
    speaking: 'Gapirmoqda...',
    listening: 'Tinglamoqda...',
    askByText: 'Matn yozing yoki mikrofonga bosing',
    examplePrompt: "Ko'p beriladigan savollar",
    suggestedFollowUps: 'Keyingi savollar',
    quickTopics: 'Mashhur mavzular',
    listen: 'Tinglash',
    copy: 'Nusxalash',
    copied: 'Nusxalandi',
    askFollowUp: 'Davomini so‘rash',
    helpful: 'Foydali',
    notAccurate: 'Aniq emas',
    tooGeneric: 'Juda umumiy',
    feedbackSaved: 'Fikr saqlandi',
    showAllSources: "Hammasini ko'rsatish",
    showLessSources: 'Kamroq ko‘rsatish',
    officialSource: 'Rasmiy sayt',
    telegramSource: 'Telegram',
    youtubeSource: 'YouTube',
    interviewSource: 'Intervyu',
    publicSource: 'Ochiq manba',
    inputHint: "Yuborish uchun Enter bosing. Yangi qator uchun Shift+Enter.",
  },
} as const

export const QUICK_TOPICS = {
  en: ['Cambridge', 'Jahon School', 'Modme', 'Business advice', 'University', 'Books'],
  uz: ['Cambridge', 'Jahon School', 'Modme', 'Biznes maslahat', 'Universitet', 'Kitoblar'],
} as const

const QUESTIONS = {
  en: [
    "What is Jahongir's approach to education quality?",
    'What would Jahongir advise a young founder in Uzbekistan?',
    'How do I think about discipline and results?',
    'What can students learn from my public journey?',
    'How do I balance growth and quality?',
    'What themes show up most in my Telegram posts?',
  ],
  uz: [
    "Ta'lim sifati haqida qanday fikrdaman?",
    "O'zbekistondagi yosh founderga nima maslahat beraman?",
    'Intizom va natijaga qanday qarayman?',
    "Talabalar mening ochiq yo'limdan qanday saboq olishi mumkin?",
    "O'sish va sifat o'rtasidagi muvozanatni qanday ko'raman?",
    "Telegram postlarimda eng ko'p qaysi mavzular uchraydi?",
  ],
} as const

export function getRandomQuestions(lang: Language, count: number) {
  const items = [...QUESTIONS[lang]]
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[swapIndex]] = [items[swapIndex], items[index]]
  }
  return items.slice(0, count)
}
