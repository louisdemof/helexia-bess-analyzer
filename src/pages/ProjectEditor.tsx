// src/pages/ProjectEditor.tsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore.ts';
import type { BESSProject, EconomicParams, LoadData, BatteryParams, GridParams, EMSParams, OptLimits, SizingParams } from '../engine/types.ts';
import EconomicParamsForm from '../components/inputs/EconomicParamsForm.tsx';
import LoadDataForm from '../components/inputs/LoadDataForm.tsx';
import BatteryParamsForm from '../components/inputs/BatteryParamsForm.tsx';
import GridParamsForm from '../components/inputs/GridParamsForm.tsx';
import EMSParamsForm from '../components/inputs/EMSParamsForm.tsx';
import OptLimitsForm from '../components/inputs/OptLimitsForm.tsx';
import SizingForm from '../components/inputs/SizingForm.tsx';

const TABS = [
  { key: 'economic', label: 'Parâmetros Econômicos', short: 'Econômico' },
  { key: 'load',     label: 'Carga',                 short: 'Carga' },
  { key: 'battery',  label: 'Renováveis',            short: 'Bateria' },
  { key: 'grid',     label: 'Rede Elétrica',         short: 'Rede' },
  { key: 'ems',      label: 'EMS',                   short: 'EMS' },
  { key: 'limits',   label: 'Limites da Otimização',short: 'Limites' },
  { key: 'sizing',   label: 'Dimensionamento',       short: 'Sizing' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const storeProject = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const updateProject = useProjectStore((s) => s.updateProject);
  const loadProject = useProjectStore((s) => s.loadProject);

  const [project, setProject] = useState<BESSProject | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('economic');
  const [saving, setSaving] = useState(false);

  // Load project from IndexedDB on mount
  useEffect(() => {
    if (id) {
      loadProject(id).then((p) => { if (p) setProject(p); });
    }
  }, [id, loadProject]);

  // Sync from store when it changes (e.g., after hydrate)
  useEffect(() => {
    if (storeProject && !project) setProject(storeProject);
  }, [storeProject, project]);

  // Auto-save with debounce
  const save = useCallback(async (updated: BESSProject) => {
    setSaving(true);
    await updateProject(updated.id, updated);
    setSaving(false);
  }, [updateProject]);

  function updateFields(updater: (prev: BESSProject) => BESSProject) {
    setProject((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      save(updated);
      return updated;
    });
  }

  function handleEconomicChange(updates: Partial<EconomicParams>) {
    updateFields((p) => ({ ...p, economicParams: { ...p.economicParams, ...updates } }));
  }

  function handleLoadChange(updates: Partial<LoadData>) {
    updateFields((p) => ({ ...p, loadData: { ...p.loadData, ...updates } }));
  }

  function handleBatteryChange(updates: Partial<BatteryParams>) {
    updateFields((p) => ({ ...p, batteryParams: { ...p.batteryParams, ...updates } }));
  }

  function handleGridChange(updates: Partial<GridParams>) {
    updateFields((p) => ({ ...p, gridParams: { ...p.gridParams, ...updates } }));
  }

  function handleIcmsChange(icms: number) {
    updateFields((p) => ({ ...p, economicParams: { ...p.economicParams, icms } }));
  }

  function handleEMSChange(updates: Partial<EMSParams>) {
    updateFields((p) => ({ ...p, emsParams: { ...p.emsParams, ...updates } }));
  }

  function handleLimitsChange(updates: Partial<OptLimits>) {
    updateFields((p) => ({ ...p, optimizationLimits: { ...p.optimizationLimits, ...updates } }));
  }

  function handleSizingChange(updates: Partial<SizingParams>) {
    updateFields((p) => ({ ...p, sizingParams: { ...p.sizingParams, ...updates } }));
  }

  // Tab completion indicators
  function isTabComplete(tab: TabKey): boolean {
    if (!project) return false;
    switch (tab) {
      case 'economic': return project.economicParams.capexPerKWh > 0;
      case 'load': return project.loadData.method !== null && (
        project.loadData.method === 'csv' ? project.loadData.csvData !== null :
        project.loadData.method === 'profile' ? project.loadData.profileId !== null :
        project.loadData.method === 'invoice' ? project.loadData.monthlyInvoice.some((r) => r.consumoPontaKWh > 0) :
        project.loadData.hourlyKVA.some((v) => v > 0)
      );
      case 'battery': return project.batteryParams.capacityKWh > 0;
      case 'grid': return project.gridParams.distributorId !== '' && project.gridParams.tusdPontaRMWh > 0;
      case 'ems': return project.emsParams.loadShifting;
      case 'limits': return true;
      case 'sizing': return project.sizingParams.bessCapacityKWh > 0;
    }
  }

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
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{project.name}</h2>
          <p className="text-sm text-[#6692A8]">{project.clientName}{project.siteAddress ? ` — ${project.siteAddress}` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-[#6692A8]">Salvando...</span>}
          <Link
            to={`/scenarios/${project.id}`}
            className="rounded-lg border border-[#6692A8] px-4 py-2 text-sm text-[#6692A8] hover:bg-white/5 transition-colors"
          >
            Cenários
          </Link>
          <Link
            to={`/results/${project.id}`}
            className="rounded-lg bg-[#2F927B] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 transition-colors"
          >
            Simular
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[#2F927B]/20 bg-[#243447] p-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const complete = isTabComplete(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#2F927B] text-white'
                  : 'text-[#6692A8] hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${complete ? 'bg-[#C6DA38]' : 'bg-[#6692A8]/30'}`} />
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="lg:hidden">{tab.short}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'economic' && (
          <EconomicParamsForm params={project.economicParams} onChange={handleEconomicChange} />
        )}
        {activeTab === 'load' && (
          <LoadDataForm data={project.loadData} onChange={handleLoadChange} gridState={project.gridParams.state} />
        )}
        {activeTab === 'battery' && (
          <BatteryParamsForm params={project.batteryParams} onChange={handleBatteryChange} />
        )}
        {activeTab === 'grid' && (
          <GridParamsForm params={project.gridParams} onChange={handleGridChange} onIcmsChange={handleIcmsChange} />
        )}
        {activeTab === 'ems' && (
          <EMSParamsForm params={project.emsParams} onChange={handleEMSChange} demandaContratadaKW={project.gridParams.demandaContratadaKW} />
        )}
        {activeTab === 'limits' && (
          <OptLimitsForm
            params={project.optimizationLimits}
            onChange={handleLimitsChange}
            batteryCapacityKWh={project.batteryParams.capacityKWh}
            cRate={project.batteryParams.cRate}
          />
        )}
        {activeTab === 'sizing' && (
          <SizingForm
            params={project.sizingParams}
            onChange={handleSizingChange}
            batteryCapacityKWh={project.batteryParams.capacityKWh}
            cRate={project.batteryParams.cRate}
            capexPerKWh={project.economicParams.capexPerKWh}
            otherFixedCosts={project.economicParams.otherFixedCosts}
            omPctCapex={project.economicParams.omPctCapex}
          />
        )}
      </div>
    </div>
  );
}
