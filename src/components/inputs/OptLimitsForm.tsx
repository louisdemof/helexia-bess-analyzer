// src/components/inputs/OptLimitsForm.tsx
import type { OptLimits } from '../../engine/types.ts';
import CurrencyInput from '../shared/CurrencyInput.tsx';
import Toggle from '../shared/Toggle.tsx';

interface Props {
  params: OptLimits;
  onChange: (updates: Partial<OptLimits>) => void;
  batteryCapacityKWh: number;
  cRate: number;
}

export default function OptLimitsForm({ params, onChange, batteryCapacityKWh, cRate }: Props) {
  const autoMaxPower = batteryCapacityKWh * cRate;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Limites da Otimização</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <CurrencyInput label="SoC mínimo" value={params.minSoCPct * 100} onChange={(v) => onChange({ minSoCPct: v / 100 })} unit="%" step={1} min={0} max={100} />
          <CurrencyInput label="SoC máximo" value={params.maxSoCPct * 100} onChange={(v) => onChange({ maxSoCPct: v / 100 })} unit="%" step={1} min={0} max={100} />
          <CurrencyInput
            label="Potência máxima descarga"
            value={params.maxDischargePowerKW || autoMaxPower}
            onChange={(v) => onChange({ maxDischargePowerKW: v })}
            unit="kW"
          />
          <CurrencyInput
            label="Potência máxima carga"
            value={params.maxChargePowerKW || autoMaxPower}
            onChange={(v) => onChange({ maxChargePowerKW: v })}
            unit="kW"
          />
        </div>
        <p className="mt-2 text-xs text-[#6692A8]">
          Auto-calculado: {autoMaxPower.toFixed(0)} kW (capacidade {batteryCapacityKWh} kWh x C-rate {cRate})
        </p>
        <div className="mt-4">
          <Toggle
            label="Restringir carga apenas fora do horário de ponta"
            checked={params.restrictChargingToOffPeak}
            onChange={(v) => onChange({ restrictChargingToOffPeak: v })}
          />
        </div>
      </div>
    </div>
  );
}
