// src/store/simulationStore.ts
import { create } from 'zustand';
import type { BESSSimulationResult } from '../engine/types.ts';

interface SimulationStore {
  results: Map<string, BESSSimulationResult>;
  getResult: (projectId: string, scenarioId?: string | null) => BESSSimulationResult | undefined;
  setResult: (result: BESSSimulationResult) => void;
  clearResult: (projectId: string, scenarioId?: string | null) => void;
  clearAll: () => void;
}

function makeKey(projectId: string, scenarioId?: string | null): string {
  return scenarioId ? `${projectId}:${scenarioId}` : projectId;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  results: new Map(),

  getResult: (projectId, scenarioId = null) => {
    return get().results.get(makeKey(projectId, scenarioId));
  },

  setResult: (result) => {
    set((s) => {
      const next = new Map(s.results);
      next.set(makeKey(result.projectId, result.scenarioId), result);
      return { results: next };
    });
  },

  clearResult: (projectId, scenarioId = null) => {
    set((s) => {
      const next = new Map(s.results);
      next.delete(makeKey(projectId, scenarioId));
      return { results: next };
    });
  },

  clearAll: () => {
    set({ results: new Map() });
  },
}));
