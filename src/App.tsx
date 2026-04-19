import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from './store';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import TreePage from './pages/TreePage';
import TimelinePage from './pages/TimelinePage';
import SettingsPage from './pages/SettingsPage';
import UnassociatedPage from './pages/UnassociatedPage';
import PersonPage from './pages/PersonPage';

// ── Desktop top navigation bar ───────────────────────────────────────────────
function TopNav() {
  const { t } = useTranslation();
  const locale = useUIStore((s) => s.locale);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const title = locale === 'es' ? 'Árbol Pérez' : 'Perez Family Tree';

  return (
    <nav className="hidden md:flex flex-shrink-0 items-center gap-4 px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 shadow-sm">
      {/* Logo + title */}
      <div className="flex items-center gap-2">
        <TreeIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
        <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{title}</span>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {[
          { to: '/',         label: 'Home',         end: true },
          { to: '/browse',   label: t('nav_browse') || 'Browse',  end: false },
          { to: '/tree',     label: t('nav_tree'),   end: false },
          { to: '/timeline', label: t('nav_timeline'), end: false },
          { to: '/unassociated', label: 'Connect', end: false },
          { to: '/settings', label: t('nav_settings'), end: false },
        ].map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isActive
                  ? 'bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 font-medium'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <button
        onClick={toggleTheme}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </nav>
  );
}

// ── Mobile top bar (title + theme toggle only) ───────────────────────────────
function MobileTopBar() {
  const location = useLocation();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const PAGE_TITLES: Record<string, string> = {
    '/':         'Perez Family Tree',
    '/browse':   'Browse',
    '/tree':     'Family Tree',
    '/timeline': 'Timeline',
    '/unassociated': 'Connect Members',
    '/settings': 'Settings',
  };
  const title = PAGE_TITLES[location.pathname] ?? 'Perez Family Tree';

  return (
    <div className="md:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <TreeIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{title}</span>
      </div>
      <button
        onClick={toggleTheme}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        aria-label={theme === 'light' ? 'Dark mode' : 'Light mode'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  );
}

// ── Mobile bottom tab bar ─────────────────────────────────────────────────────
function BottomNav() {
  const tabs = [
    { to: '/',         icon: <HomeIcon />,     label: 'Home',    end: true  },
    { to: '/browse',   icon: <PeopleIcon />,   label: 'Browse',  end: false },
    { to: '/tree',     icon: <TreeTabIcon />,  label: 'Tree',    end: false },
    { to: '/timeline', icon: <TimelineIcon />, label: 'Timeline',end: false },
    { to: '/unassociated', icon: <LinkIcon />, label: 'Connect', end: false },
    { to: '/settings', icon: <GearIcon />,     label: 'Settings',end: false },
  ];

  return (
    <nav
      className="md:hidden flex-shrink-0 flex items-stretch bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 safe-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-400 dark:text-slate-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`w-6 h-6 flex items-center justify-center transition-transform ${isActive ? 'scale-110' : ''}`}>
                {icon}
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
function TreeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-7M9 9l3-7 3 7M5 13h14M8 13v4M16 13v4"/>
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 12L12 4l9 8M5 10v10h5v-5h4v5h5V10"/>
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
  );
}
function TreeTabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="4" r="2"/><circle cx="6" cy="14" r="2"/><circle cx="18" cy="14" r="2"/>
      <line x1="12" y1="6" x2="12" y2="10"/><line x1="12" y1="10" x2="6" y2="12"/><line x1="12" y1="10" x2="18" y2="12"/>
      <line x1="6" y1="16" x2="6" y2="20"/><line x1="18" y1="16" x2="18" y2="20"/>
    </svg>
  );
}
function TimelineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

// ── Root app shell ────────────────────────────────────────────────────────────
export default function App() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <BrowserRouter basename="/perez-family-tree">
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-950">
        <TopNav />
        <MobileTopBar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/"         element={<HomePage />} />
            <Route path="/browse"   element={<BrowsePage />} />
            <Route path="/tree"     element={<TreePage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/unassociated" element={<UnassociatedPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/person/:id" element={<PersonPage />} />
          </Routes>
        </div>

        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
