// src/components/inputs/SizingForm.tsx
import { useState } from 'react';
import type { SizingParams } from '../../engine/types.ts';
import type { OptimizerConfig, OptimizerResult, OptimizerSweepPoint } from '../../engine/capacityOptimizer.ts';
import CurrencyInput from '../shared/CurrencyInput.tsx';

interface Props {
  params: SizingParams;
  onChange: (updates: Partial<SizingParams>) => void;
  // Read from other tabs (not editable here)
  batteryCapacityKWh: number;
  cRate: number;
  capexPerKWh: number;
  otherFixedCosts: number;
  omPctCapex: number;
  // Optimizer
  onOptimize?: (config: OptimizerConfig) => void;
  onApplyOptimal?: (capacityKWh: number) => void;
  optimizerResult?: OptimizerResult | null;
  optimizing?: boolean;
  optimizerProgress?: number;
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SizingForm({
  params, onChange, batteryCapacityKWh, cRate, capexPerKWh, otherFixedCosts, omPctCapex,
  onOptimize, onApplyOptimal, optimizerResult, optimizing, optimizerProgress,
}: Props) {
  const batteryCapex = batteryCapacityKWh * capexPerKWh;
  const totalCapex = batteryCapex + otherFixedCosts;
  const maxPowerKW = batteryCapacityKWh * cRate;
  const omAnnual = totalCapex * omPctCapex;

  const [optMin, setOptMin] = useState(100);
  const [optMax, setOptMax] = useState(5000);
  const [optSteps, setOptSteps] = useState(40);
  const [optContract, setOptContract] = useState<10 | 12 | 15>(params.contractYears);

  return (
    <div className="space-y-6">
      {/* Contract duration */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Contrato EaaS</h3>
        <div>
          <label className="mb-2 block text-sm text-[#6692A8]">Duração do contrato</label>
          <div className="flex gap-2">
            {([10, 12, 15] as const).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => onChange({ contractYears: y })}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
                  params.contractYears === y
                    ? 'bg-[#2F927B] text-white'
                    : 'border border-[#6692A8] text-[#6692A8] hover:bg-white/5'
                }`}
              >
                {y} anos
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#6692A8]">
            Os resultados mostrarão o fee mensal EaaS para as 3 durações simultaneamente.
          </p>
        </div>
      </div>

      {/* System summary (read-only, from other tabs) */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Resumo do Sistema BESS</h3>
        <p className="mb-4 text-xs text-[#6692A8]">Valores definidos nas abas Renováveis e Parâmetros Econômicos</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <InfoCard label="Capacidade" value={`${fmt(batteryCapacityKWh)} kWh`} />
          <InfoCard label="Potência máxima" value={`${fmt(maxPowerKW)} kW`} sub={`C-rate ${cRate}`} />
          <InfoCard label="Capex unitário" value={`R$ ${fmt(capexPerKWh)}/kWh`} />
          <InfoCard label="O&M anual" value={`R$ ${fmt(omAnnual)}`} sub={`${(omPctCapex * 100).toFixed(1)}% Capex`} />
        </div>
      </div>

      {/* Cost summary */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Resumo de Custos</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <CostCard label="CAPEX Bateria" value={batteryCapex} />
          <CostCard label="Outros custos fixos" value={otherFixedCosts} />
          <CostCard label="CAPEX Total" value={totalCapex} highlight />
        </div>
      </div>

      {/* Capacity Optimizer */}
      <div className="rounded-xl border border-[#C6DA38]/30 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-[#C6DA38]">Otimizador de Capacidade</h3>
        <p className="mb-4 text-xs text-[#6692A8]">
          Encontra a capacidade nominal que maximiza a economia líquida (economia bruta - fee EaaS).
        </p>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <CurrencyInput label="Capacidade mínima" value={optMin} onChange={setOptMin} unit="kWh" step={50} />
          <CurrencyInput label="Capacidade máxima" value={optMax} onChange={setOptMax} unit="kWh" step={100} />
          <CurrencyInput label="Pontos de análise" value={optSteps} onChange={setOptSteps} unit="" step={1} min={10} max={100} />
          <div>
            <label className="mb-1 block text-sm text-[#6692A8]">Contrato</label>
            <div className="flex gap-1">
              {([10, 12, 15] as const).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setOptContract(y)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    optContract === y
                      ? 'bg-[#C6DA38] text-[#1A2332]'
                      : 'border border-[#6692A8] text-[#6692A8] hover:bg-white/5'
                  }`}
                >
                  {y}a
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOptimize?.({ minCapacityKWh: optMin, maxCapacityKWh: optMax, steps: optSteps, targetContractYears: optContract })}
          disabled={optimizing}
          className="mt-4 rounded-lg bg-[#C6DA38] px-6 py-2.5 text-sm font-medium text-[#1A2332] hover:bg-[#C6DA38]/80 disabled:opacity-50 transition-colors"
        >
          {optimizing ? `Otimizando... ${optimizerProgress ?? 0}%` : 'Otimizar Capacidade'}
        </button>

        {optimizing && (
          <div className="mt-3 h-2 rounded-full bg-[#1A2332] overflow-hidden">
            <div
              className="h-full bg-[#C6DA38] transition-all duration-200"
              style={{ width: `${optimizerProgress ?? 0}%` }}
            />
          </div>
        )}

        {/* Results */}
        {optimizerResult && !optimizing && (
          <div className="mt-5 space-y-4">
            {/* Optimal value */}
            <div className="rounded-lg border border-[#C6DA38]/40 bg-[#C6DA38]/10 p-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-[#6692A8]">Capacidade ótima</p>
                  <p className="text-xl font-bold text-[#C6DA38]">{fmt(optimizerResult.optimalCapacityKWh)} kWh</p>
                </div>
                <div>
                  <p className="text-xs text-[#6692A8]">Economia líquida Ano 1</p>
                  <p className="text-lg font-semibold text-[#2F927B]">R$ {fmt(optimizerResult.optimalNetSavingsYr1)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6692A8]">Economia bruta Ano 1</p>
                  <p className="text-lg font-semibold text-white">R$ {fmt(optimizerResult.optimalGrossSavingsYr1)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6692A8]">Fee EaaS anual</p>
                  <p className="text-lg font-semibold text-white">R$ {fmt(optimizerResult.optimalAnnualFeeYr1)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onApplyOptimal?.(optimizerResult.optimalCapacityKWh)}
                className="mt-3 rounded-lg bg-[#2F927B] px-5 py-2 text-sm font-medium text-white hover:bg-[#2F927B]/80 transition-colors"
              >
                Aplicar {fmt(optimizerResult.optimalCapacityKWh)} kWh
              </button>
            </div>

            {/* Sweep chart */}
            <SweepChart data={optimizerResult.sweepData} optimalKWh={optimizerResult.optimalCapacityKWh} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sweep Chart (SVG) ──────────────────────────────────── */

function SweepChart({ data, optimalKWh }: { data: OptimizerSweepPoint[]; optimalKWh: number }) {
  if (data.length < 2) return null;

  const W = 700, H = 250, PAD = { top: 20, right: 20, bottom: 40, left: 70 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const xMin = data[0].capacityKWh;
  const xMax = data[data.length - 1].capacityKWh;
  const allValues = data.flatMap((d) => [d.grossSavingsYr1, d.annualFeeYr1, d.netSavingsYr1]);
  const yMin = Math.min(0, ...allValues);
  const yMax = Math.max(...allValues);
  const yRange = yMax - yMin || 1;

  const x = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin || 1)) * cw;
  const y = (v: number) => PAD.top + ch - ((v - yMin) / yRange) * ch;

  const line = (pts: OptimizerSweepPoint[], getter: (d: OptimizerSweepPoint) => number) =>
    pts.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.capacityKWh)},${y(getter(d))}`).join(' ');

  const optX = x(optimalKWh);

  return (
    <div className="rounded-lg bg-[#1A2332] p-4">
      <p className="mb-2 text-xs text-[#6692A8]">Economia vs Capacidade (Ano 1)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const yVal = yMin + f * yRange;
          return (
            <g key={f}>
              <line x1={PAD.left} y1={y(yVal)} x2={W - PAD.right} y2={y(yVal)} stroke="#6692A8" strokeOpacity={0.2} />
              <text x={PAD.left - 5} y={y(yVal) + 4} textAnchor="end" fill="#6692A8" fontSize={9}>
                {(yVal / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}

        {/* Optimal line */}
        <line x1={optX} y1={PAD.top} x2={optX} y2={H - PAD.bottom} stroke="#C6DA38" strokeDasharray="4 2" strokeOpacity={0.6} />

        {/* Lines */}
        <path d={line(data, (d) => d.grossSavingsYr1)} fill="none" stroke="#2F927B" strokeWidth={2} />
        <path d={line(data, (d) => d.annualFeeYr1)} fill="none" stroke="#f97316" strokeWidth={2} />
        <path d={line(data, (d) => d.netSavingsYr1)} fill="none" stroke="#C6DA38" strokeWidth={2.5} />

        {/* X axis labels */}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0).map((d) => (
          <text key={d.capacityKWh} x={x(d.capacityKWh)} y={H - PAD.bottom + 15} textAnchor="middle" fill="#6692A8" fontSize={9}>
            {d.capacityKWh}
          </text>
        ))}
        <text x={PAD.left + cw / 2} y={H - 5} textAnchor="middle" fill="#6692A8" fontSize={10}>Capacidade (kWh)</text>

        {/* Legend */}
        <circle cx={PAD.left + 10} cy={PAD.top + 5} r={4} fill="#2F927B" />
        <text x={PAD.left + 18} y={PAD.top + 9} fill="#6692A8" fontSize={9}>Economia bruta</text>
        <circle cx={PAD.left + 120} cy={PAD.top + 5} r={4} fill="#f97316" />
        <text x={PAD.left + 128} y={PAD.top + 9} fill="#6692A8" fontSize={9}>Fee EaaS</text>
        <circle cx={PAD.left + 200} cy={PAD.top + 5} r={4} fill="#C6DA38" />
        <text x={PAD.left + 208} y={PAD.top + 9} fill="#6692A8" fontSize={9}>Economia líquida</text>
      </svg>
    </div>
  );
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-[#1A2332] p-3">
      <p className="text-xs text-[#6692A8]">{label}</p>
      <p className="text-base font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-[#6692A8]">{sub}</p>}
    </div>
  );
}

function CostCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? 'bg-[#2F927B]/20 border border-[#2F927B]/40' : 'bg-[#1A2332]'}`}>
      <p className="text-xs text-[#6692A8]">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-[#2F927B]' : 'text-white'}`}>
        R$ {fmt(value)}
      </p>
    </div>
  );
}
