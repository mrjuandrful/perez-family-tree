import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore, useFamilyTreeStore } from '../../store';

export default function FilterPanel() {
  const { t } = useTranslation();
  const generationFilter = useUIStore((s) => s.generationFilter);
  const surnameFilter = useUIStore((s) => s.surnameFilter);
  const setGenerationFilter = useUIStore((s) => s.setGenerationFilter);
  const setSurnameFilter = useUIStore((s) => s.setSurnameFilter);
  const persons = useFamilyTreeStore((s) => s.data.persons);

  const surnames = useMemo(() => {
    const set = new Set<string>();
    for (const p of Object.values(persons)) {
      if (p.names.surname.en) set.add(p.names.surname.en);
    }
    return Array.from(set).sort();
  }, [persons]);

  function toggleSurname(surname: string) {
    if (surnameFilter.includes(surname)) {
      setSurnameFilter(surnameFilter.filter((s) => s !== surname));
    } else {
      setSurnameFilter([...surnameFilter, surname]);
    }
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      {/* Generation filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 font-medium">{t('filter_generation')}:</label>
        <select
          value={generationFilter}
          onChange={(e) => setGenerationFilter(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-indigo-300"
        >
          <option value={0}>{t('all_generations')}</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* Surname filter */}
      {surnames.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">{t('filter_surname')}:</span>
          <div className="flex gap-1">
            {surnames.map((surname) => (
              <button
                key={surname}
                onClick={() => toggleSurname(surname)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  surnameFilter.includes(surname)
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {surname}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
