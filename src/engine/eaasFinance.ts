// src/engine/eaasFinance.ts
// EaaS financial model: CAPEX/OPEX build + IRR backsolve for 10/12/15yr contracts
// Augmentation model integrated — uses events from bessSimulation

import type { EconomicParams, BatteryParams, SizingParams, EaaSResult, BESSSimulationResult, AugmentationEvent } from './types.ts';

const TARGET_IRR_REAL = 0.137; // 13.7% real (IPCA + 13.7%)

/* ── CAPEX calculation ──────────────────────────────────── */

export function calcTotalCapex(econ: EconomicParams, battery: BatteryParams, _sizing: SizingParams): number {
  const batteryCapex = battery.capacityKWh * econ.capexPerKWh;
  return batteryCapex + econ.otherFixedCosts;
}

/* ── Augmentation simulation (standalone for fee backsolve) */

function simulateAugmentationForFee(
  battery: BatteryParams,
  econ: EconomicParams,
  contractYears: number,
): AugmentationEvent[] {
  const nominal = battery.capacityKWh;
  const capexPerKWh = econ.capexPerKWh;
  const events: AugmentationEvent[] = [];
  let addedKWh = 0;

  for (let y = 1; y <= contractYears; y++) {
    const intrinsicPct = battery.degradationTable[y]
      ?? battery.degradationTable[battery.degradationTable.length - 1];
    const originalCapKWh = nominal * (intrinsicPct / 100);
    const currentCapKWh = originalCapKWh + addedKWh * 0.98;
    const currentPct = (currentCapKWh / nominal) * 100;

    if (battery.augmentationStrategy === 'none') {
      // No augmentation
    } else if (battery.augmentationStrategy === 'threshold') {
      if (currentPct < battery.augmentationThresholdPct) {
        const targetKWh = nominal * (battery.augmentationTargetPct / 100);
        const kWhToAdd = targetKWh - currentCapKWh;
        if (kWhToAdd > 0) {
          const priceDecline = Math.pow(1 - battery.augmentationPriceDeclinePct / 100, y);
          const costReal = kWhToAdd * capexPerKWh * battery.augmentationCostFactor * priceDecline;
          const costNominal = costReal * Math.pow(1 + econ.ipca, y);
          events.push({ year: y, capacityBeforeKWh: Math.round(currentCapKWh), capacityAfterKWh: Math.round(targetKWh), kWhAdded: Math.round(kWhToAdd), costReal: Math.round(costReal), costNominal: Math.round(costNominal) });
          addedKWh += kWhToAdd;
        }
      }
    } else {
      if (y % battery.augmentationPeriodYears === 0) {
        const kWhToAdd = nominal - currentCapKWh;
        if (kWhToAdd > 0) {
          const priceDecline = Math.pow(1 - battery.augmentationPriceDeclinePct / 100, y);
          const costReal = kWhToAdd * capexPerKWh * battery.augmentationCostFactor * priceDecline;
          const costNominal = costReal * Math.pow(1 + econ.ipca, y);
          events.push({ year: y, capacityBeforeKWh: Math.round(currentCapKWh), capacityAfterKWh: Math.round(nominal), kWhAdded: Math.round(kWhToAdd), costReal: Math.round(costReal), costNominal: Math.round(costNominal) });
          addedKWh += kWhToAdd;
        }
      }
    }
  }
  return events;
}

/* ── Cash flow builder ──────────────────────────────────── */

function buildCashFlows(
  monthlyFeeYr1: number,
  econ: EconomicParams,
  battery: BatteryParams,
  sizing: SizingParams,
  contractYears: number,
  augEvents: AugmentationEvent[],
): number[] {
  const totalCapex = calcTotalCapex(econ, battery, sizing);
  const ipca = econ.ipca;

  // Year 0: negative CAPEX
  const cf: number[] = [-totalCapex];

  for (let y = 1; y <= contractYears; y++) {
    // Revenue: monthly fee × 12, escalated by IPCA
    const revenue = monthlyFeeYr1 * 12 * Math.pow(1 + ipca, y - 1);

    // O&M: % of CAPEX, escalated by IPCA
    const om = totalCapex * econ.omPctCapex * Math.pow(1 + ipca, y - 1);

    // SG&A / Structure cost: % of CAPEX, escalated by IPCA
    const sga = totalCapex * econ.sgaPctCapex * Math.pow(1 + ipca, y - 1);

    // EMS cost if enabled (monthly × 12, IPCA-escalated)
    const emsCost = econ.emsEnabled ? econ.emsCostMonthly * 12 * Math.pow(1 + ipca, y - 1) : 0;

    // Asset management cost if enabled (monthly × 12, IPCA-escalated)
    const assetMgmtCost = econ.assetMgmtEnabled ? econ.assetMgmtCostMonthly * 12 * Math.pow(1 + ipca, y - 1) : 0;

    // Converter replacement: % of total CAPEX, IPCA-escalated
    let converterCost = 0;
    if (econ.converterReplacementEnabled && econ.converterReplacementYears > 0) {
      if (y % econ.converterReplacementYears === 0) {
        converterCost = totalCapex * econ.converterReplacementPctCapex * Math.pow(1 + ipca, y - 1);
      }
    }

    // Augmentation cost from events (nominal BRL, already computed with price decline)
    const augCost = augEvents
      .filter((e) => e.year === y)
      .reduce((sum, e) => sum + e.costNominal, 0);

    cf.push(revenue - om - sga - emsCost - assetMgmtCost - converterCost - augCost);
  }

  return cf;
}

/**
 * Build LEVERAGED equity cash flows:
 * - Year 0: only equity portion (CAPEX × (1 - financingPct))
 * - Years 1-N: same OPEX as unleveraged, minus annual debt service (PMT)
 * - Debt is constant annuity (French amortization)
 */
function buildLeveragedCashFlows(
  monthlyFeeYr1: number,
  econ: EconomicParams,
  battery: BatteryParams,
  sizing: SizingParams,
  contractYears: number,
  augEvents: AugmentationEvent[],
): number[] {
  const totalCapex = calcTotalCapex(econ, battery, sizing);
  const ipca = econ.ipca;
  const debtAmount = totalCapex * econ.financingPctCapex;
  const equityAmount = totalCapex - debtAmount;
  const rate = econ.financingRate;
  const term = econ.financingTermYears;

  // Annual debt service (constant annuity / PMT)
  const annualDebtService = rate > 0 && term > 0
    ? debtAmount * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1)
    : term > 0 ? debtAmount / term : 0;

  // Year 0: equity only
  const cf: number[] = [-equityAmount];

  for (let y = 1; y <= contractYears; y++) {
    const revenue = monthlyFeeYr1 * 12 * Math.pow(1 + ipca, y - 1);
    const om = totalCapex * econ.omPctCapex * Math.pow(1 + ipca, y - 1);
    const sga = totalCapex * econ.sgaPctCapex * Math.pow(1 + ipca, y - 1);
    const emsCost = econ.emsEnabled ? econ.emsCostMonthly * 12 * Math.pow(1 + ipca, y - 1) : 0;
    const assetMgmtCost = econ.assetMgmtEnabled ? econ.assetMgmtCostMonthly * 12 * Math.pow(1 + ipca, y - 1) : 0;
    let converterCost = 0;
    if (econ.converterReplacementEnabled && econ.converterReplacementYears > 0) {
      if (y % econ.converterReplacementYears === 0) {
        converterCost = totalCapex * econ.converterReplacementPctCapex * Math.pow(1 + ipca, y - 1);
      }
    }
    const augCost = augEvents.filter((e) => e.year === y).reduce((sum, e) => sum + e.costNominal, 0);

    // Debt service only during loan term
    const debtPayment = y <= term ? annualDebtService : 0;

    cf.push(revenue - om - sga - emsCost - assetMgmtCost - converterCost - augCost - debtPayment);
  }

  return cf;
}

/** Calculate IRR via bisection (find rate where NPV = 0) */
function calcIRR(cashFlows: number[]): number {
  let lo = -0.5, hi = 2.0, rate = 0.15;
  for (let i = 0; i < 200; i++) {
    const npv = calcNPV(cashFlows, rate);
    if (Math.abs(npv) < 1) break;
    if (npv > 0) lo = rate; else hi = rate;
    rate = (lo + hi) / 2;
  }
  return rate;
}

/* ── NPV calculation ────────────────────────────────────── */

function calcNPV(cashFlows: number[], rate: number): number {
  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + rate, t);
  }
  return npv;
}

/* ── IRR backsolve via bisection ────────────────────────── */

interface BacksolveResult {
  fee: number;
  feeWithoutAug: number;
  augEvents: AugmentationEvent[];
  totalAugCostNominal: number;
  feeWithFinancing: number;          // lower fee with external financing (same equity IRR)
  equityIRRWithFinancingSameFee: number; // equity IRR if keeping same fee + financing
}

export function backsolveMonthlyFee(
  econ: EconomicParams,
  battery: BatteryParams,
  sizing: SizingParams,
  contractYears: 10 | 12 | 15,
): BacksolveResult {
  const irrNominal = (1 + TARGET_IRR_REAL) * (1 + econ.ipca) - 1;

  // Pre-compute augmentation events for this contract duration
  const augEvents = simulateAugmentationForFee(battery, econ, contractYears);
  const totalAugCostNominal = augEvents.reduce((s, e) => s + e.costNominal, 0);

  // Backsolve WITH augmentation
  let lo = 0, hi = 2_000_000, fee = (lo + hi) / 2;
  for (let i = 0; i < 100; i++) {
    const cf = buildCashFlows(fee, econ, battery, sizing, contractYears, augEvents);
    const npv = calcNPV(cf, irrNominal);
    if (Math.abs(npv) < 1) break;
    if (npv > 0) hi = fee; else lo = fee;
    fee = (lo + hi) / 2;
  }

  // Backsolve WITHOUT augmentation (empty events)
  let lo2 = 0, hi2 = 2_000_000, feeNoAug = (lo2 + hi2) / 2;
  for (let i = 0; i < 100; i++) {
    const cf = buildCashFlows(feeNoAug, econ, battery, sizing, contractYears, []);
    const npv = calcNPV(cf, irrNominal);
    if (Math.abs(npv) < 1) break;
    if (npv > 0) hi2 = feeNoAug; else lo2 = feeNoAug;
    feeNoAug = (lo2 + hi2) / 2;
  }

  // Financing analysis (only if enabled)
  let feeWithFinancing = fee;
  let equityIRRWithFinancingSameFee = irrNominal;

  if (econ.financingEnabled && econ.financingPctCapex > 0) {
    // Option A: Lower fee with financing (same equity IRR target)
    let loF = 0, hiF = 2_000_000, feeF = (loF + hiF) / 2;
    for (let i = 0; i < 100; i++) {
      const cf = buildLeveragedCashFlows(feeF, econ, battery, sizing, contractYears, augEvents);
      const npv = calcNPV(cf, irrNominal);
      if (Math.abs(npv) < 1) break;
      if (npv > 0) hiF = feeF; else loF = feeF;
      feeF = (loF + hiF) / 2;
    }
    feeWithFinancing = feeF;

    // Option B: Higher equity IRR if keeping same fee with financing
    const cfSameFee = buildLeveragedCashFlows(fee, econ, battery, sizing, contractYears, augEvents);
    equityIRRWithFinancingSameFee = calcIRR(cfSameFee);
  }

  return { fee, feeWithoutAug: feeNoAug, augEvents, totalAugCostNominal, feeWithFinancing, equityIRRWithFinancingSameFee };
}

/* ── Compute EaaS results for all 3 contract durations ── */

export function computeEaaSResults(
  simResult: BESSSimulationResult,
  econ: EconomicParams,
  battery: BatteryParams,
  sizing: SizingParams,
): EaaSResult[] {
  const durations: (10 | 12 | 15)[] = [10, 12, 15];

  return durations.map((contractYears) => {
    const result = backsolveMonthlyFee(econ, battery, sizing, contractYears);
    const monthlyFeeYr1 = result.fee;
    const monthlyFeeYr5 = monthlyFeeYr1 * Math.pow(1 + econ.ipca, 4);
    const annualFeeYr1 = monthlyFeeYr1 * 12;

    const yr1Results = simResult.monthlyResults.slice(0, 12);
    const grossSavingsYr1 = yr1Results.reduce((s, m) => s + m.savingsGrossR, 0);
    const netSavingsYr1 = grossSavingsYr1 - annualFeeYr1;
    const ratio = annualFeeYr1 > 0 ? grossSavingsYr1 / annualFeeYr1 : 0;

    let cumulative = 0;
    let breakEvenMonth: number | null = null;
    const maxMonths = Math.min(contractYears * 12, simResult.monthlyResults.length);
    for (let m = 0; m < maxMonths; m++) {
      const year = Math.floor(m / 12);
      const eaasFee = monthlyFeeYr1 * Math.pow(1 + econ.ipca, year);
      const gross = simResult.monthlyResults[m].savingsGrossR;
      cumulative += gross - eaasFee;
      if (cumulative > 0 && breakEvenMonth === null) {
        breakEvenMonth = m + 1;
      }
    }

    return {
      contractYears,
      monthlyFeeYr1,
      monthlyFeeYr5,
      annualFeeYr1,
      grossSavingsVsFeeRatio: ratio,
      netSavingsYr1,
      clientBreakEvenMonths: breakEvenMonth,
      helexiaIRRReal: TARGET_IRR_REAL,
      monthlyFeeWithoutAug: result.feeWithoutAug,
      augmentationImpactMonthly: monthlyFeeYr1 - result.feeWithoutAug,
      totalAugCostNominal: result.totalAugCostNominal,
      monthlyFeeWithFinancing: result.feeWithFinancing,
      equityIRRWithFinancingSameFee: result.equityIRRWithFinancingSameFee,
    };
  });
}

/** Apply EaaS fee to simulation monthly results (mutates) */
export function applyEaaSFeeToResults(
  simResult: BESSSimulationResult,
  eaasResult: EaaSResult,
  ipca: number,
): void {
  for (const mr of simResult.monthlyResults) {
    const year = Math.floor(mr.month / 12);
    const fee = eaasResult.monthlyFeeYr1 * Math.pow(1 + ipca, year);
    mr.eaasFeeR = fee;
    mr.netSavingsR = mr.savingsGrossR - fee;
  }
}
