// src/components/inputs/EMSParamsForm.tsx
import type { EMSParams } from '../../engine/types.ts';
import Toggle from '../shared/Toggle.tsx';
import CurrencyInput from '../shared/CurrencyInput.tsx';

interface Props {
  params: EMSParams;
  onChange: (updates: Partial<EMSParams>) => void;
}

export default function EMSParamsForm({ params, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Operations */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Operações</h3>
        <div className="space-y-3">
          <Toggle label="Load Shifting (redução consumo ponta)" checked={params.loadShifting} onChange={(v) => onChange({ loadShifting: v })} />
          <Toggle label="Peak Shaving (redução demanda pico)" checked={params.peakShaving} onChange={(v) => onChange({ peakShaving: v })} disabled />
          {params.peakShaving && (
            <p className="ml-14 text-xs text-[#6692A8]">Fase 2 — em desenvolvimento</p>
          )}
        </div>
      </div>

      {/* Charging */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Carregamento</h3>
        <div className="space-y-3">
          <Toggle label="Carregamento com Grid" checked={params.gridCharging} onChange={(v) => onChange({ gridCharging: v })} />
          {params.gridCharging && (
            <CurrencyInput
              label="Horas antes do pico para carregar com a rede"
              value={params.chargeWindowHours}
              onChange={(v) => onChange({ chargeWindowHours: v })}
              unit="horas"
              step={1}
              min={1}
              className="ml-14 max-w-xs"
            />
          )}
          <Toggle label="Carregamento com Solar" checked={params.solarCharging} onChange={(v) => onChange({ solarCharging: v })} disabled />
          <p className="ml-14 text-xs text-[#6692A8]/60">Disponível em versão futura (Solar + BESS)</p>
        </div>
      </div>
    </div>
  );
}
