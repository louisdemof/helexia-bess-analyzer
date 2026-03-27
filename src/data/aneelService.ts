// src/data/aneelService.ts
// ANEEL open-data API integration for Grupo A tariff components
// 3-tier fallback: LocalStorage cache → live fetch → bundled JSON

import { getDistributorById } from './distributors.ts';

/* ── Types ──────────────────────────────────────────────── */

export interface GrupoATariffs {
  sigAgente: string;
  subgroup: string;
  fetchedAt: string;              // ISO timestamp
  vigencia: string;               // Tariff start date from ANEEL
  // Verde
  verde_TUSD_Demanda: number;     // R$/kW/month
  verde_TUSD_Ponta: number;       // R$/MWh
  verde_TUSD_FP: number;          // R$/MWh
  verde_TE_Ponta: number;         // R$/MWh
  verde_TE_FP: number;            // R$/MWh
  // Azul
  azul_TUSD_Dem_Ponta: number;    // R$/kW/month
  azul_TUSD_Dem_FP: number;       // R$/kW/month
  azul_TUSD_Ponta: number;        // R$/MWh
  azul_TUSD_FP: number;           // R$/MWh
  azul_TE_Ponta: number;          // R$/MWh
  azul_TE_FP: number;             // R$/MWh
  // Metadata
  partial: boolean;               // true if some fields couldn't be parsed
  warnings: string[];             // user-facing warnings
}

/** Raw record from ANEEL datastore API */
interface ANEELRecord {
  SigAgente: string;
  DscSubGrupo: string;
  DscModalidadeTarifaria: string;
  DscBaseTarifaria: string;
  DscDetalhe: string;
  VlrTUSD: string;
  VlrTE: string;
  DatInicioVigencia: string;
  DatFimVigencia: string;
  NomPostoTarifario: string;
  DscUnidadeTerciaria: string;
  [key: string]: string;
}

/* ── Constants ──────────────────────────────────────────── */

const ANEEL_RESOURCE_ID = 'fcf2906c-7c32-4b9b-a637-054e7a5234f4';
const PROXY_BASE = '/api/aneel';
const DIRECT_BASE = 'https://dadosabertos.aneel.gov.br/api/3/action';
// Public CORS proxies for production (GitHub Pages can't proxy)
// corsproxy.io blocks server-side but works from browser origins
const CORS_PROXIES = [
  'https://corsproxy.io/?',
];
const CACHE_PREFIX = 'bess-aneel-tariff-';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/* ── Helpers ────────────────────────────────────────────── */

/** Parse Brazilian decimal string "1.234,56" → 1234.56; also handles ",00" → 0 */
function parseBRDecimal(value: string | undefined | null): number {
  if (!value || value.trim() === '' || value.trim() === ',00') return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Build ANEEL SQL query for a specific distributor + subgroup */
function buildQuery(sigAgente: string, subgroup: string): string {
  const sg = subgroup.replace("'", "''");
  const sa = sigAgente.replace("'", "''");
  return `SELECT * FROM "${ANEEL_RESOURCE_ID}" WHERE "SigAgente" = '${sa}' AND "DscSubGrupo" LIKE '${sg}%' AND "DatInicioVigencia" = (SELECT MAX("DatInicioVigencia") FROM "${ANEEL_RESOURCE_ID}" WHERE "SigAgente" = '${sa}' AND "DscSubGrupo" LIKE '${sg}%') LIMIT 50`;
}

/** Fetch with timeout */
async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ── Cache layer (LocalStorage) ─────────────────────────── */

function getCacheKey(sigAgente: string, subgroup: string): string {
  return `${CACHE_PREFIX}${sigAgente}-${subgroup}`;
}

function getFromCache(sigAgente: string, subgroup: string): GrupoATariffs | null {
  try {
    const key = getCacheKey(sigAgente, subgroup);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as GrupoATariffs;
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age > CACHE_MAX_AGE_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

function saveToCache(tariffs: GrupoATariffs): void {
  try {
    const key = getCacheKey(tariffs.sigAgente, tariffs.subgroup);
    localStorage.setItem(key, JSON.stringify(tariffs));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/* ── Record parsing ─────────────────────────────────────── */

function parseRecords(records: ANEELRecord[], sigAgente: string, subgroup: string): GrupoATariffs {
  const tariffs: GrupoATariffs = {
    sigAgente,
    subgroup,
    fetchedAt: new Date().toISOString(),
    vigencia: '',
    verde_TUSD_Demanda: 0,
    verde_TUSD_Ponta: 0,
    verde_TUSD_FP: 0,
    verde_TE_Ponta: 0,
    verde_TE_FP: 0,
    azul_TUSD_Dem_Ponta: 0,
    azul_TUSD_Dem_FP: 0,
    azul_TUSD_Ponta: 0,
    azul_TUSD_FP: 0,
    azul_TE_Ponta: 0,
    azul_TE_FP: 0,
    partial: false,
    warnings: [],
  };

  if (records.length === 0) {
    tariffs.partial = true;
    tariffs.warnings.push('Nenhum registro encontrado na API ANEEL para esta distribuidora/subgrupo.');
    return tariffs;
  }

  tariffs.vigencia = records[0].DatInicioVigencia ?? '';

  // Filter: prefer "Tarifa de Aplicação", exclude APE and SCEE detail records
  const filtered = records.filter((r) => {
    const base = (r.DscBaseTarifaria ?? '').toLowerCase();
    const detalhe = (r.DscDetalhe ?? '').toUpperCase();
    const isAplicacao = base.includes('aplica');
    const isSpecialDetail = detalhe === 'APE' || detalhe === 'SCEE';
    return isAplicacao && !isSpecialDetail;
  });

  // If no "Tarifa de Aplicação" records, fall back to all non-APE/SCEE records
  const pool = filtered.length > 0 ? filtered : records.filter((r) => {
    const detalhe = (r.DscDetalhe ?? '').toUpperCase();
    return detalhe !== 'APE' && detalhe !== 'SCEE';
  });

  for (const r of pool) {
    const modalidade = (r.DscModalidadeTarifaria ?? '').toLowerCase();
    const posto = (r.NomPostoTarifario ?? '').toLowerCase();
    const unidade = (r.DscUnidadeTerciaria ?? '').toLowerCase();
    const vlrTUSD = parseBRDecimal(r.VlrTUSD);
    const vlrTE = parseBRDecimal(r.VlrTE);

    const isDemand = unidade === 'kw';
    const isEnergy = unidade === 'mwh';
    const isPonta = posto.includes('ponta') && !posto.includes('fora');
    const isFP = posto.includes('fora');
    const isNA = posto.includes('não') || posto.includes('nao') || posto === '';

    // ── Verde ──
    if (modalidade.includes('verde')) {
      // Demand: Verde has a single demand charge (Posto = "Não se aplica", Unit = kW)
      if (isDemand && isNA && tariffs.verde_TUSD_Demanda === 0) {
        tariffs.verde_TUSD_Demanda = vlrTUSD;
      }
      // Energy Ponta
      if (isEnergy && isPonta) {
        if (tariffs.verde_TUSD_Ponta === 0) tariffs.verde_TUSD_Ponta = vlrTUSD;
        if (tariffs.verde_TE_Ponta === 0 && vlrTE > 0) tariffs.verde_TE_Ponta = vlrTE;
      }
      // Energy Fora-ponta
      if (isEnergy && isFP) {
        if (tariffs.verde_TUSD_FP === 0) tariffs.verde_TUSD_FP = vlrTUSD;
        if (tariffs.verde_TE_FP === 0 && vlrTE > 0) tariffs.verde_TE_FP = vlrTE;
      }
    }

    // ── Azul ──
    if (modalidade.includes('azul')) {
      // Demand Ponta
      if (isDemand && isPonta && tariffs.azul_TUSD_Dem_Ponta === 0) {
        tariffs.azul_TUSD_Dem_Ponta = vlrTUSD;
      }
      // Demand FP
      if (isDemand && isFP && tariffs.azul_TUSD_Dem_FP === 0) {
        tariffs.azul_TUSD_Dem_FP = vlrTUSD;
      }
      // Energy Ponta
      if (isEnergy && isPonta) {
        if (tariffs.azul_TUSD_Ponta === 0) tariffs.azul_TUSD_Ponta = vlrTUSD;
        if (tariffs.azul_TE_Ponta === 0 && vlrTE > 0) tariffs.azul_TE_Ponta = vlrTE;
      }
      // Energy FP
      if (isEnergy && isFP) {
        if (tariffs.azul_TUSD_FP === 0) tariffs.azul_TUSD_FP = vlrTUSD;
        if (tariffs.azul_TE_FP === 0 && vlrTE > 0) tariffs.azul_TE_FP = vlrTE;
      }
    }
  }

  // Check for missing critical values
  const missing: string[] = [];
  if (tariffs.verde_TUSD_Demanda === 0) missing.push('TUSD Demanda (Verde)');
  if (tariffs.verde_TUSD_Ponta === 0) missing.push('TUSD Ponta (Verde)');
  if (tariffs.verde_TUSD_FP === 0) missing.push('TUSD FP (Verde)');

  if (missing.length > 0) {
    tariffs.partial = true;
    tariffs.warnings.push(
      `Valores não encontrados na API ANEEL: ${missing.join(', ')}. Preencha manualmente.`
    );
  }

  return tariffs;
}

/* ── Main fetch function ────────────────────────────────── */

export async function fetchGrupoATariffs(
  distributorId: string,
  subgroup: string,
): Promise<GrupoATariffs> {
  const dist = getDistributorById(distributorId);
  if (!dist) {
    return {
      sigAgente: distributorId,
      subgroup,
      fetchedAt: new Date().toISOString(),
      vigencia: '',
      verde_TUSD_Demanda: 0, verde_TUSD_Ponta: 0, verde_TUSD_FP: 0,
      verde_TE_Ponta: 0, verde_TE_FP: 0,
      azul_TUSD_Dem_Ponta: 0, azul_TUSD_Dem_FP: 0,
      azul_TUSD_Ponta: 0, azul_TUSD_FP: 0,
      azul_TE_Ponta: 0, azul_TE_FP: 0,
      partial: true,
      warnings: ['Distribuidora não encontrada.'],
    };
  }

  const sigAgente = dist.sigAgente;

  // Tier 1: LocalStorage cache
  const cached = getFromCache(sigAgente, subgroup);
  if (cached) return cached;

  // Tier 2: Live ANEEL API fetch
  const sql = buildQuery(sigAgente, subgroup);
  const encodedSql = encodeURIComponent(sql);

  const directUrl = `${DIRECT_BASE}/datastore_search_sql?sql=${encodedSql}`;

  // Build URL list: Vite proxy (dev) → CORS proxies (prod) → direct (if CORS enabled)
  const urls = [
    `${PROXY_BASE}/datastore_search_sql?sql=${encodedSql}`,
    ...CORS_PROXIES.map((proxy) => `${proxy}${encodeURIComponent(directUrl)}`),
    directUrl,
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, 10000);
      if (!res.ok) continue;
      const data = await res.json() as { success: boolean; result: { records: ANEELRecord[] } };
      if (!data.success || !data.result?.records) continue;

      const tariffs = parseRecords(data.result.records, sigAgente, subgroup);
      saveToCache(tariffs);
      return tariffs;
    } catch {
      // Try next URL
      continue;
    }
  }

  // Tier 3: Bundled fallback JSON
  try {
    const fallback = await loadBundledTariffs(sigAgente, subgroup);
    if (fallback) return fallback;
  } catch {
    // No bundled data available
  }

  // All tiers failed
  return {
    sigAgente,
    subgroup,
    fetchedAt: new Date().toISOString(),
    vigencia: '',
    verde_TUSD_Demanda: 0, verde_TUSD_Ponta: 0, verde_TUSD_FP: 0,
    verde_TE_Ponta: 0, verde_TE_FP: 0,
    azul_TUSD_Dem_Ponta: 0, azul_TUSD_Dem_FP: 0,
    azul_TUSD_Ponta: 0, azul_TUSD_FP: 0,
    azul_TE_Ponta: 0, azul_TE_FP: 0,
    partial: true,
    warnings: ['Não foi possível obter tarifas da API ANEEL. Preencha os valores manualmente.'],
  };
}

/* ── Bundled fallback ───────────────────────────────────── */

let bundledData: Record<string, GrupoATariffs> | null = null;

async function loadBundledTariffs(
  sigAgente: string,
  subgroup: string,
): Promise<GrupoATariffs | null> {
  if (!bundledData) {
    try {
      const mod = await import('./aneel-tariffs.json');
      bundledData = (mod.default ?? mod) as Record<string, GrupoATariffs>;
    } catch {
      return null;
    }
  }
  const key = `${sigAgente}-${subgroup}`;
  return bundledData[key] ?? null;
}

/* ── Cache management ───────────────────────────────────── */

export function clearTariffCache(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function getCacheAge(distributorId: string, subgroup: string): number | null {
  const dist = getDistributorById(distributorId);
  if (!dist) return null;
  const cached = getFromCache(dist.sigAgente, subgroup);
  if (!cached) return null;
  return Date.now() - new Date(cached.fetchedAt).getTime();
}

/** Returns true if cached tariff is older than 180 days */
export function isTariffStale(distributorId: string, subgroup: string): boolean {
  const age = getCacheAge(distributorId, subgroup);
  if (age === null) return true;
  return age > 180 * 24 * 60 * 60 * 1000;
}
