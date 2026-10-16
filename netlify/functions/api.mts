/**
 * Kindset API — the only thing that writes to the database.
 *
 * Every request carries Telegram's signed initData. We check its signature with
 * the bot token, so a player can only act as themselves, and only organizers can
 * run rounds and enter scores.
 *
 * Netlify environment variables (Project configuration → Environment variables):
 *   SUPABASE_URL           https://<project>.supabase.co
 *   SUPABASE_SECRET_KEY    sb_secret_…   (never in the app itself)
 *   TELEGRAM_BOT_TOKEN     from @BotFather
 *   ORGANIZER_TELEGRAM_IDS optional, comma-separated Telegram user ids
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { nextRound, standings, tally, type Round } from '../../src/lib/mexicano';
import { chapterChat } from '../lib/db';
import { appLink, ensureWebhook, resultsPost, roundPost, tg } from '../lib/telegram';

const CHAPTER_SLUG = 'alanya';
const DEFAULTS = { venue: 'Mahmutlar', price: 500, capacity: 16, courts: 2, target: 21, hour: 18, weekday: 5 /* Friday */ };

type TgUser = { id: number; first_name: string; last_name?: string; username?: string; language_code?: string };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

type Verify = { user: TgUser } | { error: 'no_init_data' | 'bad_signature' | 'expired' | 'no_user' };

function verifyInitData(raw: string, botToken: string): Verify {
  if (!raw) return { error: 'no_init_data' };
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash) return { error: 'no_init_data' };
  params.delete('hash');
  const check = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = createHmac('sha256', secret).update(check).digest('hex');
  if (calc.length !== hash.length || !timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) return { error: 'bad_signature' };
  const age = Date.now() / 1000 - Number(params.get('auth_date') ?? 0);
  if (age > 7 * 24 * 3600) return { error: 'expired' };
  try {
    const user = JSON.parse(params.get('user') ?? 'null');
    return user?.id ? { user } : { error: 'no_user' };
  } catch { return { error: 'no_user' }; }
}

/** Next Friday 18:00 in Turkey (UTC+3, no daylight saving). */
function nextEventStart(now = new Date()): string {
  const tr = new Date(now.getTime() + 3 * 3600_000);
  const d = new Date(Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate(), DEFAULTS.hour - 3));
  let add = (DEFAULTS.weekday - tr.getUTCDay() + 7) % 7;
  if (add === 0 && tr.getUTCHours() >= DEFAULTS.hour + 2) add = 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString();
}

/** Query that must return data (lists, inserts, single rows). */
async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw error;
  if (data == null) throw new Error('no_data');
  return data as NonNullable<T>;
}
/** Query that may return nothing (maybeSingle). */
async function maybe<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

async function context(db: SupabaseClient, user: TgUser) {
  const chapter = await must(db.from('chapters').select('*').eq('slug', CHAPTER_SLUG).single());

  // Player row for this Telegram user.
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  let player = await maybe(db.from('players').select('*').eq('telegram_id', user.id).maybeSingle());
  if (!player) {
    player = await must(db.from('players').insert({
      telegram_id: user.id, name, username: user.username ?? null,
      langs: user.language_code ? [user.language_code.slice(0, 2).toUpperCase()] : [],
    }).select().single());
  } else if (player.name !== name || player.username !== (user.username ?? null)) {
    await db.from('players').update({ name, username: user.username ?? null }).eq('id', player.id);
  }

  // Membership. The first person to open the app becomes the organizer.
  const members = await must(db.from('chapter_members').select('*').eq('chapter_id', chapter.id));
  let mine = members.find((m: { player_id: string }) => m.player_id === player.id);
  const envOrganizers = (process.env.ORGANIZER_TELEGRAM_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const shouldOrganize = envOrganizers.includes(String(user.id)) || !members.some((m: { role: string }) => m.role !== 'player');
  if (!mine) {
    mine = await must(db.from('chapter_members').insert({
      chapter_id: chapter.id, player_id: player.id, role: shouldOrganize ? 'organizer' : 'player',
    }).select().single());
  } else if (mine.role === 'player' && envOrganizers.includes(String(user.id))) {
    await db.from('chapter_members').update({ role: 'organizer' }).eq('chapter_id', chapter.id).eq('player_id', player.id);
    mine.role = 'organizer';
  }

  // Season and the current event (created on demand).
  let season = await maybe(db.from('seasons').select('*').eq('chapter_id', chapter.id).order('number', { ascending: false }).limit(1).maybeSingle());
  if (!season) season = await must(db.from('seasons').insert({ chapter_id: chapter.id, number: 1 }).select().single());

  let event = await maybe(db.from('events').select('*').eq('chapter_id', chapter.id).in('status', ['open', 'live'])
    .order('starts_at', { ascending: true }).limit(1).maybeSingle());
  // A night that ended more than 6 hours ago closes itself, so next week's opens.
  if (event && new Date(event.starts_at).getTime() + (event.duration_min + 6 * 60) * 60_000 < Date.now()) {
    const { count } = await db.from('rounds').select('id', { count: 'exact', head: true }).eq('event_id', event.id);
    await db.from('events').update({ status: count ? 'finished' : 'cancelled' }).eq('id', event.id);
    event = null;
  }
  if (!event) {
    // Next game repeats the last one's weekday, time, place and price, one week later.
    const last = await maybe(db.from('events').select('starts_at, duration_min, venue, price, capacity, courts, target_points')
      .eq('chapter_id', chapter.id).order('starts_at', { ascending: false }).limit(1).maybeSingle());
    let startsAt = nextEventStart();
    if (last) {
      let t = new Date(last.starts_at).getTime();
      while (t + (last.duration_min + 6 * 60) * 60_000 < Date.now()) t += 7 * 24 * 3600_000;
      startsAt = new Date(t).toISOString();
    }
    event = await must(db.from('events').insert({
      chapter_id: chapter.id, season_id: season.id, starts_at: startsAt,
      duration_min: last?.duration_min ?? 120, venue: last?.venue ?? DEFAULTS.venue, price: last?.price ?? DEFAULTS.price,
      capacity: last?.capacity ?? DEFAULTS.capacity, courts: last?.courts ?? DEFAULTS.courts,
      target_points: last?.target_points ?? DEFAULTS.target,
    }).select().single());
  }
  return { chapter, player, role: mine.role as string, season, event };
}

async function loadRounds(db: SupabaseClient, eventId: string) {
  const rounds = await must(db.from('rounds').select('id, number, resting, matches(*)').eq('event_id', eventId).order('number'));
  return rounds.map((r: { id: string; number: number; resting: string[]; matches: Record<string, unknown>[] }) => ({
    id: r.id,
    resting: r.resting ?? [],
    matches: [...r.matches].sort((a, b) => Number(a.court) - Number(b.court)).map((m) => ({
      court: m.court as number,
      a: [m.a1, m.a2] as [string, string],
      b: [m.b1, m.b2] as [string, string],
      scoreA: (m.score_a as number) ?? 0,
      scoreB: (m.score_b as number) ?? 0,
      done: !!m.done,
    })),
  }));
}

async function state(db: SupabaseClient, ctx: Awaited<ReturnType<typeof context>>) {
  const { chapter, player, role, season, event } = ctx;
  const regs = await must(db.from('registrations').select('player_id, created_at').eq('event_id', event.id).order('created_at'));
  const rounds = await loadRounds(db, event.id);

  // Season table from every event of this season.
  const seasonEvents = await must(db.from('events').select('id, status, charity_raised, starts_at').eq('season_id', season.id).order('starts_at'));
  const points: Record<string, number> = {};
  const weeks: Record<string, Set<string>> = {};
  let lastFinished: { id: string; pts: Record<string, number> } | null = null;
  for (const e of seasonEvents as { id: string; status: string }[]) {
    if (e.status === 'cancelled') continue;
    const rs = e.id === event.id ? rounds : await loadRounds(db, e.id);
    const t = tally(rs);
    for (const [id, p] of Object.entries(t.points)) {
      points[id] = (points[id] ?? 0) + p;
      (weeks[id] ??= new Set()).add(e.id);
    }
    if (e.status === 'finished') lastFinished = { id: e.id, pts: t.points };
  }
  const seasonRows = Object.keys(points).map((id) => ({ id, points: points[id], weeks: weeks[id].size }))
    .sort((a, b) => b.points - a.points);

  // Awards from the most recently finished event.
  const awards: { winner?: string; newbie?: string; spirit?: string } = {};
  if (lastFinished) {
    const ranked = Object.entries(lastFinished.pts).sort((a, b) => b[1] - a[1]);
    awards.winner = ranked[0]?.[0];
    const lf = lastFinished.id;
    const newbies = ranked.filter(([id]) => [...(weeks[id] ?? [])].every((x) => x === lf || x === event.id));
    awards.newbie = newbies.find(([id]) => id !== awards.winner)?.[0];
    const votes = await must(db.from('award_votes').select('nominee_id').eq('event_id', lastFinished.id).eq('award', 'spirit'));
    const count: Record<string, number> = {};
    votes.forEach((v: { nominee_id: string }) => { count[v.nominee_id] = (count[v.nominee_id] ?? 0) + 1; });
    awards.spirit = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  const myVote = await maybe(db.from('award_votes').select('nominee_id').eq('event_id', event.id)
    .eq('voter_id', player.id).eq('award', 'spirit').maybeSingle());

  const ids = new Set<string>([player.id, ...regs.map((r: { player_id: string }) => r.player_id), ...seasonRows.map((r) => r.id),
    ...Object.values(awards).filter(Boolean) as string[]]);
  const people = await must(db.from('players').select('id, name, level, langs').in('id', [...ids]));
  const players = Object.fromEntries(people.map((p: { id: string; name: string; level: number; langs: string[] }) =>
    [p.id, { id: p.id, name: p.name, level: Number(p.level ?? 2), langs: (p.langs ?? []).join(' ') }]));

  const raised = seasonEvents.reduce((s: number, e: { charity_raised: number }) => s + Number(e.charity_raised ?? 0), 0);
  return {
    me: players[player.id],
    role,
    chapter: { slug: chapter.slug, city: chapter.city, currency: chapter.currency === 'TRY' ? '₺' : chapter.currency, season: season.number, raised },
    event: {
      id: event.id, startsAt: event.starts_at, durationMin: event.duration_min, venue: event.venue, price: Number(event.price),
      capacity: event.capacity, courts: event.courts, target: event.target_points, status: event.status,
      charityRaised: Number(event.charity_raised ?? 0),
    },
    players,
    registered: regs.map((r: { player_id: string }) => r.player_id),
    rounds: rounds.map(({ matches, resting }) => ({ matches, resting })),
    season: seasonRows,
    awards,
    myVote: myVote?.nominee_id ?? null,
  };
}

/** Best effort: post to the chapter's connected Telegram group. Never fails the request. */
async function postToGroup(db: SupabaseClient, token: string, chapterId: string, build: (names: (id: string) => string) => Promise<string>) {
  try {
    const chat = await chapterChat(db, chapterId);
    if (!chat) return;
    const people = await must(db.from('players').select('id, name'));
    const byId = Object.fromEntries(people.map((p: { id: string; name: string }) => [p.id, p.name]));
    const text = await build((id) => byId[id] ?? '—');
    const r = await tg(token, 'sendMessage', {
      chat_id: chat, text, parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '🎾 Kindset', url: await appLink(token) }]] },
    });
    if (!r.ok) console.warn('group post', r.description);
  } catch (e) { console.warn('group post', e); }
}

export default async (req: Request) => {
  // Trim: pasted keys often carry a stray space or line break.
  const SUPABASE_URL = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY?.trim();
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const missing = [!SUPABASE_URL && 'SUPABASE_URL', !SUPABASE_SECRET_KEY && 'SUPABASE_SECRET_KEY', !TELEGRAM_BOT_TOKEN && 'TELEGRAM_BOT_TOKEN'].filter(Boolean);
  if (missing.length || !SUPABASE_URL || !SUPABASE_SECRET_KEY || !TELEGRAM_BOT_TOKEN) {
    return json({ error: 'not_configured', detail: missing.join(', ') }, 503);
  }

  const v = verifyInitData(req.headers.get('x-telegram-init-data') ?? '', TELEGRAM_BOT_TOKEN);
  if ('error' in v) {
    // bot id is the public part before ':'; it shows whether the token belongs to this bot.
    // Ask Telegram which bot this token belongs to (public info), so a wrong token is obvious.
    let tokenBot = 'token_check_failed';
    try {
      const me = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`).then((r) => r.json());
      tokenBot = me?.ok ? `token=@${me.result.username}` : 'token_revoked_or_invalid';
    } catch { /* network */ }
    console.warn('auth failed', v.error, tokenBot);
    return json({ error: 'unauthorized', detail: `${v.error} · ${tokenBot}` }, 401);
  }
  const user = v.user;

  const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  try {
    const ctx = await context(db, user);
    // Register the bot webhook once per server start (no manual setup needed).
    await ensureWebhook(TELEGRAM_BOT_TOKEN, new URL(req.url).origin).catch((e) => console.warn('webhook', e));
    if (req.method === 'GET') return json(await state(db, ctx));

    const body = await req.json() as { action: string; [k: string]: unknown };
    const { event, player, role } = ctx;
    const organizer = role === 'organizer' || role === 'admin';
    const forbid = () => json({ error: 'organizers_only' }, 403);

    switch (body.action) {
      case 'join':
        await db.from('registrations').upsert({ event_id: event.id, player_id: player.id }, { onConflict: 'event_id,player_id', ignoreDuplicates: true });
        break;
      case 'leave':
        await db.from('registrations').delete().eq('event_id', event.id).eq('player_id', player.id);
        break;
      case 'level': {
        const target = (body.playerId as string | undefined) ?? player.id;
        if (target !== player.id && !organizer) return forbid();
        const level = Math.max(0, Math.min(7, Math.round(Number(body.level) * 10) / 10));
        if (!Number.isFinite(level)) return json({ error: 'bad_level' }, 400);
        await must(db.from('players').update({ level }).eq('id', target).select('id'));
        break;
      }
      case 'vote': {
        const nominee = body.nominee as string | null;
        await db.from('award_votes').delete().eq('event_id', event.id).eq('voter_id', player.id).eq('award', 'spirit');
        if (nominee && nominee !== player.id) {
          await db.from('award_votes').insert({ event_id: event.id, voter_id: player.id, award: 'spirit', nominee_id: nominee });
        }
        break;
      }
      case 'nextRound': {
        if (!organizer) return forbid();
        const regs = await must(db.from('registrations').select('player_id').eq('event_id', event.id).order('created_at'));
        const pool = regs.map((r: { player_id: string }) => r.player_id).slice(0, event.capacity);
        const rounds: Round[] = await loadRounds(db, event.id);
        if (rounds.length && !rounds[rounds.length - 1].matches.every((m) => m.done)) return json({ error: 'round_not_finished' }, 409);
        if (pool.length < 4) return json({ error: 'not_enough_players' }, 409);
        const levels = await must(db.from('players').select('id, level').in('id', pool));
        const levelOf = Object.fromEntries(levels.map((p: { id: string; level: number }) => [p.id, Number(p.level ?? 2)]));
        const r = nextRound(pool, rounds, (id) => levelOf[id] ?? 2, event.courts, event.target_points);
        const row = await must(db.from('rounds').insert({ event_id: event.id, number: rounds.length + 1, resting: r.resting }).select().single());
        await must(db.from('matches').insert(r.matches.map((m) => ({
          round_id: row.id, court: m.court, a1: m.a[0], a2: m.a[1], b1: m.b[0], b2: m.b[1], score_a: m.scoreA, score_b: m.scoreB, done: false,
        }))));
        if (event.status === 'open') await db.from('events').update({ status: 'live' }).eq('id', event.id);
        await postToGroup(db, TELEGRAM_BOT_TOKEN, ctx.chapter.id, async (names) =>
          roundPost(rounds.length + 1, r.matches.map((m) => ({ court: m.court, a: m.a.map(names), b: m.b.map(names) })), r.resting.map(names)));
        break;
      }
      case 'score': {
        if (!organizer) return forbid();
        const round = await must(db.from('rounds').select('id').eq('event_id', event.id).eq('number', Number(body.round) + 1).single());
        const a = Math.max(0, Math.min(event.target_points, Number(body.scoreA)));
        await must(db.from('matches').update({ score_a: a, score_b: event.target_points - a, done: !!body.done })
          .eq('round_id', round.id).eq('court', Number(body.court)));
        break;
      }
      case 'updateEvent': {
        if (!organizer) return forbid();
        const startsAt = new Date(String(body.startsAt));
        const durationMin = Math.round(Number(body.durationMin));
        const capacity = Math.round(Number(body.capacity));
        const courts = Math.round(Number(body.courts));
        const price = Number(body.price);
        const venue = String(body.venue ?? '').trim().slice(0, 80);
        if (Number.isNaN(startsAt.getTime()) || !(durationMin >= 30 && durationMin <= 600) || !(capacity >= 4 && capacity <= 64)
          || !(courts >= 1 && courts <= 8) || !(price >= 0) || !venue) return json({ error: 'bad_event' }, 400);
        await must(db.from('events').update({
          starts_at: startsAt.toISOString(), duration_min: durationMin, venue, price, capacity, courts,
          reminded_at: null, // a new time gets a fresh reminder
        }).eq('id', event.id).select('id'));
        break;
      }
      case 'reset':
        if (!organizer) return forbid();
        await db.from('rounds').delete().eq('event_id', event.id);
        await db.from('award_votes').delete().eq('event_id', event.id);
        await db.from('events').update({ status: 'open' }).eq('id', event.id);
        break;
      case 'finish': {
        if (!organizer) return forbid();
        const raised = Math.max(0, Number(body.raised ?? 0));
        await db.from('events').update({ status: 'finished', charity_raised: raised }).eq('id', event.id);
        const rounds: Round[] = await loadRounds(db, event.id);
        const regs = await must(db.from('registrations').select('player_id').eq('event_id', event.id));
        const table = standings(regs.map((x: { player_id: string }) => x.player_id), rounds).filter((x) => x.games > 0);
        if (table.length) {
          const currency = ctx.chapter.currency === 'TRY' ? '₺' : ctx.chapter.currency;
          await postToGroup(db, TELEGRAM_BOT_TOKEN, ctx.chapter.id, async (names) =>
            resultsPost(table.map((x) => ({ name: names(x.id), points: x.points })), raised, currency));
        }
        break;
      }
      default:
        return json({ error: 'unknown_action' }, 400);
    }
    return json(await state(db, await context(db, user)));
  } catch (e) {
    console.error(e);
    const msg = (e as { message?: string; code?: string })?.message ?? '';
    return json({ error: 'server_error', detail: msg.slice(0, 120) }, 500);
  }
};

export const config = { path: '/api' };
