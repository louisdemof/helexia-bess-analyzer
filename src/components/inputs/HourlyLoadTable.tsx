// src/components/inputs/HourlyLoadTable.tsx

interface Props {
  values: number[];  // 24 values
  onChange: (values: number[]) => void;
  unit?: string;
}

export default function HourlyLoadTable({ values, onChange, unit = 'kVA' }: Props) {
  function handleChange(hour: number, val: number) {
    const next = [...values];
    next[hour] = val;
    onChange(next);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#6692A8]">
            <th className="py-1 text-left">Hora</th>
            <th className="py-1 text-left">Carga ({unit})</th>
            <th className="w-24 py-1" />
            <th className="py-1 text-left">Hora</th>
            <th className="py-1 text-left">Carga ({unit})</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 12 }, (_, i) => (
            <tr key={i} className="border-t border-[#2F927B]/10">
              <td className="py-1 text-[#6692A8]">{String(i).padStart(2, '0')}h</td>
              <td className="py-1">
                <input
                  type="number"
                  value={values[i] || ''}
                  onChange={(e) => handleChange(i, parseFloat(e.target.value) || 0)}
                  className="w-24 rounded border border-[#6692A8]/50 bg-[#1A2332] px-2 py-1 text-white focus:border-[#2F927B] focus:outline-none"
                />
              </td>
              <td />
              <td className="py-1 text-[#6692A8]">{String(i + 12).padStart(2, '0')}h</td>
              <td className="py-1">
                <input
                  type="number"
                  value={values[i + 12] || ''}
                  onChange={(e) => handleChange(i + 12, parseFloat(e.target.value) || 0)}
                  className="w-24 rounded border border-[#6692A8]/50 bg-[#1A2332] px-2 py-1 text-white focus:border-[#2F927B] focus:outline-none"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
