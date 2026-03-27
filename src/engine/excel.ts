// src/engine/excel.ts
// Excel export — multi-sheet workbook matching the reference log file format
import * as XLSX from 'xlsx';
import type {
  BESSProject, BESSSimulationResult, EaaSResult,
  BatteryParams,
} from './types.ts';
import { buildLoadCurve8760, parseHourMinute, aggregateMonthly } from './loadCurve.ts';
import { calcMonthlyInvoice, type MonthlyLoadInput } from './invoiceCalc.ts';
import { calcTotalCapex } from './eaasFinance.ts';

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/* ── Main export function ───────────────────────────────── */

export function exportResultsToExcel(
  project: BESSProject,
  simResult: BESSSimulationResult,
  selectedEaaS: EaaSResult | null,
): void {
  const wb = XLSX.utils.book_new();

  const baseCurve = buildLoadCurve8760(project.loadData, project.gridParams);
  const pontaStartH = parseHourMinute(project.gridParams.pontaStart);
  const pontaEndH = parseHourMinute(project.gridParams.pontaEnd);

  // Sheet 1: Fluxo de Potência Horária com BESS
  addHourlyFlowSheet(wb, baseCurve, simResult, project.batteryParams, pontaStartH, pontaEndH);

  // Sheet 2: Conta Energia sem BESS
  addInvoiceSheet(wb, 'Conta Energia sem BESS', baseCurve, project, pontaStartH, pontaEndH, false);

  // Sheet 3: Conta Energia com BESS
  addInvoiceSheet(wb, 'Conta Energia com BESS', simResult.hourlyNetLoad ?? baseCurve, project, pontaStartH, pontaEndH, true);

  // Sheet 4: Agregado Ano a Ano sem BESS
  addYearlyAggregateSheet(wb, 'Agregado sem BESS', baseCurve, project, null);

  // Sheet 5: Agregado Ano a Ano com BESS
  addYearlyAggregateSheet(wb, 'Agregado com BESS', baseCurve, project, simResult);

  // Sheet 6: Métricas Financeiras sem BESS
  addFinancialMetricsSheet(wb, 'Métricas sem BESS', project, simResult, false);

  // Sheet 7: Métricas Financeiras com BESS
  addFinancialMetricsSheet(wb, 'Métricas com BESS', project, simResult, true);

  // Sheet 8: EaaS Summary
  if (simResult.eaasResults.length > 0) {
    addEaaSSheet(wb, simResult, project);
  }

  // Sheet 9: Resumo do Projeto
  addProjectSummarySheet(wb, project, simResult, selectedEaaS);

  // Download
  const fileName = `BESS_${project.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/* ── Sheet: Hourly power flow ───────────────────────────── */

function addHourlyFlowSheet(
  wb: XLSX.WorkBook,
  baseCurve: number[],
  sim: BESSSimulationResult,
  battery: BatteryParams,
  pontaStartH: number,
  pontaEndH: number,
) {
  const headers = [
    'Dia', 'Hora', 'SOC [%]', 'Energia bateria [Wh]',
    'Carga [W]', 'Consumo Rede [W]',
    'Energia inserida bateria [Wh]', 'Energia retirada bateria [Wh]',
    'Ponta', 'Dia Semana',
  ];

  const rows: (string | number)[][] = [headers];
  const netLoad = sim.hourlyNetLoad ?? [];
  const soc = sim.hourlySoC ?? [];
  const usableKWh = battery.capacityKWh * battery.dodPct;

  // Build date for each hour (starting Jan 1)
  let dayCounter = 0;
  let hourInDay = 0;
  let monthIdx = 0;
  let dayInMonth = 1;

  for (let h = 0; h < Math.min(8760, baseCurve.length); h++) {
    const load = baseCurve[h] ?? 0;
    const net = netLoad[h] ?? load;
    const socVal = soc[h] ?? 0;
    const socPct = usableKWh > 0 ? (socVal / usableKWh) * 100 : 0;

    const dow = dayCounter % 7;
    const isWeekday = dow < 5;
    const isPonta = isWeekday && hourInDay >= pontaStartH && hourInDay < pontaEndH;

    const discharged = isPonta ? Math.max(0, load - net) : 0;
    const charged = !isPonta ? Math.max(0, net - load) : 0;

    const dateStr = `${String(dayInMonth).padStart(2, '0')}/${String(monthIdx + 1).padStart(2, '0')}`;
    const hourStr = `${String(hourInDay).padStart(2, '0')}:00`;
    const dowNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    rows.push([
      dateStr,
      hourStr,
      Math.round(socPct * 100) / 100,
      Math.round(socVal * 1000),  // Wh
      Math.round(load * 1000),     // W
      Math.round(net * 1000),      // W
      Math.round(charged * 1000),  // Wh
      Math.round(discharged * 1000), // Wh
      isPonta ? 'PONTA' : 'FP',
      dowNames[dow],
    ]);

    hourInDay++;
    if (hourInDay >= 24) {
      hourInDay = 0;
      dayCounter++;
      dayInMonth++;
      if (dayInMonth > DAYS_IN_MONTH[monthIdx]) {
        dayInMonth = 1;
        monthIdx++;
        if (monthIdx >= 12) monthIdx = 0;
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = headers.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Fluxo Horário BESS');
}

/* ── Sheet: Monthly invoice ─────────────────────────────── */

function addInvoiceSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  curve: number[],
  project: BESSProject,
  pontaStartH: number,
  pontaEndH: number,
  _isBESS: boolean,
) {
  const monthly = aggregateMonthly(curve, pontaStartH, pontaEndH);

  const headers = [
    'Mês',
    'Custo Demanda [R$]',
    'TUSD Ponta [R$]',
    'TUSD FP [R$]',
    'TE Ponta [R$]',
    'TE FP [R$]',
    'Energia ACL [R$]',
    'Ultrapassagem [R$]',
    'COSIP [R$]',
    'Custo Total [R$]',
    'Consumo Ponta [MWh]',
    'Consumo FP [MWh]',
    'Demanda Medida [kW]',
  ];

  const rows: (string | number)[][] = [headers];
  let totalAnual = 0;

  for (let m = 0; m < 12; m++) {
    const agg = monthly[m];
    const load: MonthlyLoadInput = {
      consumoPontaMWh: agg.consumoPontaKWh / 1000,
      consumoFPMWh: agg.consumoFPKWh / 1000,
      demandaMedidaKW: agg.demandaMedidaKW,
      demandaMedidaPontaKW: agg.demandaPontaKW,
      demandaMedidaFPKW: agg.demandaFPKW,
    };
    const inv = calcMonthlyInvoice(load, project.gridParams, project.economicParams, 0);
    totalAnual += inv.totalR;

    rows.push([
      MONTHS_PT[m],
      round2(inv.demandChargeR),
      round2(inv.tusdPontaR),
      round2(inv.tusdFPR),
      round2(inv.tePontaR),
      round2(inv.teFPR),
      round2(inv.aclEnergiaR),
      round2(inv.ultrapassagemR),
      round2(inv.cosipR),
      round2(inv.totalR),
      round2(agg.consumoPontaKWh / 1000),
      round2(agg.consumoFPKWh / 1000),
      round2(agg.demandaMedidaKW),
    ]);
  }

  // Total row
  rows.push([]);
  rows.push(['TOTAL ANUAL', '', '', '', '', '', '', '', '', round2(totalAnual)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

/* ── Sheet: Year-by-year aggregate ──────────────────────── */

function addYearlyAggregateSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  baseCurve: number[],
  project: BESSProject,
  sim: BESSSimulationResult | null,
) {
  const battery = project.batteryParams;
  const years = project.economicParams.simulationYears;

  const headers = [
    'Ano', 'Capacidade BESS [kWh]', 'Carga Anual [kWh]', 'Consumo Rede [kWh]',
    'Energia inserida bateria [kWh]', 'Energia retirada bateria [kWh]', 'Ciclos bateria',
  ];

  const rows: (string | number)[][] = [headers];
  const annualLoad = baseCurve.reduce((s, v) => s + v, 0);

  for (let y = 0; y < years; y++) {
    const degradation = (battery.degradationTable[y] ?? battery.degradationTable[battery.degradationTable.length - 1]) / 100;
    const capY = sim ? battery.capacityKWh * degradation : 0;

    // Monthly results for this year
    const yr = sim ? sim.monthlyResults.slice(y * 12, (y + 1) * 12) : [];
    const energyShifted = yr.reduce((s, m) => s + m.energyShiftedKWh, 0);
    const cycles = yr.reduce((s, m) => s + m.cyclesMonth, 0);

    // Grid consumption = load + charging losses
    const gridConsumption = sim
      ? annualLoad + (energyShifted / battery.roundTripEfficiency - energyShifted)
      : annualLoad;

    rows.push([
      y + 1,
      round2(capY),
      round2(annualLoad),
      round2(gridConsumption),
      round2(sim ? energyShifted / battery.roundTripEfficiency : 0),
      round2(sim ? energyShifted : 0),
      Math.round(cycles),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

/* ── Sheet: Financial metrics ───────────────────────────── */

function addFinancialMetricsSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  project: BESSProject,
  sim: BESSSimulationResult,
  isBESS: boolean,
) {
  const years = project.economicParams.simulationYears;
  const econ = project.economicParams;
  const capex = isBESS ? calcTotalCapex(econ, project.batteryParams, project.sizingParams) : 0;

  // Row-based layout (transposed, like the reference)
  const yearHeaders = ['ANO', '0', ...Array.from({ length: years }, (_, i) => String(i + 1))];

  const annualLoad = Array.from({ length: years }, () => sim.monthlyResults.slice(0, 12).reduce((s, m) => s + m.consumoPontaBeforeMWh + m.consumoFPBeforeMWh, 0));

  const energyCosts: number[] = [];
  const omCosts: number[] = [];
  for (let y = 0; y < years; y++) {
    const yr = sim.monthlyResults.slice(y * 12, (y + 1) * 12);
    const cost = yr.reduce((s, m) => s + (isBESS ? m.invoiceAfterR : m.invoiceBeforeR), 0);
    energyCosts.push(cost);
    omCosts.push(isBESS ? capex * econ.omPctCapex * Math.pow(1 + econ.ipca, y) : 0);
  }

  const rows: (string | number)[][] = [
    yearHeaders,
    ['Carga Anual [MWh]', 0, ...annualLoad.map((v) => round2(v))],
    ['Custo energia [R$]', 0, ...energyCosts.map((v) => round2(v))],
    ['Operação e Manutenção [R$]', 0, ...omCosts.map((v) => round2(v))],
    ['CAPEX e RECAPEX [R$]', round2(capex), ...Array.from({ length: years }, () => 0)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = yearHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

/* ── Sheet: EaaS summary ────────────────────────────────── */

function addEaaSSheet(wb: XLSX.WorkBook, sim: BESSSimulationResult, project: BESSProject) {
  const headers = ['Métrica', '10 anos', '12 anos', '15 anos'];
  const e10 = sim.eaasResults.find((e) => e.contractYears === 10);
  const e12 = sim.eaasResults.find((e) => e.contractYears === 12);
  const e15 = sim.eaasResults.find((e) => e.contractYears === 15);

  const capex = calcTotalCapex(project.economicParams, project.batteryParams, project.sizingParams);

  const rows: (string | number)[][] = [
    headers,
    ['CAPEX Total [R$]', capex, capex, capex],
    ['Fee mensal Ano 1 [R$]', round2(e10?.monthlyFeeYr1 ?? 0), round2(e12?.monthlyFeeYr1 ?? 0), round2(e15?.monthlyFeeYr1 ?? 0)],
    ['Fee mensal Ano 5 [R$]', round2(e10?.monthlyFeeYr5 ?? 0), round2(e12?.monthlyFeeYr5 ?? 0), round2(e15?.monthlyFeeYr5 ?? 0)],
    ['Fee anual Ano 1 [R$]', round2(e10?.annualFeeYr1 ?? 0), round2(e12?.annualFeeYr1 ?? 0), round2(e15?.annualFeeYr1 ?? 0)],
    ['Economia bruta Ano 1 [R$]', round2(sim.grossSavingsYr1), round2(sim.grossSavingsYr1), round2(sim.grossSavingsYr1)],
    ['Ratio Economia/Fee', round2(e10?.grossSavingsVsFeeRatio ?? 0), round2(e12?.grossSavingsVsFeeRatio ?? 0), round2(e15?.grossSavingsVsFeeRatio ?? 0)],
    ['Economia líquida Ano 1 [R$]', round2(e10?.netSavingsYr1 ?? 0), round2(e12?.netSavingsYr1 ?? 0), round2(e15?.netSavingsYr1 ?? 0)],
    ['Break-even cliente [meses]', e10?.clientBreakEvenMonths ?? 'N/A', e12?.clientBreakEvenMonths ?? 'N/A', e15?.clientBreakEvenMonths ?? 'N/A'],
    ['IRR Helexia (real)', '13.7%', '13.7%', '13.7%'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = headers.map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Resumo EaaS');
}

/* ── Sheet: Project summary ─────────────────────────────── */

function addProjectSummarySheet(
  wb: XLSX.WorkBook,
  project: BESSProject,
  sim: BESSSimulationResult,
  selectedEaaS: EaaSResult | null,
) {
  const rows: (string | number)[][] = [
    ['BESS Viability Analyser — Resumo do Projeto'],
    [],
    ['Cliente', project.clientName],
    ['Site', project.siteAddress],
    ['Data', new Date().toLocaleDateString('pt-BR')],
    [],
    ['=== CONFIGURAÇÃO ==='],
    ['Distribuidora', project.gridParams.distributorId],
    ['Estado', project.gridParams.state],
    ['Tipo cliente', project.gridParams.clientType === 'cativo' ? 'Cativo (ACR)' : 'Livre (ACL)'],
    ['Modalidade', project.gridParams.modalidade],
    ['Subgrupo', project.gridParams.subgroup],
    ['Período ponta', `${project.gridParams.pontaStart} – ${project.gridParams.pontaEnd}`],
    ['Demanda contratada [kW]', project.gridParams.demandaContratadaKW],
    [],
    ['=== BATERIA ==='],
    ['Capacidade [kWh]', project.batteryParams.capacityKWh],
    ['C-Rate', project.batteryParams.cRate],
    ['DoD [%]', project.batteryParams.dodPct * 100],
    ['Eficiência [%]', project.batteryParams.roundTripEfficiency * 100],
    ['Capex [R$/kWh]', project.economicParams.capexPerKWh],
    ['CAPEX Total [R$]', calcTotalCapex(project.economicParams, project.batteryParams, project.sizingParams)],
    [],
    ['=== RESULTADOS ANO 1 ==='],
    ['Fatura antes BESS [R$/ano]', round2(sim.totalInvoiceBeforeYr1)],
    ['Fatura depois BESS [R$/ano]', round2(sim.totalInvoiceAfterYr1)],
    ['Economia bruta [R$/ano]', round2(sim.grossSavingsYr1)],
    ['Energia deslocada [MWh/ano]', round2(sim.energyShiftedYr1MWh)],
    ['Ciclos/ano', round2(sim.totalCyclesYr1)],
    ['SoC médio [%]', round2(sim.avgSoCYr1Pct)],
  ];

  if (selectedEaaS) {
    rows.push([]);
    rows.push(['=== EaaS ===']);
    rows.push(['Contrato [anos]', selectedEaaS.contractYears]);
    rows.push(['Fee mensal Ano 1 [R$]', round2(selectedEaaS.monthlyFeeYr1)]);
    rows.push(['Fee anual Ano 1 [R$]', round2(selectedEaaS.annualFeeYr1)]);
    rows.push(['Economia líquida Ano 1 [R$]', round2(selectedEaaS.netSavingsYr1)]);
    rows.push(['IRR Helexia (real)', '13.7%']);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Resumo Projeto');
}

/* ── Helpers ────────────────────────────────────────────── */

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
