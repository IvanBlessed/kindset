import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const CHAPTER_SLUG = 'alanya';

/** Settings from Netlify environment variables, trimmed (pasted keys often carry spaces). */
export function env() {
  return {
    url: process.env.SUPABASE_URL?.trim().replace(/\/+$/, '') ?? '',
    key: process.env.SUPABASE_SECRET_KEY?.trim() ?? '',
    token: process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '',
  };
}

export function db(): SupabaseClient | null {
  const { url, key } = env();
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

/** The group chat a chapter posts to (set with /connect). Null if not connected or column missing. */
export async function chapterChat(client: SupabaseClient, chapterId: string): Promise<number | null> {
  const { data, error } = await client.from('chapters').select('telegram_chat_id').eq('id', chapterId).maybeSingle();
  if (error) { console.warn('chapterChat', error.message); return null; }
  return (data?.telegram_chat_id as number | null) ?? null;
}
