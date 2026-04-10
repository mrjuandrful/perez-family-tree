import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamilyTreeStore, useUIStore } from '../store';
import { useLocale } from '../hooks/useLocale';

export default function TimelinePage() {
  const { t } = useTranslation();
  const { t: tl } = useLocale();
  const persons = useFamilyTreeStore((s) => s.data.persons);
  const setSelectedPerson = useUIStore((s) => s.setSelectedPerson);

  const byDecade = useMemo(() => {
    const withYear = Object.values(persons)
      .filter((p) => p.birth?.date?.year)
      .sort((a, b) => (a.birth!.date!.year! - b.birth!.date!.year!));

    const decades = new Map<number, typeof withYear>();
    for (const p of withYear) {
      const decade = Math.floor(p.birth!.date!.year! / 10) * 10;
      if (!decades.has(decade)) decades.set(decade, []);
      decades.get(decade)!.push(p);
    }
    return Array.from(decades.entries()).sort(([a], [b]) => a - b);
  }, [persons]);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-bold text-gray-900 mb-6">{t('timeline_title')}</h1>

      {byDecade.length === 0 && (
        <p className="text-gray-400 text-sm">{t('no_birth_year')}</p>
      )}

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-20 top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-8">
          {byDecade.map(([decade, people]) => (
            <div key={decade} className="relative">
              <div className="flex items-start gap-6">
                <div className="w-14 text-right flex-shrink-0">
                  <span className="text-xs font-bold text-gray-400 bg-white pr-1">{decade}s</span>
                </div>

                <div className="flex-1 space-y-2 pl-6">
                  {people.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => setSelectedPerson(person.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-400 text-sm font-semibold group-hover:bg-indigo-100 transition-colors">
                        {tl(person.names.given).charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {tl(person.names.given)} {tl(person.names.surname)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {person.birth?.date?.year}
                          {person.death?.date?.year && ` – ${person.death.date.year}`}
                          {person.birth?.place && ` · ${tl(person.birth.place.display)}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
