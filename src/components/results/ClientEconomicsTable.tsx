// src/components/results/ClientEconomicsTable.tsx
// Shows the full client picture: Invoice Before vs (Invoice After + EaaS Fee) for 10/12/15yr

import type { BESSSimulationResult, EaaSResult, EconomicParams } from '../../engine/types.ts';

interface Props {
  sim: BESSSimulationResult;
  econ: EconomicParams;
}

function fmt(v: number, d = 0): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function ClientEconomicsTable({ sim, econ }: Props) {
  if (sim.eaasResults.length === 0) return null;

  const years = econ.simulationYears;
  const ipca = econ.ipca;

  // Build year-by-year data for each contract duration
  const contracts = sim.eaasResults.map((eaas) => buildClientYears(sim, eaas, ipca, years));

  return (
    <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
      <h3 className="mb-4 text-base font-semibold text-white">Economia do Cliente — Comparação de Contratos</h3>

      {/* Summary cards for each duration */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {sim.eaasResults.map((eaas, i) => {
          const c = contracts[i];
          const totalSaved = c.cumulativeNetSaving;
          // Year 1 net savings: gross savings - fee
          const yr1 = c.years[0];
          const netMonthlyYr1 = yr1 ? yr1.netSaving / 12 : 0;
          const grossMonthlyYr1 = yr1 ? (yr1.invoiceBefore - yr1.invoiceAfterBESS) / 12 : 0;
          const pctSavingYr1 = yr1 && yr1.invoiceBefore > 0
            ? (yr1.netSaving / yr1.invoiceBefore) * 100
            : 0;
          return (
            <div key={eaas.contractYears} className="rounded-lg border border-[#2F927B]/20 bg-[#1A2332] p-4">
              <p className="mb-1 text-sm font-medium text-[#6692A8]">Contrato {eaas.contractYears} anos</p>
              <p className="text-xl font-bold text-[#C6DA38]">R$ {fmt(totalSaved)}</p>
              <p className="text-xs text-[#6692A8]">economia total acumulada ({eaas.contractYears} anos)</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6692A8]">Economia bruta/mês (ano 1)</span>
                  <span className="text-white">R$ {fmt(grossMonthlyYr1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6692A8]">Fee mensal (ano 1)</span>
                  <span className="text-white">R$ {fmt(eaas.monthlyFeeYr1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6692A8]">Economia líquida/mês (ano 1)</span>
                  <span className={netMonthlyYr1 >= 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}>R$ {fmt(netMonthlyYr1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6692A8]">% economia líquida (ano 1)</span>
                  <span className={pctSavingYr1 >= 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}>{fmt(pctSavingYr1, 1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Year-by-year detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#6692A8]">
              <th className="py-2 text-left">Ano</th>
              <th className="py-2 text-right">Fatura sem BESS (R$)</th>
              {sim.eaasResults.map((e) => (
                <th key={e.contractYears} className="py-2 text-right" colSpan={1}>
                  Custo total {e.contractYears}a (R$)
                </th>
              ))}
              {sim.eaasResults.map((e) => (
                <th key={`sav-${e.contractYears}`} className="py-2 text-right">
                  Economia {e.contractYears}a (R$)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: years }, (_, y) => {
              const yr = sim.monthlyResults.slice(y * 12, (y + 1) * 12);
              const invoiceBefore = yr.reduce((s, m) => s + m.invoiceBeforeR, 0);

              return (
                <tr key={y} className="border-t border-[#2F927B]/10">
                  <td className="py-1.5 text-[#6692A8]">{y + 1}</td>
                  <td className="py-1.5 text-right text-white">{fmt(invoiceBefore)}</td>
                  {contracts.map((c, i) => {
                    const row = c.years[y];
                    if (!row) return <td key={i} className="py-1.5 text-right text-[#6692A8]">—</td>;
                    return (
                      <td key={i} className="py-1.5 text-right text-white">
                        {fmt(row.totalClientCost)}
                      </td>
                    );
                  })}
                  {contracts.map((c, i) => {
                    const row = c.years[y];
                    if (!row) return <td key={`s-${i}`} className="py-1.5 text-right text-[#6692A8]">—</td>;
                    return (
                      <td key={`s-${i}`} className={`py-1.5 text-right font-medium ${row.netSaving >= 0 ? 'text-[#C6DA38]' : 'text-[#ef4444]'}`}>
                        {fmt(row.netSaving)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Totals row */}
            <tr className="border-t-2 border-[#2F927B]/30 font-semibold">
              <td className="py-2 text-white">TOTAL</td>
              <td className="py-2 text-right text-white">{fmt(contracts[0]?.totalBefore ?? 0)}</td>
              {contracts.map((c, i) => (
                <td key={i} className="py-2 text-right text-white">{fmt(c.totalClientCost)}</td>
              ))}
              {contracts.map((c, i) => (
                <td key={`st-${i}`} className="py-2 text-right text-[#C6DA38]">{fmt(c.cumulativeNetSaving)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Build year-by-year client economics ────────────────── */

interface YearRow {
  year: number;
  invoiceBefore: number;
  invoiceAfterBESS: number;
  eaasFeeAnnual: number;
  totalClientCost: number;    // invoiceAfterBESS + eaasFee
  netSaving: number;          // invoiceBefore - totalClientCost
}

interface ContractData {
  years: YearRow[];
  totalBefore: number;
  totalClientCost: number;
  cumulativeNetSaving: number;
}

function buildClientYears(
  sim: BESSSimulationResult,
  eaas: EaaSResult,
  ipca: number,
  _maxYears: number,
): ContractData {
  const rows: YearRow[] = [];
  let totalBefore = 0;
  let totalClientCost = 0;

  // Only count years within the contract period — BESS is removed after contract ends
  const contractYears = eaas.contractYears;

  for (let y = 0; y < contractYears; y++) {
    const yr = sim.monthlyResults.slice(y * 12, (y + 1) * 12);
    if (yr.length < 12) break;

    const invoiceBefore = yr.reduce((s, m) => s + m.invoiceBeforeR, 0);
    const invoiceAfter = yr.reduce((s, m) => s + m.invoiceAfterR, 0);
    const annualFee = eaas.monthlyFeeYr1 * 12 * Math.pow(1 + ipca, y);

    const clientCost = invoiceAfter + annualFee;
    const netSaving = invoiceBefore - clientCost;

    totalBefore += invoiceBefore;
    totalClientCost += clientCost;

    rows.push({
      year: y + 1,
      invoiceBefore,
      invoiceAfterBESS: invoiceAfter,
      eaasFeeAnnual: annualFee,
      totalClientCost: clientCost,
      netSaving,
    });
  }

  return {
    years: rows,
    totalBefore,
    totalClientCost,
    cumulativeNetSaving: totalBefore - totalClientCost,
  };
}
