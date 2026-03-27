// src/engine/invoiceCalc.ts
// Brazilian electricity invoice calculator
// Supports: Cativo Verde, Cativo Azul, ACL Verde, ACL Azul

import type { GridParams, EconomicParams } from './types.ts';
import {
  grossUp,
  applyIncentivo,
  effectiveIcmsForTUSD,
  effectivePisCofinsForTUSD,
  demandaFaturadaVerde,
  demandaFaturadaAzul,
  ultrapassagem,
} from './tariff.ts';

/* ── Monthly load data for invoice calc ─────────────────── */

export interface MonthlyLoadInput {
  consumoPontaMWh: number;
  consumoFPMWh: number;
  demandaMedidaKW: number;            // Global max demand in month
  demandaMedidaPontaKW: number;       // Max demand during ponta (Azul)
  demandaMedidaFPKW: number;          // Max demand during FP (Azul)
}

/* ── Invoice line items ─────────────────────────────────── */

export interface InvoiceLineItem {
  label: string;
  valueR: number;
}

export interface InvoiceResult {
  lines: InvoiceLineItem[];
  totalR: number;
  // Breakdowns for comparison
  demandChargeR: number;
  tusdPontaR: number;
  tusdFPR: number;
  tePontaR: number;
  teFPR: number;
  aclEnergiaR: number;
  cosipR: number;
  ultrapassagemR: number;
}

/* ── Main calculator ────────────────────────────────────── */

export function calcMonthlyInvoice(
  load: MonthlyLoadInput,
  grid: GridParams,
  econ: EconomicParams,
  yearIndex: number = 0,
): InvoiceResult {
  const lines: InvoiceLineItem[] = [];

  const icmsTUSD = effectiveIcmsForTUSD(grid, econ);
  const { pis: pisTUSD, cofins: cofinsTUSD } = effectivePisCofinsForTUSD(grid, econ);
  const icmsExempt = grid.clienteIsentoICMS;
  const pcExempt = grid.clienteIsentoPISCOFINS;

  // For TE components (Cativo) or ACL energia, incentivo does NOT apply
  const icmsTE = icmsExempt ? 0 : econ.icms;
  const pisTE = pcExempt ? 0 : econ.pis;
  const cofinsTE = pcExempt ? 0 : econ.cofins;

  let demandChargeR = 0;
  let tusdPontaR = 0;
  let tusdFPR = 0;
  let tePontaR = 0;
  let teFPR = 0;
  let aclEnergiaR = 0;
  let ultraR = 0;

  if (grid.modalidade === 'verde') {
    // ── VERDE ──────────────────────────────────────────

    // Demand charge (single tariff)
    const demFat = demandaFaturadaVerde(load.demandaMedidaKW, grid.demandaContratadaKW);
    const tusdDem = applyIncentivo(grid.tusdDemandaRkW, grid.incentivo);
    // ICMS base on demand: contratada or medida?
    const demForIcms = grid.icmsOnDemand === 'medida'
      ? load.demandaMedidaKW
      : demFat;
    // Gross-up demand charge
    demandChargeR = grossUp(demForIcms * tusdDem, icmsTUSD, pisTUSD, cofinsTUSD, icmsExempt, pcExempt);
    // If demFat > demForIcms (contratada > medida), the extra is without ICMS
    if (demFat > demForIcms) {
      demandChargeR += (demFat - demForIcms) * tusdDem * (pcExempt ? 1 : (1 + pisTUSD + cofinsTUSD));
    }
    lines.push({ label: 'Demanda Contratada (Verde)', valueR: demandChargeR });

    // TUSD Ponta consumption
    const tusdPontaTariff = applyIncentivo(grid.tusdPontaRMWh, grid.incentivo);
    tusdPontaR = grossUp(load.consumoPontaMWh * tusdPontaTariff, icmsTUSD, pisTUSD, cofinsTUSD, icmsExempt, pcExempt);
    lines.push({ label: 'TUSD Ponta', valueR: tusdPontaR });

    // TUSD FP consumption
    const tusdFPTariff = applyIncentivo(grid.tusdFPRMWh, grid.incentivo);
    tusdFPR = grossUp(load.consumoFPMWh * tusdFPTariff, icmsTUSD, pisTUSD, cofinsTUSD, icmsExempt, pcExempt);
    lines.push({ label: 'TUSD Fora-ponta', valueR: tusdFPR });

    if (grid.clientType === 'cativo') {
      // TE Ponta (Cativo only)
      tePontaR = grossUp(load.consumoPontaMWh * grid.tePontaRMWh, icmsTE, pisTE, cofinsTE, icmsExempt, pcExempt);
      lines.push({ label: 'TE Ponta', valueR: tePontaR });

      // TE FP (Cativo only)
      teFPR = grossUp(load.consumoFPMWh * grid.teFPRMWh, icmsTE, pisTE, cofinsTE, icmsExempt, pcExempt);
      lines.push({ label: 'TE Fora-ponta', valueR: teFPR });
    }

    // Ultrapassagem
    ultraR = ultrapassagem(load.demandaMedidaKW, grid.demandaContratadaKW, grid.tusdDemandaRkW);
    if (ultraR > 0) {
      lines.push({ label: 'Ultrapassagem', valueR: ultraR });
    }

  } else {
    // ── AZUL ───────────────────────────────────────────

    // Demand Ponta
    const demFatPonta = demandaFaturadaAzul(load.demandaMedidaPontaKW, grid.demandaContratadaPontaKW);
    const azulDemPonta = applyIncentivo(grid.azulDemPontaRkW, grid.incentivo);
    const demPontaForIcms = grid.icmsOnDemand === 'medida'
      ? load.demandaMedidaPontaKW
      : demFatPonta;
    let demPontaR = grossUp(demPontaForIcms * azulDemPonta, icmsTUSD, pisTUSD, cofinsTUSD, icmsExempt, pcExempt);
    if (demFatPonta > demPontaForIcms) {
      demPontaR += (demFatPonta - demPontaForIcms) * azulDemPonta * (pcExempt ? 1 : (1 + pisTUSD + cofinsTUSD));
    }
    lines.push({ label: 'Demanda Ponta (Azul)', valueR: demPontaR });

    // Demand FP
    const demFatFP = demandaFaturadaAzul(load.demandaMedidaFPKW, grid.demandaContratadaFPKW);
    const azulDemFP = applyIncentivo(grid.azulDemFPRkW, grid.incentivo);
    const demFPForIcms = grid.icmsOnDemand === 'medida'
      ? load.demandaMedidaFPKW
      : demFatFP;
    let demFPR = grossUp(demFPForIcms * azulDemFP, icmsTUSD, pisTUSD, cofinsTUSD, icmsExempt, pcExempt);
    if (demFatFP > demFPForIcms) {
      demFPR += (demFatFP - demFPForIcms) * azulDemFP * (pcExempt ? 1 : (1 + pisTUSD + cofinsTUSD));
    }
    lines.push({ label: 'Demanda Fora-ponta (Azul)', valueR: demFPR });

    demandChargeR = demPontaR + demFPR;

    // TUSD Ponta consumption (Azul uses same energy tariff fields)
    const tusdPontaTariff = applyIncentivo(grid.tusdPontaRMWh, grid.incentivo);
    tusdPontaR = grossUp(load.consumoPontaMWh * tusdPontaTariff, icmsTUSD, pisTUSD, cofinsTUSD, icmsExempt, pcExempt);
    lines.push({ label: 'TUSD Ponta', valueR: tusdPontaR });

    // TUSD FP consumption
    const tusdFPTariff = applyIncentivo(grid.tusdFPRMWh, grid.incentivo);
    tusdFPR = grossUp(load.consumoFPMWh * tusdFPTariff, icmsTUSD, pisTUSD, cofinsTUSD, icmsExempt, pcExempt);
    lines.push({ label: 'TUSD Fora-ponta', valueR: tusdFPR });

    if (grid.clientType === 'cativo') {
      tePontaR = grossUp(load.consumoPontaMWh * grid.tePontaRMWh, icmsTE, pisTE, cofinsTE, icmsExempt, pcExempt);
      lines.push({ label: 'TE Ponta', valueR: tePontaR });

      teFPR = grossUp(load.consumoFPMWh * grid.teFPRMWh, icmsTE, pisTE, cofinsTE, icmsExempt, pcExempt);
      lines.push({ label: 'TE Fora-ponta', valueR: teFPR });
    }

    // Ultrapassagem — check both ponta and FP demand
    const ultraPonta = ultrapassagem(load.demandaMedidaPontaKW, grid.demandaContratadaPontaKW, grid.azulDemPontaRkW);
    const ultraFP = ultrapassagem(load.demandaMedidaFPKW, grid.demandaContratadaFPKW, grid.azulDemFPRkW);
    ultraR = ultraPonta + ultraFP;
    if (ultraR > 0) {
      lines.push({ label: 'Ultrapassagem', valueR: ultraR });
    }
  }

  // ACL energy (Livre only)
  if (grid.clientType === 'livre') {
    const totalMWh = load.consumoPontaMWh + load.consumoFPMWh;
    const table = grid.aclEnergyPriceTable ?? [];
    const aclPrice = grid.aclSamePrice
      ? grid.aclEnergyPriceRMWh
      : (table[yearIndex] ?? grid.aclEnergyPriceRMWh);
    // ACL energia: ICMS generally applies at state rate
    aclEnergiaR = grossUp(totalMWh * aclPrice, icmsTE, pisTE, cofinsTE, icmsExempt, pcExempt);
    lines.push({ label: 'Energia ACL (Comercializadora)', valueR: aclEnergiaR });
  }

  // COSIP (passthrough, unchanged by BESS)
  const cosipR = grid.cosipR;
  lines.push({ label: 'COSIP', valueR: cosipR });

  const totalR = lines.reduce((sum, l) => sum + l.valueR, 0);

  return {
    lines,
    totalR,
    demandChargeR,
    tusdPontaR,
    tusdFPR,
    tePontaR,
    teFPR,
    aclEnergiaR,
    cosipR,
    ultrapassagemR: ultraR,
  };
}
