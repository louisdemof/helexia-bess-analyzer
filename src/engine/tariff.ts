// src/engine/tariff.ts
// Tax & tariff gross-up calculations per Brazilian electricity regulation

import type { GridParams, EconomicParams } from './types.ts';

/**
 * ICMS "por dentro" gross-up:
 *   gross = net / (1 - ICMS_rate)
 *   ICMS amount = gross × ICMS_rate
 *
 * Full gross-up with PIS/COFINS (applied "por fora" on top of tariff):
 *   net = quantity × unitTariff × (1 + PIS + COFINS)
 *   gross = net / (1 - ICMS)
 */
export function grossUp(
  netValue: number,
  icms: number,
  pis: number,
  cofins: number,
  isIcmsExempt: boolean,
  isPisCofinsExempt: boolean,
): number {
  let value = netValue;
  if (!isPisCofinsExempt) {
    value *= (1 + pis + cofins);
  }
  if (!isIcmsExempt && icms > 0) {
    value = value / (1 - icms);
  }
  return value;
}

/** Calculate ICMS amount from grossed-up value */
export function icmsAmount(grossValue: number, icms: number, isExempt: boolean): number {
  if (isExempt || icms <= 0) return 0;
  return grossValue * icms;
}

/** Apply I50/I100 incentivo discount to a TUSD component */
export function applyIncentivo(
  tusdValue: number,
  incentivo: 'nenhum' | 'I50' | 'I100',
): number {
  if (incentivo === 'I100') return 0;
  if (incentivo === 'I50') return tusdValue * 0.5;
  return tusdValue;
}

/** Get the effective ICMS rate considering exemptions and incentivo */
export function effectiveIcmsForTUSD(
  grid: GridParams,
  econ: EconomicParams,
): number {
  if (grid.clienteIsentoICMS) return 0;
  // For ACL with I50/I100: ICMS on TUSD may also be discounted
  if (grid.clientType === 'livre' && grid.incentivo !== 'nenhum' && grid.descontoLivreIncideICMS) {
    if (grid.incentivo === 'I100') return 0;
    if (grid.incentivo === 'I50') return econ.icms * 0.5;
  }
  return econ.icms;
}

/** Get effective PIS/COFINS rates */
export function effectivePisCofinsForTUSD(
  grid: GridParams,
  econ: EconomicParams,
): { pis: number; cofins: number } {
  if (grid.clienteIsentoPISCOFINS) return { pis: 0, cofins: 0 };
  if (grid.clientType === 'livre' && grid.incentivo !== 'nenhum' && grid.descontoLivreIncidePISCOFINS) {
    const mult = grid.incentivo === 'I100' ? 0 : 0.5;
    return { pis: econ.pis * mult, cofins: econ.cofins * mult };
  }
  return { pis: econ.pis, cofins: econ.cofins };
}

/**
 * Demanda faturada for Verde modal:
 *   max(demanda_medida, demanda_contratada × 0.9)
 */
export function demandaFaturadaVerde(
  demandaMedidaKW: number,
  demandaContratadaKW: number,
): number {
  return Math.max(demandaMedidaKW, demandaContratadaKW * 0.9);
}

/**
 * Demanda faturada for Azul modal (separate ponta / FP):
 *   max(demanda_medida_X, demanda_contratada_X × 0.9)
 */
export function demandaFaturadaAzul(
  demandaMedidaKW: number,
  demandaContratadaKW: number,
): number {
  return Math.max(demandaMedidaKW, demandaContratadaKW * 0.9);
}

/**
 * Ultrapassagem (demand overrun) — Resolução 1000/2021 ANEEL:
 *   Tolerância: 5% sobre demanda contratada
 *   Se demanda_medida > demanda_contratada × 1.05:
 *     Ultrapassagem = (demanda_medida - demanda_contratada) × 2 × tarifa_demanda
 *   A tolerância de 5% é o gatilho. Uma vez ultrapassada, a penalidade
 *   de 2× incide sobre toda a diferença (medida - contratada).
 */
export function ultrapassagem(
  demandaMedidaKW: number,
  demandaContratadaKW: number,
  tarifaDemandaRkW: number,
): number {
  const threshold = demandaContratadaKW * 1.05;
  if (demandaMedidaKW <= threshold) return 0;
  return (demandaMedidaKW - demandaContratadaKW) * 2 * tarifaDemandaRkW;
}
