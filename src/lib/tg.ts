/**
 * Thin wrapper over Telegram's official Mini App script (telegram-web-app.js,
 * loaded in index.html). It is supported by every Telegram client and is ready
 * before our code runs, so the signed login (initData) is always available.
 */
interface TgUser { id: number; first_name: string; last_name?: string; username?: string; language_code?: string }
interface WebApp {
  initData: string;
  initDataUnsafe: { user?: TgUser };
  colorScheme: 'light' | 'dark';
  platform: string;
  ready(): void;
  expand(): void;
  onEvent(event: string, cb: () => void): void;
  HapticFeedback?: { impactOccurred(style: 'light' | 'medium' | 'heavy'): void };
}

const wa: WebApp | undefined = (window as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp;

/** True only when opened inside Telegram with a signed login. */
export const inTelegram = !!wa?.initData;
export const rawInitData = wa?.initData ?? '';
export const tgUser: TgUser | undefined = wa?.initDataUnsafe?.user;
export const platform = wa?.platform ?? 'web';
export const colorScheme = (): 'light' | 'dark' =>
  wa?.colorScheme ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export function startTelegram(onTheme: () => void) {
  if (!wa) return;
  try { wa.ready(); wa.expand(); wa.onEvent('themeChanged', onTheme); } catch { /* older client */ }
}

export function haptic() {
  try { wa?.HapticFeedback?.impactOccurred('light'); } catch { /* not supported */ }
}
