import TreeCanvas from '../components/tree/TreeCanvas';
import ProfilePanel from '../components/profile/ProfilePanel';
import SearchBar from '../components/search/SearchBar';
import FilterPanel from '../components/search/FilterPanel';

export default function TreePage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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
