// src/engine/bessSimulation.ts
// Hourly BESS simulation loop (8760 × N years)

import type {
  BatteryParams, GridParams, EMSParams, OptLimits,
  EconomicParams, MonthlyResult, BESSSimulationResult,
  AugmentationEvent,
} from './types.ts';
import { buildLoadCurve8760, aggregateMonthly, parseHourMinute, isPontaHour, hoursUntilNextPonta } from './loadCurve.ts';
import { calcMonthlyInvoice, type MonthlyLoadInput } from './invoiceCalc.ts';
import type { LoadData } from './types.ts';

/* ── Augmentation model ─────────────────────────────────── */

interface AugmentationResult {
  effectiveCapacityPct: number[];   // per year (0..N), % of nominal
  events: AugmentationEvent[];
}

function simulateAugmentation(
  battery: BatteryParams,
  econ: EconomicParams,
  contractYears: number,
): AugmentationResult {
  const nominal = battery.capacityKWh;
  const capexPerKWh = econ.capexPerKWh;
  const events: AugmentationEvent[] = [];
  const effectivePct: number[] = [100]; // year 0

  // Track cumulative kWh added to compute blended degradation
  let addedKWh = 0;

  for (let y = 1; y <= contractYears; y++) {
    // Intrinsic degradation of original cells
    const intrinsicPct = battery.degradationTable[y]
      ?? battery.degradationTable[battery.degradationTable.length - 1];

    // Effective capacity = original degraded + previously added modules
    // (added modules degrade ~2% per year from their installation date, simplified)
    const originalCapKWh = nominal * (intrinsicPct / 100);
    const currentCapKWh = originalCapKWh + addedKWh * 0.98; // added modules degrade slowly
    const currentPct = (currentCapKWh / nominal) * 100;

    let augmented = false;

    if (battery.augmentationStrategy === 'none') {
      // No augmentation — use intrinsic degradation only
    } else if (battery.augmentationStrategy === 'threshold') {
      if (currentPct < battery.augmentationThresholdPct) {
        const targetKWh = nominal * (battery.augmentationTargetPct / 100);
        const kWhToAdd = targetKWh - currentCapKWh;

        if (kWhToAdd > 0) {
          // Cost: modules only, with real price decline
          const priceDecline = Math.pow(1 - battery.augmentationPriceDeclinePct / 100, y);
          const costReal = kWhToAdd * capexPerKWh * battery.augmentationCostFactor * priceDecline;
          const costNominal = costReal * Math.pow(1 + econ.ipca, y);

          events.push({
            year: y,
            capacityBeforeKWh: Math.round(currentCapKWh),
            capacityAfterKWh: Math.round(targetKWh),
            kWhAdded: Math.round(kWhToAdd),
            costReal: Math.round(costReal),
            costNominal: Math.round(costNominal),
          });

          addedKWh += kWhToAdd;
          effectivePct.push(battery.augmentationTargetPct);
          augmented = true;
        }
      }
    } else {
      // Scheduled strategy
      if (y % battery.augmentationPeriodYears === 0) {
        const targetKWh = nominal;
        const kWhToAdd = targetKWh - currentCapKWh;

        if (kWhToAdd > 0) {
          const priceDecline = Math.pow(1 - battery.augmentationPriceDeclinePct / 100, y);
          const costReal = kWhToAdd * capexPerKWh * battery.augmentationCostFactor * priceDecline;
          const costNominal = costReal * Math.pow(1 + econ.ipca, y);

          events.push({
            year: y,
            capacityBeforeKWh: Math.round(currentCapKWh),
            capacityAfterKWh: Math.round(targetKWh),
            kWhAdded: Math.round(kWhToAdd),
            costReal: Math.round(costReal),
            costNominal: Math.round(costNominal),
          });

          addedKWh += kWhToAdd;
          effectivePct.push(100);
          augmented = true;
        }
      }
    }

    if (!augmented) {
      effectivePct.push(Math.min(currentPct, effectivePct[y - 1]));
    }
  }

  return { effectiveCapacityPct: effectivePct, events };
}

/* ── Main simulation entry point ────────────────────────── */

export function runBESSSimulation(
  loadData: LoadData,
  battery: BatteryParams,
  grid: GridParams,
  ems: EMSParams,
  limits: OptLimits,
  econ: EconomicParams,
  projectId: string,
  scenarioId: string | null = null,
): BESSSimulationResult {
  const years = econ.simulationYears;
  const startYear = econ.startYear || 2026;
  const pontaStartH = parseHourMinute(grid.pontaStart);
  const pontaEndH = parseHourMinute(grid.pontaEnd);

  // Build base load curve (year 1 — same shape each year, no load growth)
  const baseCurve = buildLoadCurve8760(loadData, grid);

  // Before-BESS monthly aggregation (same every year, using start year calendar)
  const beforeMonthly = aggregateMonthly(baseCurve, pontaStartH, pontaEndH, startYear);

  const allMonthlyResults: MonthlyResult[] = [];
  const allHourlySoC: number[] = [];
  const allHourlyNetLoad: number[] = [];

  // Run augmentation model to get effective capacity per year
  const augModel = simulateAugmentation(battery, econ, years);

  const maxChargePower = limits.maxChargePowerKW > 0
    ? limits.maxChargePowerKW
    : battery.capacityKWh * battery.cRate;
  const maxDischargePower = limits.maxDischargePowerKW > 0
    ? limits.maxDischargePowerKW
    : battery.capacityKWh * battery.cRate;

  for (let y = 0; y < years; y++) {
    // Use augmentation-adjusted effective capacity (accounts for degradation + augmentation)
    const effectivePct = (augModel.effectiveCapacityPct[y] ?? 73) / 100;
    const capY = battery.capacityKWh * effectivePct;
    const usableKWh = capY * battery.dodPct;
    const rte = battery.roundTripEfficiency;

    let soc = usableKWh * 0.2; // Start at 20% SoC

    // Monthly accumulators for this year
    const monthNetLoadHours: number[][] = Array.from({ length: 12 }, () => []);
    const monthDischargeKWh: number[] = new Array(12).fill(0);

    for (let h = 0; h < 8760; h++) {
      const loadH = baseCurve[h];
      const simYear = startYear + y;
      const isPonta = isPontaHour(h, pontaStartH, pontaEndH, simYear);
      const htPonta = hoursUntilNextPonta(h, pontaStartH, simYear);
      const month = monthFromHourFast(h);

      let netLoad = loadH;
      const mode = ems.bessMode || (ems.loadShifting ? 'loadShifting' : ems.peakShaving ? 'peakShaving' : 'loadShifting');
      const minSoC = usableKWh * limits.minSoCPct;
      const targetSoC = usableKWh * limits.maxSoCPct;

      // Peak shaving target: auto = demanda contratada, or manual value
      const psTarget = ems.peakShavingAutoTarget
        ? grid.demandaContratadaKW
        : (ems.peakShavingTargetKW || grid.demandaContratadaKW);

      let shouldDischarge = false;
      let maxDischargeThisHour = maxDischargePower;

      if (mode === 'loadShifting') {
        // Discharge only during ponta hours
        shouldDischarge = isPonta;
        // Discharge as much as possible (up to full load)
        maxDischargeThisHour = Math.min(loadH, maxDischargePower);
      } else if (mode === 'peakShaving') {
        // Discharge whenever load exceeds target (any hour, any day)
        shouldDischarge = loadH > psTarget;
        // Only shave the excess above the target
        maxDischargeThisHour = Math.min(loadH - psTarget, maxDischargePower);
      } else {
        // Combined: load shifting during ponta + peak shaving always
        if (isPonta) {
          shouldDischarge = true;
          maxDischargeThisHour = Math.min(loadH, maxDischargePower);
        } else if (loadH > psTarget) {
          shouldDischarge = true;
          maxDischargeThisHour = Math.min(loadH - psTarget, maxDischargePower);
        }
      }

      if (shouldDischarge && soc > minSoC) {
        // DISCHARGE
        const availableSoC = soc - minSoC;
        const discharge = Math.min(maxDischargeThisHour, availableSoC);
        soc -= discharge;
        netLoad = loadH - discharge;
        monthDischargeKWh[month] += discharge;
      } else if (ems.gridCharging) {
        // CHARGE
        const canCharge = !limits.restrictChargingToOffPeak || !isPonta;
        const socDeficit = targetSoC - soc;

        // For peak shaving mode: charge anytime load is below target (more aggressive)
        // For load shifting: charge within window before ponta
        const shouldCharge = mode === 'peakShaving'
          ? (canCharge && socDeficit > 0 && loadH < psTarget)
          : (mode === 'combined')
            ? (canCharge && socDeficit > 0 && (htPonta <= ems.chargeWindowHours || loadH < psTarget))
            : (canCharge && socDeficit > 0 && htPonta <= ems.chargeWindowHours);

        if (shouldCharge) {
          const chargeNeed = socDeficit;

          // For peak shaving: max charge = target - load (keep grid draw at target)
          // For load shifting: max charge = demanda contratada × 1.05 - load
          const demandaLimit = mode === 'peakShaving'
            ? psTarget
            : grid.demandaContratadaKW * 1.05;
          const maxChargeForDemand = Math.max(0, demandaLimit - loadH);

          const hoursAvailable = mode === 'peakShaving' ? 1 : Math.max(htPonta, 1);
          const charge = Math.min(
            chargeNeed / hoursAvailable,
            maxChargePower,
            socDeficit,
            maxChargeForDemand,
          );
          if (charge > 0) {
            soc += charge * rte;
            soc = Math.min(soc, targetSoC);
            netLoad = loadH + charge;
          }
        }
      }

      // Store
      allHourlySoC.push(soc);
      allHourlyNetLoad.push(netLoad);
      monthNetLoadHours[month].push(netLoad);
    }

    // Aggregate monthly results for this year
    const afterMonthly = aggregateMonthlyFromHours(
      allHourlyNetLoad.slice(y * 8760, (y + 1) * 8760),
      pontaStartH,
      pontaEndH,
      startYear + y,
    );

    for (let m = 0; m < 12; m++) {
      const globalMonth = y * 12 + m;
      const bm = beforeMonthly[m];
      const am = afterMonthly[m];

      // Calculate invoices
      const beforeLoad: MonthlyLoadInput = {
        consumoPontaMWh: bm.consumoPontaKWh / 1000,
        consumoFPMWh: bm.consumoFPKWh / 1000,
        demandaMedidaKW: bm.demandaMedidaKW,
        demandaMedidaPontaKW: bm.demandaPontaKW,
        demandaMedidaFPKW: bm.demandaFPKW,
      };
      const afterLoad: MonthlyLoadInput = {
        consumoPontaMWh: am.consumoPontaKWh / 1000,
        consumoFPMWh: am.consumoFPKWh / 1000,
        demandaMedidaKW: am.demandaMedidaKW,
        demandaMedidaPontaKW: am.demandaPontaKW,
        demandaMedidaFPKW: am.demandaFPKW,
      };

      // Escalate tariffs for years > 0
      const escalatedGrid = y > 0 ? escalateGridTariffs(grid, econ.energyInflation, y) : grid;

      const invBefore = calcMonthlyInvoice(beforeLoad, escalatedGrid, econ, y);
      const invAfter = calcMonthlyInvoice(afterLoad, escalatedGrid, econ, y);

      const savingsGross = invBefore.totalR - invAfter.totalR;
      const cyclesMonth = capY > 0 ? monthDischargeKWh[m] / capY : 0;

      allMonthlyResults.push({
        month: globalMonth,
        consumoPontaBeforeMWh: bm.consumoPontaKWh / 1000,
        consumoFPBeforeMWh: bm.consumoFPKWh / 1000,
        consumoPontaAfterMWh: am.consumoPontaKWh / 1000,
        consumoFPAfterMWh: am.consumoFPKWh / 1000,
        demandaMedidaBeforeKW: bm.demandaMedidaKW,
        demandaMedidaAfterKW: am.demandaMedidaKW,
        demandaPontaAfterKW: am.demandaPontaKW,
        demandaFPAfterKW: am.demandaFPKW,
        invoiceBeforeR: invBefore.totalR,
        invoiceAfterR: invAfter.totalR,
        savingsGrossR: savingsGross,
        eaasFeeR: 0, // Filled later by eaasFinance
        netSavingsR: savingsGross, // Adjusted later
        cyclesMonth,
        energyShiftedKWh: monthDischargeKWh[m],
      });
    }
  }

  // Year 1 aggregates
  const yr1 = allMonthlyResults.slice(0, 12);
  const totalInvoiceBeforeYr1 = yr1.reduce((s, m) => s + m.invoiceBeforeR, 0);
  const totalInvoiceAfterYr1 = yr1.reduce((s, m) => s + m.invoiceAfterR, 0);
  const grossSavingsYr1 = totalInvoiceBeforeYr1 - totalInvoiceAfterYr1;
  const energyShiftedYr1MWh = yr1.reduce((s, m) => s + m.energyShiftedKWh, 0) / 1000;
  const totalCyclesYr1 = yr1.reduce((s, m) => s + m.cyclesMonth, 0);
  const yr1SoC = allHourlySoC.slice(0, 8760);
  const usableYr1 = battery.capacityKWh * (battery.degradationTable[0] / 100) * battery.dodPct;
  const avgSoCYr1Pct = usableYr1 > 0
    ? (yr1SoC.reduce((s, v) => s + v, 0) / yr1SoC.length) / usableYr1 * 100
    : 0;

  return {
    projectId,
    scenarioId,
    monthlyResults: allMonthlyResults,
    eaasResults: [], // Filled by eaasFinance.ts
    totalInvoiceBeforeYr1,
    totalInvoiceAfterYr1,
    grossSavingsYr1,
    energyShiftedYr1MWh,
    totalCyclesYr1,
    avgSoCYr1Pct,
    hourlySoC: allHourlySoC,
    hourlyNetLoad: allHourlyNetLoad,
    augmentationEvents: augModel.events,
    effectiveCapacityPct: augModel.effectiveCapacityPct,
    intrinsicCapacityPct: battery.degradationTable.slice(0, years + 1),
  };
}

/* ── Helpers ────────────────────────────────────────────── */

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_HOURS: number[] = [];
{
  let h = 0;
  for (let m = 0; m < 12; m++) {
    MONTH_HOURS.push(h);
    h += DAYS_IN_MONTH[m] * 24;
  }
}

function monthFromHourFast(h: number): number {
  for (let m = 11; m >= 0; m--) {
    if (h >= MONTH_HOURS[m]) return m;
  }
  return 0;
}

function aggregateMonthlyFromHours(
  curve8760: number[],
  pontaStartH: number,
  pontaEndH: number,
  year: number = 2026,
) {
  const result: Array<{
    consumoPontaKWh: number; consumoFPKWh: number;
    demandaMedidaKW: number; demandaPontaKW: number; demandaFPKW: number;
  }> = [];

  let idx = 0;
  for (let m = 0; m < 12; m++) {
    let cP = 0, cFP = 0, maxAll = 0, maxP = 0, maxFP = 0;
    const days = DAYS_IN_MONTH[m];
    for (let d = 0; d < days; d++) {
      for (let h = 0; h < 24; h++) {
        const kw = curve8760[idx] ?? 0;
        const isP = isPontaHour(idx, pontaStartH, pontaEndH, year);
        if (isP) { cP += kw; if (kw > maxP) maxP = kw; }
        else { cFP += kw; if (kw > maxFP) maxFP = kw; }
        if (kw > maxAll) maxAll = kw;
        idx++;
      }
    }
    result.push({ consumoPontaKWh: cP, consumoFPKWh: cFP, demandaMedidaKW: maxAll, demandaPontaKW: maxP, demandaFPKW: maxFP });
  }
  return result;
}

/** Escalate grid tariffs by energy inflation for year y */
function escalateGridTariffs(grid: GridParams, inflationRate: number, year: number): GridParams {
  const factor = Math.pow(1 + inflationRate, year);
  return {
    ...grid,
    tusdDemandaRkW: grid.tusdDemandaRkW * factor,
    tusdPontaRMWh: grid.tusdPontaRMWh * factor,
    tusdFPRMWh: grid.tusdFPRMWh * factor,
    tePontaRMWh: grid.tePontaRMWh * factor,
    teFPRMWh: grid.teFPRMWh * factor,
    azulDemPontaRkW: grid.azulDemPontaRkW * factor,
    azulDemFPRkW: grid.azulDemFPRkW * factor,
    // ACL energy price already handled via aclEnergyPriceTable
  };
}
