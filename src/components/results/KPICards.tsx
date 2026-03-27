// src/components/results/KPICards.tsx
import type { BESSSimulationResult, EaaSResult } from '../../engine/types.ts';

interface Props {
  sim: BESSSimulationResult;
  eaas: EaaSResult | null;
}

function fmt(v: number, decimals = 0): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function KPICards({ sim, eaas }: Props) {
  const savingsPct = sim.totalInvoiceBeforeYr1 > 0
    ? (sim.grossSavingsYr1 / sim.totalInvoiceBeforeYr1) * 100
    : 0;
  const netSavingsYr1 = eaas ? eaas.netSavingsYr1 : sim.grossSavingsYr1;
  const netPct = sim.totalInvoiceBeforeYr1 > 0
    ? (netSavingsYr1 / sim.totalInvoiceBeforeYr1) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <Card label="Fatura Antes" value={`R$ ${fmt(sim.totalInvoiceBeforeYr1)}`} sub="/ano" color="navy" />
      <Card label="Fatura Depois" value={`R$ ${fmt(sim.totalInvoiceAfterYr1)}`} sub="/ano (sem EaaS)" color="teal" />
      <Card label="Economia Bruta" value={`R$ ${fmt(sim.grossSavingsYr1)}`} sub={`${fmt(savingsPct, 1)}% redução`} color="lime" />
      <Card
        label="Fee EaaS (Ano 1)"
        value={eaas ? `R$ ${fmt(eaas.monthlyFeeYr1)}` : '—'}
        sub={eaas ? `/mês (${eaas.contractYears}a)` : ''}
        color="navy"
      />
      <Card
        label="Economia Líquida"
        value={`R$ ${fmt(netSavingsYr1)}`}
        sub={`${fmt(netPct, 1)}% líquido /ano`}
        color="teal"
      />
      <Card label="Energia Deslocada" value={`${fmt(sim.energyShiftedYr1MWh, 1)} MWh`} sub="/ano" color="orange" />
    </div>
  );
}

function Card({ label, value, sub, color }: { label: string; value: string; sub: string; color: 'navy' | 'teal' | 'lime' | 'orange' }) {
  const borderColors = {
    navy: 'border-[#004B70]/40',
    teal: 'border-[#2F927B]/40',
    lime: 'border-[#C6DA38]/40',
    orange: 'border-[#f97316]/40',
  };
  const accentColors = {
    navy: 'text-[#004B70]',
    teal: 'text-[#2F927B]',
    lime: 'text-[#C6DA38]',
    orange: 'text-[#f97316]',
  };
  return (
    <div className={`rounded-xl border ${borderColors[color]} bg-[#243447] p-4`}>
      <p className="mb-1 text-xs text-[#6692A8]">{label}</p>
      <p className={`text-xl font-bold ${accentColors[color]} lg:text-2xl`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#6692A8]">{sub}</p>}
    </div>
  );
}
