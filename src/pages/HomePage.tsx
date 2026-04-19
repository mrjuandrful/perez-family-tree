import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyTreeStore } from '../store';

const BRANCH_CONFIG: Record<string, { label: string; color: string; bg: string; dark: string }> = {
  'perez-line':    { label: 'Pérez',    color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-900/30', dark: 'border-violet-200 dark:border-violet-700' },
  'zitt-line':     { label: 'Zitt',     color: 'text-sky-700 dark:text-sky-300',       bg: 'bg-sky-50 dark:bg-sky-900/30',       dark: 'border-sky-200 dark:border-sky-700'     },
  'santana-line':  { label: 'Santana',  color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/30', dark: 'border-emerald-200 dark:border-emerald-700' },
  'martinez-line': { label: 'Martínez', color: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-50 dark:bg-amber-900/30',   dark: 'border-amber-200 dark:border-amber-700' },
  'safanova-line': { label: 'Safanova', color: 'text-rose-700 dark:text-rose-300',     bg: 'bg-rose-50 dark:bg-rose-900/30',     dark: 'border-rose-200 dark:border-rose-700'   },
};

function TreeLogoSVG() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="w-20 h-20 mx-auto mb-4 drop-shadow-md"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#4f46e5"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="22" fill="url(#hbg)"/>
      {/* trunk */}
      <rect x="55" y="72" width="10" height="28" rx="4" fill="#92400e"/>
      <rect x="40" y="95" width="40" height="7" rx="3" fill="#92400e" opacity="0.7"/>
      {/* canopy */}
      <circle cx="60" cy="52" r="26" fill="#16a34a" opacity="0.9"/>
      <circle cx="38" cy="64" r="17" fill="#22c55e" opacity="0.85"/>
      <circle cx="82" cy="64" r="17" fill="#22c55e" opacity="0.85"/>
      <circle cx="60" cy="37" r="18" fill="#4ade80" opacity="0.75"/>
      {/* fruits */}
      <circle cx="50" cy="44" r="4" fill="#fbbf24"/>
      <circle cx="70" cy="42" r="3.5" fill="#f87171"/>
      <circle cx="60" cy="55" r="3" fill="#fbbf24"/>
      <circle cx="42" cy="58" r="3" fill="#f87171"/>
      <circle cx="78" cy="57" r="3.5" fill="#fbbf24"/>
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const persons = useFamilyTreeStore((s) => s.data.persons);

  const { totalPeople, livingPeople, branchCounts } = useMemo(() => {
    const all = Object.values(persons);
    const living = all.filter((p) => p.living !== false).length;

    const counts: Record<string, number> = {};
    for (const p of all) {
      for (const tag of p.tags ?? []) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return { totalPeople: all.length, livingPeople: living, branchCounts: counts };
  }, [persons]);

  const knownBranches = Object.keys(BRANCH_CONFIG).filter((b) => branchCounts[b] > 0);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-violet-50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      {/* Hero */}
      <div className="px-5 pt-10 pb-8 text-center max-w-lg mx-auto">
        <TreeLogoSVG />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-50 tracking-tight">
          Perez Family Tree
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-slate-400 leading-relaxed">
          Explore generations of the Perez family — from grandparents to grandchildren, across every branch.
        </p>

        {/* Stats pills */}
        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
            <span className="text-base font-bold">{totalPeople}</span> family members
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
            {livingPeople} living
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
            {knownBranches.length} branches
          </span>
        </div>
      </div>

      {/* Primary CTAs */}
      <div className="px-4 max-w-sm mx-auto space-y-3 pb-4">
        <button
          onClick={() => navigate('/browse')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transition-all"
        >
          <span className="text-2xl" aria-hidden="true">👥</span>
          <div className="text-left">
            <p className="font-semibold text-base">Browse People</p>
            <p className="text-xs text-violet-200">Search and tap any family member</p>
          </div>
          <span className="ml-auto text-violet-300 text-lg">›</span>
        </button>

        <button
          onClick={() => navigate('/tree')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
        >
          <span className="text-2xl" aria-hidden="true">🌳</span>
          <div className="text-left">
            <p className="font-semibold text-base">Family Tree</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Visualize all connections</p>
          </div>
          <span className="ml-auto text-gray-300 dark:text-slate-600 text-lg">›</span>
        </button>

        <button
          onClick={() => navigate('/timeline')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
        >
          <span className="text-2xl" aria-hidden="true">📅</span>
          <div className="text-left">
            <p className="font-semibold text-base">Timeline</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Family history by decade</p>
          </div>
          <span className="ml-auto text-gray-300 dark:text-slate-600 text-lg">›</span>
        </button>
      </div>

      {/* Family Branches */}
      {knownBranches.length > 0 && (
        <section className="px-4 pb-6 max-w-lg mx-auto">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">
            Family Branches
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {knownBranches.map((tag) => {
              const cfg = BRANCH_CONFIG[tag];
              const count = branchCounts[tag] ?? 0;
              return (
                <button
                  key={tag}
                  onClick={() => navigate(`/browse?branch=${tag}`)}
                  className={`flex flex-col items-start p-3.5 rounded-xl border ${cfg.bg} ${cfg.dark} hover:brightness-95 active:scale-[0.98] transition-all text-left`}
                >
                  <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {count} {count === 1 ? 'person' : 'people'}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* How to use */}
      <section className="px-4 pb-10 max-w-lg mx-auto">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">
          How to Use
        </h2>
        <div className="space-y-2.5">
          {[
            { icon: '🔍', text: 'Tap Browse to search any family member by name.' },
            { icon: '👤', text: 'Tap a person card to see parents, siblings, spouse, and children.' },
            { icon: '🌳', text: 'Use the Tree view on a bigger screen for the full diagram.' },
            { icon: '📱', text: 'Install this app on your phone: tap Share → Add to Home Screen.' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
              <span className="text-lg leading-none mt-0.5" aria-hidden="true">{icon}</span>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-snug">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
