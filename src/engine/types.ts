// src/engine/types.ts

/* ── Economic Parameters (Tab 1) ──────────────────────── */
export interface EconomicParams {
  simulationYears: number;          // default 15
  startYear: number;                // calendar year for simulation (default 2026)
  ipca: number;                     // default 0.0403
  energyInflation: number;          // default 0.0403
  tma: number;                      // default 0.1267
  icms: number;                     // pre-filled from distributor
  pis: number;                      // default 0.012795
  cofins: number;                   // default 0.059074
  // Battery CAPEX breakdown
  capexPerKWh: number;              // R$/kWh, default 1380
  omPctCapex: number;               // default 0.025
  paintingC5Pct: number;            // editable % of total BESS cost
  bosPct: number;                   // editable %
  epcPct: number;                   // editable %
  developerCostPct: number;         // editable %
  // SG&A / Structure cost
  sgaPctCapex: number;              // default 0.05 (5% of CAPEX/year — Helexia structure cost)
  // Optional monthly costs (toggles)
  emsEnabled: boolean;              // EMS monthly cost toggle
  emsCostMonthly: number;           // R$/month if enabled
  assetMgmtEnabled: boolean;        // Asset management monthly cost toggle
  assetMgmtCostMonthly: number;     // R$/month if enabled
  converterReplacementEnabled: boolean;
  converterReplacementYears: number;    // every N years
  converterReplacementPctCapex: number; // % CAPEX
  capacityReplacementEnabled: boolean;
  capacityReplacementYears: number;
  capacityReplacementPctCapex: number;
  otherFixedCosts: number;          // R$, default 1_900_000
  // External financing (e.g., BNDES Fundo Clima)
  financingEnabled: boolean;          // default false
  financingPctCapex: number;          // default 0.80 (80% of CAPEX financed)
  financingRate: number;              // default 0.10 (10% nominal annual)
  financingTermYears: number;         // default 10 (loan term)
}

/* ── Load Data (Tab 2) ─────────────────────────────────── */
export type LoadInputMethod =
  | 'invoice'      // Curva de carga a partir da conta de energia
  | 'manual'       // Desenvolver curva de carga
  | 'profile'      // Perfil padrão indústria
  | 'csv';         // Upload SCDE-CCEE

export interface MonthlyInvoiceRow {
  month: number;                    // 1–12
  consumoPontaKWh: number;
  consumoFPKWh: number;
  demandaMedidaKW: number;
  demandaContratadaKW: number;
}

export interface LoadData {
  method: LoadInputMethod;
  // Invoice method
  monthlyInvoice: MonthlyInvoiceRow[];
  // Manual method
  hourlyKVA: number[];              // 24 values
  monthlySeasonality: number[];     // 12 values (% factor)
  // Profile method
  profileId: string | null;
  annualConsumptionKWh: number;
  // CSV method
  csvData: number[] | null;         // 8760 hourly kW values (processed)
  csvFileName: string | null;
  // Shared
  loadCurve8760: number[] | null;   // Final computed 8760-hour load curve (kW)
}

/* ── Battery Parameters (Tab 3) ────────────────────────── */
export type AugmentationStrategy = 'none' | 'scheduled' | 'threshold';

export interface BatteryParams {
  capacityKWh: number;              // Nominal storage capacity
  cRate: number;                    // default 0.33
  dodPct: number;                   // default 0.90
  roundTripEfficiency: number;      // default 0.88
  cyclesPerYearRef: number;         // reference 220
  modularUnitKWh: number;           // default 1
  degradationTable: number[];       // 16 values (year 0–15), % remaining
  // Augmentation
  augmentationStrategy: AugmentationStrategy;  // default: 'threshold'
  // Threshold strategy
  augmentationThresholdPct: number;    // default: 82 (trigger when < 82% nominal)
  augmentationTargetPct: number;       // default: 100 (restore to 100% nominal)
  augmentationCostFactor: number;      // default: 0.32 (32% of installed R$/kWh — modules only)
  augmentationPriceDeclinePct: number; // default: 3.0 (real % annual decline in module prices)
  // Scheduled strategy (legacy)
  augmentationPeriodYears: number;     // default: 5
  augmentationCostPct: number;         // default: 3.8 (% of battery-only CAPEX)
}

/* ── Augmentation Event (simulation output) ────────────── */
export interface AugmentationEvent {
  year: number;
  capacityBeforeKWh: number;
  capacityAfterKWh: number;
  kWhAdded: number;
  costReal: number;                 // real BRL at year of event
  costNominal: number;              // nominal BRL (IPCA-escalated)
}

/* ── Grid Parameters (Tab 4) ──────────────────────────── */
export type ClientType = 'cativo' | 'livre';
export type Incentivo = 'nenhum' | 'I50' | 'I100';
export type Subgroup = 'A1' | 'A2' | 'A3' | 'A3a' | 'A4' | 'AS';
export type Modalidade = 'verde' | 'azul';

export interface GridParams {
  state: string;                    // UF code
  distributorId: string;
  clientType: ClientType;
  incentivo: Incentivo;
  subgroup: Subgroup;
  modalidade: Modalidade;
  pontaStart: string;               // HH:MM
  pontaEnd: string;                 // HH:MM
  // Demands
  demandaContratadaKW: number;
  demandaContratadaPontaKW: number; // Azul only
  demandaContratadaFPKW: number;    // Azul only
  // Tariffs (editable, auto-filled from ANEEL)
  tusdDemandaRkW: number;           // R$/kW/month (Verde)
  tusdPontaRMWh: number;            // R$/MWh
  tusdFPRMWh: number;               // R$/MWh
  tePontaRMWh: number;              // R$/MWh (Cativo only)
  teFPRMWh: number;                 // R$/MWh (Cativo only)
  // Azul-specific demand tariffs
  azulDemPontaRkW: number;          // R$/kW/month
  azulDemFPRkW: number;             // R$/kW/month
  // Passthrough
  cosipR: number;                   // default 100
  // Tax toggles
  icmsOnDemand: 'contratada' | 'medida';
  clienteIsentoICMS: boolean;
  descontoLivreIncideICMS: boolean;
  clienteIsentoPISCOFINS: boolean;
  descontoLivreIncidePISCOFINS: boolean;
  // ACL energy
  aclSamePrice: boolean;
  aclEnergyPriceRMWh: number;      // default 165
  aclEnergyPriceTable: number[];    // 15 annual prices if not same
}

/* ── EMS Parameters (Tab 5) ────────────────────────────── */
export type BESSMode = 'loadShifting' | 'peakShaving' | 'combined';

export interface EMSParams {
  bessMode: BESSMode;               // default 'loadShifting'
  loadShifting: boolean;            // default true (kept for backward compat)
  peakShaving: boolean;             // default false
  peakShavingTargetKW: number;      // target max demand (kW) — BESS discharges above this
  peakShavingAutoTarget: boolean;   // auto-calculate target from demanda contratada
  gridCharging: boolean;            // default true
  chargeWindowHours: number;        // default 72
  solarCharging: boolean;           // default false (v2)
}

/* ── Optimization Limits (Tab 6) ───────────────────────── */
export interface OptLimits {
  minSoCPct: number;                // default 0.10
  maxSoCPct: number;                // default 1.00
  maxDischargePowerKW: number;      // default = capacity × C-rate
  maxChargePowerKW: number;         // default = capacity × C-rate
  restrictChargingToOffPeak: boolean; // default true
}

/* ── Sizing Parameters (Tab 7) ─────────────────────────── */
export interface SizingParams {
  bessCapacityKWh: number;
  contractYears: 10 | 12 | 15;
  numberOfUnits: number;            // auto-calc
}

/* ── Scenario ──────────────────────────────────────────── */
export interface Scenario {
  id: string;
  name: string;
  economicParams: EconomicParams;
  loadData: LoadData;
  batteryParams: BatteryParams;
  gridParams: GridParams;
  emsParams: EMSParams;
  optimizationLimits: OptLimits;
  sizingParams: SizingParams;
}

/* ── BESS Project ──────────────────────────────────────── */
export interface BESSProject {
  id: string;
  name: string;
  clientName: string;
  siteAddress: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  economicParams: EconomicParams;
  loadData: LoadData;
  batteryParams: BatteryParams;
  gridParams: GridParams;
  emsParams: EMSParams;
  optimizationLimits: OptLimits;
  sizingParams: SizingParams;
  scenarios: Scenario[];
}

/* ── Folder ────────────────────────────────────────────── */
export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

/* ── Simulation Results (in-memory only) ───────────────── */
export interface MonthlyResult {
  month: number;                    // 0–179 (15 years × 12)
  consumoPontaBeforeMWh: number;
  consumoFPBeforeMWh: number;
  consumoPontaAfterMWh: number;
  consumoFPAfterMWh: number;
  demandaMedidaBeforeKW: number;
  demandaMedidaAfterKW: number;
  demandaPontaAfterKW: number;      // Azul
  demandaFPAfterKW: number;         // Azul
  invoiceBeforeR: number;
  invoiceAfterR: number;
  savingsGrossR: number;
  eaasFeeR: number;
  netSavingsR: number;
  cyclesMonth: number;
  energyShiftedKWh: number;
}

export interface EaaSResult {
  contractYears: 10 | 12 | 15;
  monthlyFeeYr1: number;
  monthlyFeeYr5: number;
  annualFeeYr1: number;
  grossSavingsVsFeeRatio: number;
  netSavingsYr1: number;
  clientBreakEvenMonths: number | null;
  helexiaIRRReal: number;
  // Augmentation impact
  monthlyFeeWithoutAug: number;       // fee if no augmentation
  augmentationImpactMonthly: number;   // fee difference due to augmentation
  totalAugCostNominal: number;         // total augmentation cost over contract
  // Financing impact
  monthlyFeeWithFinancing: number;     // lower fee if financed (same equity IRR)
  equityIRRWithFinancingSameFee: number; // higher IRR if same fee + financing
}

export interface BESSSimulationResult {
  projectId: string;
  scenarioId: string | null;
  monthlyResults: MonthlyResult[];
  eaasResults: EaaSResult[];        // 3 entries (10/12/15 years)
  totalInvoiceBeforeYr1: number;
  totalInvoiceAfterYr1: number;
  grossSavingsYr1: number;
  energyShiftedYr1MWh: number;
  totalCyclesYr1: number;
  avgSoCYr1Pct: number;
  // Hourly data (not persisted)
  hourlySoC?: number[];             // 8760 × years
  hourlyNetLoad?: number[];         // 8760 × years
  augmentationEvents: AugmentationEvent[];
  effectiveCapacityPct: number[];     // per year: effective capacity % of nominal (with augmentation)
  intrinsicCapacityPct: number[];     // per year: intrinsic degradation % (without augmentation)
}

/* ── Default values ────────────────────────────────────── */
export const DEFAULT_ECONOMIC_PARAMS: EconomicParams = {
  simulationYears: 15,
  startYear: 2026,
  ipca: 0.0403,
  energyInflation: 0.0403,
  tma: 0.1267,
  icms: 0.205,
  pis: 0.012795,
  cofins: 0.059074,
  capexPerKWh: 1380,
  omPctCapex: 0.025,
  paintingC5Pct: 0,
  bosPct: 0,
  epcPct: 0,
  developerCostPct: 0,
  sgaPctCapex: 0.05,
  emsEnabled: false,
  emsCostMonthly: 0,
  assetMgmtEnabled: false,
  assetMgmtCostMonthly: 0,
  converterReplacementEnabled: true,
  converterReplacementYears: 5,
  converterReplacementPctCapex: 0.01,
  capacityReplacementEnabled: true,
  capacityReplacementYears: 5,
  capacityReplacementPctCapex: 0.038,
  otherFixedCosts: 1_900_000,
  financingEnabled: false,
  financingPctCapex: 0.80,
  financingRate: 0.10,
  financingTermYears: 10,
};

export const DEFAULT_LOAD_DATA: LoadData = {
  method: 'profile',
  monthlyInvoice: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    consumoPontaKWh: 0,
    consumoFPKWh: 0,
    demandaMedidaKW: 0,
    demandaContratadaKW: 0,
  })),
  hourlyKVA: new Array(24).fill(0),
  monthlySeasonality: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  profileId: null,
  annualConsumptionKWh: 0,
  csvData: null,
  csvFileName: null,
  loadCurve8760: null,
};

export const DEFAULT_BATTERY_PARAMS: BatteryParams = {
  capacityKWh: 1000,
  cRate: 0.33,
  dodPct: 0.90,
  roundTripEfficiency: 0.88,
  cyclesPerYearRef: 220,
  modularUnitKWh: 1,
  degradationTable: [
    100, 94.05, 91.56, 89.47, 87.66, 86, 84.5, 84, 83.5, 82, 81, 79.2, 77.5, 76, 74.5, 73,
  ],
  augmentationStrategy: 'threshold',
  augmentationThresholdPct: 82,
  augmentationTargetPct: 100,
  augmentationCostFactor: 0.32,
  augmentationPriceDeclinePct: 3.0,
  augmentationPeriodYears: 5,
  augmentationCostPct: 3.8,
};

export const DEFAULT_GRID_PARAMS: GridParams = {
  state: '',
  distributorId: '',
  clientType: 'cativo',
  incentivo: 'nenhum',
  subgroup: 'A4',
  modalidade: 'verde',
  pontaStart: '18:00',
  pontaEnd: '21:00',
  demandaContratadaKW: 0,
  demandaContratadaPontaKW: 0,
  demandaContratadaFPKW: 0,
  tusdDemandaRkW: 0,
  tusdPontaRMWh: 0,
  tusdFPRMWh: 0,
  tePontaRMWh: 0,
  teFPRMWh: 0,
  azulDemPontaRkW: 0,
  azulDemFPRkW: 0,
  cosipR: 100,
  icmsOnDemand: 'contratada',
  clienteIsentoICMS: false,
  descontoLivreIncideICMS: false,
  clienteIsentoPISCOFINS: false,
  descontoLivreIncidePISCOFINS: false,
  aclSamePrice: true,
  aclEnergyPriceRMWh: 165,
  aclEnergyPriceTable: new Array(15).fill(165),
};

export const DEFAULT_EMS_PARAMS: EMSParams = {
  bessMode: 'loadShifting',
  loadShifting: true,
  peakShaving: false,
  peakShavingTargetKW: 0,
  peakShavingAutoTarget: true,
  gridCharging: true,
  chargeWindowHours: 72,
  solarCharging: false,
};

export const DEFAULT_OPT_LIMITS: OptLimits = {
  minSoCPct: 0.10,
  maxSoCPct: 1.00,
  maxDischargePowerKW: 0,
  maxChargePowerKW: 0,
  restrictChargingToOffPeak: true,
};

export const DEFAULT_SIZING_PARAMS: SizingParams = {
  bessCapacityKWh: 1000,
  contractYears: 15,
  numberOfUnits: 1,
};
