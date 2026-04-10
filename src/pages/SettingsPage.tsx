import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store';
import GedcomImporter from '../components/import-export/GedcomImporter';
import GedcomExporter from '../components/import-export/GedcomExporter';
import type { Locale } from '../types';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);

  function handleLocaleChange(l: Locale) {
    setLocale(l);
    i18n.changeLanguage(l);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto w-full space-y-8">
      {/* Language */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">{t('settings_language')}</h2>
        <div className="flex gap-2">
          {(['en', 'es'] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => handleLocaleChange(l)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                locale === l
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {t(`lang_${l}`)}
            </button>
          ))}
        </div>
      </section>

      {/* Data */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">{t('settings_data')}</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">{t('import_gedcom')}</p>
            <GedcomImporter />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">{t('export_gedcom')}</p>
            <GedcomExporter />
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">{t('settings_about')}</h2>
        <p className="text-sm text-gray-500">
          Perez Family Tree — built with React, TypeScript, and React Flow.
          Data is stored locally in your browser. Export a GEDCOM or JSON file to back up your data.
        </p>
      </section>
    </div>
  );
}
