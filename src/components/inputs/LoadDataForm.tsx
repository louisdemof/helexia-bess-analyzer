// src/components/inputs/LoadDataForm.tsx
import type { LoadData, LoadInputMethod, MonthlyInvoiceRow } from '../../engine/types.ts';
import type { LoadProfile } from '../../data/loadProfiles.ts';
import { getProfileById } from '../../data/loadProfiles.ts';
import HourlyLoadTable from './HourlyLoadTable.tsx';
import SeasonalityTable from './SeasonalityTable.tsx';
import ProfileSelector from './ProfileSelector.tsx';
import CSVUploader from './CSVUploader.tsx';
import LoadHeatmap from './LoadHeatmap.tsx';
import CurrencyInput from '../shared/CurrencyInput.tsx';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const METHOD_OPTIONS: { value: LoadInputMethod; label: string }[] = [
  { value: 'invoice', label: 'Curva de carga a partir da conta de energia' },
  { value: 'manual',  label: 'Desenvolver curva de carga' },
  { value: 'profile', label: 'Fazer upload de curva de carga padrão Enersmart' },
  { value: 'csv',     label: 'Fazer upload arquivos SCDE-CCEE' },
];

interface Props {
  data: LoadData;
  onChange: (updates: Partial<LoadData>) => void;
  gridState?: string;  // UF for profile highlighting
}

export default function LoadDataForm({ data, onChange, gridState }: Props) {
  const selectedProfile = data.profileId ? getProfileById(data.profileId) : null;

  function handleMethodChange(method: LoadInputMethod) {
    onChange({ method });
  }

  function handleInvoiceChange(month: number, field: keyof MonthlyInvoiceRow, value: number) {
    const next = data.monthlyInvoice.map((r) =>
      r.month === month ? { ...r, [field]: value } : r
    );
    onChange({ monthlyInvoice: next });
  }

  function handleProfileSelect(profile: LoadProfile) {
    onChange({
      profileId: profile.id,
      monthlySeasonality: [...profile.seasonality],
    });
  }

  function handleCSVParsed(hourlyKW: number[], fileName: string) {
    onChange({ csvData: hourlyKW, csvFileName: fileName });
  }

  return (
    <div className="space-y-6">
      {/* Method selector */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Método de entrada</h3>
        <div className="space-y-2">
          {METHOD_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 transition-colors">
              <input
                type="radio"
                name="loadMethod"
                value={opt.value}
                checked={data.method === opt.value}
                onChange={() => handleMethodChange(opt.value)}
                className="h-4 w-4 accent-[#2F927B]"
              />
              <span className="text-sm text-white">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Invoice method */}
      {data.method === 'invoice' && (
        <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
          <h3 className="mb-4 text-base font-semibold text-white">Dados mensais da fatura</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#6692A8]">
                  <th className="py-2 text-left">Mês</th>
                  <th className="py-2 text-left">Consumo Ponta (kWh)</th>
                  <th className="py-2 text-left">Consumo FP (kWh)</th>
                  <th className="py-2 text-left">Demanda Medida (kW)</th>
                  <th className="py-2 text-left">Demanda Contratada (kW)</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyInvoice.map((row) => (
                  <tr key={row.month} className="border-t border-[#2F927B]/10">
                    <td className="py-1 text-[#6692A8]">{MONTHS[row.month - 1]}</td>
                    {(['consumoPontaKWh', 'consumoFPKWh', 'demandaMedidaKW', 'demandaContratadaKW'] as const).map((field) => (
                      <td key={field} className="py-1 pr-2">
                        <input
                          type="number"
                          value={row[field] || ''}
                          onChange={(e) => handleInvoiceChange(row.month, field, parseFloat(e.target.value) || 0)}
                          className="w-28 rounded border border-[#6692A8]/50 bg-[#1A2332] px-2 py-1 text-white focus:border-[#2F927B] focus:outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual method */}
      {data.method === 'manual' && (
        <>
          <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
            <h3 className="mb-4 text-base font-semibold text-white">Carga horária (24h)</h3>
            <HourlyLoadTable values={data.hourlyKVA} onChange={(v) => onChange({ hourlyKVA: v })} />
          </div>
          <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
            <h3 className="mb-4 text-base font-semibold text-white">Sazonalidade mensal (%)</h3>
            <SeasonalityTable values={data.monthlySeasonality} onChange={(v) => onChange({ monthlySeasonality: v })} />
          </div>
        </>
      )}

      {/* Profile method */}
      {data.method === 'profile' && (
        <>
          <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
            <h3 className="mb-4 text-base font-semibold text-white">Perfil da indústria</h3>
            <ProfileSelector selectedId={data.profileId} onSelect={handleProfileSelect} highlightState={gridState} />
          </div>
          {selectedProfile && (
            <>
              <CurrencyInput
                label="Consumo anual estimado"
                value={data.annualConsumptionKWh}
                onChange={(v) => onChange({ annualConsumptionKWh: v })}
                unit="kWh/ano"
                className="max-w-xs"
              />
              {selectedProfile.notes && (
                <div className="rounded-lg border border-[#f97316]/30 bg-[#f97316]/10 p-3 text-sm text-[#f97316]">
                  {selectedProfile.notes}
                </div>
              )}
              {!selectedProfile.syntheticAllowed && (
                <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 p-3 text-sm text-[#ef4444]">
                  Este perfil requer upload de Memória de Massa (CSV SCDE). A variabilidade de guindastes não pode ser modelada sinteticamente.
                </div>
              )}
              <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
                <h3 className="mb-4 text-base font-semibold text-white">Sazonalidade mensal (editável)</h3>
                <SeasonalityTable values={data.monthlySeasonality} onChange={(v) => onChange({ monthlySeasonality: v })} />
              </div>
            </>
          )}
        </>
      )}

      {/* CSV method */}
      {data.method === 'csv' && (
        <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
          <h3 className="mb-4 text-base font-semibold text-white">Upload SCDE-CCEE</h3>
          <CSVUploader onParsed={handleCSVParsed} />
          {data.csvFileName && (
            <p className="mt-3 text-sm text-[#2F927B]">Arquivo carregado: {data.csvFileName}</p>
          )}
        </div>
      )}

      {/* Heatmap — show when CSV data is available */}
      {data.csvData && data.csvData.length >= 8760 && (
        <LoadHeatmap curve8760={data.csvData} />
      )}
    </div>
  );
}
