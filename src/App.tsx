import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calculator,
  FolderClock,
  Table2,
} from 'lucide-react';
import consorciosSeedRaw from './data/consorciosSeed.json';
import {
  CodigoModalidade,
  ConsorcioItem,
  ConsorciosDataset,
  ProposalSlot,
  SavedSimulation,
  SimulacaoStatus,
} from './types';
import { ConsorciosTableTab } from './components/ConsorciosTableTab';
import { SimulatorTab } from './components/SimulatorTab';
import { PainelAssembleiasTab } from './components/PainelAssembleiasTab';
import { SavedSimulationsTab } from './components/SavedSimulationsTab';

const initialDataset = consorciosSeedRaw as unknown as ConsorciosDataset;

export function App() {
  const [activeTab, setActiveTab] = useState<
    'simulador' | 'consorcios' | 'assembleias' | 'historico'
  >('simulador');
  const [dataset, setDataset] = useState<ConsorciosDataset>(initialDataset);
  const [assembleiaGroupFocus, setAssembleiaGroupFocus] = useState<string>('001583');

  // Estado da aba Consórcios
  const [tableModality, setTableModality] = useState<CodigoModalidade | 'TODOS'>('TC3');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Estado da aba Simulador
  const [simModality, setSimModality] = useState<CodigoModalidade>('TC3');
  const [agrupar, setAgrupar] = useState<boolean>(true);
  const [slots, setSlots] = useState<ProposalSlot[]>(() => {
    const tc3Items = initialDataset.items.filter((i) => i.codigoModalidade === 'TC3');
    return [
      {
        slotIndex: 0,
        enabled: true,
        groupId: tc3Items[0]?.id || initialDataset.items[0].id,
        cotas: 1,
        lanceRecursoProprioPerc: 15,
        lanceEmbutidoPerc: 30,
      },
      {
        slotIndex: 1,
        enabled: false,
        groupId: tc3Items[Math.min(4, tc3Items.length - 1)]?.id || initialDataset.items[1].id,
        cotas: 1,
        lanceRecursoProprioPerc: 15,
        lanceEmbutidoPerc: 30,
      },
      { slotIndex: 2, enabled: false, groupId: null, cotas: 1, lanceRecursoProprioPerc: 0, lanceEmbutidoPerc: 0 },
      { slotIndex: 3, enabled: false, groupId: null, cotas: 1, lanceRecursoProprioPerc: 0, lanceEmbutidoPerc: 0 },
    ];
  });

  // Estado de Simulações Salvas (persistido no localStorage, inicia limpo)
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>(() => {
    try {
      const saved = localStorage.getItem('bb_consorcios_saved_sims_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bb_consorcios_saved_sims_v2', JSON.stringify(savedSimulations));
    } catch {
      // ignore storage errors
    }
  }, [savedSimulations]);

  // Sincronização diária invisível em segundo plano (1x por dia, sem poluir a tela)
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const lastSyncDate = (dataset.updatedAt || '').split(' ')[0];
    if (lastSyncDate !== todayStr) {
      fetch('/api/sync', { method: 'POST' })
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data?.data) {
            setDataset(data.data);
          }
        })
        .catch(() => {
          // Usa base estática se estiver em produção estática (atualizada via GitHub Actions)
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleSelectId = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const handleSimulateSelected = (chosenItems: ConsorcioItem[]) => {
    if (chosenItems.length === 0) return;
    const firstMod = chosenItems[0].codigoModalidade;
    setSimModality(firstMod);

    const nextSlots: ProposalSlot[] = [0, 1, 2, 3].map((idx) => {
      const item = chosenItems[idx];
      if (item) {
        const supportsEmbutido = item.tags.includes('Lance Embutido');
        return {
          slotIndex: idx,
          enabled: true,
          groupId: item.id,
          cotas: 1,
          lanceRecursoProprioPerc: supportsEmbutido ? 15 : 20,
          lanceEmbutidoPerc: supportsEmbutido ? 30 : 0,
        };
      }
      return {
        slotIndex: idx,
        enabled: false,
        groupId: null,
        cotas: 1,
        lanceRecursoProprioPerc: 0,
        lanceEmbutidoPerc: 0,
      };
    });

    setSlots(nextSlots);
    setAgrupar(chosenItems.length > 1);
    setActiveTab('simulador');
  };

  const handleChangeSimModality = (newMod: CodigoModalidade) => {
    setSimModality(newMod);
    const modItems = dataset.items.filter((i) => i.codigoModalidade === newMod);
    setSlots((prev) =>
      prev.map((slot, idx) => {
        if (!slot.enabled) return slot;
        const currentItem = dataset.items.find((i) => i.id === slot.groupId);
        if (currentItem) {
          const twin = modItems.find(
            (i) =>
              i.grupo === currentItem.grupo &&
              i.prazo === currentItem.prazo &&
              Math.abs(i.valorBem - currentItem.valorBem) < 10
          );
          if (twin) {
            return { ...slot, groupId: twin.id };
          }
        }
        return {
          ...slot,
          groupId: modItems[Math.min(idx, modItems.length - 1)]?.id || null,
        };
      })
    );
  };

  const handleOpenAssembleiaGroup = (grupo: string) => {
    setAssembleiaGroupFocus(grupo);
    setActiveTab('assembleias');
  };

  const handleApplyAutoProposal = (
    newMod: CodigoModalidade,
    newSlots: ProposalSlot[],
    newAgrupar: boolean
  ) => {
    setSimModality(newMod);
    setSlots(newSlots);
    setAgrupar(newAgrupar);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Cabeçalho Limpo e Direto com a Logo Oficial BB Consórcios */}
      <header className="bg-bb-blue text-white border-b-4 border-bb-yellow shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-white rounded-xl px-3 py-1.5 shadow-sm flex items-center justify-center">
              <img
                src="./logo-bb-consorcios.png"
                alt="BB Consórcios"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
                O MELHOR SIMULADOR DA BB CONSÓRCIOS
              </h1>
              <p className="text-xs text-bb-yellow font-medium">
                Simulação rápida de cartas, lances e parcelas • Tabelas atualizadas ({dataset.updatedAt.split(' ')[0]})
              </p>
            </div>
          </div>

          {/* Menu de Navegação Direto e Intuitivo */}
          <nav className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('simulador')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition ${
                activeTab === 'simulador'
                  ? 'bg-bb-yellow text-bb-dark shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Simulador
            </button>

            <button
              onClick={() => setActiveTab('consorcios')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition ${
                activeTab === 'consorcios'
                  ? 'bg-bb-yellow text-bb-dark shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Table2 className="w-4 h-4" />
              Tabela de Grupos
            </button>

            <button
              onClick={() => setActiveTab('assembleias')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition ${
                activeTab === 'assembleias'
                  ? 'bg-bb-yellow text-bb-dark shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Assembleias
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition ${
                activeTab === 'historico'
                  ? 'bg-bb-yellow text-bb-dark shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <FolderClock className="w-4 h-4" />
              Salvas {savedSimulations.length > 0 ? `(${savedSimulations.length})` : ''}
            </button>
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 print:p-0 print:max-w-none">
        {activeTab === 'simulador' && (
          <SimulatorTab
            items={dataset.items}
            modality={simModality}
            onChangeModality={handleChangeSimModality}
            slots={slots}
            onChangeSlots={setSlots}
            agrupar={agrupar}
            onChangeAgrupar={setAgrupar}
            onApplyAutoProposal={handleApplyAutoProposal}
            onSaveSimulation={(newSim) => {
              setSavedSimulations((prev) => [newSim, ...prev]);
            }}
            onOpenAssembleiaGroup={handleOpenAssembleiaGroup}
          />
        )}

        {activeTab === 'consorcios' && (
          <ConsorciosTableTab
            items={dataset.items}
            selectedModality={tableModality}
            onSelectModality={setTableModality}
            selectedIds={selectedIds}
            onToggleSelectId={handleToggleSelectId}
            onClearSelection={() => setSelectedIds([])}
            onSimulateSelected={handleSimulateSelected}
            onOpenAssembleiaGroup={handleOpenAssembleiaGroup}
          />
        )}

        {activeTab === 'assembleias' && (
          <PainelAssembleiasTab
            items={dataset.items}
            initialGroup={assembleiaGroupFocus}
            onSimulateGroup={(item, suggestedBidPerc) => {
              setSimModality(item.codigoModalidade);
              const acceptsEmb = item.tags.includes('Lance Embutido');
              const emb = acceptsEmb ? Math.min(30, suggestedBidPerc) : 0;
              const bolso = Math.max(0, Number((suggestedBidPerc - emb).toFixed(2)));
              setSlots((prev) =>
                prev.map((s, idx) =>
                  idx === 0
                    ? {
                        slotIndex: 0,
                        enabled: true,
                        groupId: item.id,
                        cotas: 1,
                        lanceEmbutidoPerc: emb,
                        lanceRecursoProprioPerc: bolso,
                      }
                    : s
                )
              );
              setActiveTab('simulador');
            }}
          />
        )}

        {activeTab === 'historico' && (
          <SavedSimulationsTab
            simulations={savedSimulations}
            onUpdateStatus={(id: string, status: SimulacaoStatus) => {
              setSavedSimulations((prev) =>
                prev.map((s) => (s.id === id ? { ...s, status } : s))
              );
            }}
            onUpdateComment={(id: string, comment: string) => {
              setSavedSimulations((prev) =>
                prev.map((s) => (s.id === id ? { ...s, comentario: comment } : s))
              );
            }}
            onDeleteSimulation={(id: string) => {
              setSavedSimulations((prev) => prev.filter((s) => s.id !== id));
            }}
            onLoadSimulation={(sim: SavedSimulation) => {
              setSimModality(sim.codigoModalidade);
              setAgrupar(sim.agrupar);
              setSlots(sim.slots);
              setActiveTab('simulador');
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
