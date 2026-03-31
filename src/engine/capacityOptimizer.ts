// src/engine/capacityOptimizer.ts
// Sweep battery capacity to find the value that maximizes net savings (gross - EaaS fee)

import type {
  LoadData, BatteryParams, GridParams, EMSParams, OptLimits,
  EconomicParams, SizingParams,
} from './types.ts';
import { runBESSSimulation } from './bessSimulation.ts';
import { backsolveMonthlyFee, calcTotalCapex } from './eaasFinance.ts';

export interface OptimizerConfig {
  minCapacityKWh: number;
  maxCapacityKWh: number;
  steps: number;
  targetContractYears: 10 | 12 | 15;
}

export interface OptimizerSweepPoint {
  capacityKWh: number;
  grossSavingsYr1: number;
  annualFeeYr1: number;
  netSavingsYr1: number;
  totalCapex: number;
}

export interface OptimizerResult {
  optimalCapacityKWh: number;
  optimalNetSavingsYr1: number;
  optimalGrossSavingsYr1: number;
  optimalAnnualFeeYr1: number;
  optimalTotalCapex: number;
  sweepData: OptimizerSweepPoint[];
}

export async function optimizeCapacity(
  loadData: LoadData,
  battery: BatteryParams,
  grid: GridParams,
  ems: EMSParams,
  limits: OptLimits,
  econ: EconomicParams,
  sizing: SizingParams,
  config: OptimizerConfig,
  projectId: string,
  onProgress?: (pct: number) => void,
): Promise<OptimizerResult> {
  const { minCapacityKWh, maxCapacityKWh, steps, targetContractYears } = config;
  const stepSize = (maxCapacityKWh - minCapacityKWh) / steps;

  const sweepData: OptimizerSweepPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const cap = minCapacityKWh + i * stepSize;
    const modBattery = { ...battery, capacityKWh: cap };
    const modSizing = { ...sizing, bessCapacityKWh: cap };

    // Run simulation (skip hourly arrays for memory)
    const sim = runBESSSimulation(loadData, modBattery, grid, ems, limits, econ, projectId);
    delete sim.hourlySoC;
    delete sim.hourlyNetLoad;

    // Backsolve EaaS fee for this capacity
    const bs = backsolveMonthlyFee(econ, modBattery, modSizing, targetContractYears);
    const annualFee = bs.fee * 12;
    const netSavings = sim.grossSavingsYr1 - annualFee;
    const totalCapex = calcTotalCapex(econ, modBattery, modSizing);

    sweepData.push({
      capacityKWh: Math.round(cap),
      grossSavingsYr1: sim.grossSavingsYr1,
      annualFeeYr1: annualFee,
      netSavingsYr1: netSavings,
      totalCapex,
    });

    // Yield to UI every 3 iterations
    if (i % 3 === 0) {
      onProgress?.(Math.round((i / steps) * 100));
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.(100);

  // Find optimal
  let best = sweepData[0];
  for (const pt of sweepData) {
    if (pt.netSavingsYr1 > best.netSavingsYr1) best = pt;
  }

  return {
    optimalCapacityKWh: best.capacityKWh,
    optimalNetSavingsYr1: best.netSavingsYr1,
    optimalGrossSavingsYr1: best.grossSavingsYr1,
    optimalAnnualFeeYr1: best.annualFeeYr1,
    optimalTotalCapex: best.totalCapex,
    sweepData,
  };
}
