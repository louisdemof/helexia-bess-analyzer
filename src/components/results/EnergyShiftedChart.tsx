// src/components/results/EnergyShiftedChart.tsx
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import type { MonthlyResult } from '../../engine/types.ts';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface Props {
  monthlyResults: MonthlyResult[]; // first 12 months
}

export default function EnergyShiftedChart({ monthlyResults }: Props) {
  const data = monthlyResults.slice(0, 12).map((m, i) => {
    const demReductionPct = m.demandaMedidaBeforeKW > 0
      ? ((m.demandaMedidaBeforeKW - m.demandaMedidaAfterKW) / m.demandaMedidaBeforeKW) * 100
      : 0;
    return {
      name: MONTHS[i],
      shifted: Math.round(m.energyShiftedKWh),
      demReduction: Math.round(demReductionPct * 10) / 10,
    };
  });

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Energia Deslocada por Mês</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fill: '#6692A8', fontSize: 12 }} axisLine={{ stroke: '#6692A8' }} />
          <YAxis yAxisId="left" tick={{ fill: '#6692A8', fontSize: 11 }} axisLine={{ stroke: '#6692A8' }} unit=" kWh" />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#C6DA38', fontSize: 11 }} axisLine={{ stroke: '#C6DA38' }} unit="%" domain={[0, 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A2332', border: '1px solid #2F927B', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar yAxisId="left" dataKey="shifted" name="Energia deslocada (kWh)" fill="#2F927B" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" dataKey="demReduction" name="Redução demanda (%)" stroke="#C6DA38" strokeWidth={2} dot={{ fill: '#C6DA38', r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
