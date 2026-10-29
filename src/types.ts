export type CodigoModalidade =
  | 'AU3'
  | 'AU4'
  | 'AI3'
  | 'AI4'
  | 'IM3'
  | 'IM4'
  | 'IM9'
  | 'MO3'
  | 'MO4'
  | 'EE3'
  | 'EE4'
  | 'TC3'
  | 'TC4';

export type TipoPessoa = 'PF' | 'PJ';

export interface ConsorcioItem {
  id: number;
  codigoModalidade: CodigoModalidade;
  modalidade: string;
  plano: 'Flex' | 'Master' | 'Especial 240';
  segmento: string;
  grupo: string;
  prazo: number;
  vagas: number;
  bemCodigo: string;
  bemDescricao: string;
  taxaAdm: number;
  fundoReserva: number;
  seguro: number;
  valorBem: number;
  parcela: number;
  assembleia: string;
  vencimento: string;
  percMinContemp: number;
  indiceCorrecao: string;
  tags: string[];
}

export interface ConsorciosDataset {
  updatedAt: string;
  source: string;
  bbPortalConnected?: boolean;
  totalRecords: number;
  items: ConsorcioItem[];
}

export interface ProposalSlot {
  slotIndex: number; // 0 to 3
  enabled: boolean;
  groupId: number | null;
  cotas: number;
  lanceRecursoProprioPerc: number; // % do bolso
  lanceEmbutidoPerc: number; // % descontado da carta (ex: até 30%)
}

export interface CalculatedProposal {
  slotIndex: number;
  item: ConsorcioItem;
  cotas: number;
  tipoPessoa: TipoPessoa;
  incluirSeguro: boolean;
  aliquotaSeguroMensal: number;
  valorSeguroMensal: number;
  valorUnitario: number;
  creditoBruto: number;
  lanceRecursoProprioPerc: number;
  lanceEmbutidoPerc: number;
  lanceTotalPerc: number;
  valorLanceRecursoProprio: number;
  valorLanceEmbutido: number;
  valorLanceTotal: number;
  creditoLiquido: number;
  prazo: number;
  parcelaUnitariaSemSeguro: number;
  parcelaMensalSemSeguro: number;
  parcelaMensalTotal: number;
  parcelaPosLance: number;
  prazoPosLance: number;
  taxaAdm: number;
  fundoReserva: number;
  seguro: number;
  taxaMensalizada: number;
  taxaAnual: number;
  indiceCorrecao: string;
  aceitaLanceEmbutido: boolean;
}

export type SimulacaoStatus =
  | 'Aguardando'
  | 'Retornar'
  | 'Contratado'
  | 'Concluído'
  | 'Cancelado';

export interface SavedSimulation {
  id: string;
  createdAt: string;
  cliente: string;
  telefone: string;
  tipoPessoa?: TipoPessoa;
  incluirSeguro?: boolean;
  especialista: string;
  telefoneEspecialista: string;
  codigoModalidade: CodigoModalidade;
  modalidadeLabel: string;
  agrupar: boolean;
  status: SimulacaoStatus;
  comentario: string;
  slots: ProposalSlot[];
}

export interface AssembleiaRecord {
  grupo: string;
  assembleia: string;
  data: string;
  qtdContemplados: number;
  maiorLance: number;
  menorLance: number;
}
