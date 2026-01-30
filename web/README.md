# The AI Brief

This is the web companion to the iOS app. It lives in `web/` and can be deployed to Vercel.

## Local dev

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the app:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000

## Environment variables

Set `OPENAI_API_KEY` in Vercel or your local `.env.local` if you do not want to paste a key in the UI.

## Webpage scraping

For newsletter or website sources without RSS, enable "Webpage Scrape" on the source. The app will
attempt to extract recent links from the page. Some sites may block scraping or provide minimal data.

## Deploy to Vercel

- Import the repo in Vercel.
- Set the project root to `web`.
- Add `OPENAI_API_KEY` in Environment Variables.
