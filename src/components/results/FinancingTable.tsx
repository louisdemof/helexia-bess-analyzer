// src/components/results/FinancingTable.tsx
// Separate box for external financing impact — only shows when financing is enabled
import type { EaaSResult, EconomicParams } from '../../engine/types.ts';

interface Props {
  results: EaaSResult[];
  grossSavingsYr1: number;
  econ: EconomicParams;
}

function fmtR(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

export default function FinancingTable({ results, grossSavingsYr1, econ }: Props) {
  if (!econ.financingEnabled || results.length === 0) return null;

  const debtPct = (econ.financingPctCapex * 100).toFixed(0);
  const rate = (econ.financingRate * 100).toFixed(1);
  const term = econ.financingTermYears;

  return (
    <div className="rounded-xl border border-[#8b5cf6]/30 bg-[#243447] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Impacto do Financiamento Externo</h3>
        <span className="rounded-full bg-[#8b5cf6]/20 px-3 py-1 text-xs text-[#8b5cf6]">
          {debtPct}% financiado a {rate}% a.a. — {term} anos
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="py-2 text-left text-[#6692A8]">Métrica</th>
              {results.map((r) => (
                <th key={r.contractYears} className="py-2 text-right text-white font-semibold text-base">
                  {r.contractYears} anos
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Option A: Lower fee */}
            <tr className="border-t border-[#8b5cf6]/20">
              <td className="py-2 text-[#6692A8]" colSpan={4}>
                <span className="font-semibold text-white">Opção A</span> — Fee reduzido (mesma TIR equity 13,7%)
              </td>
            </tr>
            <Row label="Fee mensal SEM financiamento" values={results.map((r) => fmtR(r.monthlyFeeYr1))} />
            <Row label="Fee mensal COM financiamento" values={results.map((r) => fmtR(r.monthlyFeeWithFinancing))} bold color="text-[#8b5cf6]" />
            <Row
              label="Redução no fee"
              values={results.map((r) => {
                const diff = r.monthlyFeeYr1 - r.monthlyFeeWithFinancing;
                return diff > 0 ? '-' + fmtR(diff) + '/mês' : 'R$ 0';
              })}
              sub color="text-[#C6DA38]"
            />
            <Row
              label="Economia líquida cliente Ano 1"
              values={results.map((r) => fmtR(grossSavingsYr1 - r.monthlyFeeWithFinancing * 12))}
              color={grossSavingsYr1 - results[0].monthlyFeeWithFinancing * 12 >= 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}
              bold
            />

            <Separator />

            {/* Option B: Higher IRR */}
            <tr className="border-t border-[#8b5cf6]/20">
              <td className="py-2 text-[#6692A8]" colSpan={4}>
                <span className="font-semibold text-white">Opção B</span> — Mesmo fee, TIR equity superior
              </td>
            </tr>
            <Row label="Fee mensal (mantido)" values={results.map((r) => fmtR(r.monthlyFeeYr1))} />
            <Row
              label="TIR equity Helexia (real)"
              values={results.map((r) => {
                const realIRR = (1 + r.equityIRRWithFinancingSameFee) / (1 + econ.ipca) - 1;
                return (realIRR * 100).toFixed(1) + '%';
              })}
              bold color="text-[#8b5cf6]"
            />
            <Row
              label="Ganho vs sem financiamento"
              values={results.map((r) => {
                const realIRR = (1 + r.equityIRRWithFinancingSameFee) / (1 + econ.ipca) - 1;
                const gain = (realIRR - 0.137) * 100;
                return '+' + gain.toFixed(1) + ' p.p.';
              })}
              sub color="text-[#C6DA38]"
            />
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[#6692A8]">
        Opção A: Helexia repassa a vantagem do custo de dívida ao cliente (fee menor, mesma TIR equity).
        Opção B: Helexia mantém o fee e captura a alavancagem financeira (TIR equity maior).
      </p>
    </div>
  );
}

function Row({ label, values, color, bold, sub }: { label: string; values: string[]; color?: string; bold?: boolean; sub?: boolean }) {
  return (
    <tr className={sub ? '' : 'border-t border-[#2F927B]/10'}>
      <td className={`py-2 ${sub ? 'pl-4 text-xs' : 'text-sm'} text-[#6692A8]`}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`py-2 text-right ${sub ? 'text-xs' : 'text-sm'} ${bold ? 'font-bold text-base' : ''} ${color ?? 'text-white'}`}>{v}</td>
      ))}
    </tr>
  );
}

function Separator() {
  return <tr><td colSpan={4} className="py-1"><div className="border-t border-[#8b5cf6]/20" /></td></tr>;
}
