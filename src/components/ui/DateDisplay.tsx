import { useLocale } from '../../hooks/useLocale';
import { useTranslation } from 'react-i18next';
import type { FuzzyDate } from '../../types';

interface DateDisplayProps {
  date?: FuzzyDate;
  fallback?: string;
}

export default function DateDisplay({ date, fallback }: DateDisplayProps) {
  const { locale } = useLocale();
  const { t } = useTranslation();

  if (!date) return <span>{fallback ?? t('unknown_date')}</span>;
  if (date.raw) return <span>{date.raw}</span>;
  if (!date.year) return <span>{fallback ?? t('unknown_date')}</span>;

  const qualifier = date.circa ? `${t('circa')} ` : date.before ? `${t('before')} ` : date.after ? `${t('after')} ` : '';

  let formatted = `${date.year}`;
  if (date.month && date.day) {
    try {
      const d = new Date(date.year, date.month - 1, date.day);
      formatted = d.toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      formatted = `${date.month}/${date.day}/${date.year}`;
    }
  } else if (date.month) {
    try {
      const d = new Date(date.year, date.month - 1, 1);
      formatted = d.toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
        year: 'numeric',
        month: 'long',
      });
    } catch {
      formatted = `${date.month}/${date.year}`;
    }
  }

  return <span>{qualifier}{formatted}</span>;
}
