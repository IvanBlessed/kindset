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

  const now = Date.now();
  const from = new Date(now + 2 * 3600_000).toISOString();
  const to = new Date(now + 3 * 3600_000 + 5 * 60_000).toISOString();

  const { data: chapter } = await client.from('chapters').select('id, currency').eq('slug', CHAPTER_SLUG).single();
  if (!chapter) return;
  const { data: events, error } = await client.from('events')
    .select('id, starts_at, venue, price, capacity, reminded_at')
    .eq('chapter_id', chapter.id).eq('status', 'open').is('reminded_at', null)
    .gte('starts_at', from).lte('starts_at', to);
  if (error) { console.error('reminder', error.message); return; }

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
    const price = `${Number(ev.price)} ${cur}`;

    const chat = await chapterChat(client, chapter.id);
    if (chat) {
      await tg(token, 'sendMessage', {
        chat_id: chat, parse_mode: 'HTML', text: reminderPost(time, ev.venue ?? '', price, Math.min(list.length, ev.capacity), ev.capacity),
        reply_markup: { inline_keyboard: [[{ text: '🎾 Kindset', url: link }]] },
      });
    }

    for (const [i, r] of list.entries()) {
      const p = (Array.isArray(r.players) ? r.players[0] : r.players) as { telegram_id: number; langs: string[] } | null;
      if (!p?.telegram_id) continue;
      const l = langOf(p.langs?.[0]);
      // Fails quietly for players who never allowed messages from the bot.
      await tg(token, 'sendMessage', {
        chat_id: p.telegram_id, parse_mode: 'HTML', text: T[l].dmReminder(time, ev.venue ?? '', i + 1, ev.capacity),
        reply_markup: { inline_keyboard: [[{ text: T[l].open, web_app: { url: appUrl() } }]] },
      });
    }
    console.log('reminded', ev.id, 'players', list.length, 'group', !!chat);
  }
};

export const config = { schedule: '0 * * * *' };
