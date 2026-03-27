// src/components/results/InvoiceComparisonChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthlyResult } from '../../engine/types.ts';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface Props {
  monthlyResults: MonthlyResult[]; // first 12 months
}

export default function InvoiceComparisonChart({ monthlyResults }: Props) {
  const data = monthlyResults.slice(0, 12).map((m, i) => ({
    name: MONTHS[i],
    before: Math.round(m.invoiceBeforeR),
    after: Math.round(m.invoiceAfterR),
    savings: Math.round(m.savingsGrossR),
  }));

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Comparação de Faturas — Ano 1</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fill: '#6692A8', fontSize: 12 }} axisLine={{ stroke: '#6692A8' }} />
          <YAxis tick={{ fill: '#6692A8', fontSize: 11 }} axisLine={{ stroke: '#6692A8' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A2332', border: '1px solid #2F927B', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: unknown) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, '']}
          />
          <Legend wrapperStyle={{ color: '#6692A8', fontSize: 12 }} />
          <Bar dataKey="before" name="Antes BESS" fill="#004B70" radius={[4, 4, 0, 0]} />
          <Bar dataKey="after" name="Depois BESS" fill="#2F927B" radius={[4, 4, 0, 0]} />
          <Bar dataKey="savings" name="Economia" fill="#C6DA38" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
