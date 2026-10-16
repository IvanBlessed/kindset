/**
 * Telegram Bot API helpers and the bot's message texts (RU / TR / EN).
 * Used by the API (round + results posts), the bot webhook and the reminder job.
 */
import { createHash } from 'node:crypto';

export type Lang = 'ru' | 'tr' | 'en';
/** The app's own address (Netlify sets URL at runtime). */
export const appUrl = () => `${(process.env.URL ?? 'https://kindset.netlify.app').replace(/\/+$/, '')}/`;
export const APP_SHORT_NAME = process.env.APP_SHORT_NAME?.trim() || 'night';

export async function tg<T = unknown>(token: string, method: string, body: object = {}): Promise<{ ok: boolean; result?: T; description?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.error('telegram', method, e);
    return { ok: false, description: 'network' };
  }
}

/** Secret Telegram sends with every webhook call, derived from the bot token (no extra setting). */
export const webhookSecret = (token: string) => createHash('sha256').update(`kindset-webhook:${token}`).digest('hex').slice(0, 48);

let username: string | null = null;
export async function botUsername(token: string) {
  if (!username) username = (await tg<{ username: string }>(token, 'getMe')).result?.username ?? 'kindset_alanya_bot';
  return username;
}
export async function appLink(token: string) {
  return `https://t.me/${await botUsername(token)}/${APP_SHORT_NAME}`;
}

/** Points Telegram at /bot once per server start, and sets the command menu. */
let webhookChecked = false;
export async function ensureWebhook(token: string, origin: string) {
  if (webhookChecked || !origin.startsWith('https://')) return;
  webhookChecked = true;
  const url = `${origin}/bot`;
  const info = await tg<{ url: string }>(token, 'getWebhookInfo');
  if (info.result?.url !== url) {
    const r = await tg(token, 'setWebhook', { url, secret_token: webhookSecret(token), allowed_updates: ['message', 'my_chat_member'] });
    console.log('setWebhook', url, r.ok, r.description ?? '');
  }
  for (const lang of ['', 'ru', 'tr'] as const) {
    const l: Lang = lang || 'en';
    await tg(token, 'setMyCommands', {
      commands: [
        { command: 'start', description: T[l].cmdStart },
        { command: 'next', description: T[l].cmdNext },
        { command: 'help', description: T[l].cmdHelp },
      ],
      ...(lang ? { language_code: lang } : {}),
    });
  }
}

export const html = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function langOf(code?: string | null): Lang {
  const c = (code ?? '').slice(0, 2).toLowerCase();
  if (c === 'tr') return 'tr';
  if (['ru', 'uk', 'ua', 'be', 'kk'].includes(c)) return 'ru';
  return 'en';
}

const tz = { timeZone: 'Europe/Istanbul' } as const;
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...tz });
export function fmtDay(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString({ ru: 'ru-RU', tr: 'tr-TR', en: 'en-GB' }[lang], { weekday: 'long', day: 'numeric', month: 'long', ...tz });
}

export const T = {
  en: {
    cmdStart: 'Open Kindset', cmdNext: 'Next padel game', cmdHelp: 'How it works',
    welcome: (name: string) => `🎾 Hi ${name}! This is <b>Kindset</b>, community padel games in Alanya.\n\nEvery week: Mexicano format, a new partner every round, a season ranking and prizes. Part of every entry goes to charity.\n\nTap the button to sign up 👇`,
    open: '🎾 Open Kindset',
    help: '<b>How Kindset works</b>\n\n1. Open the app and tap <b>Join this night</b>.\n2. At the court, follow your court number on the <b>Live</b> tab.\n3. Points add up to the season ranking. Top 8 play the final.\n\n/next — the next padel game',
    next: (day: string, time: string, venue: string, price: string, taken: number, cap: number) =>
      `🎾 <b>Next padel game</b>\n📅 ${day}, ${time}\n📍 ${venue} · ${price}\n👥 ${taken}/${cap} spots taken`,
    dmReminder: (time: string, venue: string, pos: number, cap: number, tomorrow = false) => pos <= cap
      ? `⏰ Reminder: padel <b>${tomorrow ? 'tomorrow' : 'today'} at ${time}</b> in ${venue}. You're on the list (#${pos}). See you on court! 🎾`
      : `⏰ Padel ${tomorrow ? 'tomorrow' : 'today'} at ${time}. You're on the waitlist (#${pos - cap}). We'll see if a spot opens up.`,
    connectOk: '✅ This group is connected. Round pairings, results and reminders will be posted here.',
    connectNo: 'Only the Kindset organizer can connect a group. Open the app first, then send /connect.',
    addedToGroup: '👋 Hi! I\'m the Kindset bot. Organizer: send /connect here to get round pairings, results and reminders in this group.',
  },
  ru: {
    cmdStart: 'Открыть Kindset', cmdNext: 'Следующая игра', cmdHelp: 'Как это работает',
    welcome: (name: string) => `🎾 Привет, ${name}! Это <b>Kindset</b> — падел-игры в Алании.\n\nКаждую неделю: формат Mexicano, новый партнёр каждый раунд, рейтинг сезона и призы. Часть взносов идёт на благотворительность.\n\nНажмите кнопку, чтобы записаться 👇`,
    open: '🎾 Открыть Kindset',
    help: '<b>Как работает Kindset</b>\n\n1. Откройте приложение и нажмите <b>Записаться</b>.\n2. На корте смотрите номер своего корта во вкладке <b>Игра</b>.\n3. Очки идут в рейтинг сезона. Топ-8 играют финал.\n\n/next — следующая игра',
    next: (day: string, time: string, venue: string, price: string, taken: number, cap: number) =>
      `🎾 <b>Следующая игра</b>\n📅 ${day}, ${time}\n📍 ${venue} · ${price}\n👥 Занято ${taken}/${cap} мест`,
    dmReminder: (time: string, venue: string, pos: number, cap: number, tomorrow = false) => pos <= cap
      ? `⏰ Напоминание: падел <b>${tomorrow ? 'завтра' : 'сегодня'} в ${time}</b>, ${venue}. Вы в списке (№${pos}). До встречи на корте! 🎾`
      : `⏰ Падел ${tomorrow ? 'завтра' : 'сегодня'} в ${time}. Вы в листе ожидания (№${pos - cap}). Если место освободится — вы следующий.`,
    connectOk: '✅ Группа подключена. Сюда будут приходить пары раундов, итоги и напоминания.',
    connectNo: 'Подключить группу может только организатор Kindset. Сначала откройте приложение, затем отправьте /connect.',
    addedToGroup: '👋 Привет! Я бот Kindset. Организатор: отправьте здесь /connect, чтобы получать пары раундов, итоги и напоминания.',
  },
  tr: {
    cmdStart: "Kindset'i aç", cmdNext: 'Sıradaki padel oyunu', cmdHelp: 'Nasıl çalışır',
    welcome: (name: string) => `🎾 Merhaba ${name}! Burası <b>Kindset</b>, Alanya'da topluluk padel oyunları.\n\nHer hafta: Mexicano formatı, her turda yeni partner, sezon sıralaması ve ödüller. Her katılım ücretinin bir kısmı hayır işine gider.\n\nKayıt olmak için butona dokun 👇`,
    open: "🎾 Kindset'i aç",
    help: "<b>Kindset nasıl çalışır</b>\n\n1. Uygulamayı aç ve <b>Katıl</b>'a dokun.\n2. Kortta <b>Canlı</b> sekmesinden kort numaranı takip et.\n3. Puanlar sezon sıralamasına eklenir. İlk 8 finali oynar.\n\n/next — sıradaki padel oyunu",
    next: (day: string, time: string, venue: string, price: string, taken: number, cap: number) =>
      `🎾 <b>Sıradaki padel oyunu</b>\n📅 ${day}, ${time}\n📍 ${venue} · ${price}\n👥 ${taken}/${cap} yer dolu`,
    dmReminder: (time: string, venue: string, pos: number, cap: number, tomorrow = false) => pos <= cap
      ? `⏰ Hatırlatma: padel <b>${tomorrow ? 'yarın' : 'bugün'} ${time}</b>, ${venue}. Listedesin (#${pos}). Kortta görüşürüz! 🎾`
      : `⏰ Padel ${tomorrow ? 'yarın' : 'bugün'} ${time}. Bekleme listesindesin (#${pos - cap}). Yer açılırsa sıradaki sensin.`,
    connectOk: '✅ Grup bağlandı. Tur eşleşmeleri, sonuçlar ve hatırlatmalar burada paylaşılacak.',
    connectNo: 'Grubu sadece Kindset organizatörü bağlayabilir. Önce uygulamayı aç, sonra /connect gönder.',
    addedToGroup: "👋 Merhaba! Ben Kindset botuyum. Organizatör: tur eşleşmeleri, sonuçlar ve hatırlatmalar için buraya /connect gönder.",
  },
};

/* ---------- group posts: short and readable in all three languages ---------- */

export function roundPost(n: number, courts: { court: number; a: string[]; b: string[] }[], resting: string[]) {
  const lines = courts.map((c) => `<b>${c.court}</b> · ${html(c.a.join(' & '))}  🆚  ${html(c.b.join(' & '))}`);
  return [`🎾 <b>Раунд ${n} · Round ${n} · Tur ${n}</b>`, '', ...lines,
    ...(resting.length ? ['', `☕ ${html(resting.join(', '))}`] : [])].join('\n');
}

export function resultsPost(top: { name: string; points: number }[], raised: number, currency: string) {
  const medals = ['🥇', '🥈', '🥉'];
  const podium = top.slice(0, 3).map((p, i) => `${medals[i]} ${html(p.name)} — <b>${p.points}</b>`);
  return ['🏁 <b>Игра завершена · Game over · Oyun bitti</b>', '', ...podium,
    ...(raised > 0 ? ['', `💛 ${raised.toLocaleString('ru-RU')} ${currency} — благотворительность · charity · hayır`] : []),
    '', 'Спасибо! · Thank you! · Teşekkürler! 🙌'].join('\n');
}

export function reminderPost(time: string, venue: string, price: string, taken: number, cap: number, tomorrow = false) {
  const left = Math.max(0, cap - taken);
  const head = tomorrow ? `Завтра в ${time} · Tomorrow ${time} · Yarın ${time}` : `Сегодня в ${time} · Today ${time} · Bugün ${time}`;
  return [`⏰ <b>${head}</b>`, `📍 ${html(venue)} · ${price}`,
    `👥 ${taken}/${cap}` + (left ? ` — свободно ${left} · ${left} spots left · ${left} yer kaldı` : ' — мест нет · full · dolu')].join('\n');
}
