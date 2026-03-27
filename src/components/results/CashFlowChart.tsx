// src/components/results/CashFlowChart.tsx
import { Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, ReferenceLine } from 'recharts';
import type { EconomicParams, BatteryParams, SizingParams, AugmentationEvent } from '../../engine/types.ts';
import { calcTotalCapex } from '../../engine/eaasFinance.ts';

interface Props {
  monthlyFeeYr1: number;
  econ: EconomicParams;
  battery: BatteryParams;
  sizing: SizingParams;
  contractYears: number;
  augmentationEvents: AugmentationEvent[];
}

export default function CashFlowChart({ monthlyFeeYr1, econ, battery, sizing, contractYears, augmentationEvents }: Props) {
  const totalCapex = calcTotalCapex(econ, battery, sizing);
  const ipca = econ.ipca;

  const data: Array<{ year: string; revenue: number; opex: number; augmentation: number; cumCash: number }> = [];
  let cumCash = -totalCapex;
  let paybackYear: number | null = null;

  for (let y = 1; y <= contractYears; y++) {
    const revenue = monthlyFeeYr1 * 12 * Math.pow(1 + ipca, y - 1);
    let opex = totalCapex * econ.omPctCapex * Math.pow(1 + ipca, y - 1);
    opex += totalCapex * econ.sgaPctCapex * Math.pow(1 + ipca, y - 1);
    if (econ.emsEnabled) opex += econ.emsCostMonthly * 12 * Math.pow(1 + ipca, y - 1);
    if (econ.assetMgmtEnabled) opex += econ.assetMgmtCostMonthly * 12 * Math.pow(1 + ipca, y - 1);
    if (econ.converterReplacementEnabled && econ.converterReplacementYears > 0 && y % econ.converterReplacementYears === 0) {
      opex += totalCapex * econ.converterReplacementPctCapex * Math.pow(1 + ipca, y - 1);
    }

    // Augmentation cost from events
    const augCost = augmentationEvents
      .filter((e) => e.year === y)
      .reduce((sum, e) => sum + e.costNominal, 0);

    cumCash += revenue - opex - augCost;
    if (paybackYear === null && cumCash >= 0) paybackYear = y;
    data.push({
      year: `A${y}`,
      revenue: Math.round(revenue / 1000),
      opex: Math.round(-opex / 1000),
      augmentation: augCost > 0 ? Math.round(-augCost / 1000) : 0,
      cumCash: Math.round(cumCash / 1000),
    });
  }

  const totalAugCost = augmentationEvents.reduce((s, e) => s + e.costNominal, 0);

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Fluxo de Caixa — Perspectiva Helexia</h3>
        <div className="flex gap-2">
          {totalAugCost > 0 && (
            <span className="rounded-full bg-[#f97316]/20 px-3 py-1 text-xs font-medium text-[#f97316]">
              Augmentação: R$ {Math.round(totalAugCost / 1000).toLocaleString('pt-BR')}k
            </span>
          )}
          {paybackYear !== null && (
            <span className="rounded-full bg-[#C6DA38]/20 px-3 py-1 text-xs font-medium text-[#C6DA38]">
              Payback: Ano {paybackYear}
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey="year" tick={{ fill: '#6692A8', fontSize: 11 }} axisLine={{ stroke: '#6692A8' }} />
          <YAxis tick={{ fill: '#6692A8', fontSize: 11 }} axisLine={{ stroke: '#6692A8' }} tickFormatter={(v: number) => `${v}k`} />
          <ReferenceLine y={0} stroke="#6692A8" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A2332', border: '1px solid #2F927B', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: unknown, name: unknown) => [`R$ ${(Number(value) * 1000).toLocaleString('pt-BR')}`, String(name)]}
          />
          <Legend wrapperStyle={{ color: '#6692A8', fontSize: 12 }} />
          <Bar dataKey="revenue" name="Receita" fill="#2F927B" radius={[4, 4, 0, 0]} />
          <Bar dataKey="opex" name="OPEX" fill="#004B70" radius={[0, 0, 4, 4]} />
          <Bar dataKey="augmentation" name="Augmentação" fill="#f97316" radius={[0, 0, 4, 4]} />
          <Line dataKey="cumCash" name="Fluxo Acumulado" stroke="#C6DA38" strokeWidth={2} dot={{ fill: '#C6DA38', r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
