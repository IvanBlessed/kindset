/**
 * Telegram webhook for @kindset bot.
 *   /start  — welcome in the player's language, with a button that opens the app
 *   /next   — next padel night: date, time, spots
 *   /help   — how it works
 *   /connect (in a group, organizer only) — this group receives pairings, results, reminders
 * The webhook is registered automatically by the API (ensureWebhook).
 */
import { CHAPTER_SLUG, db, env } from '../lib/db';
import { T, announcePost, appLink, appUrl, fmtDay, fmtTime, langOf, tg, webhookSecret } from '../lib/telegram';

type Msg = {
  message_id: number;
  text?: string;
  chat: { id: number; type: 'private' | 'group' | 'supergroup' | 'channel' };
  from?: { id: number; first_name: string; language_code?: string };
};
type Update = {
  message?: Msg;
  my_chat_member?: { chat: Msg['chat']; from: { language_code?: string }; new_chat_member: { status: string } };
};

export default async (req: Request) => {
  const { token } = env();
  if (!token || req.method !== 'POST') return new Response('ok');
  if (req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret(token)) return new Response('forbidden', { status: 403 });

  const update = await req.json().catch(() => ({})) as Update;
  try {
    await handle(token, update);
  } catch (e) {
    console.error('bot', e);
  }
  return new Response('ok'); // always 200 so Telegram doesn't retry
};

async function handle(token: string, u: Update) {
  // Bot added to a group: explain /connect.
  if (u.my_chat_member && ['member', 'administrator'].includes(u.my_chat_member.new_chat_member.status)
    && u.my_chat_member.chat.type !== 'private') {
    const l = langOf(u.my_chat_member.from.language_code);
    await tg(token, 'sendMessage', { chat_id: u.my_chat_member.chat.id, text: T[l].addedToGroup });
    return;
  }

  const m = u.message;
  if (!m?.text || !m.from) return;
  const cmd = m.text.trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const l = langOf(m.from.language_code);
  const t = T[l];
  const link = await appLink(token);
  const isPrivate = m.chat.type === 'private';
  // Inside a private chat the button opens the Mini App directly; groups only allow link buttons.
  const openButton = isPrivate
    ? { inline_keyboard: [[{ text: t.open, web_app: { url: appUrl() } }]] }
    : { inline_keyboard: [[{ text: t.open, url: link }]] };
  const reply = (text: string, withButton = true) => tg(token, 'sendMessage', {
    chat_id: m.chat.id, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true },
    ...(withButton ? { reply_markup: openButton } : {}),
    ...(isPrivate ? {} : { reply_parameters: { message_id: m.message_id, allow_sending_without_reply: true } }),
  });

  if (cmd === '/start') {
    if (!isPrivate) return reply(t.help);
    return reply(t.welcome(m.from.first_name));
  }
  if (cmd === '/help') return reply(t.help);

  const client = db();
  if (!client) return;
  const { data: chapter } = await client.from('chapters').select('id, currency').eq('slug', CHAPTER_SLUG).single();
  if (!chapter) return;

  if (cmd === '/next') {
    const { data: ev } = await client.from('events').select('id, starts_at, venue, price, capacity')
      .eq('chapter_id', chapter.id).in('status', ['open', 'live']).order('starts_at').limit(1).maybeSingle();
    if (!ev) return reply(t.help);
    const { count } = await client.from('registrations').select('player_id', { count: 'exact', head: true }).eq('event_id', ev.id);
    const cur = chapter.currency === 'TRY' ? '₺' : chapter.currency;
    return reply(t.next(fmtDay(ev.starts_at, l), fmtTime(ev.starts_at), ev.venue ?? '', `${Number(ev.price)} ${cur}`,
      Math.min(count ?? 0, ev.capacity), ev.capacity));
  }

  // Organizer helper: is this Telegram user an organizer of the chapter?
  const isOrganizer = async () => {
    const { data: player } = await client.from('players').select('id').eq('telegram_id', m.from!.id).maybeSingle();
    if (!player) return false;
    const { data: member } = await client.from('chapter_members').select('role').eq('chapter_id', chapter.id).eq('player_id', player.id).maybeSingle();
    return !!member && member.role !== 'player';
  };

  if (cmd === '/announce') {
    if (!(await isOrganizer())) return reply(t.connectNo, false);
    const { data: ev } = await client.from('events').select('id, starts_at, duration_min, venue, price, capacity')
      .eq('chapter_id', chapter.id).in('status', ['open', 'live']).order('starts_at').limit(1).maybeSingle();
    if (!ev) return;
    const { count } = await client.from('registrations').select('player_id', { count: 'exact', head: true }).eq('event_id', ev.id);
    const cur = chapter.currency === 'TRY' ? '₺' : chapter.currency;
    const { count: played } = await client.from('events').select('id', { count: 'exact', head: true })
      .eq('chapter_id', chapter.id).eq('status', 'finished');
    const end = new Date(new Date(ev.starts_at).getTime() + ev.duration_min * 60_000).toISOString();
    const caption = announcePost(fmtDay(ev.starts_at, 'ru'), fmtDay(ev.starts_at, 'tr'), fmtDay(ev.starts_at, 'en'),
      fmtTime(ev.starts_at), fmtTime(end), ev.venue ?? '', `${Number(ev.price)} ${cur}`, Math.min(count ?? 0, ev.capacity), ev.capacity, !played);
    const button = isPrivate
      ? { inline_keyboard: [[{ text: '🎾 Записаться · Katıl · Join', web_app: { url: appUrl() } }]] }
      : { inline_keyboard: [[{ text: '🎾 Записаться · Katıl · Join', url: link }]] };
    const sent = await tg<{ message_id: number }>(token, 'sendPhoto', {
      chat_id: m.chat.id, photo: `${appUrl()}kindset-cover.png`, caption, parse_mode: 'HTML', reply_markup: button,
    });
    if (!sent.ok) {
      // Fallback without the picture (e.g. image fetch failed)
      const txt = await tg<{ message_id: number }>(token, 'sendMessage', { chat_id: m.chat.id, text: caption, parse_mode: 'HTML', reply_markup: button });
      if (txt.ok && txt.result && !isPrivate) await tg(token, 'pinChatMessage', { chat_id: m.chat.id, message_id: txt.result.message_id, disable_notification: false });
      return;
    }
    // Pin it (works when the bot is a group admin; ignored otherwise).
    if (!isPrivate && sent.result) await tg(token, 'pinChatMessage', { chat_id: m.chat.id, message_id: sent.result.message_id, disable_notification: false });
    return;
  }

  if (cmd === '/connect') {
    if (isPrivate) return reply(t.connectNo, false);
    const { data: player } = await client.from('players').select('id').eq('telegram_id', m.from.id).maybeSingle();
    const { data: member } = player
      ? await client.from('chapter_members').select('role').eq('chapter_id', chapter.id).eq('player_id', player.id).maybeSingle()
      : { data: null };
    if (!member || member.role === 'player') return reply(t.connectNo, false);
    const { error } = await client.from('chapters').update({ telegram_chat_id: m.chat.id }).eq('id', chapter.id);
    if (error) { console.error('connect', error.message); return reply('⚠️ ' + error.message, false); }
    return reply(t.connectOk);
  }
}

export const config = { path: '/bot' };
