// src/components/results/SoCChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  hourlySoC: number[];      // Full SoC series (8760 × years)
  usableKWh: number;        // Usable capacity for % calculation
}

export default function SoCChart({ hourlySoC, usableKWh }: Props) {
  // Show 30-day sample (720 hours) from a representative month (e.g., hours 2160–2880 = April)
  const startH = 2160;
  const endH = Math.min(startH + 720, hourlySoC.length);
  const sample = hourlySoC.slice(startH, endH);

  const data = sample.map((soc, i) => ({
    hour: i,
    socPct: usableKWh > 0 ? (soc / usableKWh) * 100 : 0,
  }));

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Estado de Carga (SoC) — 30 dias amostra</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis
            dataKey="hour"
            tick={{ fill: '#6692A8', fontSize: 11 }}
            axisLine={{ stroke: '#6692A8' }}
            tickFormatter={(h: number) => `D${Math.floor(h / 24) + 1}`}
            interval={71}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#6692A8', fontSize: 11 }}
            axisLine={{ stroke: '#6692A8' }}
            unit="%"
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A2332', border: '1px solid #2F927B', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            labelFormatter={(h: unknown) => `Dia ${Math.floor(Number(h) / 24) + 1}, ${String(Number(h) % 24).padStart(2, '0')}h`}
            formatter={(value: unknown) => [`${Number(value).toFixed(1)}%`, 'SoC']}
          />
          <Line dataKey="socPct" stroke="#2F927B" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
