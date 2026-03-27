// src/pages/ScenarioManager.tsx
import { useParams, Link } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore.ts';
import { useSimulationStore } from '../store/simulationStore.ts';
import { runBESSSimulation } from '../engine/bessSimulation.ts';
import { computeEaaSResults, applyEaaSFeeToResults } from '../engine/eaasFinance.ts';
import type { BESSProject, Scenario, BESSSimulationResult } from '../engine/types.ts';

function fmtR(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

export default function ScenarioManager() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const { addScenario, removeScenario, loadProject, updateProject } = useProjectStore();
  const { getResult, setResult } = useSimulationStore();

  const [fullProject, setFullProject] = useState<BESSProject | null>(null);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState<string | null>(null); // scenarioId being simulated
  const [results, setResults] = useState<Map<string, BESSSimulationResult>>(new Map());
  const [baseResult, setBaseResult] = useState<BESSSimulationResult | null>(null);

  // Load project
  useEffect(() => {
    if (id) loadProject(id).then((p) => { if (p) setFullProject(p); });
  }, [id, loadProject, project]);

  // Run base simulation
  const runBase = useCallback(async (proj: BESSProject) => {
    const result = runBESSSimulation(
      proj.loadData, proj.batteryParams, proj.gridParams,
      proj.emsParams, proj.optimizationLimits, proj.economicParams, proj.id,
    );
    const eaas = computeEaaSResults(result, proj.economicParams, proj.batteryParams, proj.sizingParams);
    result.eaasResults = eaas;
    if (eaas[2]) applyEaaSFeeToResults(result, eaas[2], proj.economicParams.ipca);
    setBaseResult(result);
    setResult(result);
  }, [setResult]);

  // Run scenario simulation
  const runScenario = useCallback(async (scenario: Scenario, proj: BESSProject) => {
    setRunning(scenario.id);
    await new Promise((r) => setTimeout(r, 30));
    const result = runBESSSimulation(
      scenario.loadData, scenario.batteryParams, scenario.gridParams,
      scenario.emsParams, scenario.optimizationLimits, scenario.economicParams,
      proj.id, scenario.id,
    );
    const eaas = computeEaaSResults(result, scenario.economicParams, scenario.batteryParams, scenario.sizingParams);
    result.eaasResults = eaas;
    if (eaas[2]) applyEaaSFeeToResults(result, eaas[2], scenario.economicParams.ipca);
    setResult(result);
    setResults((prev) => new Map(prev).set(scenario.id, result));
    setRunning(null);
  }, [setResult]);

  // Run all on load
  useEffect(() => {
    if (!fullProject) return;
    // Base
    const cached = getResult(fullProject.id);
    if (cached) setBaseResult(cached);
    else runBase(fullProject);
    // Scenarios
    for (const sc of fullProject.scenarios) {
      const cachedSc = getResult(fullProject.id, sc.id);
      if (cachedSc) setResults((prev) => new Map(prev).set(sc.id, cachedSc));
    }
  }, [fullProject, getResult, runBase]);

  async function handleCreate() {
    if (!id || !newName.trim()) return;
    await addScenario(id, newName.trim());
    setNewName('');
    setShowCreate(false);
    // Reload
    const p = await loadProject(id);
    if (p) setFullProject(p);
  }

  async function handleDelete(scenarioId: string) {
    if (!id) return;
    if (!confirm('Excluir este cenário?')) return;
    await removeScenario(id, scenarioId);
    const p = await loadProject(id);
    if (p) setFullProject(p);
    setResults((prev) => { const n = new Map(prev); n.delete(scenarioId); return n; });
  }

  async function handleRename(scenarioId: string, name: string) {
    if (!fullProject) return;
    const updated = {
      ...fullProject,
      scenarios: fullProject.scenarios.map((s) =>
        s.id === scenarioId ? { ...s, name } : s
      ),
    };
    await updateProject(fullProject.id, { scenarios: updated.scenarios });
    setFullProject(updated);
  }

  async function handleRunAll() {
    if (!fullProject) return;
    await runBase(fullProject);
    for (const sc of fullProject.scenarios) {
      await runScenario(sc, fullProject);
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

  const scenarios = fullProject?.scenarios ?? [];

  // Metrics for comparison
  const allResults: Array<{ label: string; id: string | null; result: BESSSimulationResult | null; params: Scenario | BESSProject }> = [
    { label: 'Base', id: null, result: baseResult, params: fullProject ?? project },
    ...scenarios.map((sc) => ({
      label: sc.name,
      id: sc.id,
      result: results.get(sc.id) ?? null,
      params: sc,
    })),
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Cenários — {project.name}</h2>
          <p className="text-sm text-[#6692A8]">{scenarios.length} cenário{scenarios.length !== 1 ? 's' : ''} + base</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRunAll}
            className="rounded-lg bg-[#2F927B] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 transition-colors"
          >
            Simular todos
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg border border-[#C6DA38] px-4 py-2 text-sm font-medium text-[#C6DA38] hover:bg-[#C6DA38]/10 transition-colors"
          >
            + Novo cenário
          </button>
          <Link
            to={`/project/${project.id}`}
            className="rounded-lg border border-[#6692A8] px-4 py-2 text-sm text-[#6692A8] hover:bg-white/5 transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm rounded-xl border border-[#2F927B]/20 bg-[#243447] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-white">Novo Cenário</h3>
            <p className="mb-3 text-xs text-[#6692A8]">Cria uma cópia dos parâmetros atuais do projeto base. Você pode então modificar os parâmetros do cenário independentemente.</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: BESS 2 MWh, C-rate 0.5"
              className="mb-4 w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white placeholder-[#6692A8]/50 focus:border-[#2F927B] focus:outline-none"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-[#6692A8] hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleCreate} className="rounded-lg bg-[#2F927B] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 transition-colors">Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* Scenario cards */}
      <div className="mb-6 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {/* Base card */}
        <ScenarioCard
          label="Base"
          isBase
          result={baseResult}
          batteryKWh={fullProject?.batteryParams.capacityKWh ?? 0}
          cRate={fullProject?.batteryParams.cRate ?? 0}
          running={false}
          onRun={() => fullProject && runBase(fullProject)}
        />
        {/* Scenario cards */}
        {scenarios.map((sc) => (
          <ScenarioCard
            key={sc.id}
            label={sc.name}
            result={results.get(sc.id) ?? null}
            batteryKWh={sc.batteryParams.capacityKWh}
            cRate={sc.batteryParams.cRate}
            running={running === sc.id}
            onRun={() => fullProject && runScenario(sc, fullProject)}
            onDelete={() => handleDelete(sc.id)}
            onRename={(name) => handleRename(sc.id, name)}
          />
        ))}
      </div>

      {/* Comparison table */}
      {allResults.some((r) => r.result) && (
        <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
          <h3 className="mb-4 text-base font-semibold text-white">Comparação de Cenários</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="py-2 text-left text-[#6692A8]">Métrica</th>
                  {allResults.map((r) => (
                    <th key={r.id ?? 'base'} className="py-2 text-right text-white font-semibold">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompRow label="Capacidade BESS (kWh)" values={allResults.map((r) => {
                  const p = r.params;
                  return ('batteryParams' in p) ? p.batteryParams.capacityKWh.toLocaleString('pt-BR') : '—';
                })} />
                <CompRow label="C-Rate" values={allResults.map((r) => {
                  const p = r.params;
                  return ('batteryParams' in p) ? p.batteryParams.cRate.toString() : '—';
                })} />
                <CompRow label="Fatura antes (R$/ano)" values={allResults.map((r) => r.result ? fmtR(r.result.totalInvoiceBeforeYr1) : '—')} />
                <CompRow label="Fatura depois (R$/ano)" values={allResults.map((r) => r.result ? fmtR(r.result.totalInvoiceAfterYr1) : '—')} />
                <CompRow label="Economia bruta (R$/ano)" values={allResults.map((r) => r.result ? fmtR(r.result.grossSavingsYr1) : '—')} color="text-[#C6DA38]" />
                <CompRow label="Economia bruta (%)" values={allResults.map((r) => r.result && r.result.totalInvoiceBeforeYr1 > 0 ? (r.result.grossSavingsYr1 / r.result.totalInvoiceBeforeYr1 * 100).toFixed(1) + '%' : '—')} />
                <CompRow label="Energia deslocada (MWh/ano)" values={allResults.map((r) => r.result ? r.result.energyShiftedYr1MWh.toFixed(0) : '—')} />
                <CompRow label="Ciclos/ano" values={allResults.map((r) => r.result ? r.result.totalCyclesYr1.toFixed(0) : '—')} />
                <CompRow label="Fee 15a (R$/mês)" values={allResults.map((r) => {
                  const e = r.result?.eaasResults.find((e) => e.contractYears === 15);
                  return e ? fmtR(e.monthlyFeeYr1) : '—';
                })} />
                <CompRow label="Fee 12a (R$/mês)" values={allResults.map((r) => {
                  const e = r.result?.eaasResults.find((e) => e.contractYears === 12);
                  return e ? fmtR(e.monthlyFeeYr1) : '—';
                })} />
                <CompRow label="Fee 10a (R$/mês)" values={allResults.map((r) => {
                  const e = r.result?.eaasResults.find((e) => e.contractYears === 10);
                  return e ? fmtR(e.monthlyFeeYr1) : '—';
                })} />
                <CompRow label="Economia líquida 15a (R$/ano)" values={allResults.map((r) => {
                  const e = r.result?.eaasResults.find((e) => e.contractYears === 15);
                  return e ? fmtR(e.netSavingsYr1) : '—';
                })} color="text-[#C6DA38]" bold />
                <CompRow label="Ratio economia/fee 15a" values={allResults.map((r) => {
                  const e = r.result?.eaasResults.find((e) => e.contractYears === 15);
                  return e ? e.grossSavingsVsFeeRatio.toFixed(2) + '×' : '—';
                })} />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Scenario Card ──────────────────────────────────────── */

function ScenarioCard({
  label, isBase, result, batteryKWh, cRate, running,
  onRun, onDelete, onRename,
}: {
  label: string; isBase?: boolean;
  result: BESSSimulationResult | null;
  batteryKWh: number; cRate: number;
  running: boolean;
  onRun: () => void;
  onDelete?: () => void;
  onRename?: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(label);

  const grossSavings = result?.grossSavingsYr1 ?? 0;
  const fee15 = result?.eaasResults.find((e) => e.contractYears === 15)?.monthlyFeeYr1 ?? 0;
  const shifted = result?.energyShiftedYr1MWh ?? 0;

  return (
    <div className={`rounded-xl border p-4 ${isBase ? 'border-[#2F927B]/40 bg-[#2F927B]/10' : 'border-[#2F927B]/20 bg-[#243447]'}`}>
      <div className="mb-3 flex items-center justify-between">
        {editing && onRename ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => { onRename(editName); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onRename(editName); setEditing(false); } }}
            className="rounded border border-[#2F927B] bg-[#1A2332] px-2 py-1 text-sm text-white focus:outline-none"
            autoFocus
          />
        ) : (
          <h4 className="text-sm font-semibold text-white">
            {isBase && <span className="mr-1 rounded bg-[#2F927B] px-1.5 py-0.5 text-[10px] text-white">BASE</span>}
            {label}
          </h4>
        )}
        <div className="flex gap-1">
          {!isBase && onRename && (
            <button onClick={() => { setEditName(label); setEditing(true); }} className="rounded p-1 text-[#6692A8] hover:text-white transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
          )}
          {!isBase && onDelete && (
            <button onClick={onDelete} className="rounded p-1 text-[#6692A8] hover:text-[#ef4444] transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 text-xs text-[#6692A8]">
        {batteryKWh.toLocaleString('pt-BR')} kWh | C-rate {cRate} | {(batteryKWh * cRate).toFixed(0)} kW
      </div>

      {result ? (
        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-[#6692A8]">Economia bruta/ano</span><span className="text-[#C6DA38] font-medium">{fmtR(grossSavings)}</span></div>
          <div className="flex justify-between"><span className="text-[#6692A8]">Fee 15a/mês</span><span className="text-white">{fmtR(fee15)}</span></div>
          <div className="flex justify-between"><span className="text-[#6692A8]">Energia deslocada</span><span className="text-white">{shifted.toFixed(0)} MWh</span></div>
        </div>
      ) : (
        <p className="text-xs text-[#6692A8]/50">Não simulado</p>
      )}

      <button
        onClick={onRun}
        disabled={running}
        className="mt-3 w-full rounded-lg bg-[#2F927B]/20 py-1.5 text-xs font-medium text-[#2F927B] hover:bg-[#2F927B]/30 disabled:opacity-50 transition-colors"
      >
        {running ? 'Simulando...' : 'Simular'}
      </button>
    </div>
  );
}

/* ── Comparison Row ─────────────────────────────────────── */

function CompRow({ label, values, color, bold }: { label: string; values: string[]; color?: string; bold?: boolean }) {
  return (
    <tr className="border-t border-[#2F927B]/10">
      <td className="py-1.5 text-[#6692A8] text-sm">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`py-1.5 text-right text-sm ${bold ? 'font-bold' : ''} ${color ?? 'text-white'}`}>{v}</td>
      ))}
    </tr>
  );
}
