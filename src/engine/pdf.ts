// src/engine/pdf.ts
// Client-facing PDF proposal using @react-pdf/renderer
// Shows ONLY client benefits — no Helexia payback, augmentation costs, or structure costs

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer';
import type { BESSProject, BESSSimulationResult, EaaSResult } from './types.ts';

/* ── Styles ─────────────────────────────────────────────── */

const navy = '#004B70';
const teal = '#2F927B';
const lime = '#C6DA38';
const gray = '#6692A8';

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  // Cover
  coverPage: { padding: 0, fontFamily: 'Helvetica' },
  coverTop: { backgroundColor: navy, height: 320, padding: 50, justifyContent: 'flex-end' },
  coverLogo: { width: 200, marginBottom: 40 },
  coverTitle: { fontSize: 28, color: '#fff', fontWeight: 'bold', marginBottom: 8 },
  coverSubtitle: { fontSize: 16, color: teal, marginBottom: 30 },
  coverClient: { fontSize: 20, color: '#fff', marginBottom: 4 },
  coverAddress: { fontSize: 12, color: gray },
  coverBottom: { padding: 50, paddingTop: 40 },
  coverDate: { fontSize: 12, color: gray, marginBottom: 20 },
  coverDisclaimer: { fontSize: 8, color: gray, marginTop: 30, lineHeight: 1.4 },
  // Section
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: navy, marginBottom: 12, marginTop: 20 },
  sectionSubtitle: { fontSize: 12, fontWeight: 'bold', color: teal, marginBottom: 8, marginTop: 14 },
  bodyText: { fontSize: 10, color: '#333', lineHeight: 1.5, marginBottom: 8 },
  // KPI
  kpiRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  kpiCard: { flex: 1, backgroundColor: '#f7f9fc', borderRadius: 6, padding: 12, borderLeft: `3px solid ${teal}` },
  kpiLabel: { fontSize: 8, color: gray, marginBottom: 2 },
  kpiValue: { fontSize: 16, fontWeight: 'bold', color: navy },
  kpiUnit: { fontSize: 8, color: gray, marginTop: 2 },
  kpiCardHighlight: { flex: 1, backgroundColor: teal, borderRadius: 6, padding: 12 },
  kpiLabelW: { fontSize: 8, color: '#dff5ef', marginBottom: 2 },
  kpiValueW: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  kpiUnitW: { fontSize: 8, color: '#dff5ef', marginTop: 2 },
  // Table
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: navy, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  tableHeaderCell: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: '#e0e7ed' },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#f7f9fc', borderBottomWidth: 0.5, borderBottomColor: '#e0e7ed' },
  tableCell: { fontSize: 9, color: '#333' },
  tableCellBold: { fontSize: 9, color: navy, fontWeight: 'bold' },
  tableCellGreen: { fontSize: 9, color: teal, fontWeight: 'bold' },
  // Footer
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 7, color: gray },
  footerLogo: { width: 60 },
  // Highlight box
  highlightBox: { backgroundColor: '#edf7f4', borderRadius: 6, padding: 14, marginVertical: 12, borderLeft: `3px solid ${lime}` },
  highlightText: { fontSize: 11, color: navy, fontWeight: 'bold' },
  highlightSub: { fontSize: 9, color: '#555', marginTop: 4 },
});

/* ── Helpers ────────────────────────────────────────────── */

function fmtR(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

function fmtPct(v: number): string {
  return v.toFixed(1) + '%';
}

/* ── PDF Document ───────────────────────────────────────── */

interface PdfProps {
  project: BESSProject;
  sim: BESSSimulationResult;
  logoUrl: string;
}

function ClientProposal({ project, sim, logoUrl }: PdfProps) {
  const eaas = sim.eaasResults;
  const grid = project.gridParams;
  const battery = project.batteryParams;
  const yr1 = sim.monthlyResults.slice(0, 12);
  const grossSavingsYr1 = sim.grossSavingsYr1;
  const savingsPct = sim.totalInvoiceBeforeYr1 > 0 ? (grossSavingsYr1 / sim.totalInvoiceBeforeYr1) * 100 : 0;
  const isSynthetic = project.loadData.method !== 'csv';
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return React.createElement(Document, null,
    // ─── PAGE 1: COVER ───
    React.createElement(Page, { size: 'A4', style: s.coverPage },
      React.createElement(View, { style: s.coverTop },
        React.createElement(Image, { src: logoUrl, style: s.coverLogo }),
        React.createElement(Text, { style: s.coverTitle }, 'ANÁLISE DE VIABILIDADE'),
        React.createElement(Text, { style: s.coverSubtitle }, 'BESS como Serviço (EaaS)'),
        React.createElement(Text, { style: s.coverClient }, project.clientName),
        project.siteAddress ? React.createElement(Text, { style: s.coverAddress }, project.siteAddress) : null,
      ),
      React.createElement(View, { style: s.coverBottom },
        React.createElement(Text, { style: s.coverDate }, today),
        React.createElement(Text, { style: s.bodyText },
          'Este documento apresenta a análise de viabilidade para instalação de um sistema de armazenamento de energia por baterias (BESS) na modalidade Energy-as-a-Service (EaaS). O objetivo é reduzir o custo de energia elétrica do cliente através do deslocamento de consumo do horário de ponta para fora de ponta.'
        ),
        isSynthetic ? React.createElement(View, { style: { backgroundColor: '#fef3cd', padding: 10, borderRadius: 4, marginTop: 10 } },
          React.createElement(Text, { style: { fontSize: 9, color: '#856404', fontWeight: 'bold' } },
            'ATENÇÃO: Curva de carga estimada. Solicite a Memória de Massa ao distribuidor para análise definitiva.'
          ),
        ) : null,
        React.createElement(Text, { style: s.coverDisclaimer },
          'Documento confidencial — preparado exclusivamente para ' + project.clientName + '. Os valores apresentados são estimativas baseadas nas tarifas vigentes e na curva de carga fornecida. Resultados reais podem variar. Helexia Brasil — Energia como Serviço.'
        ),
      ),
    ),

    // ─── PAGE 2: RESUMO EXECUTIVO ───
    React.createElement(Page, { size: 'A4', style: s.page },
      React.createElement(Text, { style: s.sectionTitle }, 'Resumo Executivo'),
      React.createElement(Text, { style: s.bodyText },
        `Com a instalação de um sistema BESS de ${battery.capacityKWh.toLocaleString('pt-BR')} kWh (${(battery.capacityKWh * battery.cRate).toFixed(0)} kW), estimamos uma redução de ${fmtPct(savingsPct)} na fatura de energia elétrica do ${project.clientName}, representando uma economia bruta de ${fmtR(grossSavingsYr1)} por ano.`
      ),
      // KPIs
      React.createElement(View, { style: s.kpiRow },
        kpiCard('Fatura Atual', fmtR(sim.totalInvoiceBeforeYr1), 'por ano'),
        kpiCard('Fatura com BESS', fmtR(sim.totalInvoiceAfterYr1), 'por ano (sem fee)'),
        kpiCardHL('Economia Bruta', fmtR(grossSavingsYr1), fmtPct(savingsPct) + ' redução'),
      ),
      React.createElement(View, { style: s.kpiRow },
        kpiCard('Energia Deslocada', sim.energyShiftedYr1MWh.toFixed(0) + ' MWh', 'por ano'),
        kpiCard('Ciclos/Ano', sim.totalCyclesYr1.toFixed(0), 'ciclos estimados'),
        kpiCard('Capacidade', battery.capacityKWh.toLocaleString('pt-BR') + ' kWh', (battery.capacityKWh * battery.cRate).toFixed(0) + ' kW potência'),
      ),

      // Contract comparison
      React.createElement(Text, { style: s.sectionTitle }, 'Opções de Contrato EaaS'),
      React.createElement(Text, { style: s.bodyText },
        'O BESS é instalado, operado e mantido pela Helexia durante todo o período do contrato. O cliente paga apenas uma mensalidade fixa (corrigida pelo IPCA) e recebe a economia na fatura de energia desde o primeiro mês.'
      ),
      contractTable(eaas, grossSavingsYr1),

      // Highlight best option
      bestOptionBox(eaas, grossSavingsYr1),

      React.createElement(View, { style: s.footer },
        React.createElement(Text, { style: s.footerText }, 'Helexia Brasil — BESS como Serviço'),
        React.createElement(Text, { style: s.footerText }, 'Página 2'),
      ),
    ),

    // ─── PAGE 3: PERFIL ELÉTRICO ───
    React.createElement(Page, { size: 'A4', style: s.page },
      React.createElement(Text, { style: s.sectionTitle }, 'Perfil Elétrico do Cliente'),

      React.createElement(Text, { style: s.sectionSubtitle }, 'Configuração Atual'),
      configTable(project),

      React.createElement(Text, { style: s.sectionSubtitle }, 'Detalhe da Fatura — Média Mensal'),
      invoiceTable(yr1, grid, project.economicParams),

      React.createElement(Text, { style: s.sectionSubtitle }, 'Consumo Mensal'),
      consumptionTable(yr1),

      React.createElement(View, { style: s.footer },
        React.createElement(Text, { style: s.footerText }, 'Helexia Brasil — BESS como Serviço'),
        React.createElement(Text, { style: s.footerText }, 'Página 3'),
      ),
    ),

    // ─── PAGE 4: ECONOMIA DETALHADA ───
    React.createElement(Page, { size: 'A4', style: s.page },
      React.createElement(Text, { style: s.sectionTitle }, 'Economia Detalhada por Contrato'),

      ...eaas.map((e) => clientEconomySection(e, sim, project.economicParams.ipca)),

      React.createElement(Text, { style: s.sectionSubtitle }, 'Premissas'),
      React.createElement(Text, { style: s.bodyText }, `• IPCA: ${(project.economicParams.ipca * 100).toFixed(2)}% a.a.`),
      React.createElement(Text, { style: s.bodyText }, `• Inflação energia: ${(project.economicParams.energyInflation * 100).toFixed(2)}% a.a.`),
      React.createElement(Text, { style: s.bodyText }, `• Período de ponta: ${grid.pontaStart} – ${grid.pontaEnd} (dias úteis, excl. feriados)`),
      React.createElement(Text, { style: s.bodyText }, `• Modalidade: ${grid.modalidade === 'verde' ? 'Verde' : 'Azul'} | Subgrupo: ${grid.subgroup}`),
      React.createElement(Text, { style: s.bodyText }, `• Ano de referência: ${project.economicParams.startYear}`),

      React.createElement(View, { style: s.footer },
        React.createElement(Text, { style: s.footerText }, 'Helexia Brasil — BESS como Serviço'),
        React.createElement(Text, { style: s.footerText }, 'Página 4'),
      ),
    ),

    // ─── PAGE 5: METODOLOGIA ───
    React.createElement(Page, { size: 'A4', style: s.page },
      React.createElement(Text, { style: s.sectionTitle }, 'Metodologia & Condições'),

      React.createElement(Text, { style: s.sectionSubtitle }, 'Como funciona o BESS como Serviço'),
      React.createElement(Text, { style: s.bodyText }, '1. A Helexia instala e mantém o sistema de baterias no site do cliente sem custo de investimento.'),
      React.createElement(Text, { style: s.bodyText }, '2. O BESS carrega durante o horário fora de ponta (tarifa mais barata) e descarrega durante o horário de ponta (tarifa mais cara).'),
      React.createElement(Text, { style: s.bodyText }, '3. O cliente paga uma mensalidade fixa à Helexia, menor que a economia gerada na fatura de energia.'),
      React.createElement(Text, { style: s.bodyText }, '4. A diferença entre a economia e a mensalidade é o benefício líquido para o cliente.'),
      React.createElement(Text, { style: s.bodyText }, '5. A mensalidade é corrigida anualmente pelo IPCA. A economia também cresce com o reajuste tarifário.'),

      React.createElement(Text, { style: s.sectionSubtitle }, 'O que está incluso no contrato'),
      React.createElement(Text, { style: s.bodyText }, '• Equipamento BESS (baterias LFP + inversores + BOS)'),
      React.createElement(Text, { style: s.bodyText }, '• Instalação completa (civil + elétrica + comissionamento)'),
      React.createElement(Text, { style: s.bodyText }, '• Operação e manutenção durante todo o contrato'),
      React.createElement(Text, { style: s.bodyText }, '• Sistema de gestão de energia (EMS) com monitoramento remoto'),
      React.createElement(Text, { style: s.bodyText }, '• Seguro e garantia de performance'),
      React.createElement(Text, { style: s.bodyText }, '• Substituição de componentes degradados (augmentação de capacidade)'),

      React.createElement(Text, { style: s.sectionSubtitle }, 'Condições'),
      React.createElement(Text, { style: s.bodyText }, '• Contrato de locação (EaaS) — sem investimento inicial do cliente.'),
      React.createElement(Text, { style: s.bodyText }, '• Duração: 10, 12 ou 15 anos conforme opção escolhida.'),
      React.createElement(Text, { style: s.bodyText }, '• Reajuste anual da mensalidade pelo IPCA.'),
      React.createElement(Text, { style: s.bodyText }, '• Os valores são estimativas baseadas nas tarifas ANEEL vigentes e na curva de carga fornecida.'),

      isSynthetic ? React.createElement(View, { style: { backgroundColor: '#fef3cd', padding: 10, borderRadius: 4, marginTop: 16 } },
        React.createElement(Text, { style: { fontSize: 9, color: '#856404', fontWeight: 'bold' } },
          'NOTA: Esta análise utiliza uma curva de carga estimada. Para uma proposta definitiva, recomendamos o envio da Memória de Massa (dados de medição horária do distribuidor).'
        ),
      ) : null,

      React.createElement(View, { style: s.footer },
        React.createElement(Text, { style: s.footerText }, 'Helexia Brasil — BESS como Serviço'),
        React.createElement(Text, { style: s.footerText }, 'Página 5'),
      ),
    ),
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function kpiCard(label: string, value: string, unit: string) {
  return React.createElement(View, { style: s.kpiCard },
    React.createElement(Text, { style: s.kpiLabel }, label),
    React.createElement(Text, { style: s.kpiValue }, value),
    React.createElement(Text, { style: s.kpiUnit }, unit),
  );
}

function kpiCardHL(label: string, value: string, unit: string) {
  return React.createElement(View, { style: s.kpiCardHighlight },
    React.createElement(Text, { style: s.kpiLabelW }, label),
    React.createElement(Text, { style: s.kpiValueW }, value),
    React.createElement(Text, { style: s.kpiUnitW }, unit),
  );
}

function contractTable(eaas: EaaSResult[], grossSavings: number) {
  const headerCells = ['', '10 anos', '12 anos', '15 anos'];
  const rows = [
    ['Mensalidade Ano 1', ...eaas.map((e) => fmtR(e.monthlyFeeYr1) + '/mês')],
    ['Mensalidade Ano 5', ...eaas.map((e) => fmtR(e.monthlyFeeYr5) + '/mês')],
    ['Economia bruta anual', ...eaas.map(() => fmtR(grossSavings))],
    ['Economia líquida Ano 1', ...eaas.map((e) => fmtR(e.netSavingsYr1))],
    ['Ratio economia/fee', ...eaas.map((e) => e.grossSavingsVsFeeRatio.toFixed(2) + '×')],
  ];

  return React.createElement(View, { style: s.table },
    React.createElement(View, { style: s.tableHeader },
      ...headerCells.map((c, i) => React.createElement(Text, { key: i, style: { ...s.tableHeaderCell, flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'right' } }, c)),
    ),
    ...rows.map((row, ri) =>
      React.createElement(View, { key: ri, style: ri % 2 === 0 ? s.tableRow : s.tableRowAlt },
        ...row.map((c, ci) => React.createElement(Text, {
          key: ci,
          style: {
            ...(ri === 3 ? s.tableCellGreen : ci === 0 ? s.tableCellBold : s.tableCell),
            flex: ci === 0 ? 2 : 1,
            textAlign: ci === 0 ? 'left' : 'right',
          },
        }, c)),
      ),
    ),
  );
}

function bestOptionBox(eaas: EaaSResult[], grossSavings: number) {
  const best = [...eaas].sort((a, b) => b.netSavingsYr1 - a.netSavingsYr1)[0];
  if (!best || best.netSavingsYr1 <= 0) return null;
  return React.createElement(View, { style: s.highlightBox },
    React.createElement(Text, { style: s.highlightText },
      `Recomendação: Contrato de ${best.contractYears} anos`
    ),
    React.createElement(Text, { style: s.highlightSub },
      `Economia líquida de ${fmtR(best.netSavingsYr1)}/ano no primeiro ano (${fmtPct(grossSavings > 0 ? best.netSavingsYr1 / grossSavings * 100 : 0)} da economia bruta retida pelo cliente). Mensalidade de ${fmtR(best.monthlyFeeYr1)}/mês, corrigida pelo IPCA.`
    ),
  );
}

function configTable(project: BESSProject) {
  const g = project.gridParams;
  const rows = [
    ['Distribuidora', g.distributorId],
    ['Estado', g.state],
    ['Tipo de Cliente', g.clientType === 'cativo' ? 'Mercado Cativo (ACR)' : 'Mercado Livre (ACL)'],
    ['Modalidade', g.modalidade === 'verde' ? 'Verde' : 'Azul'],
    ['Subgrupo', g.subgroup],
    ['Período de Ponta', g.pontaStart + ' – ' + g.pontaEnd],
    ['Demanda Contratada', g.demandaContratadaKW.toLocaleString('pt-BR') + ' kW'],
  ];
  return React.createElement(View, { style: s.table },
    ...rows.map((r, i) => React.createElement(View, { key: i, style: i % 2 === 0 ? s.tableRow : s.tableRowAlt },
      React.createElement(Text, { style: { ...s.tableCellBold, flex: 1 } }, r[0]),
      React.createElement(Text, { style: { ...s.tableCell, flex: 1, textAlign: 'right' } }, r[1]),
    )),
  );
}

function invoiceTable(yr1: import('./types.ts').MonthlyResult[], _grid: import('./types.ts').GridParams, _econ: import('./types.ts').EconomicParams) {
  const n = yr1.length || 1;
  const beforeMonth = yr1.reduce((s, m) => s + m.invoiceBeforeR, 0) / n;
  const afterMonth = yr1.reduce((s, m) => s + m.invoiceAfterR, 0) / n;
  const delta = afterMonth - beforeMonth;

  const rows = [
    ['Fatura média mensal (antes)', fmtR(beforeMonth)],
    ['Fatura média mensal (com BESS)', fmtR(afterMonth)],
    ['Economia média mensal', fmtR(-delta)],
    ['Economia anual estimada', fmtR(-delta * 12)],
  ];

  return React.createElement(View, { style: s.table },
    ...rows.map((r, i) => React.createElement(View, { key: i, style: i % 2 === 0 ? s.tableRow : s.tableRowAlt },
      React.createElement(Text, { style: { ...(i >= 2 ? s.tableCellGreen : s.tableCellBold), flex: 1 } }, r[0]),
      React.createElement(Text, { style: { ...(i >= 2 ? s.tableCellGreen : s.tableCell), flex: 1, textAlign: 'right' } }, r[1]),
    )),
  );
}

function consumptionTable(yr1: import('./types.ts').MonthlyResult[]) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const headerCells = ['Mês', 'Ponta (MWh)', 'Fora Ponta (MWh)', 'Total (MWh)', 'Pico (kW)'];

  return React.createElement(View, { style: s.table },
    React.createElement(View, { style: s.tableHeader },
      ...headerCells.map((c, i) => React.createElement(Text, { key: i, style: { ...s.tableHeaderCell, flex: 1, textAlign: i === 0 ? 'left' : 'right' } }, c)),
    ),
    ...yr1.slice(0, 12).map((m, i) =>
      React.createElement(View, { key: i, style: i % 2 === 0 ? s.tableRow : s.tableRowAlt },
        React.createElement(Text, { style: { ...s.tableCell, flex: 1 } }, months[i]),
        React.createElement(Text, { style: { ...s.tableCell, flex: 1, textAlign: 'right' } }, m.consumoPontaBeforeMWh.toFixed(1)),
        React.createElement(Text, { style: { ...s.tableCell, flex: 1, textAlign: 'right' } }, m.consumoFPBeforeMWh.toFixed(1)),
        React.createElement(Text, { style: { ...s.tableCell, flex: 1, textAlign: 'right' } }, (m.consumoPontaBeforeMWh + m.consumoFPBeforeMWh).toFixed(1)),
        React.createElement(Text, { style: { ...s.tableCell, flex: 1, textAlign: 'right' } }, Math.round(m.demandaMedidaBeforeKW).toLocaleString('pt-BR')),
      ),
    ),
  );
}

function clientEconomySection(eaas: EaaSResult, sim: BESSSimulationResult, ipca: number) {
  const years = eaas.contractYears;
  const rows: string[][] = [];
  let cumSaving = 0;

  for (let y = 0; y < years; y++) {
    const yr = sim.monthlyResults.slice(y * 12, (y + 1) * 12);
    if (yr.length < 12) break;
    const invBefore = yr.reduce((s, m) => s + m.invoiceBeforeR, 0);
    const invAfter = yr.reduce((s, m) => s + m.invoiceAfterR, 0);
    const fee = eaas.monthlyFeeYr1 * 12 * Math.pow(1 + ipca, y);
    const clientCost = invAfter + fee;
    const saving = invBefore - clientCost;
    cumSaving += saving;
    rows.push([
      `Ano ${y + 1}`,
      fmtR(invBefore),
      fmtR(clientCost),
      fmtR(saving),
      fmtR(cumSaving),
    ]);
  }

  const headerCells = ['Ano', 'Sem BESS', 'Com BESS + Fee', 'Economia', 'Acumulado'];

  return React.createElement(View, { key: years, style: { marginBottom: 12 } },
    React.createElement(Text, { style: s.sectionSubtitle }, `Contrato ${years} anos`),
    React.createElement(View, { style: s.table },
      React.createElement(View, { style: s.tableHeader },
        ...headerCells.map((c, i) => React.createElement(Text, { key: i, style: { ...s.tableHeaderCell, flex: i === 0 ? 0.6 : 1, textAlign: i === 0 ? 'left' : 'right' } }, c)),
      ),
      ...rows.map((row, ri) =>
        React.createElement(View, { key: ri, style: ri % 2 === 0 ? s.tableRow : s.tableRowAlt },
          ...row.map((c, ci) => React.createElement(Text, {
            key: ci,
            style: {
              ...(ci >= 3 ? s.tableCellGreen : ci === 0 ? s.tableCellBold : s.tableCell),
              flex: ci === 0 ? 0.6 : 1,
              textAlign: ci === 0 ? 'left' : 'right',
            },
          }, c)),
        ),
      ),
    ),
  );
}

/* ── Export function ─────────────────────────────────────── */

export async function generateClientPDF(
  project: BESSProject,
  sim: BESSSimulationResult,
): Promise<void> {
  // Use the white logo on navy background for the cover
  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}helexia-logo.png`;

  const doc = React.createElement(ClientProposal, { project, sim, logoUrl }) as React.ReactElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(doc as any).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Proposta_BESS_${project.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
