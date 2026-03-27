// src/components/results/LoadCurveChart.tsx
import { Line, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

interface Props {
  originalCurve: number[];  // 8760 hourly kW
  netCurve: number[];       // 8760 hourly kW after BESS
}

export default function LoadCurveChart({ originalCurve, netCurve }: Props) {
  // Average day profile (24 hours)
  const avgOriginal = new Array(24).fill(0);
  const avgNet = new Array(24).fill(0);
  const count = new Array(24).fill(0);

  for (let h = 0; h < Math.min(originalCurve.length, 8760); h++) {
    const hod = h % 24;
    avgOriginal[hod] += originalCurve[h];
    avgNet[hod] += netCurve[h];
    count[hod]++;
  }

  const data = Array.from({ length: 24 }, (_, h) => {
    const n = count[h] || 1;
    const orig = avgOriginal[h] / n;
    const net = avgNet[h] / n;
    return {
      hour: `${String(h).padStart(2, '0')}h`,
      original: Math.round(orig),
      net: Math.round(net),
      discharge: Math.max(0, Math.round(orig - net)),
    };
  });

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Curva de Carga — Dia Médio</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey="hour" tick={{ fill: '#6692A8', fontSize: 11 }} axisLine={{ stroke: '#6692A8' }} />
          <YAxis tick={{ fill: '#6692A8', fontSize: 11 }} axisLine={{ stroke: '#6692A8' }} unit=" kW" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A2332', border: '1px solid #2F927B', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: unknown, name: unknown) => [`${Number(value).toLocaleString('pt-BR')} kW`, String(name)]}
          />
          <Legend wrapperStyle={{ color: '#6692A8', fontSize: 12 }} />
          <Area dataKey="discharge" name="Descarga BESS" fill="#C6DA38" fillOpacity={0.3} stroke="none" />
          <Line dataKey="original" name="Carga Original" stroke="#004B70" strokeWidth={2} dot={false} />
          <Line dataKey="net" name="Carga com BESS" stroke="#2F927B" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
