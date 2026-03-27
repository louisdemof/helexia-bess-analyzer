// src/components/layout/TopBar.tsx
import { useLocation, useParams, Link } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore.ts';

const TITLES: Record<string, string> = {
  '/': 'Projetos',
  '/new': 'Novo Projeto',
};

export default function TopBar() {
  const location = useLocation();
  const params = useParams();
  const projects = useProjectStore((s) => s.projects);

  let title = TITLES[location.pathname] ?? '';
  const breadcrumb: { label: string; path: string }[] = [];

  if (params.id) {
    const project = projects.find((p) => p.id === params.id);
    const projectName = project?.name ?? 'Projeto';

    if (location.pathname.startsWith('/project/')) {
      title = projectName;
      breadcrumb.push({ label: 'Projetos', path: '/' });
    } else if (location.pathname.startsWith('/results/')) {
      title = 'Resultados';
      breadcrumb.push({ label: 'Projetos', path: '/' });
      breadcrumb.push({ label: projectName, path: `/project/${params.id}` });
    } else if (location.pathname.startsWith('/scenarios/')) {
      title = 'Cenários';
      breadcrumb.push({ label: 'Projetos', path: '/' });
      breadcrumb.push({ label: projectName, path: `/project/${params.id}` });
    }
  }

  return (
    <header className="flex h-14 items-center border-b border-[#2F927B]/20 bg-[#243447] px-6">
      <div className="flex items-center gap-2">
        {breadcrumb.map((b, i) => (
          <span key={b.path} className="flex items-center gap-2">
            <Link to={b.path} className="text-sm text-[#6692A8] hover:text-white transition-colors">
              {b.label}
            </Link>
            {i < breadcrumb.length && (
              <span className="text-[#6692A8]">/</span>
            )}
          </span>
        ))}
        <h1 className="text-base font-semibold text-white">{title}</h1>
      </div>
    </header>
  );
}
