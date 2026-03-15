# Changelog

## 2026-03-15

### Product
- Turned the project into a public `Ask Jahongir` web app with grounded chat, source links, first-person founder-style responses, and mobile-friendly UI.
- Added voice input, optional spoken answers, pause/resume playback, and custom ElevenLabs voice support with an admin voice page.
- Added review logging and an admin review screen for inspecting weak answers and their sources.

### Knowledge
- Built layered retrieval across:
  - official business pages
  - Telegram posts
  - curated public snippets
  - longform interviews and podcast summaries
  - local transcript snippets
  - YouTube transcript snippets
  - a curated Jahongir voice set
- Expanded public business coverage for Cambridge Learning Center, Jahon School, Modme, Selfmade, Cambridge Kidzzz, Get Coffee, and Hope.
- Added official signals for:
  - Jahon School partner ecosystem and values
  - Cambridge Students app, cashback, reward system, and hybrid-learning model
  - Modme pricing, demo/support flow, gamification, and B2B sales positioning
- Added aggregate answer support for:
  - recurring Telegram themes
  - ecosystem / project-overview questions

### Infra
- Added provider-selectable chat generation with Gemini-ready support while keeping OpenAI fallback.
- Switched production to cheaper `gpt-4o-mini` fallback for chat.
- Kept OpenAI transcription and ElevenLabs voice support active.
- Deployed to Netlify at `https://askjahongirpulatov.netlify.app`.

### Repo
- Published the repo at `https://github.com/abbosjonabdullaev/ask-jahongir`.
- Refreshed `README.md` for public visitors.
- Added this changelog and knowledge-source documentation.
