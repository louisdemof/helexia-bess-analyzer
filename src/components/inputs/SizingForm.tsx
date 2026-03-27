// src/components/inputs/SizingForm.tsx
import type { SizingParams } from '../../engine/types.ts';

interface Props {
  params: SizingParams;
  onChange: (updates: Partial<SizingParams>) => void;
  // Read from other tabs (not editable here)
  batteryCapacityKWh: number;
  cRate: number;
  capexPerKWh: number;
  otherFixedCosts: number;
  omPctCapex: number;
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SizingForm({ params, onChange, batteryCapacityKWh, cRate, capexPerKWh, otherFixedCosts, omPctCapex }: Props) {
  const batteryCapex = batteryCapacityKWh * capexPerKWh;
  const totalCapex = batteryCapex + otherFixedCosts;
  const maxPowerKW = batteryCapacityKWh * cRate;
  const omAnnual = totalCapex * omPctCapex;

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
