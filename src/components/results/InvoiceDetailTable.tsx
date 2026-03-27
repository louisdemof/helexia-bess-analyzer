// src/components/results/InvoiceDetailTable.tsx
import type { GridParams, EconomicParams } from '../../engine/types.ts';
import type { MonthlyResult } from '../../engine/types.ts';
import { calcMonthlyInvoice, type MonthlyLoadInput, type InvoiceResult } from '../../engine/invoiceCalc.ts';

interface Props {
  monthlyResults: MonthlyResult[]; // first 12
  grid: GridParams;
  econ: EconomicParams;
}

function fmtR(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

function fmtDelta(v: number): string {
  const sign = v > 0 ? '+' : '';
  return sign + 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

export default function InvoiceDetailTable({ monthlyResults, grid, econ }: Props) {
  const yr1 = monthlyResults.slice(0, 12);

  // Calculate 12 individual monthly invoices and average the line items
  const beforeInvoices: InvoiceResult[] = [];
  const afterInvoices: InvoiceResult[] = [];

  for (let m = 0; m < yr1.length; m++) {
    const mr = yr1[m];
    const beforeLoad: MonthlyLoadInput = {
      consumoPontaMWh: mr.consumoPontaBeforeMWh,
      consumoFPMWh: mr.consumoFPBeforeMWh,
      demandaMedidaKW: mr.demandaMedidaBeforeKW,
      demandaMedidaPontaKW: mr.demandaMedidaBeforeKW,
      demandaMedidaFPKW: mr.demandaMedidaBeforeKW,
    };
    const afterLoad: MonthlyLoadInput = {
      consumoPontaMWh: mr.consumoPontaAfterMWh,
      consumoFPMWh: mr.consumoFPAfterMWh,
      demandaMedidaKW: mr.demandaMedidaAfterKW,
      demandaMedidaPontaKW: mr.demandaPontaAfterKW,
      demandaMedidaFPKW: mr.demandaFPAfterKW,
    };
    beforeInvoices.push(calcMonthlyInvoice(beforeLoad, grid, econ, 0));
    afterInvoices.push(calcMonthlyInvoice(afterLoad, grid, econ, 0));
  }

  // Collect all line item labels across all months
  const allLabels: string[] = [];
  for (const inv of [...beforeInvoices, ...afterInvoices]) {
    for (const line of inv.lines) {
      if (!allLabels.includes(line.label)) allLabels.push(line.label);
    }
  }

  // Average each line item across 12 months
  const n = yr1.length || 1;
  const rows = allLabels.map((label) => {
    const before = beforeInvoices.reduce((s, inv) => s + (inv.lines.find((l) => l.label === label)?.valueR ?? 0), 0) / n;
    const after = afterInvoices.reduce((s, inv) => s + (inv.lines.find((l) => l.label === label)?.valueR ?? 0), 0) / n;
    const delta = after - before;
    const deltaPct = before !== 0 ? (delta / before) * 100 : 0;
    return { label, before, after, delta, deltaPct };
  });

  // Total row
  const totalBefore = beforeInvoices.reduce((s, inv) => s + inv.totalR, 0) / n;
  const totalAfter = afterInvoices.reduce((s, inv) => s + inv.totalR, 0) / n;
  const totalDelta = totalAfter - totalBefore;
  const totalDeltaPct = totalBefore !== 0 ? (totalDelta / totalBefore) * 100 : 0;

  // Annual totals
  const annualBefore = totalBefore * 12;
  const annualAfter = totalAfter * 12;
  const annualDelta = totalDelta * 12;

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Detalhe da Fatura — Média Mensal Ano 1</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#6692A8]">
              <th className="py-2 text-left">Componente</th>
              <th className="py-2 text-right">Antes BESS</th>
              <th className="py-2 text-right">Com BESS</th>
              <th className="py-2 text-right">Diferença</th>
              <th className="py-2 text-right">Var. %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-[#2F927B]/10">
                <td className="py-2 text-[#6692A8]">{r.label}</td>
                <td className="py-2 text-right text-white">{fmtR(r.before)}</td>
                <td className="py-2 text-right text-white">{fmtR(r.after)}</td>
                <td className={`py-2 text-right font-medium ${r.delta < 0 ? 'text-[#C6DA38]' : r.delta > 0 ? 'text-[#ef4444]' : 'text-[#6692A8]'}`}>
                  {fmtDelta(r.delta)}
                </td>
                <td className={`py-2 text-right ${r.deltaPct < 0 ? 'text-[#C6DA38]' : r.deltaPct > 0 ? 'text-[#ef4444]' : 'text-[#6692A8]'}`}>
                  {r.deltaPct > 0 ? '+' : ''}{r.deltaPct.toFixed(1)}%
                </td>
              </tr>
            ))}
            {/* Monthly total */}
            <tr className="border-t-2 border-[#2F927B]/30">
              <td className="py-2 font-semibold text-white">TOTAL MENSAL</td>
              <td className="py-2 text-right font-semibold text-white">{fmtR(totalBefore)}</td>
              <td className="py-2 text-right font-semibold text-white">{fmtR(totalAfter)}</td>
              <td className={`py-2 text-right font-bold ${totalDelta < 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}`}>
                {fmtDelta(totalDelta)}
              </td>
              <td className={`py-2 text-right font-semibold ${totalDeltaPct < 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}`}>
                {totalDeltaPct > 0 ? '+' : ''}{totalDeltaPct.toFixed(1)}%
              </td>
            </tr>
            {/* Annual total */}
            <tr className="border-t border-[#2F927B]/10 bg-[#1A2332]/50">
              <td className="py-2 font-semibold text-white">TOTAL ANUAL</td>
              <td className="py-2 text-right font-semibold text-white">{fmtR(annualBefore)}</td>
              <td className="py-2 text-right font-semibold text-white">{fmtR(annualAfter)}</td>
              <td className={`py-2 text-right font-bold ${annualDelta < 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}`}>
                {fmtDelta(annualDelta)}
              </td>
              <td className={`py-2 text-right font-semibold ${totalDeltaPct < 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}`}>
                {totalDeltaPct > 0 ? '+' : ''}{totalDeltaPct.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
