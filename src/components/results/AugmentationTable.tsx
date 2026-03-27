// src/components/results/AugmentationTable.tsx
import type { AugmentationEvent } from '../../engine/types.ts';

interface Props {
  events: AugmentationEvent[];
  nominalCapacityKWh: number;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('pt-BR');
}

export default function AugmentationTable({ events, nominalCapacityKWh }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-2 text-base font-semibold text-white">Eventos de Augmentação</h3>
        <p className="text-sm text-[#C6DA38]">
          Nenhuma augmentação necessária durante o período do contrato. A capacidade permanece acima do limite mínimo.
        </p>
      </div>
    );
  }

  const totalCostReal = events.reduce((s, e) => s + e.costReal, 0);
  const totalCostNominal = events.reduce((s, e) => s + e.costNominal, 0);
  const totalKWhAdded = events.reduce((s, e) => s + e.kWhAdded, 0);

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Eventos de Augmentação</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#6692A8]">
              <th className="py-2 text-left">Ano</th>
              <th className="py-2 text-right">Cap. Antes (kWh)</th>
              <th className="py-2 text-right">Cap. Antes (%)</th>
              <th className="py-2 text-right">kWh Adicionados</th>
              <th className="py-2 text-right">Cap. Depois (kWh)</th>
              <th className="py-2 text-right">Custo Real (R$)</th>
              <th className="py-2 text-right">Custo Nominal (R$)</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.year} className="border-t border-[#2F927B]/10">
                <td className="py-1.5 text-white">Ano {e.year}</td>
                <td className="py-1.5 text-right">{fmt(e.capacityBeforeKWh)}</td>
                <td className="py-1.5 text-right text-[#f97316]">
                  {nominalCapacityKWh > 0 ? ((e.capacityBeforeKWh / nominalCapacityKWh) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-1.5 text-right text-[#2F927B]">+{fmt(e.kWhAdded)}</td>
                <td className="py-1.5 text-right">{fmt(e.capacityAfterKWh)}</td>
                <td className="py-1.5 text-right">R$ {fmt(e.costReal)}</td>
                <td className="py-1.5 text-right">R$ {fmt(e.costNominal)}</td>
              </tr>
            ))}
            {/* Totals */}
            <tr className="border-t-2 border-[#2F927B]/30 font-semibold text-white">
              <td className="py-2">TOTAL</td>
              <td />
              <td />
              <td className="py-2 text-right text-[#2F927B]">+{fmt(totalKWhAdded)} kWh</td>
              <td />
              <td className="py-2 text-right">R$ {fmt(totalCostReal)}</td>
              <td className="py-2 text-right">R$ {fmt(totalCostNominal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[#6692A8]">
        Custo Real = preço dos módulos com declínio anual de preço. Custo Nominal = ajustado pelo IPCA para o ano do evento.
        Base de cálculo: apenas módulos (células + racks), sem PCS/BOS/infraestrutura.
      </p>
    </div>
  );
}
