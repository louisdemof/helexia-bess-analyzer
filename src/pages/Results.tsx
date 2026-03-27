// src/pages/Results.tsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore.ts';
import { useSimulationStore } from '../store/simulationStore.ts';
import { runBESSSimulation } from '../engine/bessSimulation.ts';
import { computeEaaSResults, applyEaaSFeeToResults } from '../engine/eaasFinance.ts';
import { buildLoadCurve8760 } from '../engine/loadCurve.ts';
import { exportResultsToExcel } from '../engine/excel.ts';
// Lazy import PDF to avoid blocking initial render
const generateClientPDF = async (...args: Parameters<typeof import('../engine/pdf.ts')['generateClientPDF']>) => {
  const { generateClientPDF: fn } = await import('../engine/pdf.ts');
  return fn(...args);
};
import type { BESSProject, BESSSimulationResult } from '../engine/types.ts';

import KPICards from '../components/results/KPICards.tsx';
import InvoiceComparisonChart from '../components/results/InvoiceComparisonChart.tsx';
import LoadCurveChart from '../components/results/LoadCurveChart.tsx';
import SoCChart from '../components/results/SoCChart.tsx';
import EnergyShiftedChart from '../components/results/EnergyShiftedChart.tsx';
import CashFlowChart from '../components/results/CashFlowChart.tsx';
import InvoiceDetailTable from '../components/results/InvoiceDetailTable.tsx';
import EaaSFeeTable from '../components/results/EaaSFeeTable.tsx';
import ClientEconomicsTable from '../components/results/ClientEconomicsTable.tsx';
import AugmentationTable from '../components/results/AugmentationTable.tsx';
import CapacityChart from '../components/results/CapacityChart.tsx';
import FinancingTable from '../components/results/FinancingTable.tsx';
import HelexiaPaybackTable from '../components/results/HelexiaPaybackTable.tsx';

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const loadProject = useProjectStore((s) => s.loadProject);
  const { getResult, setResult } = useSimulationStore();

  const [fullProject, setFullProject] = useState<BESSProject | null>(null);
  const [simResult, setSimResult] = useState<BESSSimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<10 | 12 | 15>(15);

  // Load full project from IDB
  useEffect(() => {
    if (id) {
      loadProject(id).then((p) => { if (p) setFullProject(p); });
    }
  }, [id, loadProject]);

  const runSimulation = useCallback(async () => {
    setRunning(true);
    setError(null);

    try {
      // Reload latest project data from IndexedDB (in case user changed params)
      const latestProject = id ? await loadProject(id) : fullProject;
      if (!latestProject) { setRunning(false); return; }
      setFullProject(latestProject);

      // Run in a microtask to allow UI to update
      await new Promise((r) => setTimeout(r, 50));

      const result = runBESSSimulation(
        latestProject.loadData,
        latestProject.batteryParams,
        latestProject.gridParams,
        latestProject.emsParams,
        latestProject.optimizationLimits,
        latestProject.economicParams,
        latestProject.id,
      );

      // Compute EaaS for all 3 contract durations
      const eaasResults = computeEaaSResults(
        result,
        latestProject.economicParams,
        latestProject.batteryParams,
        latestProject.sizingParams,
      );
      result.eaasResults = eaasResults;

      // Apply the selected contract's fee to monthly results
      const selectedEaaS = eaasResults.find((e) => e.contractYears === selectedContract);
      if (selectedEaaS) {
        applyEaaSFeeToResults(result, selectedEaaS, latestProject.economicParams.ipca);
      }

      setResult(result);
      setSimResult(result);
    } catch (err) {
      setError(`Erro na simulação: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }, [fullProject, selectedContract, setResult, id, loadProject]);

  // Auto-run on load or check cache
  useEffect(() => {
    if (!fullProject || !id) return;
    const cached = getResult(id);
    if (cached) {
      setSimResult(cached);
    } else {
      runSimulation();
    }
  }, [fullProject, id, getResult, runSimulation]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#6692A8]">
        <p className="mb-4">Projeto não encontrado</p>
        <Link to="/" className="text-[#2F927B] hover:underline">Voltar aos projetos</Link>
      </div>
    );
  }

  const selectedEaaS = simResult?.eaasResults.find((e) => e.contractYears === selectedContract) ?? null;

  // Original load curve for chart
  const originalCurve = fullProject ? buildLoadCurve8760(fullProject.loadData, fullProject.gridParams) : [];
  const usableKWh = fullProject
    ? fullProject.batteryParams.capacityKWh * (fullProject.batteryParams.degradationTable[0] / 100) * fullProject.batteryParams.dodPct
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Resultados — {project.name}</h2>
          <p className="text-sm text-[#6692A8]">{project.clientName}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Contract duration selector */}
          <div className="flex gap-1 rounded-lg border border-[#2F927B]/20 bg-[#1A2332] p-0.5">
            {([10, 12, 15] as const).map((y) => (
              <button
                key={y}
                onClick={() => {
                  setSelectedContract(y);
                  // Re-apply fee
                  if (simResult) {
                    const eaas = simResult.eaasResults.find((e) => e.contractYears === y);
                    if (eaas && fullProject) {
                      applyEaaSFeeToResults(simResult, eaas, fullProject.economicParams.ipca);
                      setSimResult({ ...simResult });
                    }
                  }
                }}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  selectedContract === y ? 'bg-[#2F927B] text-white' : 'text-[#6692A8] hover:text-white'
                }`}
              >
                {y}a
              </button>
            ))}
          </div>
          <button
            onClick={runSimulation}
            disabled={running}
            className="rounded-lg bg-[#2F927B] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 disabled:opacity-50 transition-colors"
          >
            {running ? 'Simulando...' : 'Re-simular'}
          </button>
          {simResult && fullProject && (
            <button
              onClick={() => exportResultsToExcel(fullProject, simResult, selectedEaaS)}
              className="rounded-lg border border-[#C6DA38] px-4 py-2 text-sm font-medium text-[#C6DA38] hover:bg-[#C6DA38]/10 transition-colors"
            >
              Exportar Excel
            </button>
          )}
          {simResult && fullProject && (
            <button
              onClick={() => generateClientPDF(fullProject, simResult)}
              className="rounded-lg bg-[#004B70] px-4 py-2 text-sm font-medium text-white hover:bg-[#004B70]/80 transition-colors"
            >
              Proposta PDF
            </button>
          )}
          <Link
            to={`/project/${project.id}`}
            className="rounded-lg border border-[#6692A8] px-4 py-2 text-sm text-[#6692A8] hover:bg-white/5 transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 p-4 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

      {/* Loading */}
      {running && (
        <div className="flex items-center justify-center py-20 text-[#6692A8]">
          <div className="text-center">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#2F927B] border-t-transparent mx-auto" />
            <p>Executando simulação...</p>
          </div>
        </div>
      )}

      {/* Results */}
      {simResult && !running && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <KPICards sim={simResult} eaas={selectedEaaS} />

          {/* Charts row 1 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <InvoiceComparisonChart monthlyResults={simResult.monthlyResults} />
            <LoadCurveChart
              originalCurve={originalCurve}
              netCurve={simResult.hourlyNetLoad ?? []}
            />
          </div>

          {/* Charts row 2 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SoCChart hourlySoC={simResult.hourlySoC ?? []} usableKWh={usableKWh} />
            <EnergyShiftedChart monthlyResults={simResult.monthlyResults} />
          </div>

          {/* Cash Flow */}
          {selectedEaaS && fullProject && (
            <CashFlowChart
              monthlyFeeYr1={selectedEaaS.monthlyFeeYr1}
              econ={fullProject.economicParams}
              battery={fullProject.batteryParams}
              sizing={fullProject.sizingParams}
              contractYears={selectedContract}
              augmentationEvents={simResult.augmentationEvents}
            />
          )}

          {/* Capacity Degradation + Augmentation */}
          {fullProject && (
            <CapacityChart
              intrinsicPct={simResult.intrinsicCapacityPct}
              effectivePct={simResult.effectiveCapacityPct}
              events={simResult.augmentationEvents}
              nominalKWh={fullProject.batteryParams.capacityKWh}
              thresholdPct={fullProject.batteryParams.augmentationThresholdPct}
            />
          )}

          {/* Tables */}
          <div className="grid gap-6 lg:grid-cols-2">
            {fullProject && (
              <InvoiceDetailTable
                monthlyResults={simResult.monthlyResults}
                grid={fullProject.gridParams}
                econ={fullProject.economicParams}
              />
            )}
            <EaaSFeeTable results={simResult.eaasResults} grossSavingsYr1={simResult.grossSavingsYr1} />
          </div>

          {/* Augmentation Events */}
          {fullProject && (
            <AugmentationTable
              events={simResult.augmentationEvents}
              nominalCapacityKWh={fullProject.batteryParams.capacityKWh}
            />
          )}

          {/* Client Economics — full comparison */}
          {fullProject && (
            <ClientEconomicsTable sim={simResult} econ={fullProject.economicParams} />
          )}

          {/* Financing Impact — only when financing is enabled */}
          {fullProject?.economicParams.financingEnabled && (
            <FinancingTable
              results={simResult.eaasResults}
              grossSavingsYr1={simResult.grossSavingsYr1}
              econ={fullProject.economicParams}
            />
          )}

          {/* Helexia Internal Payback */}
          {fullProject && (
            <HelexiaPaybackTable
              sim={simResult}
              econ={fullProject.economicParams}
              battery={fullProject.batteryParams}
              sizing={fullProject.sizingParams}
            />
          )}
        </div>
      )}
    </div>
  );
}
