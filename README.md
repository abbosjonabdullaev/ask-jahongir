# Ask Jahongir

[![Live Demo](https://img.shields.io/badge/live-askjahongirpulatov.netlify.app-0a7f5a?style=for-the-badge)](https://askjahongirpulatov.netlify.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-111111?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Gemini](https://img.shields.io/badge/Gemini-cheaper%20chat-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![OpenAI](https://img.shields.io/badge/OpenAI-transcription%20%2B%20fallback-412991?style=for-the-badge&logo=openai)](https://platform.openai.com/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-custom%20voice-1a1a1a?style=for-the-badge)](https://elevenlabs.io/)

Jahongir Pulatov AI clone built with Next.js, grounded in public-source data from official business pages, Telegram posts, public interviews, and curated transcript snippets.

## Live

- Demo: <https://askjahongirpulatov.netlify.app>
- GitHub: <https://github.com/abbosjonabdullaev/ask-jahongir>
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)
- Knowledge sources: [`docs/knowledge-sources.md`](./docs/knowledge-sources.md)

## What It Does

- answers in a first-person Jahongir-style voice
- supports text chat and voice input
- can speak responses with a custom ElevenLabs voice
- retrieves business context for `Jahon School`, `Cambridge Learning Center`, `Modme`, and related topics
- shows source links for grounded answers
- includes internal admin pages for answer review and voice management

## Knowledge Base

The app uses layered retrieval rather than a single prompt dump.

- entity and business facts from official sites
- Telegram-derived topic and statement data
- curated public snippets from interviews and articles
- longform interview summaries
- local and YouTube-derived transcript snippets
- a higher-priority voice set for style anchoring

Main knowledge files live in [`data/`](./data).

## Project Structure

- `app/`
  - Next.js App Router pages and API routes
- `components/`
  - chat UI, message actions, voice controls, avatar, suggestions
- `data/`
  - grounded knowledge layers and curated source files
- `lib/`
  - retrieval, persona, provider, review, and utility logic
- `docs/`
  - project and source documentation
- `scripts/`
  - deployment and data-ingestion helpers

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Gemini or OpenAI for chat generation
- OpenAI for transcription and fallback
- ElevenLabs for custom voice playback
- Vercel or Netlify for deployment

## Cost Defaults

The app is configured to favor cheaper grounded answers by default:

- if `GEMINI_API_KEY` exists, chat auto-prefers `gemini-2.5-flash-lite`
- otherwise chat falls back to `gpt-4o-mini`
- `JAHONGIR_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe`
- reduced prompt size and fewer retrieved context blocks
- capped answer length with `JAHONGIR_REPLY_MAX_TOKENS=420`

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env.local`

```env
JAHONGIR_CHAT_PROVIDER=
OPENAI_API_KEY=...
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Run the app

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Useful Scripts

```bash
npm run dev
npm run dev:detached
npm run dev:stop
npm run build
npm run vercel:login
npm run vercel:link
npm run deploy:vercel
npm run netlify:status
npm run deploy:netlify:preview
npm run deploy:netlify
```

## Deployment

### GitHub

The repo can be published safely from a shared laptop with the helper script below:

```bash
powershell -ExecutionPolicy Bypass -File scripts/publish-github.ps1 -RepoName ask-jahongir -Visibility public -GitUserName "Your Name" -GitUserEmail "you@example.com"
```

### Vercel

This project includes [`vercel.json`](./vercel.json) with higher function durations for the AI and voice routes.

```bash
npm run vercel:login
npm run vercel:link
npm run deploy:vercel
```

Before the first production deploy, add the same env vars from `.env.local` to the Vercel project:

- `JAHONGIR_CHAT_PROVIDER`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `JAHONGIR_TRANSCRIBE_MODEL`
- `JAHONGIR_REPLY_MAX_TOKENS`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_MODEL_ID`
- `ELEVENLABS_STABILITY`
- `ELEVENLABS_SIMILARITY_BOOST`
- `ELEVENLABS_STYLE`
- `ELEVENLABS_SPEAKER_BOOST`
- `NEXT_PUBLIC_APP_URL`

### Netlify

This project includes [`netlify.toml`](./netlify.toml) and the Netlify Next.js runtime plugin.

```bash
npm run netlify:login
powershell -ExecutionPolicy Bypass -File scripts/deploy-netlify.ps1 -SiteName askjahongirpulatov -Production
```

## Notes

- The app is grounded in public data, not private information.
- Voice cloning should only be done with approved audio.
- If the active chat provider key is missing or invalid, the app can still answer through its local grounded fallback path, but responses will be less natural than live model output.
- Public-source details can change over time, so the knowledge base should be refreshed periodically.
