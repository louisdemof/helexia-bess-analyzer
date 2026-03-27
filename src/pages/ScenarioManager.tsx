// src/pages/ScenarioManager.tsx
import { useParams, Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore.ts';

export default function ScenarioManager() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#6692A8]">
        <p className="mb-4">Projeto não encontrado</p>
        <Link to="/" className="text-[#2F927B] hover:underline">Voltar aos projetos</Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Cenários — {project.name}</h2>
      <p className="text-sm text-[#6692A8]">Comparação de cenários — implementação no Step 12</p>
    </div>
  );
}
