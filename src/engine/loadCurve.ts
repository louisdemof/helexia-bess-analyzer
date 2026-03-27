// src/engine/loadCurve.ts
// Load curve processing: CSV, manual, profile-based, and invoice-based synthesis

import type { LoadData, GridParams } from './types.ts';
import { getProfileById } from '../data/loadProfiles.ts';

/** Days per month (non-leap year) */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Cumulative hours at start of each month */
const MONTH_START_HOUR: number[] = [];
{
  let h = 0;
  for (let m = 0; m < 12; m++) {
    MONTH_START_HOUR.push(h);
    h += DAYS_IN_MONTH[m] * 24;
  }
}

/** Get month index (0–11) from hour of year (0–8759) */
export function monthFromHour(h: number): number {
  for (let m = 11; m >= 0; m--) {
    if (h >= MONTH_START_HOUR[m]) return m;
  }
  return 0;
}

/* ── Brazilian national holidays (fixed + moveable) ────── */

/**
 * Brazilian national holidays per ANEEL calendar.
 * Fixed holidays + Easter-based moveable holidays.
 * Stored as [month (0-based), day] tuples.
 * Carnival and Corpus Christi are calculated from Easter.
 */
function getBrazilianHolidays(year: number): Set<number> {
  const holidays = new Set<number>();

  // Fixed national holidays (month 0-based, day)
  const fixed: [number, number][] = [
    [0, 1],   // Confraternização Universal (1 Jan)
    [3, 21],  // Tiradentes (21 Apr)
    [4, 1],   // Dia do Trabalho (1 May)
    [8, 7],   // Independência do Brasil (7 Sep)
    [9, 12],  // Nossa Sra. Aparecida (12 Oct)
    [10, 2],  // Finados (2 Nov)
    [10, 15], // Proclamação da República (15 Nov)
    [11, 25], // Natal (25 Dec)
  ];

  for (const [m, d] of fixed) {
    holidays.add(dayOfYear(m, d));
  }

  // Easter-based moveable holidays (Computus algorithm)
  const easter = computeEaster(year);

  // Carnival: 47 days before Easter (Monday and Tuesday)
  holidays.add(easter - 48); // Carnival Monday
  holidays.add(easter - 47); // Carnival Tuesday

  // Sexta-feira Santa: 2 days before Easter
  holidays.add(easter - 2);

  // Corpus Christi: 60 days after Easter
  holidays.add(easter + 60);

  return holidays;
}

/** Day of year (0-based) from month (0-based) and day (1-based) */
function dayOfYear(month: number, day: number): number {
  let doy = 0;
  for (let m = 0; m < month; m++) doy += DAYS_IN_MONTH[m];
  return doy + day - 1;
}

/** Compute Easter day-of-year using Anonymous Gregorian algorithm */
function computeEaster(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dayOfYear(month, day);
}

/* ── Pre-compute lookup table for the simulation year ──── */

/** Build a boolean array: isHolidayOrWeekend[dayOfYear] = true if no ponta */
export function buildNoPontaDays(year: number = 2024): boolean[] {
  const holidays = getBrazilianHolidays(year);

  // Determine day of week for Jan 1 of the given year
  // 0=Mon, 1=Tue, ..., 6=Sun
  const jan1 = new Date(year, 0, 1);
  const jan1Dow = (jan1.getDay() + 6) % 7; // Convert JS Sunday=0 to Monday=0

  const noPonta: boolean[] = [];
  for (let d = 0; d < 365; d++) {
    const dow = (jan1Dow + d) % 7;
    const isWeekend = dow >= 5; // Saturday=5, Sunday=6
    const isHoliday = holidays.has(d);
    noPonta.push(isWeekend || isHoliday);
  }
  return noPonta;
}

/** Pre-built lookup for default year (2024) */
let _noPontaDaysCache: boolean[] | null = null;
let _noPontaDaysYear: number = 0;

function getNoPontaDays(year: number = 2024): boolean[] {
  if (_noPontaDaysCache && _noPontaDaysYear === year) return _noPontaDaysCache;
  _noPontaDaysCache = buildNoPontaDays(year);
  _noPontaDaysYear = year;
  return _noPontaDaysCache;
}

/** Check if an hour falls within the ponta period (weekdays only, excluding holidays) */
export function isPontaHour(
  hourOfYear: number,
  pontaStartH: number,
  pontaEndH: number,
  year: number = 2026,
): boolean {
  const dayOfYr = Math.floor(hourOfYear / 24);
  const noPonta = getNoPontaDays(year);
  if (dayOfYr >= 365 || noPonta[dayOfYr]) return false; // Weekend or holiday

  const hourOfDay = hourOfYear % 24;
  return hourOfDay >= pontaStartH && hourOfDay < pontaEndH;
}

/** Hours until next ponta period starts (skips weekends and holidays) */
export function hoursUntilNextPonta(
  hourOfYear: number,
  pontaStartH: number,
  year: number = 2026,
): number {
  const noPonta = getNoPontaDays(year);
  const hourOfDay = hourOfYear % 24;
  const currentDay = Math.floor(hourOfYear / 24);

  // Check if today has ponta and we haven't passed it yet
  if (currentDay < 365 && !noPonta[currentDay] && hourOfDay < pontaStartH) {
    return pontaStartH - hourOfDay;
  }

  // Search forward for next ponta day
  for (let d = currentDay + 1; d < 365; d++) {
    if (!noPonta[d]) {
      // Found next working day with ponta
      const hoursToMidnight = 24 - hourOfDay;
      const fullDays = d - currentDay - 1;
      return hoursToMidnight + fullDays * 24 + pontaStartH;
    }
  }
  // Fallback: next day
  return (24 - hourOfDay) + pontaStartH;
}

/** Count ponta hours in a month (weekdays × ponta hours/day, excluding holidays) */
export function countPontaHoursInMonth(
  month: number,
  pontaStartH: number,
  pontaEndH: number,
  year: number = 2026,
): number {
  const noPonta = getNoPontaDays(year);
  const pontaHoursPerDay = pontaEndH - pontaStartH;
  let startDay = 0;
  for (let m = 0; m < month; m++) startDay += DAYS_IN_MONTH[m];

  let count = 0;
  for (let d = 0; d < DAYS_IN_MONTH[month]; d++) {
    if (!noPonta[startDay + d]) count += pontaHoursPerDay;
  }
  return count;
}

/** Parse HH:MM string to hour integer */
export function parseHourMinute(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h + (m >= 30 ? 0.5 : 0);
}

/* ── Build 8760-hour load curve from any input method ──── */

export function buildLoadCurve8760(
  loadData: LoadData,
  grid: GridParams,
): number[] {
  switch (loadData.method) {
    case 'csv':
      return buildFromCSV(loadData);
    case 'manual':
      return buildFromManual(loadData);
    case 'profile':
      return buildFromProfile(loadData);
    case 'invoice':
      return buildFromInvoice(loadData, grid);
    default:
      return new Array(8760).fill(0);
  }
}

/* ── CSV: already processed to 8760 hourly kW ──────────── */

function buildFromCSV(loadData: LoadData): number[] {
  if (loadData.csvData && loadData.csvData.length === 8760) {
    return loadData.csvData;
  }
  return new Array(8760).fill(0);
}

/* ── Manual: 24h shape × 12-month seasonality ──────────── */

function buildFromManual(loadData: LoadData): number[] {
  const hourly = loadData.hourlyKVA;      // 24 values (kVA)
  const season = loadData.monthlySeasonality; // 12 values (%)

  const curve = new Array<number>(8760);
  let idx = 0;
  for (let m = 0; m < 12; m++) {
    const factor = (season[m] ?? 100) / 100;
    const daysInMonth = DAYS_IN_MONTH[m];
    for (let d = 0; d < daysInMonth; d++) {
      for (let h = 0; h < 24; h++) {
        curve[idx++] = (hourly[h] ?? 0) * factor;
      }
    }
  }
  return curve;
}

/* ── Profile: normalized shape × annual consumption ────── */

function buildFromProfile(loadData: LoadData): number[] {
  const profile = loadData.profileId ? getProfileById(loadData.profileId) : null;
  if (!profile) return new Array(8760).fill(0);

  const hourlyPct = profile.hourly;           // 24 values, peak = 100
  const season = loadData.monthlySeasonality; // 12 values (% factor)
  const annualKWh = loadData.annualConsumptionKWh;

  if (annualKWh <= 0) return new Array(8760).fill(0);

  // Calculate the sum of all weighted hours to find scaling factor
  let weightedSum = 0;
  for (let m = 0; m < 12; m++) {
    const sFactor = (season[m] ?? 100) / 100;
    const daysInMonth = DAYS_IN_MONTH[m];
    for (let d = 0; d < daysInMonth; d++) {
      for (let h = 0; h < 24; h++) {
        weightedSum += (hourlyPct[h] / 100) * sFactor;
      }
    }
  }

  // Scale so total energy = annualKWh
  // Each hour value in kW; energy = sum of kW × 1h = sum of kWh
  const scaleFactor = annualKWh / weightedSum;

  const curve = new Array<number>(8760);
  let idx = 0;
  for (let m = 0; m < 12; m++) {
    const sFactor = (season[m] ?? 100) / 100;
    const daysInMonth = DAYS_IN_MONTH[m];
    for (let d = 0; d < daysInMonth; d++) {
      for (let h = 0; h < 24; h++) {
        curve[idx++] = (hourlyPct[h] / 100) * sFactor * scaleFactor;
      }
    }
  }
  return curve;
}

/* ── Invoice: reconstruct from 12-month billing data ───── */

function buildFromInvoice(loadData: LoadData, grid: GridParams): number[] {
  const invoice = loadData.monthlyInvoice;
  const pontaStartH = parseHourMinute(grid.pontaStart);
  const pontaEndH = parseHourMinute(grid.pontaEnd);
  const pontaHoursPerDay = pontaEndH - pontaStartH;

  // Try to get a profile for shape hints
  const profile = loadData.profileId ? getProfileById(loadData.profileId) : null;
  const hourlyShape = profile?.hourly ?? [
    // Default flat-ish commercial shape if no profile selected
    50,45,42,40,40,42,55,70,80,85,88,90,92,90,88,86,85,88,95,100,92,80,65,55,
  ];

  const curve = new Array<number>(8760);
  let idx = 0;

  for (let m = 0; m < 12; m++) {
    const row = invoice[m];
    if (!row) { idx += DAYS_IN_MONTH[m] * 24; continue; }

    const totalKWh = row.consumoPontaKWh + row.consumoFPKWh;
    const demandaKW = row.demandaMedidaKW || row.demandaContratadaKW;
    const daysInMonth = DAYS_IN_MONTH[m];
    const weekdays = Math.round(daysInMonth * 5 / 7);

    // Target energy per period
    const pontaTotalKWh = row.consumoPontaKWh;
    const fpTotalKWh = row.consumoFPKWh;

    // Ponta hours in the month (weekdays only × ponta hours/day)
    const pontaHoursMonth = weekdays * pontaHoursPerDay;
    // FP hours = rest
    const fpHoursMonth = daysInMonth * 24 - pontaHoursMonth;

    // Average kW during ponta and FP
    const avgPontaKW = pontaHoursMonth > 0 ? pontaTotalKWh / pontaHoursMonth : 0;
    const avgFPKW = fpHoursMonth > 0 ? fpTotalKWh / fpHoursMonth : 0;

    // Use hourly shape to distribute within ponta/FP, scaled to match totals
    // Normalize shape for ponta hours and FP hours separately
    let pontaShapeSum = 0;
    let fpShapeSum = 0;
    for (let h = 0; h < 24; h++) {
      if (h >= pontaStartH && h < pontaEndH) {
        pontaShapeSum += hourlyShape[h];
      } else {
        fpShapeSum += hourlyShape[h];
      }
    }

    for (let d = 0; d < daysInMonth; d++) {
      const dayOfWeek = (idx / 24 + d) % 7;
      const isWeekday = dayOfWeek < 5;

      for (let h = 0; h < 24; h++) {
        const isPonta = isWeekday && h >= pontaStartH && h < pontaEndH;
        let kw: number;

        if (isPonta && pontaShapeSum > 0) {
          kw = avgPontaKW * (hourlyShape[h] / (pontaShapeSum / pontaHoursPerDay));
        } else if (fpShapeSum > 0) {
          kw = avgFPKW * (hourlyShape[h] / (fpShapeSum / (24 - pontaHoursPerDay)));
        } else {
          kw = totalKWh / (daysInMonth * 24);
        }

        // Clamp to demanda_medida × 1.05
        if (demandaKW > 0) {
          kw = Math.min(kw, demandaKW * 1.05);
        }
        // Ensure non-negative
        curve[idx + d * 24 + h] = Math.max(0, kw);
      }
    }
    idx += daysInMonth * 24;
  }
  return curve;
}

/* ── Monthly aggregation helpers ───────────────────────── */

export interface MonthlyAggregation {
  month: number;                  // 0–11
  consumoPontaKWh: number;
  consumoFPKWh: number;
  consumoTotalKWh: number;
  demandaMedidaKW: number;        // Max kW in month (all hours)
  demandaPontaKW: number;         // Max kW during ponta
  demandaFPKW: number;            // Max kW during FP
}

export function aggregateMonthly(
  curve8760: number[],
  pontaStartH: number,
  pontaEndH: number,
  year: number = 2026,
): MonthlyAggregation[] {
  const result: MonthlyAggregation[] = [];

  let idx = 0;
  for (let m = 0; m < 12; m++) {
    let consumoPonta = 0;
    let consumoFP = 0;
    let maxAll = 0;
    let maxPonta = 0;
    let maxFP = 0;

    const days = DAYS_IN_MONTH[m];
    for (let d = 0; d < days; d++) {
      for (let h = 0; h < 24; h++) {
        const kw = curve8760[idx] ?? 0;
        const isPonta = isPontaHour(idx, pontaStartH, pontaEndH, year);

        if (isPonta) {
          consumoPonta += kw; // kW × 1h = kWh
          if (kw > maxPonta) maxPonta = kw;
        } else {
          consumoFP += kw;
          if (kw > maxFP) maxFP = kw;
        }
        if (kw > maxAll) maxAll = kw;
        idx++;
      }
    }

    result.push({
      month: m,
      consumoPontaKWh: consumoPonta,
      consumoFPKWh: consumoFP,
      consumoTotalKWh: consumoPonta + consumoFP,
      demandaMedidaKW: maxAll,
      demandaPontaKW: maxPonta,
      demandaFPKW: maxFP,
    });
  }
  return result;
}
