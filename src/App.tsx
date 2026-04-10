import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from './store';
import TreePage from './pages/TreePage';
import TimelinePage from './pages/TimelinePage';
import SettingsPage from './pages/SettingsPage';
import PersonPage from './pages/PersonPage';

function Nav() {
  const { t } = useTranslation();
  const locale = useUIStore((s) => s.locale);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const title = locale === 'es' ? 'Árbol Pérez' : 'Perez Family Tree';

  return (
    <nav className="flex-shrink-0 flex items-center gap-6 px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 shadow-sm">
      <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{title}</span>
      <div className="flex items-center gap-1 flex-1">
        {[
          { to: '/', label: t('nav_tree') },
          { to: '/timeline', label: t('nav_timeline') },
          { to: '/settings', label: t('nav_settings') },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-medium'
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
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </nav>
  );
}

export default function App() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <BrowserRouter basename="/perez-family-tree">
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-950">
        <Nav />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<TreePage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/person/:id" element={<PersonPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
