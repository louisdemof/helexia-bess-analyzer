// src/components/inputs/EMSParamsForm.tsx
import type { EMSParams, BESSMode } from '../../engine/types.ts';
import Toggle from '../shared/Toggle.tsx';
import CurrencyInput from '../shared/CurrencyInput.tsx';

interface Props {
  params: EMSParams;
  onChange: (updates: Partial<EMSParams>) => void;
  demandaContratadaKW: number;
}

const MODES: { value: BESSMode; label: string; desc: string }[] = [
  {
    value: 'loadShifting',
    label: 'Load Shifting',
    desc: 'Desloca consumo do horário de ponta para fora de ponta. Descarga apenas durante ponta (dias úteis).',
  },
  {
    value: 'peakShaving',
    label: 'Peak Shaving',
    desc: 'Reduz pico de demanda. Descarga sempre que a carga excede o limite de demanda alvo. Opera em qualquer horário.',
  },
  {
    value: 'combined',
    label: 'Combinado',
    desc: 'Load Shifting durante ponta + Peak Shaving fora de ponta. Máxima economia: reduz consumo ponta E pico de demanda.',
  },
];

export default function EMSParamsForm({ params, onChange, demandaContratadaKW }: Props) {
  const mode = params.bessMode || 'loadShifting';
  const showPeakShaving = mode === 'peakShaving' || mode === 'combined';

  function handleModeChange(m: BESSMode) {
    onChange({
      bessMode: m,
      loadShifting: m === 'loadShifting' || m === 'combined',
      peakShaving: m === 'peakShaving' || m === 'combined',
    });
  }

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Modo de Operação do BESS</h3>
        <div className="space-y-3">
          {MODES.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                mode === opt.value
                  ? 'border-[#2F927B] bg-[#2F927B]/10'
                  : 'border-[#2F927B]/20 bg-[#1A2332] hover:border-[#2F927B]/40'
              }`}
            >
              <input
                type="radio"
                name="bessMode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => handleModeChange(opt.value)}
                className="mt-0.5 h-4 w-4 accent-[#2F927B]"
              />
              <div>
                <span className="text-sm font-medium text-white">{opt.label}</span>
                <p className="mt-1 text-xs text-[#6692A8]">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Peak Shaving target */}
      {showPeakShaving && (
        <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
          <h3 className="mb-4 text-base font-semibold text-white">Limite de Demanda (Peak Shaving)</h3>
          <p className="mb-4 text-xs text-[#6692A8]">
            O BESS descarrega sempre que a carga excede este limite, reduzindo a demanda medida para o distribuidor.
          </p>

          <Toggle
            label="Usar demanda contratada como limite"
            checked={params.peakShavingAutoTarget ?? true}
            onChange={(v) => onChange({ peakShavingAutoTarget: v })}
          />

          {params.peakShavingAutoTarget ? (
            <div className="mt-3 rounded-lg bg-[#1A2332] p-3">
              <p className="text-xs text-[#6692A8]">Limite automático: <strong className="text-white">{demandaContratadaKW.toLocaleString('pt-BR')} kW</strong> (demanda contratada da aba Rede Elétrica)</p>
            </div>
          ) : (
            <CurrencyInput
              label="Limite de demanda alvo"
              value={params.peakShavingTargetKW || demandaContratadaKW}
              onChange={(v) => onChange({ peakShavingTargetKW: v })}
              unit="kW"
              className="mt-3 max-w-xs"
            />
          )}

          <div className="mt-4 rounded-lg border border-[#f97316]/20 bg-[#f97316]/5 p-3 text-xs text-[#f97316]">
            <strong>Peak Shaving — como funciona:</strong>
            <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[#6692A8]">
              <li>Quando carga &gt; limite → BESS descarrega a diferença (qualquer hora, qualquer dia)</li>
              <li>Quando carga &lt; limite → BESS carrega (respeitando o limite para não criar novo pico)</li>
              <li>Reduz demanda medida → economia na tarifa de demanda (R$/kW/mês)</li>
              <li>Elimina ou reduz multa de ultrapassagem</li>
              {mode === 'combined' && (
                <li className="text-[#2F927B]"><strong>Combinado:</strong> durante ponta, prioriza load shifting (descarga total). Fora de ponta, faz peak shaving acima do limite.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Charging */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Carregamento</h3>
        <div className="space-y-3">
          <Toggle label="Carregamento com Grid" checked={params.gridCharging} onChange={(v) => onChange({ gridCharging: v })} />
          {params.gridCharging && mode !== 'peakShaving' && (
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
          {params.gridCharging && mode === 'peakShaving' && (
            <p className="ml-14 text-xs text-[#6692A8]">Em Peak Shaving, o BESS carrega automaticamente sempre que a carga está abaixo do limite alvo.</p>
          )}
          <Toggle label="Carregamento com Solar" checked={params.solarCharging} onChange={(v) => onChange({ solarCharging: v })} disabled />
          <p className="ml-14 text-xs text-[#6692A8]/60">Disponível em versão futura (Solar + BESS)</p>
        </div>
      </div>
    </div>
  );
}
