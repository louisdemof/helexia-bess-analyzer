// src/components/results/HelexiaPaybackTable.tsx
// Internal Helexia indicator: how long to payback CAPEX from gross savings alone
// (no EaaS fee model — just CAPEX vs savings + OPEX)

import type { BESSSimulationResult, EconomicParams, BatteryParams, SizingParams, AugmentationEvent } from '../../engine/types.ts';
import { calcTotalCapex } from '../../engine/eaasFinance.ts';

interface Props {
  sim: BESSSimulationResult;
  econ: EconomicParams;
  battery: BatteryParams;
  sizing: SizingParams;
}

function fmtR(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

export default function HelexiaPaybackTable({ sim, econ, battery, sizing }: Props) {
  const totalCapex = calcTotalCapex(econ, battery, sizing);
  const ipca = econ.ipca;
  const years = econ.simulationYears;

  // Build year-by-year: gross savings - O&M - SGA - EMS - Asset Mgmt - Augmentation
  let cumCash = -totalCapex;
  let paybackYear: number | null = null;
  const rows: Array<{ year: number; grossSavings: number; totalOpex: number; netCash: number; cumCash: number }> = [];

  for (let y = 0; y < years; y++) {
    const yr = sim.monthlyResults.slice(y * 12, (y + 1) * 12);
    if (yr.length < 12) break;

    const grossSavings = yr.reduce((s, m) => s + m.savingsGrossR, 0);

    // OPEX
    let opex = totalCapex * econ.omPctCapex * Math.pow(1 + ipca, y);
    opex += totalCapex * econ.sgaPctCapex * Math.pow(1 + ipca, y);
    if (econ.emsEnabled) opex += econ.emsCostMonthly * 12 * Math.pow(1 + ipca, y);
    if (econ.assetMgmtEnabled) opex += econ.assetMgmtCostMonthly * 12 * Math.pow(1 + ipca, y);

    // Converter replacement
    if (econ.converterReplacementEnabled && econ.converterReplacementYears > 0 && (y + 1) % econ.converterReplacementYears === 0) {
      opex += totalCapex * econ.converterReplacementPctCapex * Math.pow(1 + ipca, y);
    }

    // Augmentation
    const augCost = sim.augmentationEvents
      .filter((e: AugmentationEvent) => e.year === y + 1)
      .reduce((s: number, e: AugmentationEvent) => s + e.costNominal, 0);
    opex += augCost;

    const netCash = grossSavings - opex;
    cumCash += netCash;

    if (paybackYear === null && cumCash >= 0) paybackYear = y + 1;

    rows.push({ year: y + 1, grossSavings, totalOpex: opex, netCash, cumCash });
  }

  const totalSavings = rows.reduce((s, r) => s + r.grossSavings, 0);
  const totalOpex = rows.reduce((s, r) => s + r.totalOpex, 0);
  const simplePayback = totalCapex / (rows[0]?.netCash || 1);

  return (
    <div className="rounded-xl border border-[#004B70]/30 bg-[#243447] p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Análise Interna Helexia — Payback sem EaaS</h3>
      <p className="mb-4 text-xs text-[#6692A8]">
        Se Helexia capturasse 100% da economia (sem fee ao cliente): quanto tempo para recuperar CAPEX + OPEX + Augmentação?
      </p>

      {/* Summary KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg bg-[#1A2332] p-3">
          <p className="text-xs text-[#6692A8]">CAPEX Total</p>
          <p className="text-base font-semibold text-white">{fmtR(totalCapex)}</p>
        </div>
        <div className="rounded-lg bg-[#1A2332] p-3">
          <p className="text-xs text-[#6692A8]">Payback simples</p>
          <p className="text-base font-semibold text-[#C6DA38]">
            {paybackYear !== null ? `Ano ${paybackYear}` : `>${years} anos`}
          </p>
          <p className="text-xs text-[#6692A8]">{simplePayback.toFixed(1)} anos (linear)</p>
        </div>
        <div className="rounded-lg bg-[#1A2332] p-3">
          <p className="text-xs text-[#6692A8]">Economia total {years}a</p>
          <p className="text-base font-semibold text-white">{fmtR(totalSavings)}</p>
        </div>
        <div className="rounded-lg bg-[#1A2332] p-3">
          <p className="text-xs text-[#6692A8]">OPEX total {years}a</p>
          <p className="text-base font-semibold text-white">{fmtR(totalOpex)}</p>
        </div>
      </div>

      {/* Year-by-year table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#6692A8]">
              <th className="py-1.5 text-left">Ano</th>
              <th className="py-1.5 text-right">Economia bruta</th>
              <th className="py-1.5 text-right">OPEX + Aug</th>
              <th className="py-1.5 text-right">Fluxo líquido</th>
              <th className="py-1.5 text-right">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#2F927B]/10 font-semibold">
              <td className="py-1.5 text-[#6692A8]">Ano 0</td>
              <td className="py-1.5 text-right">—</td>
              <td className="py-1.5 text-right">—</td>
              <td className="py-1.5 text-right text-[#ef4444]">-{fmtR(totalCapex)}</td>
              <td className="py-1.5 text-right text-[#ef4444]">-{fmtR(totalCapex)}</td>
            </tr>
            {rows.map((r) => (
              <tr key={r.year} className="border-t border-[#2F927B]/10">
                <td className="py-1.5 text-[#6692A8]">Ano {r.year}</td>
                <td className="py-1.5 text-right text-[#C6DA38]">{fmtR(r.grossSavings)}</td>
                <td className="py-1.5 text-right text-[#ef4444]">-{fmtR(r.totalOpex)}</td>
                <td className={`py-1.5 text-right ${r.netCash >= 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}`}>
                  {fmtR(r.netCash)}
                </td>
                <td className={`py-1.5 text-right font-medium ${r.cumCash >= 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}`}>
                  {fmtR(r.cumCash)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[#6692A8]">
        Nota: este cálculo desconsidera o modelo EaaS. Mostra o tempo necessário para que a economia bruta acumulada cubra o investimento total (CAPEX + OPEX + Augmentação).
        Não representa a rentabilidade real do projeto — para isso, ver a TIR na tabela EaaS.
      </p>
    </div>
  );
}
