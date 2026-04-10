import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../hooks/useSearch';
import { useLocale } from '../../hooks/useLocale';
import { useUIStore } from '../../store';
import type { Person } from '../../types';

export default function SearchBar() {
  const { t } = useTranslation();
  const { t: tl } = useLocale();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const results = useSearch(query);
  const setSelectedPerson = useUIStore((s) => s.setSelectedPerson);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOpen(results.length > 0 && query.length > 0);
  }, [results.length, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(person: Person) {
    setSelectedPerson(person.id);
    setQuery('');
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-64">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('search_placeholder')}
        className="w-full px-3 py-1.5 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:border-indigo-300 focus:bg-white transition-colors"
      />

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden">
          {results.map((person) => (
            <button
              key={person.id}
              onClick={() => handleSelect(person)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-400 text-xs font-semibold">
                {tl(person.names.given).charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {tl(person.names.given)} {tl(person.names.surname)}
                </p>
                {person.birth?.date?.year && (
                  <p className="text-xs text-gray-400">{person.birth.date.year}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
