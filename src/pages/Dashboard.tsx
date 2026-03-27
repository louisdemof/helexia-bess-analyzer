// src/pages/Dashboard.tsx
import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore.ts';
import type { Folder } from '../engine/types.ts';

const FOLDER_COLORS = ['#004B70', '#2F927B', '#C6DA38', '#f97316', '#8b5cf6', '#ef4444', '#6b7280', '#92400e'];

export default function Dashboard() {
  const {
    projects, folders, loading,
    removeProject, duplicateProject, updateProject,
    createFolder, updateFolder, removeFolder,
    exportProject, importProject,
  } = useProjectStore();
  const navigate = useNavigate();

  const [folderModal, setFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [moveModal, setMoveModal] = useState<string | null>(null); // project id to move
  const [renameModal, setRenameModal] = useState<string | null>(null); // project id to rename
  const [renameName, setRenameName] = useState('');
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0]);
  const [contextMenu, setContextMenu] = useState<{ id: string; type: 'project' | 'folder'; x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-[#6692A8]">Carregando...</div>;
  }

  const rootProjects = projects.filter((p) => !p.folderId);
  const folderMap = new Map<string, typeof projects>();
  for (const f of folders) folderMap.set(f.id, []);
  for (const p of projects) {
    if (p.folderId && folderMap.has(p.folderId)) {
      folderMap.get(p.folderId)!.push(p);
    }
  }

  function openFolderModal(folder?: Folder) {
    if (folder) {
      setEditingFolder(folder);
      setFolderName(folder.name);
      setFolderColor(folder.color);
    } else {
      setEditingFolder(null);
      setFolderName('');
      setFolderColor(FOLDER_COLORS[0]);
    }
    setFolderModal(true);
  }

  async function handleSaveFolder() {
    if (!folderName.trim()) return;
    if (editingFolder) {
      await updateFolder(editingFolder.id, { name: folderName.trim(), color: folderColor });
    } else {
      await createFolder(folderName.trim(), folderColor);
    }
    setFolderModal(false);
  }

  async function handleContextAction(action: string) {
    if (!contextMenu) return;
    const { id, type } = contextMenu;
    setContextMenu(null);
    if (type === 'project') {
      if (action === 'open') navigate(`/project/${id}`);
      if (action === 'duplicate') await duplicateProject(id);
      if (action === 'export') {
        const json = await exportProject(id);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bess-project-${id.slice(0, 8)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      if (action === 'rename') {
        const proj = projects.find((p) => p.id === id);
        setRenameName(proj?.name ?? '');
        setRenameModal(id);
      }
      if (action === 'move') {
        setMoveModal(id);
      }
      if (action === 'delete') {
        if (confirm('Excluir este projeto permanentemente?')) await removeProject(id);
      }
    }
    if (type === 'folder') {
      if (action === 'edit') openFolderModal(folders.find((f) => f.id === id));
      if (action === 'delete') {
        if (confirm('Excluir esta pasta? Os projetos serão movidos para a raiz.')) await removeFolder(id);
      }
    }
  }

  async function handleImport() {
    fileInputRef.current?.click();
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const p = await importProject(text);
      navigate(`/project/${p.id}`);
    } catch {
      alert('Erro ao importar projeto. Verifique o arquivo JSON.');
    }
    e.target.value = '';
  }

  return (
    <div onClick={() => setContextMenu(null)}>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Projetos</h2>
          <p className="text-sm text-[#6692A8]">{projects.length} projeto{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openFolderModal()}
            className="rounded-lg border border-[#6692A8] px-4 py-2 text-sm text-[#6692A8] hover:bg-white/5 transition-colors"
          >
            Nova Pasta
          </button>
          <button
            onClick={handleImport}
            className="rounded-lg border border-[#6692A8] px-4 py-2 text-sm text-[#6692A8] hover:bg-white/5 transition-colors"
          >
            Importar
          </button>
          <Link
            to="/new"
            className="rounded-lg bg-[#2F927B] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 transition-colors"
          >
            + Novo Projeto
          </Link>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />

      {/* Folders */}
      {folders.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#6692A8]">Pastas</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((folder) => {
              const count = folderMap.get(folder.id)?.length ?? 0;
              return (
                <div
                  key={folder.id}
                  className="group cursor-pointer rounded-xl border border-[#2F927B]/20 bg-[#243447] p-4 transition-colors hover:border-[#2F927B]/40"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ id: folder.id, type: 'folder', x: e.clientX, y: e.clientY });
                  }}
                  onClick={() => openFolderModal(folder)}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: folder.color }} />
                    <span className="truncate font-medium text-white">{folder.name}</span>
                  </div>
                  <p className="text-xs text-[#6692A8]">{count} projeto{count !== 1 ? 's' : ''}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Folder contents */}
      {folders.map((folder) => {
        const folderProjects = folderMap.get(folder.id) ?? [];
        if (folderProjects.length === 0) return null;
        return (
          <div key={folder.id} className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: folder.color }} />
              <h3 className="text-sm font-medium text-[#6692A8]">{folder.name}</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folderProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ id: p.id, type: 'project', x: e.clientX, y: e.clientY });
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Root projects */}
      {rootProjects.length > 0 && (
        <div className="mb-6">
          {folders.length > 0 && (
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#6692A8]">Sem pasta</h3>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rootProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ id: p.id, type: 'project', x: e.clientX, y: e.clientY });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#243447]">
            <svg className="h-8 w-8 text-[#6692A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="mb-1 text-lg text-white">Nenhum projeto</p>
          <p className="mb-4 text-sm text-[#6692A8]">Crie um novo projeto para começar a análise BESS</p>
          <Link to="/new" className="rounded-lg bg-[#2F927B] px-6 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 transition-colors">
            Criar Projeto
          </Link>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-[#2F927B]/20 bg-[#243447] py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'project' && (
            <>
              <CtxButton label="Abrir" onClick={() => handleContextAction('open')} />
              <CtxButton label="Renomear" onClick={() => handleContextAction('rename')} />
              <CtxButton label="Duplicar" onClick={() => handleContextAction('duplicate')} />
              {folders.length > 0 && (
                <CtxButton label="Mover para pasta" onClick={() => handleContextAction('move')} />
              )}
              <CtxButton label="Exportar JSON" onClick={() => handleContextAction('export')} />
              <div className="my-1 border-t border-[#2F927B]/20" />
              <CtxButton label="Excluir" onClick={() => handleContextAction('delete')} danger />
            </>
          )}
          {contextMenu.type === 'folder' && (
            <>
              <CtxButton label="Editar pasta" onClick={() => handleContextAction('edit')} />
              <div className="my-1 border-t border-[#2F927B]/20" />
              <CtxButton label="Excluir pasta" onClick={() => handleContextAction('delete')} danger />
            </>
          )}
        </div>
      )}

      {/* Folder Modal */}
      {folderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setFolderModal(false)}>
          <div className="w-full max-w-sm rounded-xl border border-[#2F927B]/20 bg-[#243447] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-white">
              {editingFolder ? 'Editar Pasta' : 'Nova Pasta'}
            </h3>
            <label className="mb-1 block text-sm text-[#6692A8]">Nome</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Nome da pasta"
              className="mb-4 w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white placeholder-[#6692A8]/50 focus:border-[#2F927B] focus:outline-none"
              autoFocus
            />
            <label className="mb-2 block text-sm text-[#6692A8]">Cor</label>
            <div className="mb-6 flex gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    folderColor === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setFolderColor(c)}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFolderModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-[#6692A8] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFolder}
                className="rounded-lg bg-[#2F927B] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 transition-colors"
              >
                {editingFolder ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRenameModal(null)}>
          <div className="w-full max-w-sm rounded-xl border border-[#2F927B]/20 bg-[#243447] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-white">Renomear Projeto</h3>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="Nome do projeto"
              className="mb-4 w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white placeholder-[#6692A8]/50 focus:border-[#2F927B] focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameName.trim()) {
                  updateProject(renameModal, { name: renameName.trim() });
                  setRenameModal(null);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameModal(null)}
                className="rounded-lg px-4 py-2 text-sm text-[#6692A8] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (renameName.trim()) {
                    updateProject(renameModal, { name: renameName.trim() });
                    setRenameModal(null);
                  }
                }}
                className="rounded-lg bg-[#2F927B] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Folder Modal */}
      {moveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setMoveModal(null)}>
          <div className="w-full max-w-sm rounded-xl border border-[#2F927B]/20 bg-[#243447] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-white">Mover para pasta</h3>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  await updateProject(moveModal, { folderId: null });
                  setMoveModal(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors"
              >
                <span className="h-3 w-3 rounded-full border border-[#6692A8]" />
                Sem pasta (raiz)
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={async () => {
                    await updateProject(moveModal, { folderId: f.id });
                    setMoveModal(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: f.color }} />
                  {f.name}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setMoveModal(null)}
                className="rounded-lg px-4 py-2 text-sm text-[#6692A8] hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function ProjectCard({
  project,
  onContextMenu,
}: {
  project: { id: string; name: string; clientName: string; siteAddress: string; updatedAt: string };
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      to={`/project/${project.id}`}
      className="group rounded-xl border border-[#2F927B]/20 bg-[#243447] p-4 transition-colors hover:border-[#2F927B]/40"
      onContextMenu={onContextMenu}
    >
      <h4 className="mb-1 truncate font-medium text-white group-hover:text-[#2F927B] transition-colors">
        {project.name}
      </h4>
      <p className="mb-2 truncate text-sm text-[#6692A8]">{project.clientName}</p>
      {project.siteAddress && (
        <p className="mb-2 truncate text-xs text-[#6692A8]/70">{project.siteAddress}</p>
      )}
      <p className="text-xs text-[#6692A8]/50">
        Atualizado: {new Date(project.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
      </p>
    </Link>
  );
}

function CtxButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-1.5 text-left text-sm transition-colors ${
        danger ? 'text-[#ef4444] hover:bg-[#ef4444]/10' : 'text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );
}
