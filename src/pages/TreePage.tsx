import TreeCanvas from '../components/tree/TreeCanvas';
import ProfilePanel from '../components/profile/ProfilePanel';
import SearchBar from '../components/search/SearchBar';
import FilterPanel from '../components/search/FilterPanel';
import { useUIStore } from '../store';

const FAMILY_TABS = [
  { label: 'All', surnames: [] },
  { label: 'Perez', surnames: ['Perez'] },
  { label: 'Zitt', surnames: ['Zitt'] },
  { label: 'Santana', surnames: ['Santana'] },
  { label: 'Martinez', surnames: ['Martinez'] },
  { label: 'Safanova', surnames: ['Safanova'] },
];

export default function TreePage() {
  const surnameFilter = useUIStore((s) => s.surnameFilter);
  const setSurnameFilter = useUIStore((s) => s.setSurnameFilter);

  function activeTab() {
    if (surnameFilter.length === 0) return 'All';
    const tab = FAMILY_TABS.find(
      (t) => t.surnames.length === surnameFilter.length && t.surnames.every((s) => surnameFilter.includes(s))
    );
    return tab?.label ?? null;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Family line tabs */}
      <div className="flex items-center gap-1 px-4 pt-2 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
        {FAMILY_TABS.map(({ label, surnames }) => (
          <button
            key={label}
            onClick={() => setSurnameFilter(surnames)}
            className={`px-4 py-1.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab() === label
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
        <SearchBar />
        <FilterPanel />
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <TreeCanvas />
        </div>
        <ProfilePanel />
      </div>
    </div>
  );
}
