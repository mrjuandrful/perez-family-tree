import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore, useFamilyTreeStore } from '../../store';

// Convert a tag like "zitt-line" → "Zitt"
function tagLabel(tag: string): string {
  return tag.replace(/-line$/, '').replace(/^\w/, (c) => c.toUpperCase());
}

export default function FilterPanel() {
  const { t } = useTranslation();
  const generationFilter = useUIStore((s) => s.generationFilter);
  const surnameFilter = useUIStore((s) => s.surnameFilter);
  const setGenerationFilter = useUIStore((s) => s.setGenerationFilter);
  const setSurnameFilter = useUIStore((s) => s.setSurnameFilter);
  const persons = useFamilyTreeStore((s) => s.data.persons);

  const familyLines = useMemo(() => {
    const set = new Set<string>();
    for (const p of Object.values(persons)) {
      for (const tag of (p.tags ?? [])) {
        if (tag.endsWith('-line')) set.add(tag);
      }
    }
    return Array.from(set).sort();
  }, [persons]);

  function toggleLine(tag: string) {
    if (surnameFilter.includes(tag)) {
      setSurnameFilter(surnameFilter.filter((s) => s !== tag));
    } else {
      setSurnameFilter([...surnameFilter, tag]);
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

      {/* Family line filter */}
      {familyLines.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Family line:</span>
          <div className="flex gap-1">
            {familyLines.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleLine(tag)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  surnameFilter.includes(tag)
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {tagLabel(tag)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
