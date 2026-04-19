import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFamilyTreeStore, useUIStore } from '../store';
import { useLocale } from '../hooks/useLocale';
import type { Person } from '../types';
import ProfileSheet from '../components/profile/ProfileSheet';

const BRANCH_LABELS: Record<string, string> = {
  'perez-line':    'Pérez',
  'zitt-line':     'Zitt',
  'santana-line':  'Santana',
  'martinez-line': 'Martínez',
  'safanova-line': 'Safanova',
};

const BRANCH_COLORS: Record<string, string> = {
  'perez-line':    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'zitt-line':     'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'santana-line':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'martinez-line': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'safanova-line': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatYear(year?: number, month?: number, day?: number) {
  if (!year) return null;
  if (month && day) return `${MONTHS[month - 1]} ${day}, ${year}`;
  if (month) return `${MONTHS[month - 1]} ${year}`;
  return `${year}`;
}

function PersonCard({ person, onSelect }: { person: Person; onSelect: (id: string) => void }) {
  const { t } = useLocale();
  const data = useFamilyTreeStore((s) => s.data);

  const fullName = `${t(person.names.given)} ${t(person.names.surname)}`;
  const maiden = person.names.nickname ? t(person.names.nickname) : null;
  const birthYear = formatYear(person.birth?.date?.year, person.birth?.date?.month);
  const deathYear = person.death?.date?.year;
  const primaryTag = person.tags?.[0];
  const photoPath = person.profilePhotoId
    ? data.media[person.profilePhotoId]?.path
    : null;

  const initial = t(person.names.given).charAt(0).toUpperCase();

  return (
    <button
      onClick={() => onSelect(person.id)}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/60 hover:bg-gray-50 dark:hover:bg-slate-700/60 active:bg-gray-100 dark:active:bg-slate-700 transition-colors text-left"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 border border-violet-100 dark:border-violet-800/40 flex items-center justify-center">
        {photoPath ? (
          <img src={photoPath} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-violet-600 dark:text-violet-300 text-base font-bold">{initial}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{fullName}</p>
          {person.living === false && (
            <span className="text-xs text-gray-400 dark:text-slate-500">†</span>
          )}
        </div>
        {maiden && (
          <p className="text-xs text-gray-400 dark:text-slate-500 leading-tight">née {maiden}</p>
        )}
        <p className="text-xs text-gray-400 dark:text-slate-500 leading-tight mt-0.5">
          {birthYear ? `b. ${birthYear}` : ''}
          {deathYear ? ` – d. ${deathYear}` : ''}
        </p>
      </div>

      {/* Branch tag */}
      {primaryTag && BRANCH_LABELS[primaryTag] && (
        <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${BRANCH_COLORS[primaryTag] ?? 'bg-gray-100 text-gray-500'}`}>
          {BRANCH_LABELS[primaryTag]}
        </span>
      )}

      <span className="text-gray-300 dark:text-slate-600 text-sm flex-shrink-0">›</span>
    </button>
  );
}

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBranch = searchParams.get('branch') ?? '';

  const [query, setQuery] = useState('');
  const [activeBranch, setActiveBranch] = useState(initialBranch);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const persons = useFamilyTreeStore((s) => s.data.persons);
  const setSelectedPerson = useUIStore((s) => s.setSelectedPerson);

  // Sync URL param → local state
  useEffect(() => {
    const b = searchParams.get('branch') ?? '';
    setActiveBranch(b);
  }, [searchParams]);

  const allBranches = useMemo(() => {
    const seen = new Set<string>();
    for (const p of Object.values(persons)) {
      for (const tag of p.tags ?? []) {
        if (BRANCH_LABELS[tag]) seen.add(tag);
      }
    }
    return Array.from(seen);
  }, [persons]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(persons)
      .filter((p) => {
        if (activeBranch && !(p.tags ?? []).includes(activeBranch)) return false;
        if (!q) return true;
        const given = p.names.given.en.toLowerCase();
        const surname = p.names.surname.en.toLowerCase();
        const nick = p.names.nickname?.en.toLowerCase() ?? '';
        return given.includes(q) || surname.includes(q) || nick.includes(q) ||
               `${given} ${surname}`.includes(q);
      })
      .sort((a, b) => {
        const aName = `${a.names.given.en} ${a.names.surname.en}`;
        const bName = `${b.names.given.en} ${b.names.surname.en}`;
        return aName.localeCompare(bName);
      });
  }, [persons, query, activeBranch]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setSelectedPerson(id);
  }

  function handleBranchClick(tag: string) {
    const next = activeBranch === tag ? '' : tag;
    setActiveBranch(next);
    if (next) setSearchParams({ branch: next });
    else setSearchParams({});
  }

  function clearBranch() {
    setActiveBranch('');
    setSearchParams({});
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-950">
        {/* Search + filter header */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 shadow-sm">
          {/* Search bar */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 text-sm pointer-events-none" aria-hidden="true">
                🔍
              </span>
              <input
                ref={inputRef}
                type="search"
                inputMode="search"
                autoComplete="off"
                placeholder="Search by name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-600 transition"
              />
            </div>
          </div>

          {/* Branch filter chips */}
          {allBranches.length > 1 && (
            <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <button
                onClick={clearBranch}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  !activeBranch
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-transparent text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-400'
                }`}
              >
                All
              </button>
              {allBranches.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleBranchClick(tag)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    activeBranch === tag
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-transparent text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-400'
                  }`}
                >
                  {BRANCH_LABELS[tag]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="px-4 py-2 flex-shrink-0">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
            {activeBranch && ` · ${BRANCH_LABELS[activeBranch]} branch`}
          </p>
        </div>

        {/* Person list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <span className="text-4xl mb-3" aria-hidden="true">🔍</span>
              <p className="text-sm text-gray-500 dark:text-slate-400">No family members found.</p>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="mt-3 text-xs text-violet-600 dark:text-violet-400 underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl mx-3 my-1 overflow-hidden border border-gray-100 dark:border-slate-700">
              {filtered.map((person) => (
                <PersonCard key={person.id} person={person} onSelect={handleSelect} />
              ))}
            </div>
          )}
          {/* Bottom padding so last item clears mobile nav */}
          <div className="h-4" />
        </div>
      </div>

      {/* Person detail sheet */}
      {selectedId && (
        <ProfileSheet
          personId={selectedId}
          onClose={() => { setSelectedId(null); setSelectedPerson(null); }}
        />
      )}
    </>
  );
}
