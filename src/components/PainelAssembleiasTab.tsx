import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Calendar,
  RefreshCw,
  Search,
  TrendingDown,
  Users,
  Zap,
} from 'lucide-react';
import assembleiasSeedRaw from '../data/assembleiasSeed.json';
import { AssembleiaRecord, ConsorcioItem } from '../types';
import { formatPercent } from '../utils/calculations';

const initialAssembleias = assembleiasSeedRaw as Record<string, AssembleiaRecord[]>;

interface PainelAssembleiasTabProps {
  items: ConsorcioItem[];
  initialGroup?: string;
  onSimulateGroup: (item: ConsorcioItem, suggestedBidPerc: number) => void;
}

export const PainelAssembleiasTab: React.FC<PainelAssembleiasTabProps> = ({
  items,
  initialGroup,
  onSimulateGroup,
}) => {
  const [assembleiasMap, setAssembleiasMap] =
    useState<Record<string, AssembleiaRecord[]>>(initialAssembleias);
  const [segmentFilter, setSegmentFilter] = useState<string>('TODOS');
  const [searchGroup, setSearchGroup] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>(
    initialGroup || Object.keys(initialAssembleias)[0] || '001583'
  );
  const [loadingLive, setLoadingLive] = useState<boolean>(false);
  const [liveStatus, setLiveStatus] = useState<string>('');

  useEffect(() => {
    if (initialGroup && initialGroup !== '000000') {
      setSelectedGroup(initialGroup);
    }
  }, [initialGroup]);

  // Metadados de cada grupo único a partir de items
  const groupsCatalog = useMemo(() => {
    const map = new Map<
      string,
      {
        grupo: string;
        segmento: string;
        modalidade: string;
        prazo: number;
        vagas: number;
        bemDescricao: string;
        percMinContemp: number;
        sampleItem: ConsorcioItem;
      }
    >();
    for (const it of items) {
      if (it.grupo === '000000') continue;
      if (!map.has(it.grupo)) {
        map.set(it.grupo, {
          grupo: it.grupo,
          segmento: it.segmento,
          modalidade: it.modalidade,
          prazo: it.prazo,
          vagas: it.vagas,
          bemDescricao: it.bemDescricao,
          percMinContemp: it.percMinContemp,
          sampleItem: it,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.grupo.localeCompare(b.grupo));
  }, [items]);

  const filteredGroups = useMemo(() => {
    return groupsCatalog.filter((g) => {
      if (segmentFilter !== 'TODOS' && g.segmento !== segmentFilter) return false;
      if (searchGroup.trim()) {
        const q = searchGroup.trim().toLowerCase();
        return (
          g.grupo.toLowerCase().includes(q) ||
          g.bemDescricao.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [groupsCatalog, segmentFilter, searchGroup]);

  const currentGroupMeta = useMemo(
    () => groupsCatalog.find((g) => g.grupo === selectedGroup) || null,
    [groupsCatalog, selectedGroup]
  );

  const currentHistory = useMemo(
    () => assembleiasMap[selectedGroup] || [],
    [assembleiasMap, selectedGroup]
  );

  const stats = useMemo(() => {
    if (currentHistory.length === 0) {
      return {
        totalContemplados: 0,
        menorLanceAbsoluto: 0,
        mediaMenorLance: 0,
        maiorLanceAbsoluto: 0,
      };
    }
    const totalContemplados = currentHistory.reduce((acc, r) => acc + r.qtdContemplados, 0);
    const validMenores = currentHistory.filter((r) => r.menorLance > 0).map((r) => r.menorLance);
    const menorLanceAbsoluto = validMenores.length > 0 ? Math.min(...validMenores) : 0;
    const mediaMenorLance =
      validMenores.length > 0
        ? validMenores.reduce((a, b) => a + b, 0) / validMenores.length
        : 0;
    const maiorLanceAbsoluto = Math.max(...currentHistory.map((r) => r.maiorLance), 0);

    return {
      totalContemplados,
      menorLanceAbsoluto,
      mediaMenorLance,
      maiorLanceAbsoluto,
    };
  }, [currentHistory]);

  const handleQueryLivePortal = async (grp: string) => {
    setLoadingLive(true);
    setLiveStatus(`Consultando grupo ${grp} ao vivo no Portal Parceiros BB...`);
    try {
      const resp = await fetch(`/api/assembleia?grupo=${encodeURIComponent(grp)}`);
      const data = await resp.json();
      if (data.ok && Array.isArray(data.items)) {
        setAssembleiasMap((prev) => ({ ...prev, [grp]: data.items }));
        setLiveStatus(`✓ Histórico atualizado ao vivo (${data.items.length} assembleias)`);
      } else {
        setLiveStatus(`Aviso: ${data.error || 'Sem novos registros'}`);
      }
    } catch {
      setLiveStatus('Exibindo histórico sincronizado localmente.');
    } finally {
      setLoadingLive(false);
      setTimeout(() => setLiveStatus(''), 5000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Painel de Resultados de Assembleias */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-bb-blue" />
            Painel Oficial de Resultados de Assembleias e Lances Vencedores (BB Consórcios)
          </h2>
          <p className="text-xs text-slate-500">
            Consulte quantas cotas foram contempladas por mês, o menor e o maior lance vencedor de cada assembleia e simule com o lance certeiro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {liveStatus && (
            <span className="text-xs bg-blue-50 text-bb-blue px-3 py-1.5 rounded-lg font-semibold">
              {liveStatus}
            </span>
          )}
          <button
            onClick={() => handleQueryLivePortal(selectedGroup)}
            disabled={loadingLive}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold bg-bb-blue hover:bg-bb-dark text-white transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
            {loadingLive ? 'Consultando BB...' : `Atualizar Grupo ${selectedGroup} ao Vivo`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Coluna Esquerda: Lista de Grupos */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[620px]">
          <div className="space-y-2.5 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'TC', label: '🚜 Agro/TC' },
                { id: 'IM', label: '🏠 Imóvel' },
                { id: 'AU', label: '🚗 Auto FIPE' },
                { id: 'AI', label: '🚙 Auto IPCA' },
                { id: 'EE', label: '☀️ Solar' },
                { id: 'MO', label: '🏍️ Motos' },
              ].map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setSegmentFilter(seg.id)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                    segmentFilter === seg.id
                      ? 'bg-bb-blue text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchGroup}
                onChange={(e) => setSearchGroup(e.target.value)}
                placeholder="Buscar grupo (ex: 1583, 1122, Trator)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mt-2 pr-1">
            {filteredGroups.map((g) => {
              const hist = assembleiasMap[g.grupo] || [];
              const totalContemp = hist.reduce((a, b) => a + b.qtdContemplados, 0);
              const isSelected = g.grupo === selectedGroup;
              return (
                <button
                  key={g.grupo}
                  onClick={() => setSelectedGroup(g.grupo)}
                  className={`w-full text-left p-2.5 rounded-lg transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-bb-blue text-white shadow-sm'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-xs">Grupo {g.grupo}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isSelected
                            ? 'bg-bb-yellow text-bb-dark'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {g.segmento} • {g.prazo}m
                      </span>
                    </div>
                    <div
                      className={`text-[11px] truncate mt-0.5 ${
                        isSelected ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      {g.bemDescricao}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-extrabold ${
                        isSelected ? 'text-bb-yellow' : 'text-emerald-700'
                      }`}
                    >
                      Mín: {formatPercent(g.percMinContemp, 1)}
                    </div>
                    <div
                      className={`text-[10px] ${
                        isSelected ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {totalContemp > 0 ? `${totalContemp} contemp.` : `${hist.length} assemb.`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Detalhes, Gráfico e Histórico de Assembleias do Grupo */}
        <div className="lg:col-span-8 space-y-4">
          {/* Card Principal do Grupo Selecionado */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-bb-blue text-white font-mono font-extrabold text-sm">
                    GRUPO {selectedGroup}
                  </span>
                  {currentGroupMeta && (
                    <span className="text-xs font-bold text-slate-700">
                      {currentGroupMeta.bemDescricao} ({currentGroupMeta.prazo} meses •{' '}
                      {currentGroupMeta.vagas} vagas)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Histórico oficial extraído do Portal Parceiros BB Consórcios (`frmResultadoAssembleia.aspx`)
                </p>
              </div>

              {currentGroupMeta && (
                <button
                  onClick={() =>
                    onSimulateGroup(
                      currentGroupMeta.sampleItem,
                      Number(
                        (stats.mediaMenorLance > 0
                          ? stats.mediaMenorLance
                          : currentGroupMeta.percMinContemp
                        ).toFixed(2)
                      )
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold bg-bb-yellow hover:bg-bb-yellowHover text-bb-dark shadow transition"
                >
                  <Zap className="w-4 h-4" />
                  Simular Neste Grupo c/ Lance Médio ({formatPercent(
                    stats.mediaMenorLance || currentGroupMeta.percMinContemp,
                    1
                  )})
                </button>
              )}
            </div>

            {/* 4 KPIs do Grupo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-bb-blue" /> Total Contemplados
                </div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {stats.totalContemplados} cotas
                </div>
                <div className="text-[10px] text-slate-400">
                  Nas últimas {currentHistory.length} assembleias
                </div>
              </div>

              <div className="bg-emerald-50/70 rounded-lg p-3 border border-emerald-200">
                <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Menor Lance Vencedor
                </div>
                <div className="text-xl font-extrabold text-emerald-700 mt-1">
                  {formatPercent(stats.menorLanceAbsoluto, 2)}
                </div>
                <div className="text-[10px] text-emerald-700">Mínimo registrado no período</div>
              </div>

              <div className="bg-blue-50/70 rounded-lg p-3 border border-blue-200">
                <div className="text-[11px] text-bb-blue font-semibold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Média do Lance Mínimo
                </div>
                <div className="text-xl font-extrabold text-bb-blue mt-1">
                  {formatPercent(stats.mediaMenorLance, 2)}
                </div>
                <div className="text-[10px] text-slate-500">Referência ideal para contemplar</div>
              </div>

              <div className="bg-amber-50/70 rounded-lg p-3 border border-amber-200">
                <div className="text-[11px] text-amber-900 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Maior Lance Ofertado
                </div>
                <div className="text-xl font-extrabold text-amber-800 mt-1">
                  {formatPercent(stats.maiorLanceAbsoluto, 2)}
                </div>
                <div className="text-[10px] text-amber-800">Teto registrado no grupo</div>
              </div>
            </div>

            {/* Gráfico Visual de Barras da Evolução dos Lances */}
            {currentHistory.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-3">
                  Evolução Mensal do Menor Lance Vencedor (%) x Qtd. de Contemplados
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 items-end pt-2">
                  {currentHistory.slice(-12).map((row, idx) => {
                    const heightPct = Math.max(15, Math.min(100, row.menorLance));
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex flex-col items-center text-center"
                      >
                        <div className="text-[10px] font-bold text-slate-500">
                          Assemb. #{row.assembleia}
                        </div>
                        <div className="text-[10px] text-slate-400 mb-2">{row.data}</div>
                        <div className="w-full h-20 bg-slate-200/70 rounded flex items-end justify-center p-1">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full bg-bb-blue rounded-t transition-all"
                          />
                        </div>
                        <div className="text-xs font-extrabold text-bb-blue mt-1.5">
                          {formatPercent(row.menorLance, 2)}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-700">
                          {row.qtdContemplados} contemp.
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tabela Completa de Assembleias do Grupo */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
              Detalhamento por Assembleia — Grupo {selectedGroup}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Cód. Grupo</th>
                    <th className="py-2.5 px-3">Nº Assembleia</th>
                    <th className="py-2.5 px-3">Data da Assembleia</th>
                    <th className="py-2.5 px-3 text-center">Qtd. Cotas Contempladas</th>
                    <th className="py-2.5 px-3 text-right">Menor Lance Vencedor (%)</th>
                    <th className="py-2.5 px-3 text-right">Maior Lance Vencedor (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentHistory.map((r, i) => (
                    <tr key={i} className="hover:bg-blue-50/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.grupo}</td>
                      <td className="py-2.5 px-3 font-semibold">Assembleia #{r.assembleia}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.data}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          {r.qtdContemplados} contemplados
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-bb-blue">
                        {formatPercent(r.menorLance, 4)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                        {formatPercent(r.maiorLance, 4)}
                      </td>
                    </tr>
                  ))}
                  {currentHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma assembleia registrada para este grupo ainda (Grupo em formação ou recém-iniciado). Clique em &ldquo;Atualizar Grupo ao Vivo&rdquo; acima para consultar no BB.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
