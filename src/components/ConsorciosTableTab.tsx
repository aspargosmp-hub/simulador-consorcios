import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Download,
  Filter,
  Layers,
  Search,
  Sparkles,
  Square,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { CodigoModalidade, ConsorcioItem } from '../types';
import { formatBRL, formatPercent, MODALIDADES_LIST } from '../utils/calculations';

interface ConsorciosTableTabProps {
  items: ConsorcioItem[];
  selectedModality: CodigoModalidade | 'TODOS';
  onSelectModality: (mod: CodigoModalidade | 'TODOS') => void;
  selectedIds: number[];
  onToggleSelectId: (id: number) => void;
  onClearSelection: () => void;
  onSimulateSelected: (items: ConsorcioItem[]) => void;
  onOpenAssembleiaGroup?: (grupo: string) => void;
}

const SMART_TAGS = [
  'Todos',
  'Lance Embutido',
  'Lance Fixo 20%',
  'Tabela Especial 240m (93)',
  'Trator / Implemento',
  'Irrigação',
  'Rebanho e Genética',
  'Energia Solar / Sustentáveis',
  'Aceita FGTS',
  'Sem FGTS',
  'Grupo em Formação',
];

export const ConsorciosTableTab: React.FC<ConsorciosTableTabProps> = ({
  items,
  selectedModality,
  onSelectModality,
  selectedIds,
  onToggleSelectId,
  onClearSelection,
  onSimulateSelected,
  onOpenAssembleiaGroup,
}) => {
  const [activeTag, setActiveTag] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [grupoFilter, setGrupoFilter] = useState<string>('');
  const [minValor, setMinValor] = useState<string>('');
  const [maxValor, setMaxValor] = useState<string>('');
  const [maxPrazo, setMaxPrazo] = useState<string>('');
  const [maxParcela, setMaxParcela] = useState<string>('');
  const [sortBy, setSortBy] = useState<'valorBem' | 'parcela' | 'prazo' | 'percMinContemp' | 'grupo'>('valorBem');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (selectedModality !== 'TODOS' && item.codigoModalidade !== selectedModality) {
          return false;
        }
        if (activeTag !== 'Todos' && !item.tags.includes(activeTag)) {
          return false;
        }
        if (grupoFilter.trim() && !item.grupo.toLowerCase().includes(grupoFilter.trim().toLowerCase())) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const match =
            item.bemDescricao.toLowerCase().includes(q) ||
            item.bemCodigo.toLowerCase().includes(q) ||
            item.grupo.toLowerCase().includes(q) ||
            item.modalidade.toLowerCase().includes(q);
          if (!match) return false;
        }
        if (minValor && item.valorBem < Number(minValor)) return false;
        if (maxValor && item.valorBem > Number(maxValor)) return false;
        if (maxPrazo && item.prazo > Number(maxPrazo)) return false;
        if (maxParcela && item.parcela > Number(maxParcela)) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sortAsc ? 1 : -1;
        if (sortBy === 'grupo') return a.grupo.localeCompare(b.grupo) * dir;
        return (a[sortBy] - b[sortBy]) * dir;
      });
  }, [
    items,
    selectedModality,
    activeTag,
    grupoFilter,
    searchQuery,
    minValor,
    maxValor,
    maxPrazo,
    maxParcela,
    sortBy,
    sortAsc,
  ]);

  const selectedItemsObjects = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds]
  );

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Modalidade',
      'Plano',
      'Grupo',
      'Prazo',
      'Vagas',
      'Cod_Bem',
      'Descricao_Bem_Regra',
      'Taxa_Adm_%',
      'Fundo_Reserva_%',
      'Seguro_%',
      'Valor_Bem_R$',
      'Parcela_R$',
      'Assembleia',
      'Vencimento',
      'Lance_Min_Contemp_%',
    ];
    const rows = filteredItems.map((it) => [
      it.codigoModalidade,
      it.plano,
      it.grupo,
      it.prazo,
      it.vagas,
      it.bemCodigo,
      `"${it.bemDescricao}"`,
      it.taxaAdm.toFixed(2),
      it.fundoReserva.toFixed(2),
      it.seguro.toFixed(2),
      it.valorBem.toFixed(2),
      it.parcela.toFixed(2),
      it.assembleia,
      it.vencimento,
      it.percMinContemp.toFixed(4),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `grupos_bb_${selectedModality}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Modalidades Master & Flex */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-bb-blue" />
              Modalidades e Planos (Master &amp; Flex — BB Consórcios)
            </h2>
            <p className="text-xs text-slate-500">
              Selecione o segmento abaixo. Os planos <strong>Flex (3)</strong> possuem redução de 2,0% na Taxa de Administração em relação ao <strong>Master (4)</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV ({filteredItems.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <button
            onClick={() => onSelectModality('TODOS')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left transition ${
              selectedModality === 'TODOS'
                ? 'bg-bb-blue text-white border-bb-blue shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="font-bold">Todas (12)</div>
            <div className="text-[11px] opacity-80">{items.length} planos</div>
          </button>

          {MODALIDADES_LIST.map((m) => {
            const count = items.filter((i) => i.codigoModalidade === m.code).length;
            const active = selectedModality === m.code;
            return (
              <button
                key={m.code}
                onClick={() => onSelectModality(m.code)}
                className={`px-3 py-2 rounded-lg text-xs border text-left transition ${
                  active
                    ? 'bg-bb-blue text-white border-bb-blue shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-bb-blue/50 hover:bg-blue-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{m.code}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      active
                        ? 'bg-bb-yellow text-bb-dark'
                        : m.plano === 'Flex'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {m.plano}
                  </span>
                </div>
                <div className="truncate text-[11px] mt-0.5 opacity-90">{m.shortLabel}</div>
                <div className="text-[10px] opacity-75">{count} cotas</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros Inteligentes por Regras do Bem (Extraídos do Portal Parceiros BB) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Filtro Rápido por Regra / Bem do BB:
          </span>
          {SMART_TAGS.map((tag) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                  isActive
                    ? 'bg-bb-yellow text-bb-dark font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Barra de Filtros Numéricos e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar bem (ex: Trator, Irrigação, Embutido, Onix)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-bb-blue focus:outline-none"
            />
          </div>
          <div>
            <input
              type="text"
              value={grupoFilter}
              onChange={(e) => setGrupoFilter(e.target.value)}
              placeholder="Filtrar Grupo (ex: 1583)"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-bb-blue focus:outline-none"
            />
          </div>
          <div>
            <input
              type="number"
              value={minValor}
              onChange={(e) => setMinValor(e.target.value)}
              placeholder="Crédito Mín. (R$)"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-bb-blue focus:outline-none"
            />
          </div>
          <div>
            <input
              type="number"
              value={maxValor}
              onChange={(e) => setMaxValor(e.target.value)}
              placeholder="Crédito Máx. (R$)"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-bb-blue focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={maxPrazo}
              onChange={(e) => setMaxPrazo(e.target.value)}
              placeholder="Prazo Máx."
              className="w-1/2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-bb-blue focus:outline-none"
            />
            <input
              type="number"
              value={maxParcela}
              onChange={(e) => setMaxParcela(e.target.value)}
              placeholder="Parc. Máx."
              className="w-1/2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-bb-blue focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Barra Flutuante de Cotas Selecionadas para Simulação */}
      {selectedIds.length > 0 && (
        <div className="bg-bb-dark text-white rounded-xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-bb-yellow text-bb-dark text-xs font-extrabold px-2.5 py-1 rounded-md">
              {selectedIds.length} / 4 selecionadas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedItemsObjects.map((it) => (
                <span
                  key={it.id}
                  className="text-xs bg-white/10 px-2.5 py-1 rounded-md flex items-center gap-1.5"
                >
                  <strong>G.{it.grupo}</strong> ({it.codigoModalidade}) — {formatBRL(it.valorBem)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearSelection}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition"
            >
              Limpar
            </button>
            <button
              onClick={() => onSimulateSelected(selectedItemsObjects)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-extrabold bg-bb-yellow hover:bg-bb-yellowHover text-bb-dark shadow transition"
            >
              <Zap className="w-4 h-4" />
              Simular Propostas Selecionadas
            </button>
          </div>
        </div>
      )}

      {/* Tabela de Grupos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Exibindo <strong>{filteredItems.length}</strong> planos ativos (clique em até 4 planos para comparar lado a lado no Simulador)
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Filter className="w-3.5 h-3.5" /> Clique no cabeçalho para ordenar
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">Simular</th>
                <th className="py-2.5 px-2.5">Mod.</th>
                <th
                  className="py-2.5 px-2.5 cursor-pointer hover:text-bb-blue"
                  onClick={() => handleSort('grupo')}
                >
                  Grupo {sortBy === 'grupo' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th
                  className="py-2.5 px-2.5 cursor-pointer hover:text-bb-blue"
                  onClick={() => handleSort('prazo')}
                >
                  Prazo {sortBy === 'prazo' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="py-2.5 px-2.5">Vagas</th>
                <th className="py-2.5 px-3">Bem Referência / Regra BB</th>
                <th
                  className="py-2.5 px-2.5 text-right cursor-pointer hover:text-bb-blue"
                  onClick={() => handleSort('valorBem')}
                >
                  Valor do Crédito {sortBy === 'valorBem' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th
                  className="py-2.5 px-2.5 text-right cursor-pointer hover:text-bb-blue"
                  onClick={() => handleSort('parcela')}
                >
                  Parcela {sortBy === 'parcela' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="py-2.5 px-2.5 text-right">Taxa Adm</th>
                <th className="py-2.5 px-2.5 text-right">F. Res.</th>
                <th className="py-2.5 px-2.5 text-center">Assembleia</th>
                <th
                  className="py-2.5 px-2.5 text-right cursor-pointer hover:text-bb-blue"
                  onClick={() => handleSort('percMinContemp')}
                >
                  Lance Mín. 12m {sortBy === 'percMinContemp' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="py-2.5 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((it) => {
                const isSelected = selectedIds.includes(it.id);
                const hasEmbutido = it.tags.includes('Lance Embutido');
                const hasFixo20 = it.tags.includes('Lance Fixo 20%');
                return (
                  <tr
                    key={it.id}
                    className={`hover:bg-blue-50/50 transition ${
                      isSelected ? 'bg-blue-50/80 font-medium' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => onToggleSelectId(it.id)}
                        className="text-bb-blue hover:scale-110 transition"
                        title="Selecionar para simular"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-bb-blue fill-blue-100" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="py-2 px-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          it.plano === 'Flex'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-bb-blue'
                        }`}
                      >
                        {it.codigoModalidade}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-800">{it.grupo}</td>
                    <td className="py-2 px-2.5">{it.prazo}m</td>
                    <td className="py-2 px-2.5">
                      {it.vagas === 0 ? (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                          Formação
                        </span>
                      ) : (
                        <span className="font-mono text-slate-600">{it.vagas}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span>{it.bemDescricao}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({it.bemCodigo})</span>
                        {hasEmbutido && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                            Aceita Embutido
                          </span>
                        )}
                        {hasFixo20 && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                            Lance Fixo 20%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                      {formatBRL(it.valorBem)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-semibold text-bb-blue">
                      {formatBRL(it.parcela)}
                    </td>
                    <td className="py-2 px-2.5 text-right text-slate-600">
                      {formatPercent(it.taxaAdm, 2)}
                    </td>
                    <td className="py-2 px-2.5 text-right text-slate-600">
                      {formatPercent(it.fundoReserva, 2)}
                    </td>
                    <td className="py-2 px-2.5 text-center text-slate-500">{it.assembleia}</td>
                    <td className="py-2 px-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenAssembleiaGroup?.(it.grupo)}
                        className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 hover:underline"
                        title="Clique para abrir o histórico de assembleias deste grupo"
                      >
                        <TrendingDown className="w-3 h-3" />
                        {formatPercent(it.percMinContemp, 2)}
                      </button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onSimulateSelected([it])}
                          className="px-2.5 py-1 rounded bg-bb-blue hover:bg-bb-dark text-white text-[11px] font-semibold transition"
                        >
                          Simular
                        </button>
                        {onOpenAssembleiaGroup && it.grupo !== '000000' && (
                          <button
                            onClick={() => onOpenAssembleiaGroup(it.grupo)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition"
                            title="Ver Resultado de Assembleias deste Grupo"
                          >
                            Assemb.
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    Nenhum plano encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
