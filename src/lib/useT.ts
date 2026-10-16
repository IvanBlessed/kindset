import { DICT, type Key } from '@/lib/i18n';
import { useAppState } from '@/data/store';

export function useT() {
  const { lang } = useAppState();
  return (k: Key) => DICT[lang][k];
}

export function useLocale() {
  const { lang } = useAppState();
  return { ru: 'ru-RU', tr: 'tr-TR', en: 'en-GB' }[lang];
}
