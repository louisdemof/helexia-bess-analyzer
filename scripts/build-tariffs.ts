#!/usr/bin/env npx tsx
// scripts/build-tariffs.ts
// Pre-fetches ANEEL Grupo A tariffs for all distributors and saves to bundled JSON
// Run: npx tsx scripts/build-tariffs.ts

const RESOURCE_ID = 'fcf2906c-7c32-4b9b-a637-054e7a5234f4';
const BASE = 'https://dadosabertos.aneel.gov.br/api/3/action';

const DISTRIBUTORS = [
  { id: 'AME', sig: 'AME' },
  { id: 'EQUATORIAL_PA', sig: 'EQUATORIAL PA' },
  { id: 'EQUATORIAL_MA', sig: 'EQUATORIAL MA' },
  { id: 'ENERGISA_TO', sig: 'ETO' },
  { id: 'EQUATORIAL_PI', sig: 'EQUATORIAL PI' },
  { id: 'ENEL_CE', sig: 'ENEL CE' },
  { id: 'COSERN', sig: 'COSERN' },
  { id: 'ENERGISA_PB', sig: 'EPB' },
  { id: 'CELPE', sig: 'Neoenergia PE' },
  { id: 'EQUATORIAL_AL', sig: 'EQUATORIAL AL' },
  { id: 'ENERGISA_SE', sig: 'ESE' },
  { id: 'COELBA', sig: 'COELBA' },
  { id: 'CEMIG_D', sig: 'CEMIG-D' },
  { id: 'ENEL_RJ', sig: 'ENEL RJ' },
  { id: 'LIGHT', sig: 'LIGHT SESA' },
  { id: 'ENEL_SP', sig: 'ELETROPAULO' },
  { id: 'CPFL', sig: 'CPFL-PAULISTA' },
  { id: 'ELEKTRO', sig: 'ELEKTRO' },
  { id: 'EDP_SP', sig: 'EDP SP' },
  { id: 'EDP_ES', sig: 'EDP ES' },
  { id: 'EQUATORIAL_GO', sig: 'EQUATORIAL GO' },
  { id: 'CEB_DIS', sig: 'Neoenergia Brasília' },
  { id: 'ENERGISA_MS', sig: 'EMS' },
  { id: 'ENERGISA_MT', sig: 'EMT' },
  { id: 'COPEL_DIS', sig: 'COPEL-DIS' },
  { id: 'CELESC_DIS', sig: 'CELESC' },
  { id: 'RGE_SUL', sig: 'RGE SUL' },
];

const SUBGROUPS = ['A4', 'A3a', 'A2', 'A1'];

function parseBR(v: string | null | undefined): number {
  if (!v || v.trim() === '' || v.trim() === ',00') return 0;
  return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;
}

interface ANEELRecord {
  DscModalidadeTarifaria: string;
  NomPostoTarifario: string;
  DscUnidadeTerciaria: string;
  DscBaseTarifaria: string;
  DscDetalhe: string;
  VlrTUSD: string;
  VlrTE: string;
  DatInicioVigencia: string;
}

interface TariffData {
  sigAgente: string;
  subgroup: string;
  fetchedAt: string;
  vigencia: string;
  verde_TUSD_Demanda: number;
  verde_TUSD_Ponta: number;
  verde_TUSD_FP: number;
  verde_TE_Ponta: number;
  verde_TE_FP: number;
  azul_TUSD_Dem_Ponta: number;
  azul_TUSD_Dem_FP: number;
  azul_TUSD_Ponta: number;
  azul_TUSD_FP: number;
  azul_TE_Ponta: number;
  azul_TE_FP: number;
  partial: boolean;
  warnings: string[];
}

async function fetchTariff(sig: string, subgroup: string): Promise<TariffData | null> {
  const sql = `SELECT * FROM "${RESOURCE_ID}" WHERE "SigAgente" = '${sig}' AND "DscSubGrupo" LIKE '${subgroup}%' AND "DatInicioVigencia" = (SELECT MAX("DatInicioVigencia") FROM "${RESOURCE_ID}" WHERE "SigAgente" = '${sig}' AND "DscSubGrupo" LIKE '${subgroup}%') LIMIT 50`;
  const url = `${BASE}/datastore_search_sql?sql=${encodeURIComponent(sql)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success || !data.result?.records?.length) return null;
    return parseRecords(data.result.records, sig, subgroup);
  } catch {
    return null;
  }
}

function parseRecords(records: ANEELRecord[], sig: string, subgroup: string): TariffData {
  const t: TariffData = {
    sigAgente: sig, subgroup,
    fetchedAt: new Date().toISOString(),
    vigencia: records[0]?.DatInicioVigencia ?? '',
    verde_TUSD_Demanda: 0, verde_TUSD_Ponta: 0, verde_TUSD_FP: 0,
    verde_TE_Ponta: 0, verde_TE_FP: 0,
    azul_TUSD_Dem_Ponta: 0, azul_TUSD_Dem_FP: 0,
    azul_TUSD_Ponta: 0, azul_TUSD_FP: 0,
    azul_TE_Ponta: 0, azul_TE_FP: 0,
    partial: false, warnings: [],
  };

  for (const baseFilter of ['aplica', 'econ']) {
    const pool = records.filter((r) => {
      const base = (r.DscBaseTarifaria ?? '').toLowerCase();
      const det = (r.DscDetalhe ?? '').toUpperCase();
      return base.includes(baseFilter) && det !== 'APE' && det !== 'SCEE';
    });

    for (const r of pool) {
      const modal = (r.DscModalidadeTarifaria ?? '').toLowerCase();
      const posto = (r.NomPostoTarifario ?? '').toLowerCase();
      const unid = (r.DscUnidadeTerciaria ?? '').toLowerCase();
      const tusd = parseBR(r.VlrTUSD);
      const te = parseBR(r.VlrTE);
      const isDem = unid === 'kw';
      const isE = unid === 'mwh';
      const isP = posto.includes('ponta') && !posto.includes('fora');
      const isFP = posto.includes('fora');
      const isNA = posto.includes('não') || posto === '';

      if (modal.includes('verde')) {
        if (isDem && isNA && !t.verde_TUSD_Demanda) t.verde_TUSD_Demanda = tusd;
        if (isE && isP) { if (!t.verde_TUSD_Ponta) t.verde_TUSD_Ponta = tusd; if (!t.verde_TE_Ponta && te > 0) t.verde_TE_Ponta = te; }
        if (isE && isFP) { if (!t.verde_TUSD_FP) t.verde_TUSD_FP = tusd; if (!t.verde_TE_FP && te > 0) t.verde_TE_FP = te; }
      }
      if (modal.includes('azul')) {
        if (isDem && isP && !t.azul_TUSD_Dem_Ponta) t.azul_TUSD_Dem_Ponta = tusd;
        if (isDem && isFP && !t.azul_TUSD_Dem_FP) t.azul_TUSD_Dem_FP = tusd;
        if (isE && isP) { if (!t.azul_TUSD_Ponta) t.azul_TUSD_Ponta = tusd; if (!t.azul_TE_Ponta && te > 0) t.azul_TE_Ponta = te; }
        if (isE && isFP) { if (!t.azul_TUSD_FP) t.azul_TUSD_FP = tusd; if (!t.azul_TE_FP && te > 0) t.azul_TE_FP = te; }
      }
    }
    if (t.verde_TUSD_Ponta > 0) break;
  }

  if (!t.verde_TUSD_Demanda || !t.verde_TUSD_Ponta) t.partial = true;
  return t;
}

// Main
async function main() {
  const allTariffs: Record<string, TariffData> = {};
  let count = 0;

  for (const dist of DISTRIBUTORS) {
    for (const sg of SUBGROUPS) {
      process.stdout.write(`${dist.sig} ${sg}... `);
      const tariff = await fetchTariff(dist.sig, sg);
      if (tariff && !tariff.partial) {
        const key = `${dist.sig}-${sg}`;
        allTariffs[key] = tariff;
        count++;
        console.log(`OK (Ponta=${tariff.verde_TUSD_Ponta.toFixed(0)})`);
      } else {
        console.log('skip');
      }
    }
  }

  const fs = await import('fs');
  const outPath = './src/data/aneel-tariffs.json';
  fs.writeFileSync(outPath, JSON.stringify(allTariffs, null, 2));
  console.log(`\nSaved ${count} tariff records to ${outPath}`);
}

main().catch(console.error);
