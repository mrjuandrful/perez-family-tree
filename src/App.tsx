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
  const title = locale === 'es' ? 'Árbol Pérez' : 'Perez Family Tree';

  return (
    <nav className="flex-shrink-0 flex items-center gap-6 px-4 py-2.5 bg-white border-b border-gray-100 shadow-sm">
      <span className="font-bold text-gray-900 text-sm">{title}</span>
      <div className="flex items-center gap-1">
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
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/perez-family-tree">
      <div className="flex flex-col h-screen">
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
