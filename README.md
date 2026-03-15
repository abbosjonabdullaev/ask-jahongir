# Ask Jahongir

A Next.js 14 app for chatting with a public-data-grounded Jahongir Pulatov AI clone. The app supports text chat, voice input, ElevenLabs voice playback, source links, and internal answer review tooling.

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- OpenAI for chat and transcription
- ElevenLabs for custom voice playback

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Add environment variables in `.env.local`:
```env
OPENAI_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
```

3. Run the app:
```bash
npm run dev
```

4. Open `http://localhost:3000`

## Useful Scripts

- `npm run dev`
- `npm run dev:detached`
- `npm run dev:stop`
- `npm run build`
- `npm run netlify:status`
- `npm run deploy:netlify:preview`
- `npm run deploy:netlify`
- `npm run repo:publish`
- `npm run site:deploy`

## GitHub Setup

This project currently sits inside an unrelated outer git repo on this machine, so use a standalone git repo inside this folder:

```bash
gh auth login
powershell -ExecutionPolicy Bypass -File scripts/publish-github.ps1 -RepoName ask-jahongir -Visibility private -GitUserName "Your Name" -GitUserEmail "you@example.com"
```

The publish script refuses to use placeholder git identity values such as `you@example.com`, which is important on shared or borrowed laptops.

## Netlify Setup

The project includes [`netlify.toml`](./netlify.toml) and the Netlify Next.js runtime plugin.

1. Log in to Netlify:
```bash
npm run netlify:login
```

2. Create a preview deploy:
```bash
npm run deploy:netlify:preview
```

3. Create a production deploy:
```bash
powershell -ExecutionPolicy Bypass -File scripts/deploy-netlify.ps1 -SiteName ask-jahongir-demo -Production
```

Add the required environment variables in the Netlify dashboard before production use.
