// src/data/loadProfiles.ts
// Auto-generated from BESS Load Profile Sub-Spec v1.0

export interface LoadProfile {
  id:           string;               // 'P01'
  name:         string;               // Display name PT-BR
  emoji:        string;               // UI icon
  priority:     1 | 2 | 3;
  hourly:       number[];             // 24 values, relative % (peak = 100)
  seasonality:  number[];             // 12 values, index factor (100 = normal)
  loadFactor:   number;               // Typical annual load factor (0–1)
  defaultCRate: number;               // Recommended C-rate
  preferredStates: string[];          // UF codes
  syntheticAllowed: boolean;          // false = force CSV upload
  seasonalOpToggle: boolean;          // show seasonal operation toggle
  subSectorOptions?: string[];        // dropdown sub-types (optional)
  notes:        string;               // Warning to show in UI
}

export const LOAD_PROFILES: LoadProfile[] = [
  { id: 'P01', name: 'Hotel & Resort (Praia / Urbano)', emoji: '\u{1F3E8}', priority: 1,
    hourly: [20,18,17,16,15,16,22,35,52,65,72,75,78,80,82,85,88,95,100,98,90,75,55,32],
    seasonality: [125,105,90,80,75,78,120,88,82,88,108,132],
    loadFactor: 0.62, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['BA','CE','PR','GO'],
    notes: 'Verificar taxa de ocupação média. Temporada: Jan, Jul, Nov-Dez.' },

  { id: 'P02', name: 'Resort Termal (Caldas Novas)', emoji: '\u{2668}\u{FE0F}', priority: 1,
    hourly: [42,40,38,37,36,38,45,55,65,75,80,82,85,85,86,88,90,96,100,98,92,80,65,50],
    seasonality: [135,115,95,85,80,82,132,90,85,90,112,140],
    loadFactor: 0.74, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['GO'],
    notes: 'Bombeamento termal 24h eleva mínimo noturno para ~40% do pico. Caldas Novas exclusivo.' },

  { id: 'P03', name: 'Supermercado & Hipermercado', emoji: '\u{1F6D2}', priority: 1,
    hourly: [12,10,9,8,8,10,18,35,58,70,78,82,85,85,86,88,90,95,100,98,88,70,45,22],
    seasonality: [105,95,90,85,82,82,90,88,88,92,108,135],
    loadFactor: 0.61, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['BA','CE','GO','MS','PR'],
    notes: 'Verificar se possui câmara fria / açougue (+8% load factor). Multi-CNPJ: potencial ICP4+BESS.' },

  { id: 'P04', name: 'Shopping Center & Mall', emoji: '\u{1F3EC}', priority: 1,
    hourly: [5,4,4,3,3,4,8,15,35,58,72,82,88,90,90,92,94,97,100,100,95,80,50,18],
    seasonality: [110,95,88,82,80,80,92,88,88,92,110,140],
    loadFactor: 0.65, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['BA','CE','GO','PR'],
    notes: 'Verificar se Azul — economia de demanda ponta é o principal driver. ABL benchmark: 80-120 kWh/m²/ano.' },

  { id: 'P05', name: 'Hospital & Complexo de Saúde', emoji: '\u{1F3E5}', priority: 1,
    hourly: [68,65,63,62,62,64,70,78,85,90,92,93,92,92,91,90,90,93,96,100,98,92,85,75],
    seasonality: [100,98,98,96,95,94,98,97,97,98,99,100],
    loadFactor: 0.78, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['BA','CE','GO','PR'],
    notes: 'Narrativa comercial: backup primeiro, tarifa segundo. Verificar gerador diesel existente.' },

  { id: 'P06', name: 'Frigorífico & Abatedouro', emoji: '\u{1F969}', priority: 1,
    hourly: [75,72,70,68,68,72,85,95,100,98,95,90,88,87,86,85,85,88,90,88,85,82,80,78],
    seasonality: [85,80,78,92,100,105,102,98,90,95,88,82],
    loadFactor: 0.82, defaultCRate: 0.40, syntheticAllowed: true, seasonalOpToggle: true,
    preferredStates: ['MS','GO','PA'],
    notes: 'SAZONAL CRÍTICO: safra MS bovinos Abr-Jul. Modelar safra/entressafra separadamente.' },

  { id: 'P07', name: 'Cooperativa Agroindustrial (Grãos)', emoji: '\u{1F33E}', priority: 1,
    hourly: [35,32,30,28,28,32,55,78,90,95,98,100,98,95,92,90,88,90,92,90,85,72,55,42],
    seasonality: [60,55,90,100,105,75,65,80,95,100,98,65],
    loadFactor: 0.72, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: true,
    preferredStates: ['MS','GO','PR'],
    subSectorOptions: ['Silo + Secador','Apenas Armazenagem','Processamento (farelo/óleo)'],
    notes: 'SAZONAL CRÍTICO: soja MS Abr-Mai e Set-Out. Entressafra Jun-Ago quase sem carga de secagem.' },

  { id: 'P08', name: 'Data Center & Hub de Telecom', emoji: '\u{1F5A5}\u{FE0F}', priority: 1,
    hourly: [90,89,88,88,88,88,89,90,92,93,94,94,94,94,93,93,93,94,95,96,95,94,93,91],
    seasonality: [100,100,100,99,99,99,100,100,100,100,101,102],
    loadFactor: 0.92, defaultCRate: 0.50, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['CE','BA','PR'],
    notes: 'Verificar PUE e potência IT instalada. I50/I100 comum — aplicar desconto TUSD antes de calcular.' },

  { id: 'P09', name: 'Indústria Alimentícia & Bebidas', emoji: '\u{1F3ED}', priority: 2,
    hourly: [18,15,12,10,10,18,45,72,85,90,93,95,94,93,92,90,88,90,92,88,72,52,35,22],
    seasonality: [95,92,90,88,88,88,100,95,95,98,102,108],
    loadFactor: 0.67, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: true,
    preferredStates: ['GO','CE','MS','BA'],
    subSectorOptions: ['Cerveja / Bebidas','Lácteos','Sucos / Conservas','Confeitaria / Biscoito','Outro'],
    notes: 'Subsetor determina perfil real. Cerveja/lácteos: load factor +0.08. Sucos: sazonal por safra.' },

  { id: 'P10', name: 'Têxtil, Calçados & Confecção', emoji: '\u{1F45F}', priority: 2,
    hourly: [8,6,5,5,5,12,42,72,85,88,90,90,88,88,86,82,78,80,82,75,55,35,18,10],
    seasonality: [88,85,90,92,95,90,95,98,100,100,98,92],
    loadFactor: 0.57, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['CE'],
    notes: 'CE: polo calçadista Sobral/Cariri. Verificar férias coletivas (campo obrigatório).' },

  { id: 'P11', name: 'Cerâmica & Materiais de Construção', emoji: '\u{1F9F1}', priority: 2,
    hourly: [82,80,79,78,78,80,85,90,95,98,100,100,99,98,97,96,95,96,98,97,94,90,87,84],
    seasonality: [95,95,95,90,88,85,88,90,95,98,100,98],
    loadFactor: 0.85, defaultCRate: 0.40, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['CE','GO'],
    notes: 'IMPORTANTE: fornos contínuos não são shiftáveis. BESS dimensionado sobre ~35% carga anciliar.' },

  { id: 'P12', name: 'Metal-Mecânica & Autopeças (2 Turnos)', emoji: '\u{2699}\u{FE0F}', priority: 2,
    hourly: [8,6,5,5,5,10,55,88,96,100,98,95,90,92,95,95,90,88,85,80,62,35,18,10],
    seasonality: [90,88,95,95,95,82,78,90,95,95,92,75],
    loadFactor: 0.64, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: true,
    preferredStates: ['PR','GO'],
    notes: 'Jul = férias coletivas automotivo (-25%). COPEL: ponta 18h30-21h30 (ajustar auto).' },

  { id: 'P13', name: 'Universidade & Campus Educacional', emoji: '\u{1F393}', priority: 2,
    hourly: [3,2,2,2,2,5,15,45,68,75,78,72,58,60,70,78,85,90,100,98,82,50,18,5],
    seasonality: [28,32,88,95,98,100,35,90,100,100,98,72],
    loadFactor: 0.42, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['BA','CE','GO','PR'],
    notes: 'ATENÇÃO: Jan-Fev e Jul = recessos (25-32% da carga). Sazonalidade CRÍTICA para o modelo.' },

  { id: 'P14', name: 'Porto & Terminal Logístico', emoji: '\u{2693}', priority: 3,
    hourly: [40,38,35,32,30,38,55,72,82,88,90,92,90,88,88,85,82,85,88,90,85,75,60,48],
    seasonality: [95,90,95,98,100,100,98,98,98,100,98,95],
    loadFactor: 0.60, defaultCRate: 0.60, syntheticAllowed: false, seasonalOpToggle: false,
    preferredStates: ['PA','BA'],
    notes: 'CSV OBRIGATÓRIO — spikes de guindaste impossíveis de modelar sinteticamente. C-rate 0.60.' },

  { id: 'P15', name: 'Centro de Distribuição & Logística', emoji: '\u{1F4E6}', priority: 3,
    hourly: [25,22,18,15,15,20,42,65,78,85,88,90,88,88,90,90,88,90,92,90,82,65,45,30],
    seasonality: [88,82,85,85,85,82,88,88,90,95,115,135],
    loadFactor: 0.68, defaultCRate: 0.45, syntheticAllowed: true, seasonalOpToggle: false,
    preferredStates: ['BA','GO','CE'],
    notes: 'Nov-Dez pico +35% (Black Friday + Natal). Câmara fria: loadFactor +0.12.' },
];

export const getProfileById = (id: string) =>
  LOAD_PROFILES.find((p) => p.id === id);

export const getProfilesByPriority = (priority: 1 | 2 | 3) =>
  LOAD_PROFILES.filter((p) => p.priority === priority);

export const getProfilesByState = (uf: string) =>
  LOAD_PROFILES.filter((p) => p.preferredStates.includes(uf));
