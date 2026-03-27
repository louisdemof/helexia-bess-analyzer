// src/components/inputs/LoadHeatmap.tsx
// Heatmap showing hourly × monthly average load pattern

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface Props {
  curve8760: number[];  // 8760 hourly kW values
}

export default function LoadHeatmap({ curve8760 }: Props) {
  if (!curve8760 || curve8760.length < 8760) return null;

  // Build 24×12 matrix of average kW
  const matrix: number[][] = Array.from({ length: 24 }, () => new Array(12).fill(0));
  const counts: number[][] = Array.from({ length: 24 }, () => new Array(12).fill(0));

  let idx = 0;
  for (let m = 0; m < 12; m++) {
    const days = DAYS_IN_MONTH[m];
    for (let d = 0; d < days; d++) {
      for (let h = 0; h < 24; h++) {
        matrix[h][m] += curve8760[idx] ?? 0;
        counts[h][m]++;
        idx++;
      }
    }
  }

  // Average
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 12; m++) {
      matrix[h][m] = counts[h][m] > 0 ? matrix[h][m] / counts[h][m] : 0;
    }
  }

  // Find min/max for color scale
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 12; m++) {
      if (matrix[h][m] < minVal) minVal = matrix[h][m];
      if (matrix[h][m] > maxVal) maxVal = matrix[h][m];
    }
  }
  const range = maxVal - minVal || 1;

  // Monthly totals (MWh)
  const monthlyMWh: number[] = [];
  idx = 0;
  for (let m = 0; m < 12; m++) {
    let sum = 0;
    const hours = DAYS_IN_MONTH[m] * 24;
    for (let i = 0; i < hours; i++) {
      sum += curve8760[idx++] ?? 0;
    }
    monthlyMWh.push(sum / 1000);
  }

  // Hourly averages (kW)
  const hourlyAvg: number[] = [];
  for (let h = 0; h < 24; h++) {
    let sum = 0;
    for (let m = 0; m < 12; m++) sum += matrix[h][m];
    hourlyAvg.push(sum / 12);
  }

  // Color interpolation: navy (#004B70) → teal (#2F927B) → lime (#C6DA38)
  function getColor(value: number): string {
    const t = (value - minVal) / range;
    if (t < 0.5) {
      const t2 = t * 2;
      const r = Math.round(0 + t2 * (47 - 0));
      const g = Math.round(75 + t2 * (146 - 75));
      const b = Math.round(112 + t2 * (123 - 112));
      return `rgb(${r},${g},${b})`;
    } else {
      const t2 = (t - 0.5) * 2;
      const r = Math.round(47 + t2 * (198 - 47));
      const g = Math.round(146 + t2 * (218 - 146));
      const b = Math.round(123 + t2 * (56 - 123));
      return `rgb(${r},${g},${b})`;
    }
  }

  // Monthly peaks (absolute, not averaged)
  const monthlyPeakKW: number[] = [];
  idx = 0;
  for (let m = 0; m < 12; m++) {
    let peak = 0;
    const hours = DAYS_IN_MONTH[m] * 24;
    for (let i = 0; i < hours; i++) {
      const v = curve8760[idx++] ?? 0;
      if (v > peak) peak = v;
    }
    monthlyPeakKW.push(peak);
  }

  const totalMWh = monthlyMWh.reduce((s, v) => s + v, 0);
  const peakKW = Math.max(...curve8760);  // Absolute peak from raw data
  const avgKW = curve8760.reduce((s, v) => s + v, 0) / 8760;
  const loadFactor = peakKW > 0 ? avgKW / peakKW : 0;

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <h3 className="mb-2 text-base font-semibold text-white">Mapa de Calor — Carga Média (kW)</h3>

      {/* Summary stats */}
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-[#6692A8]">
        <span>Consumo anual: <strong className="text-white">{totalMWh.toFixed(0)} MWh</strong></span>
        <span>Pico: <strong className="text-white">{peakKW.toFixed(0)} kW</strong></span>
        <span>Média: <strong className="text-white">{avgKW.toFixed(0)} kW</strong></span>
        <span>Fator de carga: <strong className="text-white">{(loadFactor * 100).toFixed(1)}%</strong></span>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="px-1 py-1 text-[#6692A8]" />
              {MONTHS.map((m) => (
                <th key={m} className="px-1 py-1 text-center text-[#6692A8]">{m}</th>
              ))}
              <th className="px-2 py-1 text-center text-[#6692A8]">Média</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 24 }, (_, h) => (
              <tr key={h}>
                <td className="pr-2 text-right text-[#6692A8]">{String(h).padStart(2, '0')}h</td>
                {Array.from({ length: 12 }, (_, m) => {
                  const val = matrix[h][m];
                  return (
                    <td
                      key={m}
                      className="rounded"
                      style={{
                        backgroundColor: getColor(val),
                        width: 52,
                        height: 20,
                        textAlign: 'center',
                        color: val > (minVal + range * 0.7) ? '#1A2332' : '#fff',
                        fontSize: 9,
                        fontWeight: 500,
                      }}
                      title={`${MONTHS[m]} ${String(h).padStart(2, '0')}h: ${val.toFixed(0)} kW`}
                    >
                      {Math.round(val).toLocaleString('pt-BR')}
                    </td>
                  );
                })}
                <td className="pl-2 text-center text-white" style={{ fontSize: 10 }}>
                  {Math.round(hourlyAvg[h]).toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
            {/* Monthly average row */}
            <tr>
              <td className="pt-2 pr-2 text-right text-[#6692A8]">Média kW</td>
              {Array.from({ length: 12 }, (_, m) => {
                let sum = 0;
                for (let h = 0; h < 24; h++) sum += matrix[h][m];
                const avg = sum / 24;
                return (
                  <td key={m} className="pt-2 text-center text-white" style={{ fontSize: 10 }}>
                    {Math.round(avg).toLocaleString('pt-BR')}
                  </td>
                );
              })}
              <td className="pt-2 pl-2 text-center font-semibold text-white" style={{ fontSize: 10 }}>
                {Math.round(avgKW).toLocaleString('pt-BR')}
              </td>
            </tr>
            {/* Monthly peak row */}
            <tr>
              <td className="pt-1 pr-2 text-right text-[#6692A8]">Pico kW</td>
              {monthlyPeakKW.map((v, m) => (
                <td key={m} className="pt-1 text-center" style={{ fontSize: 10, color: v > peakKW * 0.95 ? '#ef4444' : '#fff' }}>
                  {Math.round(v).toLocaleString('pt-BR')}
                </td>
              ))}
              <td className="pt-1 pl-2 text-center font-semibold text-[#ef4444]" style={{ fontSize: 10 }}>
                {Math.round(peakKW).toLocaleString('pt-BR')}
              </td>
            </tr>
            {/* Monthly totals row */}
            <tr>
              <td className="pt-1 pr-2 text-right text-[#6692A8]">MWh</td>
              {monthlyMWh.map((v, m) => (
                <td key={m} className="pt-1 text-center text-white" style={{ fontSize: 10 }}>
                  {Math.round(v).toLocaleString('pt-BR')}
                </td>
              ))}
              <td className="pt-1 pl-2 text-center font-semibold text-[#2F927B]" style={{ fontSize: 10 }}>
                {Math.round(totalMWh).toLocaleString('pt-BR')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-[#6692A8]">
        <span>{minVal.toFixed(0)} kW</span>
        <div className="h-3 flex-1 rounded" style={{
          background: `linear-gradient(to right, rgb(0,75,112), rgb(47,146,123), rgb(198,218,56))`,
        }} />
        <span>{maxVal.toFixed(0)} kW</span>
      </div>
    </div>
  );
}
