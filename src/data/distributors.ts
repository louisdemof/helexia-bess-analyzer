// src/data/distributors.ts

export interface Distributor {
  id: string;
  sigAgente: string;         // ANEEL API SigAgente
  name: string;              // Full display name
  state: string;             // UF code
  icmsElectricity: number;   // ICMS rate on electricity (decimal)
  icmsLegalBasis: string;    // Legal reference
  pontaStart: string;        // Default ponta start HH:MM
  pontaEnd: string;          // Default ponta end HH:MM
}

export const DISTRIBUTORS: Distributor[] = [
  // ── Norte ────────────────────────────────────────────
  { id: 'AME',           sigAgente: 'AME',           name: 'Amazonas Energia',               state: 'AM', icmsElectricity: 0.20,  icmsLegalBasis: 'Modal rate',                                          pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'EQUATORIAL_PA', sigAgente: 'EQUATORIAL PA', name: 'Equatorial Pará',                state: 'PA', icmsElectricity: 0.17,  icmsLegalBasis: 'LC 194/2022 floor',                                   pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'EQUATORIAL_MA', sigAgente: 'EQUATORIAL MA', name: 'Equatorial Maranhão',            state: 'MA', icmsElectricity: 0.22,  icmsLegalBasis: 'Lei 12.120/2023 — raised from 20% Feb 2024',          pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'ENERGISA_TO',   sigAgente: 'ETO',           name: 'Energisa Tocantins',             state: 'TO', icmsElectricity: 0.18,  icmsLegalBasis: 'Modal rate TO',                                       pontaStart: '18:00', pontaEnd: '21:00' },

  // ── Nordeste ─────────────────────────────────────────
  { id: 'EQUATORIAL_PI', sigAgente: 'EQUATORIAL PI', name: 'Equatorial Piauí',               state: 'PI', icmsElectricity: 0.18,  icmsLegalBasis: 'Confirm vs SEFAZ-PI current',                        pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'ENEL_CE',       sigAgente: 'ENEL CE',       name: 'Enel Distribuição Ceará',        state: 'CE', icmsElectricity: 0.20,  icmsLegalBasis: 'Lei 18.305/2023 — from Jan 2024',                    pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'COSERN',        sigAgente: 'COSERN',        name: 'Cosern',                         state: 'RN', icmsElectricity: 0.20,  icmsLegalBasis: 'Lei 11.999/2024 — from Mar 2025 (was 18%)',           pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'ENERGISA_PB',   sigAgente: 'EPB',            name: 'Energisa Paraíba',               state: 'PB', icmsElectricity: 0.20,  icmsLegalBasis: 'Lei 12.788/2023 — from Jan 2024',                    pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'CELPE',         sigAgente: 'Neoenergia PE', name: 'Celpe (Neoenergia)',             state: 'PE', icmsElectricity: 0.205, icmsLegalBasis: 'Lei 18.305/2023 — from Jan 2024',                    pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'EQUATORIAL_AL', sigAgente: 'EQUATORIAL AL', name: 'Equatorial Alagoas',             state: 'AL', icmsElectricity: 0.17,  icmsLegalBasis: 'LC 194/2022 floor',                                   pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'ENERGISA_SE',   sigAgente: 'ESE',            name: 'Energisa Sergipe',               state: 'SE', icmsElectricity: 0.18,  icmsLegalBasis: 'Confirm vs SEFAZ-SE current',                        pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'COELBA',        sigAgente: 'COELBA',        name: 'Coelba (Neoenergia)',            state: 'BA', icmsElectricity: 0.205, icmsLegalBasis: 'Lei 14.629/2023 — from Feb 2024 (was 19%)',           pontaStart: '18:00', pontaEnd: '21:00' },

  // ── Sudeste ──────────────────────────────────────────
  { id: 'CEMIG_D',       sigAgente: 'CEMIG-D',       name: 'Cemig Distribuição',             state: 'MG', icmsElectricity: 0.18,  icmsLegalBasis: 'Reduced per LC 194 from 30%',                        pontaStart: '17:00', pontaEnd: '20:00' },
  { id: 'ENEL_RJ',       sigAgente: 'ENEL RJ',       name: 'Enel Distribuição Rio',          state: 'RJ', icmsElectricity: 0.20,  icmsLegalBasis: '18% + 2% FECP (Fundo de Combate à Pobreza)',          pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'LIGHT',         sigAgente: 'LIGHT SESA',    name: 'Light',                          state: 'RJ', icmsElectricity: 0.20,  icmsLegalBasis: '18% + 2% FECP',                                      pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'ENEL_SP',       sigAgente: 'ELETROPAULO',   name: 'Enel São Paulo (Eletropaulo)',   state: 'SP', icmsElectricity: 0.18,  icmsLegalBasis: 'Modal rate; Grupo A > 200 kWh/mês',                  pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'CPFL',          sigAgente: 'CPFL-PAULISTA', name: 'CPFL Paulista',                  state: 'SP', icmsElectricity: 0.18,  icmsLegalBasis: 'Modal rate SP',                                      pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'ELEKTRO',       sigAgente: 'ELEKTRO',       name: 'Elektro (Neoenergia)',           state: 'SP', icmsElectricity: 0.18,  icmsLegalBasis: 'Modal rate SP',                                      pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'EDP_SP',        sigAgente: 'EDP SP',        name: 'EDP São Paulo',                  state: 'SP', icmsElectricity: 0.18,  icmsLegalBasis: 'Modal rate SP',                                      pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'EDP_ES',        sigAgente: 'EDP ES',        name: 'EDP Espírito Santo',             state: 'ES', icmsElectricity: 0.17,  icmsLegalBasis: 'Majoração 19.5% revogada — mantém 17%',              pontaStart: '18:00', pontaEnd: '21:00' },

  // ── Centro-Oeste ─────────────────────────────────────
  { id: 'EQUATORIAL_GO', sigAgente: 'EQUATORIAL GO', name: 'Equatorial Goiás (CELG-D)',      state: 'GO', icmsElectricity: 0.19,  icmsLegalBasis: 'Lei 22.460/2023 — from Apr 2024 (was 17%)',           pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'CEB_DIS',       sigAgente: 'Neoenergia Brasília', name: 'CEB Distribuição (Neoenergia)', state: 'DF', icmsElectricity: 0.20,  icmsLegalBasis: 'Lei 7.326/2023 — from Jan 2024',               pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'ENERGISA_MS',   sigAgente: 'EMS',            name: 'Energisa Mato Grosso do Sul',    state: 'MS', icmsElectricity: 0.17,  icmsLegalBasis: 'LC 194/2022 floor',                                   pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'ENERGISA_MT',   sigAgente: 'EMT',            name: 'Energisa Mato Grosso',           state: 'MT', icmsElectricity: 0.17,  icmsLegalBasis: 'LC 194/2022 floor',                                   pontaStart: '18:00', pontaEnd: '21:00' },

  // ── Sul ──────────────────────────────────────────────
  { id: 'COPEL_DIS',     sigAgente: 'COPEL-DIS',     name: 'Copel Distribuição',             state: 'PR', icmsElectricity: 0.195, icmsLegalBasis: 'Lei 1.029/2023 — from Mar 2024 (was 19%)',            pontaStart: '18:30', pontaEnd: '21:30' },
  { id: 'CELESC_DIS',    sigAgente: 'CELESC',         name: 'Celesc Distribuição',            state: 'SC', icmsElectricity: 0.12,  icmsLegalBasis: 'RICMS-SC — specific energy rate (energy = 12%)',      pontaStart: '18:00', pontaEnd: '21:00' },
  { id: 'RGE_SUL',       sigAgente: 'RGE SUL',       name: 'RGE Sul',                        state: 'RS', icmsElectricity: 0.12,  icmsLegalBasis: 'RICMS-RS — specific energy rate',                    pontaStart: '18:00', pontaEnd: '21:00' },
];

// ── Lookup helpers ──────────────────────────────────────

export const DISTRIBUTOR_MAP = new Map(DISTRIBUTORS.map((d) => [d.id, d]));

export function getDistributorById(id: string): Distributor | undefined {
  return DISTRIBUTOR_MAP.get(id);
}

export function getDistributorsByState(uf: string): Distributor[] {
  return DISTRIBUTORS.filter((d) => d.state === uf);
}

/** All unique UF codes present in the distributor list, sorted */
export const STATES = [...new Set(DISTRIBUTORS.map((d) => d.state))].sort();

/** UF → state name mapping */
export const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá',
  BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo',
  GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco',
  PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina',
  SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
};
