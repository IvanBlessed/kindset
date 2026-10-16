// Include Telegram UI styles first to allow our code override the package CSS.
import '@telegram-apps/telegram-ui/dist/styles.css';

import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';

import { Root } from '@/components/Root.tsx';
import { colorScheme, startTelegram } from '@/lib/tg';

import './index.css';

function applyTheme() {
  document.documentElement.dataset.theme = colorScheme();
}
applyTheme();
startTelegram(applyTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
