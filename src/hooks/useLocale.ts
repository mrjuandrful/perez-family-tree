import { useUIStore } from '../store';
import type { BilingualString } from '../types';

export function useLocale() {
  const locale = useUIStore((s) => s.locale);

  function t(str: BilingualString | undefined, fallback = ''): string {
    if (!str) return fallback;
    return str[locale] || str.en || fallback;
  }

  return { locale, t };
}
