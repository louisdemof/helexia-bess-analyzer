// src/components/results/EaaSFeeTable.tsx
import type { EaaSResult } from '../../engine/types.ts';

interface Props {
  results: EaaSResult[];
  grossSavingsYr1: number;
}

function fmtR(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

export default function EaaSFeeTable({ results, grossSavingsYr1 }: Props) {
  if (results.length === 0) return null;

  const hasAugImpact = results.some((r) => r.augmentationImpactMonthly > 0);

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Resumo EaaS — Comparação de Contratos</h3>
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
            <Row label="Economia bruta anual (sem fee)" values={results.map(() => fmtR(grossSavingsYr1))} color="text-[#C6DA38]" />
            <Separator />
            <Row label="Fee mensal Ano 1" values={results.map((r) => fmtR(r.monthlyFeeYr1))} bold />
            {hasAugImpact && (
              <>
                <Row label="Fee sem augmentação" values={results.map((r) => fmtR(r.monthlyFeeWithoutAug))} sub />
                <Row label="Impacto augmentação no fee" values={results.map((r) => r.augmentationImpactMonthly > 0 ? '+' + fmtR(r.augmentationImpactMonthly) + '/mês' : 'R$ 0')} sub color="text-[#f97316]" />
                <Row label="Custo total augmentação (nominal)" values={results.map((r) => fmtR(r.totalAugCostNominal))} sub color="text-[#f97316]" />
              </>
            )}
            <Row label="Fee mensal Ano 5" values={results.map((r) => fmtR(r.monthlyFeeYr5))} sub />
            <Row label="Fee anual Ano 1" values={results.map((r) => fmtR(r.annualFeeYr1))} />
            <Separator />
            <Row label="Economia líquida Ano 1" values={results.map((r) => fmtR(r.netSavingsYr1))} color={results[0].netSavingsYr1 >= 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'} bold />
            <Row label="Ratio economia / fee" values={results.map((r) => r.grossSavingsVsFeeRatio.toFixed(2) + '×')} color={results[0].grossSavingsVsFeeRatio >= 1 ? 'text-[#C6DA38]' : 'text-[#ef4444]'} />
            <Row label="Break-even cliente" values={results.map((r) => r.clientBreakEvenMonths !== null ? r.clientBreakEvenMonths + ' meses' : 'Imediato')} />
            <Separator />
            <Row label="IRR Helexia (real)" values={results.map((r) => (r.helexiaIRRReal * 100).toFixed(1) + '%')} color="text-[#2F927B]" />
          </tbody>
        </table>
      </div>
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
  return <tr><td colSpan={4} className="py-1"><div className="border-t border-[#2F927B]/20" /></td></tr>;
}
