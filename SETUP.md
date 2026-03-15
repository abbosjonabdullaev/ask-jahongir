# Setup Guide for Banana Headshots 🍌

## Prerequisites

Before you can run this project, you need to install Node.js and npm:

### Installing Node.js

1. **Download Node.js** from [https://nodejs.org/](https://nodejs.org/)
   - Choose the LTS (Long Term Support) version
   - Download the Windows installer (.msi)

2. **Install Node.js**
   - Run the downloaded installer
   - Follow the installation wizard
   - Make sure to check "Add to PATH" during installation

3. **Verify Installation**
   - Open a new terminal/PowerShell window
   - Run: `node --version`
   - Run: `npm --version`
   - Both should show version numbers

## Project Setup

Once Node.js is installed, follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
# Copy the example environment file
cp env.example .env.local

# Edit .env.local with your actual values
notepad .env.local
```

### 3. Configure Stripe (Required for payments)
1. Go to [https://stripe.com](https://stripe.com) and create an account
2. Get your API keys from the Stripe Dashboard
3. Update `.env.local` with your keys:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_actual_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### 4. Run the Development Server
```bash
npm run dev
```

### 5. Open Your Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## Testing the App

### Test Payment Flow
1. Upload a selfie image
2. Wait for AI headshots to generate (mock data)
3. Click "Pay $5 & Download All"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete payment to see success page

### Test Cards for Stripe
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Expiry**: 4000 0000 0000 0069

## Troubleshooting

### Common Issues

**"npm is not recognized"**
- Node.js not installed or not in PATH
- Restart terminal after installation

**"Module not found" errors**
- Run `npm install` to install dependencies
- Check that all files are in correct locations

**Stripe errors**
- Verify API keys in `.env.local`
- Check Stripe dashboard for any account issues
- Ensure you're using test keys for development

**Port already in use**
- Change port: `npm run dev -- -p 3001`
- Or kill process using port 3000

**ElevenLabs CLI login fails in this shell**
- The ElevenLabs CLI uses an interactive TTY UI for `auth login`
- In wrapped shells like Codex execution, raw terminal input is not available
- Run the login command in a normal PowerShell or Command Prompt window:
  ```powershell
  cd "C:\Users\kamol\OneDrive\Рабочий стол\vibe coding\bananaheadshots"
  npm.cmd run voice:login
  ```

## ElevenLabs Voice Setup

The ElevenLabs CLI is installed and the project was initialized with:
- `agents.json`
- `tools.json`
- `tests.json`

Useful commands:
```powershell
npm.cmd run voice:cli
npm.cmd run voice:init
npm.cmd run voice:login
```

To use a real custom voice in the app:
1. Get your ElevenLabs API key from the ElevenLabs dashboard
2. Add it to `.env.local`:
   ```env
   ELEVENLABS_API_KEY=your_key_here
   ```
3. Open the app admin page:
   - `http://localhost:3000/admin/voice`
4. Upload approved Jahongir voice samples and create the voice
5. Save the returned voice ID in `.env.local`:
   ```env
   ELEVENLABS_VOICE_ID=your_voice_id_here
   ```
6. Restart the dev server

## Next Steps

1. **Customize the UI**: Modify `tailwind.config.js` and components
2. **Add Real API**: Replace mock data in `lib/headshotGenerator.ts`
3. **Deploy**: Push to GitHub and deploy on Vercel
4. **Add Features**: User accounts, image storage, analytics

## Support

If you encounter issues:
1. Check this setup guide
2. Review the README.md
3. Check console errors in browser
4. Verify all environment variables are set

---

Happy coding! 🚀 
