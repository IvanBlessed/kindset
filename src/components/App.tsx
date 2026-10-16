import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useLaunchParams, useSignal, miniApp, backButton } from '@tma.js/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { useEffect, type ReactNode } from 'react';

import { Wordmark } from '@/brand/Logo';
import { actions, useAppState } from '@/data/store';
import { LANGS, type Key } from '@/lib/i18n';
import { useT } from '@/lib/useT';
import { EventsPage } from '@/pages/EventsPage';
import { LivePage } from '@/pages/LivePage';
import { RankingPage } from '@/pages/RankingPage';
import { MePage } from '@/pages/MePage';

const ICONS: Record<string, ReactNode> = {
  events: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>,
  live: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M5 12h14M9 3v4h6V3M9 21v-4h6v4" /></svg>,
  ranking: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20v-7h4v7M10 20V8h4v12M16 20v-5h4v5" /></svg>,
  me: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.3-3.7 4-5.5 7.5-5.5s6.2 1.8 7.5 5.5" /></svg>,
};
const TABS = [
  { path: '/', key: 'events' as const, Page: EventsPage },
  { path: '/live', key: 'live' as const, Page: LivePage },
  { path: '/ranking', key: 'ranking' as const, Page: RankingPage },
  { path: '/me', key: 'me' as const, Page: MePage },
];

const ERRORS: Record<string, Key> = { not_configured: 'errorSetup', unauthorized: 'errorAuth' };

function Status() {
  const t = useT();
  const { data, error } = useAppState();
  if (data && !error) return null;
  if (!data && !error) return <p className="ks-card ks-pad ks-muted">{t('loading')}</p>;
  return (
    <div className="ks-card ks-pad ks-stack" style={{ marginTop: 0, marginBottom: 12 }}>
      <p>{t(ERRORS[error!] ?? 'errorGeneric')}</p>
      {error !== 'unauthorized' && <button className="ks-btn ks-btn--ghost" onClick={actions.retry}>{t('retry')}</button>}
    </div>
  );
}

function Shell() {
  const t = useT();
  const { lang, data, mode } = useAppState();
  useEffect(() => { try { backButton.hide(); } catch { /* empty */ } }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  return (
    <div className="ks-app">
      <header className="ks-header">
        <div>
          <Wordmark city={data?.chapter.city ?? 'Alanya'} />
          <p className="ks-header__sub">{t('tagline')}</p>
        </div>
        <div className="ks-seg" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => actions.setLang(l)}>{l.toUpperCase()}</button>
          ))}
        </div>
      </header>
      {mode === 'preview' && (
        <p className="ks-note ks-note--top">
          {t('preview')}
          <span className="ks-diag"> · v{__BUILD__} · {location.hash.includes('tgWebApp') ? 'tg-hash' : 'no-hash'}{sessionStorage.length ? ' · ss' : ''}</span>
        </p>
      )}
      <Status />
      <main className="ks-main">
        <Routes>
          {data && TABS.map(({ path, Page }) => <Route key={path} path={path} element={<Page d={data} />} />)}
          {data && <Route path="*" element={<Navigate to="/" />} />}
        </Routes>
      </main>
      <nav className="ks-tabbar">
        {TABS.map((tab) => (
          <NavLink key={tab.path} to={tab.path} end className="ks-tab">
            {ICONS[tab.key]}<span>{t(tab.key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function App() {
  const lp = useLaunchParams();
  const isDark = useSignal(miniApp.isDark);
  return (
    <AppRoot appearance={isDark ? 'dark' : 'light'} platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppRoot>
  );
}
