// src/components/layout/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore.ts';

const NAV_ITEMS = [
  { path: '/', label: 'Projetos', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/new', label: 'Novo Projeto', icon: 'M12 4v16m8-8H4' },
];

export default function Sidebar() {
  const location = useLocation();
  const projects = useProjectStore((s) => s.projects);

  return (
    <aside className="flex w-60 flex-col border-r border-[#2F927B]/20 bg-[#243447]">
      {/* Logo */}
      <div className="px-5 py-5">
        <Link to="/" className="block">
          <img
            src={`${import.meta.env.BASE_URL}helexia-logo.svg`}
            alt="Helexia"
            className="mb-2" style={{ height: 55 }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}helexia-logo.png`;
            }}
          />
          <span className="text-xs font-medium tracking-wider text-[#6692A8]">BESS ANALYSER</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-[#2F927B]/20 text-[#2F927B]'
                  : 'text-[#6692A8] hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}

        {/* Recent projects */}
        {projects.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-[#6692A8]">
              Recentes
            </p>
            {projects.slice(0, 8).map((p) => (
              <Link
                key={p.id}
                to={`/project/${p.id}`}
                className={`flex items-center gap-2 truncate rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  location.pathname === `/project/${p.id}`
                    ? 'bg-[#2F927B]/20 text-[#2F927B]'
                    : 'text-[#6692A8] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#2F927B]" />
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2F927B]/20 px-5 py-3">
        <p className="text-xs text-[#6692A8]">Helexia Brasil</p>
      </div>
    </aside>
  );
}
