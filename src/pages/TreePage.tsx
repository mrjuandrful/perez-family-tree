import TreeCanvas from '../components/tree/TreeCanvas';
import ProfilePanel from '../components/profile/ProfilePanel';
import SearchBar from '../components/search/SearchBar';
import FilterPanel from '../components/search/FilterPanel';

export default function TreePage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <SearchBar />
        <FilterPanel />
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <TreeCanvas />
        <ProfilePanel />
      </div>
    </div>
  );
}
