// src/components/inputs/GridParamsForm.tsx
import { useState, useCallback } from 'react';
import type { GridParams, ClientType, Incentivo, Subgroup, Modalidade } from '../../engine/types.ts';
import { STATES, STATE_NAMES, getDistributorsByState, getDistributorById } from '../../data/distributors.ts';
import { fetchGrupoATariffs, isTariffStale, clearTariffCache } from '../../data/aneelService.ts';
import CurrencyInput from '../shared/CurrencyInput.tsx';
import Toggle from '../shared/Toggle.tsx';

interface Props {
  params: GridParams;
  onChange: (updates: Partial<GridParams>) => void;
  onIcmsChange: (icms: number) => void;
}

const SUBGROUPS: Subgroup[] = ['A1', 'A2', 'A3', 'A3a', 'A4', 'AS'];

export default function GridParamsForm({ params, onChange, onIcmsChange }: Props) {
  const [fetching, setFetching] = useState(false);
  const [tariffWarnings, setTariffWarnings] = useState<string[]>([]);
  const staleWarning = params.distributorId && params.subgroup
    ? isTariffStale(params.distributorId, params.subgroup)
    : false;

  const distributors = params.state ? getDistributorsByState(params.state) : [];

  const handleStateChange = useCallback((state: string) => {
    const dists = getDistributorsByState(state);
    const first = dists[0];
    onChange({
      state,
      distributorId: first?.id ?? '',
      pontaStart: first?.pontaStart ?? '18:00',
      pontaEnd: first?.pontaEnd ?? '21:00',
    });
    if (first) {
      onIcmsChange(first.icmsElectricity);
    }
  }, [onChange, onIcmsChange]);

  const handleDistributorChange = useCallback((distId: string) => {
    const dist = getDistributorById(distId);
    onChange({
      distributorId: distId,
      pontaStart: dist?.pontaStart ?? '18:00',
      pontaEnd: dist?.pontaEnd ?? '21:00',
    });
    if (dist) {
      onIcmsChange(dist.icmsElectricity);
    }
  }, [onChange, onIcmsChange]);

  async function handleFetchTariffs() {
    if (!params.distributorId || !params.subgroup) return;
    setFetching(true);
    setTariffWarnings([]);
    // Clear stale cache to force fresh fetch
    clearTariffCache();
    try {
      const t = await fetchGrupoATariffs(params.distributorId, params.subgroup);
      onChange({
        tusdDemandaRkW: t.verde_TUSD_Demanda || params.tusdDemandaRkW,
        tusdPontaRMWh: t.verde_TUSD_Ponta || params.tusdPontaRMWh,
        tusdFPRMWh: t.verde_TUSD_FP || params.tusdFPRMWh,
        tePontaRMWh: t.verde_TE_Ponta || params.tePontaRMWh,
        teFPRMWh: t.verde_TE_FP || params.teFPRMWh,
        azulDemPontaRkW: t.azul_TUSD_Dem_Ponta || params.azulDemPontaRkW,
        azulDemFPRkW: t.azul_TUSD_Dem_FP || params.azulDemFPRkW,
      });
      if (t.warnings.length > 0) setTariffWarnings(t.warnings);
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Distributor selection */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Distribuidora</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Estado */}
          <div>
            <label className="mb-1 block text-sm text-[#6692A8]">Estado</label>
            <select
              value={params.state}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white focus:border-[#2F927B] focus:outline-none"
            >
              <option value="">Selecione</option>
              {STATES.map((uf) => (
                <option key={uf} value={uf}>{uf} — {STATE_NAMES[uf] ?? uf}</option>
              ))}
            </select>
          </div>

          {/* Distribuidora */}
          <div>
            <label className="mb-1 block text-sm text-[#6692A8]">Distribuidora</label>
            <select
              value={params.distributorId}
              onChange={(e) => handleDistributorChange(e.target.value)}
              className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white focus:border-[#2F927B] focus:outline-none"
              disabled={!params.state}
            >
              <option value="">Selecione</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Cliente */}
          <div>
            <label className="mb-1 block text-sm text-[#6692A8]">Tipo de Cliente</label>
            <select
              value={params.clientType}
              onChange={(e) => onChange({ clientType: e.target.value as ClientType })}
              className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white focus:border-[#2F927B] focus:outline-none"
            >
              <option value="cativo">Cativo (ACR)</option>
              <option value="livre">Livre (ACL)</option>
            </select>
          </div>

          {/* Incentivo (only for Livre) */}
          {params.clientType === 'livre' && (
            <div>
              <label className="mb-1 block text-sm text-[#6692A8]">Incentivo</label>
              <select
                value={params.incentivo}
                onChange={(e) => onChange({ incentivo: e.target.value as Incentivo })}
                className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white focus:border-[#2F927B] focus:outline-none"
              >
                <option value="nenhum">Nenhum</option>
                <option value="I50">I50 (50% desconto TUSD)</option>
                <option value="I100">I100 (100% desconto TUSD)</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Grupo */}
          <div>
            <label className="mb-1 block text-sm text-[#6692A8]">Subgrupo</label>
            <select
              value={params.subgroup}
              onChange={(e) => onChange({ subgroup: e.target.value as Subgroup })}
              className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white focus:border-[#2F927B] focus:outline-none"
            >
              {SUBGROUPS.map((sg) => (
                <option key={sg} value={sg}>{sg}</option>
              ))}
            </select>
          </div>

          {/* Modalidade */}
          <div>
            <label className="mb-1 block text-sm text-[#6692A8]">Modalidade</label>
            <select
              value={params.modalidade}
              onChange={(e) => onChange({ modalidade: e.target.value as Modalidade })}
              className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white focus:border-[#2F927B] focus:outline-none"
            >
              <option value="verde">Verde</option>
              <option value="azul">Azul</option>
            </select>
          </div>

          {/* Ponta period */}
          <div>
            <label className="mb-1 block text-sm text-[#6692A8]">Ponta início</label>
            <input
              type="time"
              value={params.pontaStart}
              onChange={(e) => onChange({ pontaStart: e.target.value })}
              className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white focus:border-[#2F927B] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6692A8]">Ponta fim</label>
            <input
              type="time"
              value={params.pontaEnd}
              onChange={(e) => onChange({ pontaEnd: e.target.value })}
              className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white focus:border-[#2F927B] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Demands */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Demandas</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <CurrencyInput label="Demanda contratada" value={params.demandaContratadaKW} onChange={(v) => onChange({ demandaContratadaKW: v })} unit="kW" />
          {params.modalidade === 'azul' && (
            <>
              <CurrencyInput label="Demanda contratada Ponta" value={params.demandaContratadaPontaKW} onChange={(v) => onChange({ demandaContratadaPontaKW: v })} unit="kW" />
              <CurrencyInput label="Demanda contratada FP" value={params.demandaContratadaFPKW} onChange={(v) => onChange({ demandaContratadaFPKW: v })} unit="kW" />
            </>
          )}
        </div>
      </div>

      {/* Tariffs */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Tarifas da Distribuidora</h3>
          <button
            type="button"
            onClick={handleFetchTariffs}
            disabled={fetching || !params.distributorId}
            className="rounded-lg bg-[#2F927B] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2F927B]/80 disabled:opacity-50 transition-colors"
          >
            {fetching ? 'Buscando...' : 'Buscar ANEEL'}
          </button>
        </div>

        {staleWarning && (
          <div className="mb-3 rounded-lg border border-[#f97316]/30 bg-[#f97316]/10 p-2 text-sm text-[#f97316]">
            Tarifas com mais de 180 dias. Recomendado atualizar via ANEEL.
          </div>
        )}

        {tariffWarnings.length > 0 && (
          <div className="mb-3 rounded-lg border border-[#f97316]/30 bg-[#f97316]/10 p-2 text-sm text-[#f97316]">
            {tariffWarnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <CurrencyInput label="TUSD Demanda" value={params.tusdDemandaRkW} onChange={(v) => onChange({ tusdDemandaRkW: v })} unit="R$/kW" step={0.01} />
          <CurrencyInput label="TUSD Ponta" value={params.tusdPontaRMWh} onChange={(v) => onChange({ tusdPontaRMWh: v })} unit="R$/MWh" step={0.01} />
          <CurrencyInput label="TUSD Fora-ponta" value={params.tusdFPRMWh} onChange={(v) => onChange({ tusdFPRMWh: v })} unit="R$/MWh" step={0.01} />
          {params.clientType === 'cativo' && (
            <>
              <CurrencyInput label="TE Ponta" value={params.tePontaRMWh} onChange={(v) => onChange({ tePontaRMWh: v })} unit="R$/MWh" step={0.01} />
              <CurrencyInput label="TE Fora-ponta" value={params.teFPRMWh} onChange={(v) => onChange({ teFPRMWh: v })} unit="R$/MWh" step={0.01} />
            </>
          )}
          {params.modalidade === 'azul' && (
            <>
              <CurrencyInput label="Azul Demanda Ponta" value={params.azulDemPontaRkW} onChange={(v) => onChange({ azulDemPontaRkW: v })} unit="R$/kW" step={0.01} />
              <CurrencyInput label="Azul Demanda FP" value={params.azulDemFPRkW} onChange={(v) => onChange({ azulDemFPRkW: v })} unit="R$/kW" step={0.01} />
            </>
          )}
        </div>

        <div className="mt-4">
          <CurrencyInput label="COSIP" value={params.cosipR} onChange={(v) => onChange({ cosipR: v })} unit="R$/mês" className="max-w-xs" />
        </div>
      </div>

      {/* Tax toggles */}
      <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Impostos e Isenções</h3>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-[#6692A8]">O ICMS incide sobre a demanda</label>
          <select
            value={params.icmsOnDemand}
            onChange={(e) => onChange({ icmsOnDemand: e.target.value as 'contratada' | 'medida' })}
            className="w-full max-w-xs rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 text-white focus:border-[#2F927B] focus:outline-none"
          >
            <option value="contratada">Contratada (padrão)</option>
            <option value="medida">Medida (cliente possui liminar judicial)</option>
          </select>
        </div>

        <div className="space-y-3">
          <Toggle label="Cliente isento/compensa ICMS" checked={params.clienteIsentoICMS} onChange={(v) => onChange({ clienteIsentoICMS: v })} />
          <Toggle label="Descontos do mercado livre incidem sobre ICMS da TUSD?" checked={params.descontoLivreIncideICMS} onChange={(v) => onChange({ descontoLivreIncideICMS: v })} />
          <Toggle label="Cliente isento/compensa PIS/Cofins" checked={params.clienteIsentoPISCOFINS} onChange={(v) => onChange({ clienteIsentoPISCOFINS: v })} />
          <Toggle label="Descontos do mercado livre incidem sobre PIS/COFINS da TUSD?" checked={params.descontoLivreIncidePISCOFINS} onChange={(v) => onChange({ descontoLivreIncidePISCOFINS: v })} />
        </div>
      </div>

      {/* ACL energy (only for Livre) */}
      {params.clientType === 'livre' && (
        <div className="rounded-xl border border-[#2F927B]/20 bg-[#243447] p-5">
          <h3 className="mb-4 text-base font-semibold text-white">Energia Contratada Mercado Livre</h3>
          <Toggle
            label="Mesmo preço ao longo dos anos"
            checked={params.aclSamePrice}
            onChange={(v) => onChange({ aclSamePrice: v })}
          />
          {params.aclSamePrice ? (
            <CurrencyInput
              label="Energia contratada mercado livre"
              value={params.aclEnergyPriceRMWh}
              onChange={(v) => onChange({ aclEnergyPriceRMWh: v })}
              unit="R$/MWh"
              className="mt-4 max-w-xs"
            />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr>
                    {params.aclEnergyPriceTable.map((_, y) => (
                      <th key={y} className="px-1 py-1 text-center text-xs text-[#6692A8]">Ano {y + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {params.aclEnergyPriceTable.map((v, y) => (
                      <td key={y} className="px-1 py-1">
                        <input
                          type="number"
                          value={v || ''}
                          onChange={(e) => {
                            const next = [...params.aclEnergyPriceTable];
                            next[y] = parseFloat(e.target.value) || 0;
                            onChange({ aclEnergyPriceTable: next });
                          }}
                          className="w-20 rounded border border-[#6692A8]/50 bg-[#1A2332] px-1 py-1 text-center text-white focus:border-[#2F927B] focus:outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
