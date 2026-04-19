import { useState, useMemo } from 'react';
import { useFamilyTreeStore } from '../store';
import { useLocale } from '../hooks/useLocale';

export default function UnassociatedPage() {
  const { t } = useLocale();
  const data = useFamilyTreeStore((s) => s.data);
  const [search, setSearch] = useState('');

  // Get unassociated people
  const unassociated = useMemo(() => {
    return Object.values(data.persons)
      .filter((p) => (p as any).associated === false)
      .sort((a, b) => {
        const aName = `${t(a.names.given)} ${t(a.names.surname)}`;
        const bName = `${t(b.names.given)} ${t(b.names.surname)}`;
        return aName.localeCompare(bName);
      });
  }, [data, t]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return unassociated;
    const q = search.toLowerCase();
    return unassociated.filter((p) => {
      const name = `${t(p.names.given)} ${t(p.names.surname)}`.toLowerCase();
      const maiden = p.names.nickname ? t(p.names.nickname).toLowerCase() : '';
      return name.includes(q) || maiden.includes(q);
    });
  }, [unassociated, search, t]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-50 mb-3">
          {unassociated.length} Members to Connect
        </h1>
        <input
          type="text"
          placeholder="Search name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
            {search.trim() ? (
              <>
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-500 dark:text-slate-400">No members match "{search}"</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">✓</div>
                <p className="text-gray-500 dark:text-slate-400">All members are connected!</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.map((person) => {
              const given = t(person.names.given);
              const surname = t(person.names.surname);
              const maiden = person.names.nickname ? t(person.names.nickname) : null;
              const note = (person as any).note;
              const initial = given.charAt(0).toUpperCase();

              return (
                <div
                  key={person.id}
                  className="px-4 py-4 hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 border border-violet-200 dark:border-violet-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-violet-600 dark:text-violet-300 font-bold text-sm">{initial}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-slate-50">
                        {given} {surname}
                      </p>
                      {maiden && (
                        <p className="text-xs text-gray-500 dark:text-slate-400">née {maiden}</p>
                      )}
                      {person.birth?.date?.year && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                          b. {person.birth.date.year}
                        </p>
                      )}
                      {note && (
                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 italic">
                          {note}
                        </p>
                      )}
                    </div>

                    {/* Tag */}
                    {person.tags?.[0] && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex-shrink-0">
                        {person.tags[0].replace('-line', '')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
