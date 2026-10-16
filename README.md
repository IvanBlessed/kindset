# Kindset

**Play padel. Do good.** A Telegram Mini App for community padel nights: weekly Mexicano events, live scoring, season rankings, weekly awards and charity totals. Starts with the Alanya chapter and is built to add more cities.

Built on the official [Telegram Mini Apps React template](https://github.com/Telegram-Mini-Apps/reactjs-template) (MIT): React, TypeScript, Vite, `@tma.js/sdk-react`, Telegram UI.

## What's in it

| Screen | Does |
| --- | --- |
| Events | Next padel night, 16 spots, waitlist, join / cancel |
| Live | Mexicano rounds on 2 courts, score entry to 21, tonight's table |
| Ranking | Charity raised, last week's awards, Spirit-of-the-game vote, season table (top 8 to finals) |
| Me | Telegram profile, tonight's stats, organizer mode, reset |

Languages: Russian, Turkish, English (auto-detected from Telegram).

## Run locally

```bash
npm install
npm run dev      # open the printed URL; outside Telegram the app runs in preview mode
npm test         # Mexicano engine tests
npm run build
```

## How data flows

Inside Telegram the app talks only to `/api` (a Netlify function, `netlify/functions/api.mts`). The function checks Telegram's signed login with the bot token, then reads and writes Supabase with the secret key. The secret key and bot token never reach the browser. In a normal browser the app runs in **preview mode** with example players saved on that device.

The first person to open the app becomes the chapter organizer. Add more organizers with `ORGANIZER_TELEGRAM_IDS`.

### Netlify environment variables

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project-id>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase → Settings → API Keys → Secret key (`sb_secret_…`) |
| `TELEGRAM_BOT_TOKEN` | from @BotFather |
| `ORGANIZER_TELEGRAM_IDS` | optional, comma-separated Telegram user ids |

## Deploy

Netlify builds from this repo using `netlify.toml` (build `npm run build`, publish `dist`). Every push to `main` redeploys.

Then in Telegram, **@BotFather** → `/newapp` → choose the bot → paste the Netlify URL.

## Project layout

```
src/lib/mexicano.ts     pairing engine (tested in mexicano.test.ts)
src/lib/i18n.ts         RU / TR / EN texts
src/data/config.ts      chapter settings (city, price, courts, next event)
src/data/store.ts       app state (local now, Supabase next)
src/pages/              Events, Live, Ranking, Me
src/brand/Logo.tsx      Kindset mark
supabase/schema.sql     database for the shared version (step 2)
```

## Roadmap

1. ✓ Shared data with Supabase: registrations, scores and rankings sync across phones; server checks Telegram login.
2. Bot messages: reminders, round pairings and results posted in the group.
3. Payments (iyzico / PayTR), sponsor slots, more chapters.

Sample players in `src/data/sample.ts` are example data and will be replaced by real registrations.
