// src/store/projectStore.ts
import { create } from 'zustand';
import type { BESSProject, Folder } from '../engine/types.ts';
import {
  DEFAULT_ECONOMIC_PARAMS,
  DEFAULT_LOAD_DATA,
  DEFAULT_BATTERY_PARAMS,
  DEFAULT_GRID_PARAMS,
  DEFAULT_EMS_PARAMS,
  DEFAULT_OPT_LIMITS,
  DEFAULT_SIZING_PARAMS,
} from '../engine/types.ts';
import {
  getAllProjects,
  getProject,
  putProject,
  deleteProject as dbDeleteProject,
  getAllFolders,
  putFolder,
  deleteFolder as dbDeleteFolder,
} from '../storage/projectDB.ts';

/** Fill missing fields on projects loaded from IndexedDB with current defaults. */
function migrateProject(p: BESSProject): BESSProject {
  return {
    ...p,
    economicParams: { ...DEFAULT_ECONOMIC_PARAMS, ...p.economicParams },
    batteryParams: {
      ...DEFAULT_BATTERY_PARAMS,
      ...p.batteryParams,
      degradationTable: p.batteryParams?.degradationTable ?? [...DEFAULT_BATTERY_PARAMS.degradationTable],
    },
    gridParams: {
      ...DEFAULT_GRID_PARAMS,
      ...p.gridParams,
      aclEnergyPriceTable: p.gridParams?.aclEnergyPriceTable ?? [...DEFAULT_GRID_PARAMS.aclEnergyPriceTable],
    },
    emsParams: { ...DEFAULT_EMS_PARAMS, ...p.emsParams },
    optimizationLimits: { ...DEFAULT_OPT_LIMITS, ...p.optimizationLimits },
    sizingParams: { ...DEFAULT_SIZING_PARAMS, ...p.sizingParams },
  };
}

interface ProjectStore {
  // State
  projects: BESSProject[];
  folders: Folder[];
  currentProjectId: string | null;
  loading: boolean;

  // Init
  hydrate: () => Promise<void>;

  // Project CRUD
  createProject: (name: string, clientName: string, siteAddress: string, folderId?: string | null) => Promise<BESSProject>;
  updateProject: (id: string, updates: Partial<BESSProject>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<BESSProject>;
  loadProject: (id: string) => Promise<BESSProject | undefined>;
  setCurrentProject: (id: string | null) => void;

  // Folder CRUD
  createFolder: (name: string, color: string) => Promise<Folder>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;

  // Scenario
  addScenario: (projectId: string, scenarioName: string) => Promise<void>;
  removeScenario: (projectId: string, scenarioId: string) => Promise<void>;

  // Import/Export
  exportProject: (id: string) => Promise<string>;
  importProject: (json: string) => Promise<BESSProject>;
}

function generateId(): string {
  return crypto.randomUUID();
}

function createNewProject(
  name: string,
  clientName: string,
  siteAddress: string,
  folderId: string | null = null,
): BESSProject {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    clientName,
    siteAddress,
    folderId,
    createdAt: now,
    updatedAt: now,
    economicParams: { ...DEFAULT_ECONOMIC_PARAMS },
    loadData: {
      ...DEFAULT_LOAD_DATA,
      monthlyInvoice: DEFAULT_LOAD_DATA.monthlyInvoice.map((r) => ({ ...r })),
      hourlyKVA: [...DEFAULT_LOAD_DATA.hourlyKVA],
      monthlySeasonality: [...DEFAULT_LOAD_DATA.monthlySeasonality],
    },
    batteryParams: {
      ...DEFAULT_BATTERY_PARAMS,
      degradationTable: [...DEFAULT_BATTERY_PARAMS.degradationTable],
    },
    gridParams: {
      ...DEFAULT_GRID_PARAMS,
      aclEnergyPriceTable: [...DEFAULT_GRID_PARAMS.aclEnergyPriceTable],
    },
    emsParams: { ...DEFAULT_EMS_PARAMS },
    optimizationLimits: { ...DEFAULT_OPT_LIMITS },
    sizingParams: { ...DEFAULT_SIZING_PARAMS },
    scenarios: [],
  };
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  folders: [],
  currentProjectId: null,
  loading: true,

  hydrate: async () => {
    const [rawProjects, folders] = await Promise.all([
      getAllProjects(),
      getAllFolders(),
    ]);
    const projects = rawProjects.map(migrateProject);
    set({ projects, folders, loading: false });
  },

  createProject: async (name, clientName, siteAddress, folderId = null) => {
    const project = createNewProject(name, clientName, siteAddress, folderId);
    await putProject(project);
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  updateProject: async (id, updates) => {
    const existing = await getProject(id);
    if (!existing) return;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await putProject(updated);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },

  removeProject: async (id) => {
    await dbDeleteProject(id);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
    }));
  },

  duplicateProject: async (id) => {
    const original = await getProject(id);
    if (!original) throw new Error('Project not found');
    const clone: BESSProject = {
      ...structuredClone(original),
      id: generateId(),
      name: `${original.name} (cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await putProject(clone);
    set((s) => ({ projects: [...s.projects, clone] }));
    return clone;
  },

  loadProject: async (id) => {
    const project = await getProject(id);
    return project ? migrateProject(project) : undefined;
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id });
  },

  createFolder: async (name, color) => {
    const folder: Folder = {
      id: generateId(),
      name,
      color,
      createdAt: new Date().toISOString(),
    };
    await putFolder(folder);
    set((s) => ({ folders: [...s.folders, folder] }));
    return folder;
  },

  updateFolder: async (id, updates) => {
    const existing = get().folders.find((f) => f.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    await putFolder(updated);
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? updated : f)),
    }));
  },

  removeFolder: async (id) => {
    await dbDeleteFolder(id);
    // Move projects in this folder to root
    const { projects } = get();
    for (const p of projects) {
      if (p.folderId === id) {
        const updated = { ...p, folderId: null, updatedAt: new Date().toISOString() };
        await putProject(updated);
      }
    }
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      projects: s.projects.map((p) =>
        p.folderId === id ? { ...p, folderId: null } : p,
      ),
    }));
  },

  addScenario: async (projectId, scenarioName) => {
    const project = await getProject(projectId);
    if (!project) return;
    const scenario = {
      id: generateId(),
      name: scenarioName,
      economicParams: structuredClone(project.economicParams),
      loadData: structuredClone(project.loadData),
      batteryParams: structuredClone(project.batteryParams),
      gridParams: structuredClone(project.gridParams),
      emsParams: structuredClone(project.emsParams),
      optimizationLimits: structuredClone(project.optimizationLimits),
      sizingParams: structuredClone(project.sizingParams),
    };
    const updated = {
      ...project,
      scenarios: [...project.scenarios, scenario],
      updatedAt: new Date().toISOString(),
    };
    await putProject(updated);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? updated : p)),
    }));
  },

  removeScenario: async (projectId, scenarioId) => {
    const project = await getProject(projectId);
    if (!project) return;
    const updated = {
      ...project,
      scenarios: project.scenarios.filter((s) => s.id !== scenarioId),
      updatedAt: new Date().toISOString(),
    };
    await putProject(updated);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? updated : p)),
    }));
  },

  exportProject: async (id) => {
    const project = await getProject(id);
    if (!project) throw new Error('Project not found');
    return JSON.stringify(project);
  },

  importProject: async (json) => {
    const imported = JSON.parse(json) as BESSProject;
    imported.id = generateId();
    imported.createdAt = new Date().toISOString();
    imported.updatedAt = new Date().toISOString();
    await putProject(imported);
    set((s) => ({ projects: [...s.projects, imported] }));
    return imported;
  },
}));
