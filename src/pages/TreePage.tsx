import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TreeCanvas from '../components/tree/TreeCanvas';
import ProfilePanel from '../components/profile/ProfilePanel';
import SearchBar from '../components/search/SearchBar';
import FilterPanel from '../components/search/FilterPanel';

function MobileTreePrompt({ onViewAnyway }: { onViewAnyway: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center bg-gradient-to-b from-violet-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="text-6xl mb-5" aria-hidden="true">🌳</div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-50 mb-2">
        Tree view works best on a bigger screen
      </h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mb-8 max-w-xs">
        The full diagram has many family members and is hard to navigate on a phone. Try Browse for a mobile-friendly experience.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => navigate('/browse')}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transition-all"
        >
          <span className="text-xl" aria-hidden="true">👥</span>
          Browse People
        </button>

        <button
          onClick={onViewAnyway}
          className="w-full py-3 px-5 rounded-2xl border border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          View tree anyway
        </button>
      </div>
    </div>
  );
}

export default function TreePage() {
  const [showTreeOnMobile, setShowTreeOnMobile] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile prompt — hidden on md+ screens */}
      {!showTreeOnMobile && (
        <div className="md:hidden flex-1 flex flex-col overflow-hidden">
          <MobileTreePrompt onViewAnyway={() => setShowTreeOnMobile(true)} />
        </div>
      )}

      {/* Full tree — always shown on desktop, shown on mobile only after "View anyway" */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!showTreeOnMobile ? 'hidden md:flex' : 'flex'}`}>
        {/* Toolbar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          {showTreeOnMobile && (
            <button
              onClick={() => setShowTreeOnMobile(false)}
              className="md:hidden text-violet-600 dark:text-violet-400 text-sm font-medium mr-1 flex-shrink-0"
            >
              ← Back
            </button>
          )}
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
    </div>
  );
}
