// src/components/results/CapacityChart.tsx
// Shows intrinsic degradation vs effective capacity (with augmentation)
import { Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine, Area } from 'recharts';
import type { AugmentationEvent } from '../../engine/types.ts';

interface Props {
  intrinsicPct: number[];      // per year: degradation without augmentation
  effectivePct: number[];      // per year: effective with augmentation
  events: AugmentationEvent[];
  nominalKWh: number;
  thresholdPct: number;        // augmentation trigger threshold
}

export default function CapacityChart({ intrinsicPct, effectivePct, events, nominalKWh, thresholdPct }: Props) {
  const years = Math.max(intrinsicPct.length, effectivePct.length);

  const data = Array.from({ length: years }, (_, y) => ({
    year: `A${y}`,
    intrinsic: intrinsicPct[y] ?? intrinsicPct[intrinsicPct.length - 1] ?? 73,
    effective: effectivePct[y] ?? effectivePct[effectivePct.length - 1] ?? 73,
    intrinsicKWh: Math.round(nominalKWh * (intrinsicPct[y] ?? 73) / 100),
    effectiveKWh: Math.round(nominalKWh * (effectivePct[y] ?? 73) / 100),
    isAugYear: events.some((e) => e.year === y),
  }));

  const hasAugmentation = events.length > 0;

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Capacidade da Bateria — Degradação vs Augmentação</h3>
        {hasAugmentation && (
          <span className="rounded-full bg-[#2F927B]/20 px-3 py-1 text-xs text-[#2F927B]">
            {events.length} evento{events.length > 1 ? 's' : ''} de augmentação
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey="year" tick={{ fill: '#6692A8', fontSize: 11 }} axisLine={{ stroke: '#6692A8' }} />
          <YAxis
            domain={[60, 105]}
            tick={{ fill: '#6692A8', fontSize: 11 }}
            axisLine={{ stroke: '#6692A8' }}
            unit="%"
          />
          {/* Threshold line */}
          <ReferenceLine
            y={thresholdPct}
            stroke="#f97316"
            strokeDasharray="6 3"
            label={{ value: `Limite ${thresholdPct}%`, fill: '#f97316', fontSize: 11, position: 'right' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A2332', border: '1px solid #2F927B', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: unknown, name: unknown) => {
              const v = Number(value);
              const kWh = Math.round(nominalKWh * v / 100);
              return [`${v.toFixed(1)}% (${kWh.toLocaleString('pt-BR')} kWh)`, String(name)];
            }}
          />
          <Legend wrapperStyle={{ color: '#6692A8', fontSize: 12 }} />
          {/* Area between the two lines to show augmentation benefit */}
          {hasAugmentation && (
            <Area
              dataKey="effective"
              stroke="none"
              fill="#2F927B"
              fillOpacity={0.15}
              name="Ganho augmentação"
            />
          )}
          {/* Intrinsic degradation (without augmentation) */}
          <Line
            dataKey="intrinsic"
            name="Sem augmentação"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ fill: '#ef4444', r: 3 }}
          />
          {/* Effective capacity (with augmentation) */}
          <Line
            dataKey="effective"
            name="Com augmentação"
            stroke="#2F927B"
            strokeWidth={2.5}
            dot={(props: Record<string, unknown>) => {
              const { cx, cy, index } = props as { cx: number; cy: number; index: number };
              const isAug = data[index]?.isAugYear;
              if (isAug) {
                return (
                  <svg key={index}>
                    <circle cx={cx} cy={cy} r={6} fill="#C6DA38" stroke="#2F927B" strokeWidth={2} />
                  </svg>
                );
              }
              return <circle key={index} cx={cx} cy={cy} r={3} fill="#2F927B" />;
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Summary stats */}
      {hasAugmentation && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#6692A8]">
          <span>kWh adicionados total: <strong className="text-[#C6DA38]">{events.reduce((s, e) => s + e.kWhAdded, 0).toLocaleString('pt-BR')} kWh</strong></span>
          <span>Custo total (real): <strong className="text-white">R$ {events.reduce((s, e) => s + e.costReal, 0).toLocaleString('pt-BR')}</strong></span>
          <span>Capacidade final: <strong className="text-[#2F927B]">{effectivePct[effectivePct.length - 1]?.toFixed(1)}%</strong> vs <strong className="text-[#ef4444]">{intrinsicPct[Math.min(intrinsicPct.length - 1, effectivePct.length - 1)]?.toFixed(1)}%</strong> sem augmentação</span>
        </div>
      )}
    </div>
  );
}
