// src/components/inputs/BatteryParamsForm.tsx
import type { BatteryParams, AugmentationStrategy } from '../../engine/types.ts';
import CurrencyInput from '../shared/CurrencyInput.tsx';

interface Props {
  params: BatteryParams;
  onChange: (updates: Partial<BatteryParams>) => void;
}

export default function BatteryParamsForm({ params, onChange }: Props) {
  function handleDegradationChange(year: number, value: number) {
    const next = [...params.degradationTable];
    next[year] = value;
    onChange({ degradationTable: next });
  }

  return (
    <div className="space-y-6">
      {/* Battery specs */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Parâmetros da Bateria</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <CurrencyInput label="Capacidade nominal" value={params.capacityKWh} onChange={(v) => onChange({ capacityKWh: v })} unit="kWh" step={10} />
          <CurrencyInput label="C-Rate" value={params.cRate} onChange={(v) => onChange({ cRate: v })} step={0.01} />
          <CurrencyInput label="Profundidade de descarga (DoD)" value={params.dodPct * 100} onChange={(v) => onChange({ dodPct: v / 100 })} unit="%" step={1} />
          <CurrencyInput label="Eficiência round-trip (AC-AC)" value={params.roundTripEfficiency * 100} onChange={(v) => onChange({ roundTripEfficiency: v / 100 })} unit="%" step={1} />
          <CurrencyInput label="Ciclos/ano (referência)" value={params.cyclesPerYearRef} onChange={(v) => onChange({ cyclesPerYearRef: v })} unit="ciclos" step={1} />
          <CurrencyInput label="Unidade modular" value={params.modularUnitKWh} onChange={(v) => onChange({ modularUnitKWh: v })} unit="kWh" step={1} />
        </div>
        <div className="mt-3 text-sm text-[#6692A8]">
          Potência máxima: <span className="text-white">{(params.capacityKWh * params.cRate).toFixed(0)} kW</span>
          {' | '}
          Energia utilizável: <span className="text-white">{(params.capacityKWh * params.dodPct).toFixed(0)} kWh</span>
        </div>
      </div>

      {/* Augmentation */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Augmentação de Capacidade</h3>
        <p className="mb-4 text-xs text-[#6692A8]">
          Adição de novos módulos (células + racks) para compensar a degradação. Apenas módulos — PCS, BOS e infraestrutura são reutilizados.
        </p>

        {/* Strategy selector */}
        <div className="mb-4">
          <label className="mb-2 block text-sm text-[#6692A8]">Estratégia de augmentação</label>
          <div className="flex gap-2">
            {([
              { value: 'none' as AugmentationStrategy, label: 'Sem augmentação' },
              { value: 'threshold' as AugmentationStrategy, label: 'Por limite de capacidade (%)' },
              { value: 'scheduled' as AugmentationStrategy, label: 'Programada (a cada N anos)' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ augmentationStrategy: opt.value })}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  params.augmentationStrategy === opt.value
                    ? 'bg-[#2F927B] text-white'
                    : 'border border-[#6692A8] text-[#6692A8] hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Threshold strategy fields */}
        {params.augmentationStrategy === 'threshold' && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <CurrencyInput
              label="Limite mínimo de capacidade"
              value={params.augmentationThresholdPct}
              onChange={(v) => onChange({ augmentationThresholdPct: v })}
              unit="% nominal"
              step={1}
              min={50}
              max={95}
            />
            <CurrencyInput
              label="Restaurar capacidade para"
              value={params.augmentationTargetPct}
              onChange={(v) => onChange({ augmentationTargetPct: v })}
              unit="% nominal"
              step={1}
              min={80}
              max={100}
            />
            <CurrencyInput
              label="Fator de custo módulos"
              value={params.augmentationCostFactor * 100}
              onChange={(v) => onChange({ augmentationCostFactor: v / 100 })}
              unit="% do R$/kWh instalado"
              step={1}
            />
            <CurrencyInput
              label="Declínio preço módulos"
              value={params.augmentationPriceDeclinePct}
              onChange={(v) => onChange({ augmentationPriceDeclinePct: v })}
              unit="% a.a. (real)"
              step={0.5}
            />
          </div>
        )}

        {/* Scheduled strategy fields */}
        {params.augmentationStrategy === 'scheduled' && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <CurrencyInput
              label="Periodicidade"
              value={params.augmentationPeriodYears}
              onChange={(v) => onChange({ augmentationPeriodYears: v })}
              unit="anos"
              step={1}
              min={1}
            />
            <CurrencyInput
              label="Fator de custo módulos"
              value={params.augmentationCostFactor * 100}
              onChange={(v) => onChange({ augmentationCostFactor: v / 100 })}
              unit="% do R$/kWh instalado"
              step={1}
            />
            <CurrencyInput
              label="Declínio preço módulos"
              value={params.augmentationPriceDeclinePct}
              onChange={(v) => onChange({ augmentationPriceDeclinePct: v })}
              unit="% a.a. (real)"
              step={0.5}
            />
          </div>
        )}

        {/* Explanation */}
        <div className="mt-4 rounded-lg bg-[#1A2332] p-3 text-xs text-[#6692A8]">
          {params.augmentationStrategy === 'none' ? (
            <>
              Sem augmentação — a capacidade da bateria segue a tabela de degradação sem reposição de módulos.
              O BESS deslocará progressivamente menos energia ao longo do contrato.
            </>
          ) : params.augmentationStrategy === 'threshold' ? (
            <>
              Quando a capacidade efetiva cair abaixo de <strong className="text-white">{params.augmentationThresholdPct}%</strong> do nominal,
              novos módulos serão adicionados para restaurar a <strong className="text-white">{params.augmentationTargetPct}%</strong>.
              Custo: <strong className="text-white">{(params.augmentationCostFactor * 100).toFixed(0)}%</strong> do R$/kWh original
              (apenas módulos, sem PCS/BOS), com declínio real de <strong className="text-white">{params.augmentationPriceDeclinePct}%/ano</strong> no preço dos módulos.
            </>
          ) : (
            <>
              A cada <strong className="text-white">{params.augmentationPeriodYears} anos</strong>, módulos são adicionados para restaurar 100% da capacidade nominal.
              Custo: <strong className="text-white">{(params.augmentationCostFactor * 100).toFixed(0)}%</strong> do R$/kWh original.
            </>
          )}
        </div>
      </div>

      {/* Solar (disabled) */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5 opacity-40">
        <h3 className="mb-2 text-base font-semibold text-white">Solar FV</h3>
        <p className="text-sm text-[#6692A8]/60">Disponível em versão futura (Solar + BESS)</p>
      </div>

      {/* Degradation table */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Tabela de Degradação (células originais)</h3>
        <p className="mb-3 text-xs text-[#6692A8]">Capacidade remanescente das células originais por ano. A augmentação é calculada separadamente.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {params.degradationTable.map((_, y) => (
                  <th key={y} className="px-1 py-1 text-center text-xs text-[#6692A8]">
                    Ano {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {params.degradationTable.map((v, y) => (
                  <td key={y} className="px-1 py-1">
                    <input
                      type="number"
                      value={v}
                      onChange={(e) => handleDegradationChange(y, parseFloat(e.target.value) || 0)}
                      step={0.1}
                      className="w-full min-w-[55px] rounded border border-[#6692A8]/50 bg-[#1A2332] px-1 py-1 text-center text-white focus:border-[#2F927B] focus:outline-none"
                    />
                  </td>
                ))}
              </tr>
              <tr>
                {params.degradationTable.map((_, y) => (
                  <td key={y} className="px-1 text-center text-xs text-[#6692A8]">%</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
