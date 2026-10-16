/**
 * Runs every hour (Netlify scheduled function). About 3 hours before a padel
 * night it posts a reminder in the connected group and messages each signed-up
 * player in their language. Each night is reminded once (events.reminded_at).
 */
import { CHAPTER_SLUG, chapterChat, db, env } from '../lib/db';
import { T, appLink, appUrl, fmtTime, langOf, reminderPost, tg } from '../lib/telegram';

export default async () => {
  const { token } = env();
  const client = db();
  if (!token || !client) return;

  // Look ahead 16 hours; each game has its own reminder moment:
  // games before noon get it at 20:00 the evening before, later games 3 hours before.
  const now = Date.now();
  const horizon = new Date(now + 16 * 3600_000).toISOString();

  const { data: chapter } = await client.from('chapters').select('id, currency').eq('slug', CHAPTER_SLUG).single();
  if (!chapter) return;
  const { data: found, error } = await client.from('events')
    .select('id, starts_at, venue, price, capacity, reminded_at')
    .eq('chapter_id', chapter.id).eq('status', 'open').is('reminded_at', null)
    .gt('starts_at', new Date(now).toISOString()).lte('starts_at', horizon);
  if (error) { console.error('reminder', error.message); return; }
  const events = (found ?? []).filter((ev) => now >= reminderAt(ev.starts_at));

  const link = await appLink(token);
  const cur = chapter.currency === 'TRY' ? '₺' : chapter.currency;
  for (const ev of events ?? []) {
    // Claim the reminder first so a retry never double-sends.
    const { data: claimed } = await client.from('events').update({ reminded_at: new Date().toISOString() })
      .eq('id', ev.id).is('reminded_at', null).select('id');
    if (!claimed?.length) continue;

    const { data: regs } = await client.from('registrations').select('player_id, created_at, players(telegram_id, langs)')
      .eq('event_id', ev.id).order('created_at');
    const list = regs ?? [];
    const time = fmtTime(ev.starts_at);
    const tomorrow = trDay(ev.starts_at) !== trDay(new Date(now).toISOString());
    const price = `${Number(ev.price)} ${cur}`;

    const chat = await chapterChat(client, chapter.id);
    if (chat) {
      await tg(token, 'sendMessage', {
        chat_id: chat, parse_mode: 'HTML', text: reminderPost(time, ev.venue ?? '', price, Math.min(list.length, ev.capacity), ev.capacity, tomorrow),
        reply_markup: { inline_keyboard: [[{ text: '🎾 Kindset', url: link }]] },
      });
    }

    for (const [i, r] of list.entries()) {
      const p = (Array.isArray(r.players) ? r.players[0] : r.players) as { telegram_id: number; langs: string[] } | null;
      if (!p?.telegram_id) continue;
      const l = langOf(p.langs?.[0]);
      // Fails quietly for players who never allowed messages from the bot.
      await tg(token, 'sendMessage', {
        chat_id: p.telegram_id, parse_mode: 'HTML', text: T[l].dmReminder(time, ev.venue ?? '', i + 1, ev.capacity, tomorrow),
        reply_markup: { inline_keyboard: [[{ text: T[l].open, web_app: { url: appUrl() } }]] },
      });
    }
    console.log('reminded', ev.id, 'players', list.length, 'group', !!chat);
  }
};

/** Calendar day in Turkey (UTC+3). */
const trDay = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 10);

/** When to remind: 20:00 the evening before for morning games, otherwise 3 hours before. */
export function reminderAt(startsAt: string): number {
  const start = new Date(startsAt).getTime();
  const hourTR = new Date(start + 3 * 3600_000).getUTCHours();
  if (hourTR < 12) {
    const eve = new Date(`${trDay(startsAt)}T20:00:00+03:00`).getTime() - 24 * 3600_000;
    return eve;
  }
  return start - 3 * 3600_000;
}

export const config = { schedule: '0 * * * *' };
