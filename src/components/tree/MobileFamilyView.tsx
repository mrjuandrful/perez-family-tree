import { useState, useMemo, useCallback } from 'react';
import { useFamilyTreeStore } from '../../store';
import { useLocale } from '../../hooks/useLocale';
import type { Person, FamilyTreeData, Family } from '../../types';

// ── Data helpers ──────────────────────────────────────────────────────────────

function getParentFamily(personId: string, data: FamilyTreeData): Family | null {
  for (const fam of Object.values(data.families)) {
    if (fam.children.some((c) => c.personId === personId)) return fam;
  }
  return null;
}

function getOwnFamilies(personId: string, data: FamilyTreeData): Family[] {
  return Object.values(data.families).filter((f) =>
    f.partners.some((p) => p.personId === personId)
  );
}

function getSpouses(personId: string, data: FamilyTreeData): { person: Person; dissolved: boolean }[] {
  const seen = new Set<string>();
  const result: { person: Person; dissolved: boolean }[] = [];
  for (const fam of getOwnFamilies(personId, data)) {
    const dissolved = !!(fam as any).dissolved;
    for (const p of fam.partners) {
      if (p.personId === personId || seen.has(p.personId)) continue;
      seen.add(p.personId);
      const sp = data.persons[p.personId];
      if (sp) result.push({ person: sp, dissolved });
    }
  }
  return result;
}

function getChildren(personId: string, data: FamilyTreeData): Person[] {
  const seen = new Set<string>();
  const result: Person[] = [];
  for (const fam of getOwnFamilies(personId, data)) {
    for (const c of fam.children) {
      if (seen.has(c.personId)) continue;
      seen.add(c.personId);
      const child = data.persons[c.personId];
      if (child) result.push(child);
    }
  }
  return result;
}

function getSiblings(personId: string, data: FamilyTreeData): Person[] {
  const fam = getParentFamily(personId, data);
  if (!fam) return [];
  const seen = new Set<string>();
  return fam.children
    .filter((c) => c.personId !== personId && !seen.has(c.personId) && seen.add(c.personId))
    .map((c) => data.persons[c.personId])
    .filter(Boolean) as Person[];
}

// ── Formatting ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(year?: number, month?: number, day?: number): string {
  if (!year) return '';
  if (month && day) return `${MONTHS[month - 1]} ${day}, ${year}`;
  if (month) return `${MONTHS[month - 1]} ${year}`;
  return `${year}`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  person,
  size = 'md',
  light = false,
}: {
  person: Person;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  light?: boolean;
}) {
  const { t } = useLocale();
  const initial = t(person.names.given).charAt(0).toUpperCase();
  const sizeClass = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
  }[size];

  if (light) {
    return (
      <div className={`${sizeClass} rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center flex-shrink-0`}>
        <span className="font-bold text-white">{initial}</span>
      </div>
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 border-2 border-violet-200 dark:border-violet-700 flex items-center justify-center flex-shrink-0`}>
      <span className="font-bold text-violet-600 dark:text-violet-300">{initial}</span>
    </div>
  );
}

// ── Parent card ───────────────────────────────────────────────────────────────

function ParentCard({ person, onNavigate }: { person: Person; onNavigate: (id: string) => void }) {
  const { t } = useLocale();
  const given = t(person.names.given);
  const surname = t(person.names.surname);
  const maiden = person.names.nickname ? t(person.names.nickname) : null;
  const birth = fmtDate(person.birth?.date?.year);
  const hasParents = !!getParentFamily(person.id, useFamilyTreeStore.getState().data);

  return (
    <button
      onClick={() => onNavigate(person.id)}
      className="flex-1 flex flex-col items-center gap-2.5 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-700 active:scale-[0.97] transition-all text-center min-w-0"
    >
      {hasParents && (
        <div className="text-xs text-violet-400 dark:text-violet-500 flex items-center gap-0.5">
          <span>↑</span><span>has parents</span>
        </div>
      )}
      <Avatar person={person} size="md" />
      <div className="min-w-0 w-full">
        <p className="text-xs font-bold text-gray-800 dark:text-slate-200 leading-tight truncate">{given}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-tight truncate">{surname}</p>
        {maiden && <p className="text-xs text-gray-400 dark:text-slate-500 leading-tight">née {maiden}</p>}
        {birth && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">b. {birth}</p>}
      </div>
    </button>
  );
}

// ── Focus card (the main selected person) ─────────────────────────────────────

function FocusCard({
  person,
  spouses,
  isRoot,
  onSpouseNavigate,
}: {
  person: Person;
  spouses: { person: Person; dissolved: boolean }[];
  isRoot: boolean;
  onSpouseNavigate: (id: string) => void;
}) {
  const { t } = useLocale();
  const given = t(person.names.given);
  const surname = t(person.names.surname);
  const maiden = person.names.nickname ? t(person.names.nickname) : null;
  const birth = fmtDate(person.birth?.date?.year, person.birth?.date?.month, person.birth?.date?.day);
  const death = fmtDate(person.death?.date?.year);

  return (
    <div className="mx-4 rounded-2xl overflow-hidden shadow-lg shadow-violet-200/60 dark:shadow-violet-900/40">
      {/* Main person */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 dark:from-violet-700 dark:to-indigo-700 p-5">
        <div className="flex items-start gap-4">
          <Avatar person={person} size="lg" light />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {given} {surname}
                  {person.names.suffix && (
                    <span className="text-white/70 text-sm font-normal ml-1">{person.names.suffix}</span>
                  )}
                </h2>
                {maiden && <p className="text-sm text-violet-200 leading-tight">née {maiden}</p>}
              </div>
              {isRoot && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                  You
                </span>
              )}
            </div>

            <div className="mt-2.5 space-y-1">
              {birth && (
                <p className="text-sm text-violet-100 flex items-center gap-1.5">
                  <span aria-hidden>🎂</span>
                  <span>
                    b. {birth}
                    {death && ` · d. ${death}`}
                  </span>
                </p>
              )}
              {person.living !== false && !death && (
                <p className="text-sm text-violet-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-300 flex-shrink-0" />
                  Living
                </p>
              )}
              {person.birth?.place && (
                <p className="text-sm text-violet-200 flex items-center gap-1.5 truncate">
                  <span aria-hidden>📍</span>
                  <span className="truncate">{t(person.birth.place.display)}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spouses */}
      {spouses.length > 0 && (
        <div className="bg-violet-50 dark:bg-slate-800/80 border-t border-violet-100 dark:border-violet-900/40">
          {spouses.map(({ person: sp, dissolved }) => {
            const spGiven = t(sp.names.given);
            const spSurname = t(sp.names.surname);
            const spMaiden = sp.names.nickname ? t(sp.names.nickname) : null;
            return (
              <button
                key={sp.id}
                onClick={() => onSpouseNavigate(sp.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 active:bg-violet-100 dark:active:bg-violet-900/30 transition-colors text-left"
              >
                <span className="text-xl flex-shrink-0" aria-hidden>{dissolved ? '👥' : '💍'}</span>
                <Avatar person={sp} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-violet-900 dark:text-violet-200 truncate">
                    {spGiven} {spSurname}
                  </p>
                  {dissolved && <p className="text-xs text-gray-400 dark:text-slate-500">Former spouse</p>}
                  {spMaiden && !dissolved && (
                    <p className="text-xs text-violet-500 dark:text-violet-400">née {spMaiden}</p>
                  )}
                </div>
                <span className="text-violet-400 dark:text-violet-500 text-sm flex-shrink-0">›</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sibling chip ──────────────────────────────────────────────────────────────

function SiblingChip({ person, onNavigate }: { person: Person; onNavigate: (id: string) => void }) {
  const { t } = useLocale();
  const given = t(person.names.given);
  const surname = t(person.names.surname);
  return (
    <button
      onClick={() => onNavigate(person.id)}
      className="flex-shrink-0 flex items-center gap-2 pl-2 pr-3 py-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:scale-95 transition-all"
    >
      <Avatar person={person} size="xs" />
      <span className="text-sm text-gray-700 dark:text-slate-300 font-medium whitespace-nowrap">
        {given} {surname.charAt(0)}.
      </span>
    </button>
  );
}

// ── Child card ────────────────────────────────────────────────────────────────

function ChildCard({ person, onNavigate }: { person: Person; onNavigate: (id: string) => void }) {
  const { t } = useLocale();
  const data = useFamilyTreeStore((s) => s.data);
  const given = t(person.names.given);
  const surname = t(person.names.surname);
  const birth = fmtDate(person.birth?.date?.year);
  const hasChildren = getChildren(person.id, data).length > 0;
  const spouses = getSpouses(person.id, data);

  return (
    <button
      onClick={() => onNavigate(person.id)}
      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-700 active:scale-[0.97] transition-all text-center w-full"
    >
      <Avatar person={person} size="md" />
      <div className="w-full min-w-0">
        <p className="text-xs font-bold text-gray-800 dark:text-slate-200 leading-tight truncate">{given}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-tight truncate">{surname}</p>
        {birth && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">b. {birth}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {person.living !== false && (
          <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">Living</span>
        )}
        {spouses.length > 0 && (
          <span className="text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full">
            ♥ married
          </span>
        )}
        {hasChildren && (
          <span className="text-xs bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-full">
            has children ↓
          </span>
        )}
      </div>
    </button>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-3">
      {children}
    </p>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-1">
      <div className="w-px h-5 bg-gradient-to-b from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MobileFamilyView() {
  const data = useFamilyTreeStore((s) => s.data);
  const { t } = useLocale();
  const rootId = data.meta.rootPersonId ?? Object.keys(data.persons)[0];

  const [focusId, setFocusId] = useState<string>(rootId);
  const [history, setHistory] = useState<string[]>([]);

  const navigateTo = useCallback((id: string) => {
    setHistory((h) => [...h, focusId]);
    setFocusId(id);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }, [focusId]);

  const navigateBack = useCallback(() => {
    if (history.length === 0) return;
    setFocusId(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }, [history]);

  const person = data.persons[focusId];
  const parentFam = useMemo(() => getParentFamily(focusId, data), [focusId, data]);
  const parents = useMemo(
    () => (parentFam?.partners.map((p) => data.persons[p.personId]).filter(Boolean) as Person[]) ?? [],
    [parentFam, data]
  );
  const spouses = useMemo(() => getSpouses(focusId, data), [focusId, data]);
  const children = useMemo(() => getChildren(focusId, data), [focusId, data]);
  const siblings = useMemo(() => getSiblings(focusId, data), [focusId, data]);

  // Build short breadcrumb from history
  const breadcrumb = useMemo(() => {
    if (history.length === 0) return [];
    const last2 = history.slice(-2);
    return last2.map((id) => {
      const p = data.persons[id];
      return p ? t(p.names.given) : '?';
    });
  }, [history, data, t]);

  if (!person) return null;

  const childCols =
    children.length === 1 ? 'grid-cols-1' :
    children.length === 2 ? 'grid-cols-2' :
    'grid-cols-3';

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">

      {/* ── Sticky breadcrumb nav ── */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2 px-4 py-3 min-h-[48px]">
          {history.length > 0 ? (
            <button
              onClick={navigateBack}
              className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 text-sm font-semibold min-h-[44px] pr-3"
              aria-label="Go back"
            >
              <span className="text-base">←</span>
              <span className="truncate max-w-[120px]">
                {breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : 'Back'}
              </span>
            </button>
          ) : (
            <span className="text-sm text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
              <span aria-hidden>🌳</span>
              <span>Family Tree</span>
            </span>
          )}

          {breadcrumb.length > 1 && (
            <span className="text-gray-300 dark:text-slate-600 text-sm flex items-center gap-1.5 truncate">
              <span>···</span>
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {history.length} {history.length === 1 ? 'level' : 'levels'} back
              </span>
            </span>
          )}

          <div className="ml-auto">
            <button
              onClick={() => { setFocusId(rootId); setHistory([]); }}
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                focusId === rootId
                  ? 'text-violet-400 dark:text-violet-500 cursor-default'
                  : 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 active:bg-violet-100'
              }`}
              disabled={focusId === rootId}
            >
              Home
            </button>
          </div>
        </div>
      </div>

      <div className="pb-10 space-y-0">

        {/* ── Parents ── */}
        <div className="pt-5 px-4">
          {parents.length > 0 ? (
            <>
              <SectionLabel>Parents</SectionLabel>
              <div className="flex gap-3">
                {parents.map((p) => (
                  <ParentCard key={p.id} person={p} onNavigate={navigateTo} />
                ))}
              </div>
              <Connector />
            </>
          ) : (
            <div className="flex flex-col items-center py-3 mb-1">
              <div className="text-xs text-gray-300 dark:text-slate-600 italic flex items-center gap-1.5">
                <span>↑</span><span>No parents recorded</span>
              </div>
              <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mt-2" />
            </div>
          )}
        </div>

        {/* ── Focus person ── */}
        <FocusCard
          person={person}
          spouses={spouses}
          isRoot={focusId === rootId}
          onSpouseNavigate={navigateTo}
        />

        {/* ── Siblings ── */}
        {siblings.length > 0 && (
          <div className="px-4 pt-4">
            <SectionLabel>Siblings</SectionLabel>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
              {siblings.map((s) => (
                <SiblingChip key={s.id} person={s} onNavigate={navigateTo} />
              ))}
            </div>
          </div>
        )}

        {/* ── Children ── */}
        {children.length > 0 ? (
          <div className="px-4 pt-5">
            <Connector />
            <SectionLabel>Children</SectionLabel>
            <div className={`grid ${childCols} gap-3`}>
              {children.map((c) => (
                <ChildCard key={c.id} person={c} onNavigate={navigateTo} />
              ))}
            </div>
          </div>
        ) : spouses.length > 0 ? (
          <div className="pt-3 text-center">
            <p className="text-xs text-gray-300 dark:text-slate-600 italic">No children recorded</p>
          </div>
        ) : null}

        {/* ── Empty state ── */}
        {parents.length === 0 && children.length === 0 && spouses.length === 0 && siblings.length === 0 && (
          <div className="mt-6 text-center px-6">
            <p className="text-sm text-gray-400 dark:text-slate-500">
              No family connections recorded for this person yet.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
