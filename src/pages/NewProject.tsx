// src/pages/NewProject.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore.ts';

export default function NewProject() {
  const navigate = useNavigate();
  const { createProject, folders } = useProjectStore();

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !clientName.trim()) return;
    setSubmitting(true);
    try {
      const project = await createProject(name.trim(), clientName.trim(), siteAddress.trim(), folderId);
      navigate(`/project/${project.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-6 text-2xl font-bold text-white">Novo Projeto</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Project Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#6692A8]">Nome do Projeto *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: COELBA A4 — Shopping Paralela"
            className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-4 py-2.5 text-white placeholder-[#6692A8]/50 focus:border-[#2F927B] focus:outline-none"
            autoFocus
            required
          />
        </div>

        {/* Client Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#6692A8]">Nome do Cliente *</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: Shopping Paralela S.A."
            className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-4 py-2.5 text-white placeholder-[#6692A8]/50 focus:border-[#2F927B] focus:outline-none"
            required
          />
        </div>

        {/* Site Address */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#6692A8]">Endereço do Site</label>
          <input
            type="text"
            value={siteAddress}
            onChange={(e) => setSiteAddress(e.target.value)}
            placeholder="Ex: Av. Luís Viana, 8544 — Salvador, BA"
            className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-4 py-2.5 text-white placeholder-[#6692A8]/50 focus:border-[#2F927B] focus:outline-none"
          />
        </div>

        {/* Folder selection */}
        {folders.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[#6692A8]">Pasta</label>
            <select
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-4 py-2.5 text-white focus:border-[#2F927B] focus:outline-none"
            >
              <option value="">Sem pasta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-[#6692A8] px-6 py-2.5 text-sm text-[#6692A8] hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !clientName.trim()}
            className="rounded-lg bg-[#2F927B] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2F927B]/80 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Criando...' : 'Criar Projeto'}
          </button>
        </div>
      </form>
    </div>
  );
}
