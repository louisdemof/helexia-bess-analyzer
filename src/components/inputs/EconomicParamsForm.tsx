// src/components/inputs/EconomicParamsForm.tsx
import type { EconomicParams } from '../../engine/types.ts';
import CurrencyInput from '../shared/CurrencyInput.tsx';
import Toggle from '../shared/Toggle.tsx';

interface Props {
  params: EconomicParams;
  onChange: (updates: Partial<EconomicParams>) => void;
}

export default function EconomicParamsForm({ params, onChange }: Props) {
  return (
    <div className="space-y-8">
      {/* Simulation */}
      <Section title="Simulação">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <CurrencyInput label="Anos de simulação" value={params.simulationYears} onChange={(v) => onChange({ simulationYears: v })} unit="anos" step={1} min={1} max={30} />
          <CurrencyInput label="Ano de início" value={params.startYear} onChange={(v) => onChange({ startYear: v })} unit="" step={1} min={2024} max={2035} />
          <CurrencyInput label="IPCA" value={params.ipca * 100} onChange={(v) => onChange({ ipca: v / 100 })} unit="%" step={0.01} />
          <CurrencyInput label="Inflação energia" value={params.energyInflation * 100} onChange={(v) => onChange({ energyInflation: v / 100 })} unit="%" step={0.01} />
          <CurrencyInput label="Taxa Mínima de Atratividade" value={params.tma * 100} onChange={(v) => onChange({ tma: v / 100 })} unit="%" step={0.01} />
        </div>
      </Section>

      {/* Taxes */}
      <Section title="Impostos">
        <div className="grid grid-cols-3 gap-4">
          <CurrencyInput label="ICMS" value={params.icms * 100} onChange={(v) => onChange({ icms: v / 100 })} unit="%" step={0.1} />
          <CurrencyInput label="PIS" value={params.pis * 100} onChange={(v) => onChange({ pis: v / 100 })} unit="%" step={0.0001} />
          <CurrencyInput label="COFINS" value={params.cofins * 100} onChange={(v) => onChange({ cofins: v / 100 })} unit="%" step={0.0001} />
        </div>
      </Section>

      {/* Solar (disabled) */}
      <Section title="Solar FV" disabled>
        <p className="text-sm text-[#6692A8]/60">Disponível em versão futura (Solar + BESS)</p>
      </Section>

      {/* Battery CAPEX */}
      <Section title="Bateria">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <CurrencyInput label="Capex" value={params.capexPerKWh} onChange={(v) => onChange({ capexPerKWh: v })} unit="R$/kWh" step={10} />
          <CurrencyInput label="O&M" value={params.omPctCapex * 100} onChange={(v) => onChange({ omPctCapex: v / 100 })} unit="% Capex a.a." step={0.1} />
          <CurrencyInput label="Pintura C5" value={params.paintingC5Pct * 100} onChange={(v) => onChange({ paintingC5Pct: v / 100 })} unit="% custo BESS" step={0.1} />
          <CurrencyInput label="BOS" value={params.bosPct * 100} onChange={(v) => onChange({ bosPct: v / 100 })} unit="% custo BESS" step={0.1} />
          <CurrencyInput label="EPC" value={params.epcPct * 100} onChange={(v) => onChange({ epcPct: v / 100 })} unit="% custo BESS" step={0.1} />
          <CurrencyInput label="Custo Desenvolvedor" value={params.developerCostPct * 100} onChange={(v) => onChange({ developerCostPct: v / 100 })} unit="% custo BESS" step={0.1} />
        </div>

        <div className="mt-4 space-y-3">
          <Toggle label="Troca do conversor bidirecional" checked={params.converterReplacementEnabled} onChange={(v) => onChange({ converterReplacementEnabled: v })} />
          {params.converterReplacementEnabled && (
            <div className="ml-14 flex gap-4">
              <CurrencyInput label="Periodicidade" value={params.converterReplacementYears} onChange={(v) => onChange({ converterReplacementYears: v })} unit="anos" step={1} min={1} />
              <CurrencyInput label="Custo" value={params.converterReplacementPctCapex * 100} onChange={(v) => onChange({ converterReplacementPctCapex: v / 100 })} unit="% Capex" step={0.1} />
            </div>
          )}

          <div className="rounded-lg bg-[#1A2332] px-3 py-2">
            <p className="text-xs text-[#6692A8]">Augmentação de capacidade configurada na aba Renováveis (Bateria)</p>
          </div>
        </div>
      </Section>

      {/* Helexia structure costs */}
      <Section title="Custos Estruturais Helexia">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <CurrencyInput label="SG&A / Custo estrutura" value={params.sgaPctCapex * 100} onChange={(v) => onChange({ sgaPctCapex: v / 100 })} unit="% Capex a.a." step={0.5} min={0} max={10} />
        </div>

        <div className="mt-4 space-y-3">
          <Toggle label="Custo EMS (mensal)" checked={params.emsEnabled} onChange={(v) => onChange({ emsEnabled: v })} />
          {params.emsEnabled && (
            <CurrencyInput label="Custo EMS" value={params.emsCostMonthly} onChange={(v) => onChange({ emsCostMonthly: v })} unit="R$/mês" className="ml-14 max-w-xs" />
          )}

          <Toggle label="Asset Management (mensal)" checked={params.assetMgmtEnabled} onChange={(v) => onChange({ assetMgmtEnabled: v })} />
          {params.assetMgmtEnabled && (
            <CurrencyInput label="Custo Asset Management" value={params.assetMgmtCostMonthly} onChange={(v) => onChange({ assetMgmtCostMonthly: v })} unit="R$/mês" className="ml-14 max-w-xs" />
          )}
        </div>
      </Section>

      {/* Other fixed costs */}
      <Section title="Outros Custos">
        <CurrencyInput label="Outros custos fixos (CAPEX)" value={params.otherFixedCosts} onChange={(v) => onChange({ otherFixedCosts: v })} unit="R$" step={1000} className="max-w-xs" />
      </Section>

      {/* External Financing */}
      <Section title="Financiamento Externo">
        <Toggle label="Financiamento externo (ex: BNDES Fundo Clima)" checked={params.financingEnabled} onChange={(v) => onChange({ financingEnabled: v })} />
        {params.financingEnabled && (
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <CurrencyInput label="% do CAPEX financiado" value={params.financingPctCapex * 100} onChange={(v) => onChange({ financingPctCapex: v / 100 })} unit="%" step={5} min={0} max={100} />
            <CurrencyInput label="Taxa de juros anual" value={params.financingRate * 100} onChange={(v) => onChange({ financingRate: v / 100 })} unit="% a.a." step={0.5} />
            <CurrencyInput label="Prazo do financiamento" value={params.financingTermYears} onChange={(v) => onChange({ financingTermYears: v })} unit="anos" step={1} min={1} max={20} />
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children, disabled }: { title: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div className={`rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5 ${disabled ? 'opacity-40' : ''}`}>
      <h3 className="mb-4 text-base font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}
