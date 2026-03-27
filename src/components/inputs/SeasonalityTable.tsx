// src/components/inputs/SeasonalityTable.tsx

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface Props {
  values: number[];  // 12 values (% factor, e.g. 100 = normal)
  onChange: (values: number[]) => void;
}

export default function SeasonalityTable({ values, onChange }: Props) {
  function handleChange(month: number, val: number) {
    const next = [...values];
    next[month] = val;
    onChange(next);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {MONTHS.map((m) => (
              <th key={m} className="px-1 py-1 text-center text-xs text-[#6692A8]">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {values.map((v, i) => (
              <td key={i} className="px-1 py-1">
                <input
                  type="number"
                  value={v || ''}
                  onChange={(e) => handleChange(i, parseFloat(e.target.value) || 0)}
                  className="w-full min-w-[50px] rounded border border-[#6692A8]/50 bg-[#1A2332] px-1 py-1 text-center text-white focus:border-[#2F927B] focus:outline-none"
                />
              </td>
            ))}
          </tr>
          <tr>
            {values.map((_, i) => (
              <td key={i} className="px-1 text-center text-xs text-[#6692A8]">%</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
