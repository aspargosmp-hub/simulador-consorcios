import React, { useState } from 'react';
import {
  ExternalLink,
  FolderClock,
  MessageCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { SavedSimulation, SimulacaoStatus } from '../types';

interface SavedSimulationsTabProps {
  simulations: SavedSimulation[];
  onUpdateStatus: (id: string, status: SimulacaoStatus) => void;
  onUpdateComment: (id: string, comment: string) => void;
  onDeleteSimulation: (id: string) => void;
  onLoadSimulation: (sim: SavedSimulation) => void;
}

const STATUS_OPTIONS: SimulacaoStatus[] = [
  'Aguardando',
  'Retornar',
  'Contratado',
  'Concluído',
  'Cancelado',
];

const STATUS_BADGE: Record<SimulacaoStatus, string> = {
  Aguardando: 'bg-amber-100 text-amber-800 border-amber-200',
  Retornar: 'bg-blue-100 text-blue-800 border-blue-200',
  Contratado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Concluído: 'bg-green-100 text-green-900 border-green-300',
  Cancelado: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const SavedSimulationsTab: React.FC<SavedSimulationsTabProps> = ({
  simulations,
  onUpdateStatus,
  onUpdateComment,
  onDeleteSimulation,
  onLoadSimulation,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  const filtered = simulations.filter((s) => {
    if (statusFilter !== 'TODOS' && s.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.cliente.toLowerCase().includes(q) ||
        s.telefone.toLowerCase().includes(q) ||
        s.modalidadeLabel.toLowerCase().includes(q) ||
        s.comentario.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FolderClock className="w-5 h-5 text-bb-blue" />
            Histórico de Simulações Salvas (Mini-CRM Comercial)
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe o funil das simulações enviadas aos clientes, atualize o status e reabra qualquer proposta com 1 clique.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, telefone..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
          >
            <option value="TODOS">Todos os Status ({simulations.length})</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st} ({simulations.filter((s) => s.status === st).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Código / Data</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3">Modalidade</th>
                <th className="py-2.5 px-3">Propostas</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Comentário / Anotações</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((sim) => {
                const activeSlots = sim.slots.filter((s) => s.enabled && s.groupId);
                const cleanPhone = sim.telefone.replace(/\D/g, '');
                return (
                  <tr key={sim.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-800">{sim.id}</div>
                      <div className="text-[11px] text-slate-400">{sim.createdAt}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      <div>{sim.cliente}</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        Resp: {sim.especialista}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span>{sim.telefone}</span>
                        {cleanPhone.length >= 10 && (
                          <a
                            href={`https://wa.me/55${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            title="Chamar no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-bb-blue font-bold text-[11px]">
                        {sim.codigoModalidade}
                      </span>
                      <div className="text-[11px] text-slate-600 mt-0.5">{sim.modalidadeLabel}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-700">
                        {activeSlots.length} opção(ões)
                      </span>
                      {sim.agrupar && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                          Agrupado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={sim.status}
                        onChange={(e) =>
                          onUpdateStatus(sim.id, e.target.value as SimulacaoStatus)
                        }
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          STATUS_BADGE[sim.status]
                        }`}
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={sim.comentario}
                        onChange={(e) => onUpdateComment(sim.id, e.target.value)}
                        placeholder="Adicionar observação..."
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-bb-blue focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onLoadSimulation(sim)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-bb-blue hover:bg-bb-dark text-white font-semibold text-[11px] transition"
                          title="Reabrir esta simulação no Simulador"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir
                        </button>
                        <button
                          onClick={() => onDeleteSimulation(sim.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Excluir simulação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhuma simulação encontrada.
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
