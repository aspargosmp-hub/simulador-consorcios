import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BarChart3,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  CopyPlus,
  FileText,
  Layers,
  Plus,
  Printer,
  Save,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  User,
  Wand2,
} from 'lucide-react';
import {
  CalculatedProposal,
  CodigoModalidade,
  ConsorcioItem,
  ProposalSlot,
  SavedSimulation,
  TipoPessoa,
} from '../types';
import {
  aggregateProposals,
  ALIQUOTA_SEGURO_MENSAL,
  calculateProposal,
  formatBRL,
  formatPercent,
  MODALIDADES_LIST,
} from '../utils/calculations';
import { CurrencyInput } from './CurrencyInput';

interface SimulatorTabProps {
  items: ConsorcioItem[];
  modality: CodigoModalidade;
  onChangeModality: (mod: CodigoModalidade) => void;
  slots: ProposalSlot[];
  onChangeSlots: (slots: ProposalSlot[]) => void;
  agrupar: boolean;
  onChangeAgrupar: (val: boolean) => void;
  onSaveSimulation: (sim: SavedSimulation) => void;
  onOpenAssembleiaGroup?: (grupo: string) => void;
}

type ObjetivoCompraId =
  | 'TRATOR'
  | 'CAMINHAO'
  | 'IRRIGACAO'
  | 'REBANHO'
  | 'IMOVEL'
  | 'CARRO_FIPE'
  | 'CARRO_IPCA'
  | 'SOLAR'
  | 'MOTO';

interface ObjetivoCompraOption {
  id: ObjetivoCompraId;
  label: string;
  emoji: string;
  seg: string;
  defaultModFlex: CodigoModalidade;
  defaultModMaster: CodigoModalidade;
  filterFn: (item: ConsorcioItem) => boolean;
}

const OBJETIVOS_COMPRA: ObjetivoCompraOption[] = [
  {
    id: 'TRATOR',
    label: 'Trator / Implemento',
    emoji: '🚜',
    seg: 'TC',
    defaultModFlex: 'TC3',
    defaultModMaster: 'TC4',
    filterFn: (i) =>
      i.segmento === 'TC' &&
      (i.tags.includes('Trator / Implemento') ||
        i.bemDescricao.includes('TRATOR') ||
        i.bemDescricao.includes('PESADOS')),
  },
  {
    id: 'CAMINHAO',
    label: 'Caminhão / Pesados',
    emoji: '🚛',
    seg: 'TC',
    defaultModFlex: 'TC3',
    defaultModMaster: 'TC4',
    filterFn: (i) =>
      i.segmento === 'TC' &&
      (!i.bemDescricao.includes('IRRIGACAO') && !i.bemDescricao.includes('REBANHO')),
  },
  {
    id: 'IRRIGACAO',
    label: 'Irrigação / Pivô',
    emoji: '💧',
    seg: 'TC',
    defaultModFlex: 'TC3',
    defaultModMaster: 'TC4',
    filterFn: (i) => i.segmento === 'TC' && i.tags.includes('Irrigação'),
  },
  {
    id: 'REBANHO',
    label: 'Rebanho / Pecuária',
    emoji: '🐄',
    seg: 'TC',
    defaultModFlex: 'TC3',
    defaultModMaster: 'TC4',
    filterFn: (i) => i.segmento === 'TC' && i.tags.includes('Rebanho e Genética'),
  },
  {
    id: 'IMOVEL',
    label: 'Casa / Imóvel / Terreno',
    emoji: '🏠',
    seg: 'IM',
    defaultModFlex: 'IM3',
    defaultModMaster: 'IM4',
    filterFn: (i) => i.segmento === 'IM',
  },
  {
    id: 'CARRO_FIPE',
    label: 'Carro / Picape (FIPE)',
    emoji: '🚗',
    seg: 'AU',
    defaultModFlex: 'AU3',
    defaultModMaster: 'AU4',
    filterFn: (i) => i.segmento === 'AU',
  },
  {
    id: 'CARRO_IPCA',
    label: 'Carro / Utilitário (IPCA)',
    emoji: '🚙',
    seg: 'AI',
    defaultModFlex: 'AI3',
    defaultModMaster: 'AI4',
    filterFn: (i) => i.segmento === 'AI',
  },
  {
    id: 'SOLAR',
    label: 'Energia Solar / Equip.',
    emoji: '☀️',
    seg: 'EE',
    defaultModFlex: 'EE3',
    defaultModMaster: 'EE4',
    filterFn: (i) => i.segmento === 'EE',
  },
  {
    id: 'MOTO',
    label: 'Motocicleta',
    emoji: '🏍️',
    seg: 'MO',
    defaultModFlex: 'MO3',
    defaultModMaster: 'MO4',
    filterFn: (i) => i.segmento === 'MO',
  },
];

const DIFERENCIAIS_LIST = [
  'Grupo em Andamento',
  'Atendimento Personalizado',
  'Contemplação a Curto Prazo',
  'Grupos com Alto Número de Contemplados',
  'Flexibilidade na utilização de Créditos',
];

const BENEFICIOS_LIST = [
  'Sem Juros (Apenas Taxa de Administração diluída no prazo)',
  'Não compromete seu limite de crédito junto aos Bancos',
  'Alienação apenas do bem a ser adquirido',
  'Poder de negociação à vista no momento da aquisição',
  'Possibilidade de utilizar até 30% da própria carta como Lance Embutido (nos grupos elegíveis)',
  'Flexibilidade de prazos e utilização do crédito em todo o território nacional',
];

export const SimulatorTab: React.FC<SimulatorTabProps> = ({
  items,
  modality,
  onChangeModality,
  slots,
  onChangeSlots,
  agrupar,
  onChangeAgrupar,
  onSaveSimulation,
  onOpenAssembleiaGroup,
}) => {
  const [cliente, setCliente] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>('PF');
  const [incluirSeguro, setIncluirSeguro] = useState<boolean>(false);
  const [especialista, setEspecialista] = useState<string>('Consultor Especialista');
  const [telefoneEspecialista, setTelefoneEspecialista] = useState<string>('(11) 99999-9999');
  const [comentario, setComentario] = useState<string>('');
  const [copiedWhats, setCopiedWhats] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  const [slotGroupFilter, setSlotGroupFilter] = useState<Record<number, string>>({});

  // Estados da Calculadora Reversa 2.0 (Assistente Inteligente por Objetivo + Crédito + Mensalidade)
  const [objetivo, setObjetivo] = useState<ObjetivoCompraId>('TRATOR');
  const [planoPreferido, setPlanoPreferido] = useState<'Flex' | 'Master'>('Flex');
  const [targetLiquido, setTargetLiquido] = useState<number>(350000);
  const [targetMensalidadeMax, setTargetMensalidadeMax] = useState<number>(0);
  const [targetBolsoReais, setTargetBolsoReais] = useState<number>(0);
  const [targetUsarEmbutido, setTargetUsarEmbutido] = useState<boolean>(true);
  const [assistantFeedback, setAssistantFeedback] = useState<string>('');

  const [visibleRows, setVisibleRows] = useState<Record<string, boolean>>({
    bemRegra: true,
    creditoBruto: true,
    lanceEmbutido: true,
    creditoLiquido: true,
    prazo: true,
    parcelaMensal: true,
    seguroPrestamista: true,
    lanceRecursoProprio: true,
    lanceTotal: true,
    parcelaPosLance: true,
    prazoPosLance: true,
    valorUnitario: true,
    cotas: true,
    taxaMensalizada: true,
    taxaAnual: true,
    taxaAdm: true,
    fundoReserva: true,
    indiceCorrecao: true,
    diferenciais: true,
    beneficios: true,
  });

  const modalityItems = useMemo(
    () =>
      items
        .filter((i) => i.codigoModalidade === modality)
        .sort((a, b) => a.valorBem - b.valorBem || a.prazo - b.prazo),
    [items, modality]
  );

  const uniqueGroupsSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        grupo: string;
        prazo: number;
        bemDescricao: string;
        vagas: number;
        percMinContemp: number;
        minValor: number;
        maxValor: number;
        acceptsEmbutido: boolean;
        items: ConsorcioItem[];
      }
    >();
    for (const it of modalityItems) {
      const existing = map.get(it.grupo);
      if (!existing) {
        map.set(it.grupo, {
          grupo: it.grupo,
          prazo: it.prazo,
          bemDescricao: it.bemDescricao,
          vagas: it.vagas,
          percMinContemp: it.percMinContemp,
          minValor: it.valorBem,
          maxValor: it.valorBem,
          acceptsEmbutido: it.tags.includes('Lance Embutido'),
          items: [it],
        });
      } else {
        existing.minValor = Math.min(existing.minValor, it.valorBem);
        existing.maxValor = Math.max(existing.maxValor, it.valorBem);
        existing.items.push(it);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.prazo - b.prazo);
  }, [modalityItems]);

  const updateSlot = (index: number, patch: Partial<ProposalSlot>) => {
    const next = slots.map((s, idx) => (idx === index ? { ...s, ...patch } : s));
    onChangeSlots(next);
  };

  const duplicateSlotToNext = (sourceIdx: number) => {
    const src = slots[sourceIdx];
    const targetIdx = slots.findIndex((s, i) => i !== sourceIdx && !s.enabled);
    const destIdx = targetIdx !== -1 ? targetIdx : (sourceIdx + 1) % 4;
    const next = slots.map((s, idx) =>
      idx === destIdx
        ? {
            ...src,
            slotIndex: destIdx,
            enabled: true,
          }
        : s
    );
    onChangeSlots(next);
  };

  // MOTOR DE RECOMENDAÇÃO INTELIGENTE (Monta até 3 cenários estratégicos automaticamente!)
  const handleAutoBuildProposal = (e: React.FormEvent) => {
    e.preventDefault();
    const objConfig = OBJETIVOS_COMPRA.find((o) => o.id === objetivo) || OBJETIVOS_COMPRA[0];
    const targetMod =
      planoPreferido === 'Flex' ? objConfig.defaultModFlex : objConfig.defaultModMaster;

    const liquidoDesejado = Number(targetLiquido) || 0;
    const mensalidadeMax = Number(targetMensalidadeMax) || 0;
    const bolsoReais = Number(targetBolsoReais) || 0;

    // Filtra os itens da modalidade e objetivo escolhido (priorizando grupos com vagas > 0)
    let pool = items.filter(
      (i) => i.codigoModalidade === targetMod && objConfig.filterFn(i) && i.vagas > 0
    );
    if (pool.length === 0) {
      pool = items.filter((i) => i.codigoModalidade === targetMod && i.vagas > 0);
    }
    if (pool.length === 0) {
      pool = items.filter((i) => i.codigoModalidade === targetMod);
    }
    if (pool.length === 0) return;

    // Avalia candidatos (1 a 3 cotas) para encontrar os 3 melhores cenários:
    // Cenário 1: Equilíbrio / Mais próximo do Crédito Líquido e dentro da Mensalidade
    // Cenário 2: Menor Parcela Mensal (Prazo mais longo)
    // Cenário 3: Contemplação Mais Rápida (Menor Lance Mínimo 12m ou Lance Fixo 20%)
    interface CandidateScenario {
      item: ConsorcioItem;
      cotas: number;
      embPerc: number;
      bolsoPerc: number;
      creditoBruto: number;
      creditoLiquido: number;
      parcelaInicial: number;
      parcelaPosLance: number;
      scoreCredito: number;
      withinBudget: boolean;
    }

    const candidates: CandidateScenario[] = [];

    for (const item of pool) {
      // Testa com o percentual de embutido escolhido (e também testa 0% em grupos de Lance Fixo 20/30 quando há lance do bolso suficiente)
      const embOptions = targetUsarEmbutido ? [30, 0] : [0];

      for (const embPerc of embOptions) {
        // Se o usuário pediu embutido, só usa embPerc=0 se for grupo de Lance Fixo <= 30% e tiver lance do bolso
        if (targetUsarEmbutido && embPerc === 0 && item.percMinContemp > 30) continue;

        const fatorLiq = 1 - embPerc / 100;

        for (let cotas = 1; cotas <= 4; cotas++) {
          const creditoBruto = item.valorBem * cotas;
          const creditoLiquido = creditoBruto * fatorLiq;
          const parcelaInicial = item.parcela * cotas;

          let bolsoPerc = 15;
          if (bolsoReais > 0 && creditoBruto > 0) {
            // Mantém precisão total para que o valor em R$ bata exatamente (sem quebrar em R$ 100.009,92)
            bolsoPerc = Math.min(69, (bolsoReais / creditoBruto) * 100);
          } else if (embPerc === 0 && item.tags.includes('Lance Fixo 20%')) {
            bolsoPerc = 20;
          } else if (bolsoReais === 0 && targetUsarEmbutido) {
            bolsoPerc = 0;
          }

          const lanceTotalPerc = embPerc + bolsoPerc;
          const lanceTotalValor = creditoBruto * (lanceTotalPerc / 100);
          const saldoTotal = parcelaInicial * item.prazo;
          const parcelaPosLance =
            item.prazo > 1
              ? Math.max(0, (saldoTotal - parcelaInicial - lanceTotalValor) / (item.prazo - 1))
              : parcelaInicial;

          // Distância percentual para o crédito líquido desejado
          const scoreCredito =
            liquidoDesejado > 0
              ? Math.abs(creditoLiquido - liquidoDesejado) / liquidoDesejado
              : mensalidadeMax > 0
              ? Math.abs(parcelaPosLance - mensalidadeMax) / mensalidadeMax
              : 0;

          // Verifica se cabe na mensalidade máxima (considerando a parcela pós-lance se houver lance, ou inicial)
          const refParcela = lanceTotalPerc > 0 ? parcelaPosLance : parcelaInicial;
          const withinBudget = mensalidadeMax <= 0 || refParcela <= mensalidadeMax * 1.12;

          // Aceita candidatos cujo crédito líquido esteja próximo do pedido (-6% a +14%)
          const reasonableCredit =
            liquidoDesejado <= 0 ||
            (creditoLiquido >= liquidoDesejado * 0.94 &&
              creditoLiquido <= liquidoDesejado * 1.15);

          if (reasonableCredit) {
            candidates.push({
              item,
              cotas,
              embPerc,
              bolsoPerc,
              creditoBruto,
              creditoLiquido,
              parcelaInicial,
              parcelaPosLance,
              scoreCredito,
              withinBudget,
            });
          }
        }
      }
    }

    // Fallback se a faixa estrita (-6% a +14%) não encontrar opções suficientes
    if (candidates.length < 3 && liquidoDesejado > 0) {
      for (const item of pool) {
        const embPerc = targetUsarEmbutido ? 30 : 0;
        const fatorLiq = 1 - embPerc / 100;
        for (let cotas = 1; cotas <= 4; cotas++) {
          const creditoBruto = item.valorBem * cotas;
          const creditoLiquido = creditoBruto * fatorLiq;
          if (creditoLiquido < liquidoDesejado * 0.85 || creditoLiquido > liquidoDesejado * 1.30)
            continue;
          const parcelaInicial = item.parcela * cotas;
          const bolsoPerc =
            bolsoReais > 0 && creditoBruto > 0
              ? Math.min(69, (bolsoReais / creditoBruto) * 100)
              : 0;
          const lanceTotalValor = creditoBruto * ((embPerc + bolsoPerc) / 100);
          const saldoTotal = parcelaInicial * item.prazo;
          const parcelaPosLance =
            item.prazo > 1
              ? Math.max(0, (saldoTotal - parcelaInicial - lanceTotalValor) / (item.prazo - 1))
              : parcelaInicial;
          const scoreCredito = Math.abs(creditoLiquido - liquidoDesejado) / liquidoDesejado;
          const withinBudget = mensalidadeMax <= 0 || parcelaPosLance <= mensalidadeMax * 1.15;
          candidates.push({
            item,
            cotas,
            embPerc,
            bolsoPerc,
            creditoBruto,
            creditoLiquido,
            parcelaInicial,
            parcelaPosLance,
            scoreCredito,
            withinBudget,
          });
        }
      }
    }

    // Se o filtro estrito não achou, pega o mais próximo geral
    const workingList =
      candidates.filter((c) => c.withinBudget).length > 0
        ? candidates.filter((c) => c.withinBudget)
        : candidates;

    if (workingList.length === 0) return;

    // 1. Melhor encaixe exato de Crédito Líquido
    const byCreditFit = [...workingList].sort((a, b) => a.scoreCredito - b.scoreCredito);
    const c1 = byCreditFit[0];

    // 2. Menor Parcela Pós-Lance (em um grupo diferente do C1 se possível)
    const byLowestInstallment = [...workingList].sort(
      (a, b) => a.parcelaPosLance - b.parcelaPosLance
    );
    const c2 =
      byLowestInstallment.find((c) => c.item.grupo !== c1.item.grupo) ||
      byLowestInstallment.find((c) => c.item.id !== c1.item.id) ||
      c1;

    // 3. Menor Lance Mínimo Histórico 12m (Grupo mais fácil de contemplar)
    const byFastestContemp = [...workingList].sort(
      (a, b) => a.item.percMinContemp - b.item.percMinContemp
    );
    const c3 =
      byFastestContemp.find(
        (c) => c.item.grupo !== c1.item.grupo && c.item.grupo !== c2.item.grupo
      ) ||
      byFastestContemp[0] ||
      c1;

    const chosenScenarios = [c1, c2, c3].filter(
      (v, index, self) =>
        index ===
        self.findIndex((t) => t.item.id === v.item.id && t.cotas === v.cotas)
    );

    onChangeModality(targetMod);
    onChangeAgrupar(false); // Desmarca agrupar para comparar os 3 cenários lado a lado!

    const nextSlots: ProposalSlot[] = [0, 1, 2, 3].map((idx) => {
      const sc = chosenScenarios[idx];
      if (sc) {
        return {
          slotIndex: idx,
          enabled: true,
          groupId: sc.item.id,
          cotas: sc.cotas,
          lanceEmbutidoPerc: sc.embPerc,
          lanceRecursoProprioPerc: sc.bolsoPerc,
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

    onChangeSlots(nextSlots);

    const newGroupFilters: Record<number, string> = {};
    chosenScenarios.forEach((sc, idx) => {
      newGroupFilters[idx] = sc.item.grupo;
    });
    setSlotGroupFilter(newGroupFilters);

    setAssistantFeedback(
      `Montamos ${chosenScenarios.length} opções ideais para ${objConfig.label} (${targetMod}): Opção 1 (Crédito exato: ${formatBRL(
        c1.creditoLiquido
      )} líq.), Opção 2 (Menor parcela: ${formatBRL(
        c2.parcelaPosLance
      )}/mês) e Opção 3 (Menor lance mín. 12m: Grupo ${c3.item.grupo} com ${formatPercent(
        c3.item.percMinContemp,
        1
      )}).`
    );
  };

  const calculatedProposals: CalculatedProposal[] = useMemo(() => {
    const result: CalculatedProposal[] = [];
    for (const slot of slots) {
      if (!slot.enabled || !slot.groupId) continue;
      const found = items.find((i) => i.id === slot.groupId);
      if (found) {
        result.push(calculateProposal(slot, found, tipoPessoa, incluirSeguro));
      }
    }
    return result;
  }, [slots, items, tipoPessoa, incluirSeguro]);

  const aggregated = useMemo(
    () => aggregateProposals(calculatedProposals),
    [calculatedProposals]
  );

  const toggleRow = (key: string) => {
    setVisibleRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyWhatsApp = () => {
    if (calculatedProposals.length === 0) return;
    const modObj = MODALIDADES_LIST.find((m) => m.code === modality);
    const lines: string[] = [];
    lines.push(`*PROPOSTA DE CONSÓRCIO BB — ${modObj?.label.toUpperCase() || modality}*`);
    lines.push(
      `📋 *Modalidade Titular:* ${
        tipoPessoa === 'PF' ? 'Pessoa Física (CPF)' : 'Pessoa Jurídica (CNPJ)'
      }${incluirSeguro ? ' (c/ Seguro Prestamista incluso)' : ''}`
    );
    if (cliente.trim()) lines.push(`👤 *Cliente:* ${cliente}`);
    lines.push('');

    calculatedProposals.forEach((p, idx) => {
      lines.push(
        `📌 *Opção ${idx + 1} — Grupo ${p.item.grupo} (${p.cotas} cota${
          p.cotas > 1 ? 's' : ''
        })*`
      );
      lines.push(`• Bem/Regra: ${p.item.bemDescricao}`);
      lines.push(`• Valor da Carta (Bruto): *${formatBRL(p.creditoBruto)}*`);
      if (p.lanceEmbutidoPerc > 0) {
        lines.push(
          `• (-) Lance Embutido (${formatPercent(p.lanceEmbutidoPerc, 1)}): ${formatBRL(
            p.valorLanceEmbutido
          )}`
        );
        lines.push(`• (=) *Crédito Líquido Liberado: ${formatBRL(p.creditoLiquido)}*`);
      }
      lines.push(
        `• Prazo: ${p.prazo} meses | Parcela Inicial: *${formatBRL(p.parcelaMensalTotal)}*`
      );
      if (incluirSeguro) {
        lines.push(
          `  _(Sendo ${formatBRL(p.parcelaMensalSemSeguro)} parcela + ${formatBRL(
            p.valorSeguroMensal
          )} seguro ${tipoPessoa})_`
        );
      }
      if (p.lanceTotalPerc > 0) {
        lines.push(
          `• Lance Ofertado Total: *${formatPercent(p.lanceTotalPerc, 1)}* (${formatBRL(
            p.valorLanceTotal
          )})`
        );
        lines.push(
          `• Desembolso Recurso Próprio (do bolso): *${formatBRL(
            p.valorLanceRecursoProprio
          )}* (${formatPercent(p.lanceRecursoProprioPerc, 1)})`
        );
        lines.push(
          `• *Nova Parcela Pós-Lance:* *${formatBRL(p.parcelaPosLance)}* (ou ${
            p.prazoPosLance
          }x mantendo a parcela)`
        );
      }
      lines.push(
        `• Taxa Mensalizada: ${formatPercent(p.taxaMensalizada, 2)} a.m. | Correção: ${
          p.indiceCorrecao
        }`
      );
      lines.push('');
    });

    if (agrupar && calculatedProposals.length > 1) {
      lines.push(`📊 *RESUMO AGRUPADO (${aggregated.cotasTotal} COTAS)*`);
      lines.push(`• Crédito Bruto Total: *${formatBRL(aggregated.creditoBrutoTotal)}*`);
      if (aggregated.lanceEmbutidoTotal > 0) {
        lines.push(`• *Crédito Líquido Total: ${formatBRL(aggregated.creditoLiquidoTotal)}*`);
      }
      lines.push(`• Parcela Inicial Total: *${formatBRL(aggregated.parcelaMensalTotal)}*`);
      if (aggregated.lanceTotalValor > 0) {
        lines.push(
          `• Desembolso do Bolso Total: *${formatBRL(aggregated.lanceRecursoProprioTotal)}*`
        );
        lines.push(`• *Parcela Pós-Lance Total: ${formatBRL(aggregated.parcelaPosLanceTotal)}*`);
      }
      lines.push('');
    }

    if (especialista.trim()) {
      lines.push(
        `🤝 *Especialista:* ${especialista} ${
          telefoneEspecialista ? `— ${telefoneEspecialista}` : ''
        }`
      );
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedWhats(true);
    setTimeout(() => setCopiedWhats(false), 3000);
  };

  const handleSave = () => {
    if (calculatedProposals.length === 0) return;
    const modObj = MODALIDADES_LIST.find((m) => m.code === modality);
    const newSim: SavedSimulation = {
      id: `SIM-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toLocaleString('pt-BR'),
      cliente: cliente.trim() || 'Cliente sem nome',
      telefone: telefone.trim() || '-',
      tipoPessoa,
      incluirSeguro,
      especialista: especialista.trim() || 'Consultor',
      telefoneEspecialista: telefoneEspecialista.trim() || '',
      codigoModalidade: modality,
      modalidadeLabel: modObj?.label || modality,
      agrupar,
      status: 'Aguardando',
      comentario: comentario.trim(),
      slots: JSON.parse(JSON.stringify(slots)),
    };
    onSaveSimulation(newSim);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const toggleFlexMaster = () => {
    if (modality === 'IM9') {
      onChangeModality('IM3');
      return;
    }
    const seg = modality.slice(0, 2);
    const targetPlan = modality.endsWith('3') ? '4' : '3';
    const nextMod = `${seg}${targetPlan}` as CodigoModalidade;
    onChangeModality(nextMod);
  };

  return (
    <div className="space-y-5">
      {/* CALCULADORA REVERSA 2.0: O QUE O CLIENTE QUER COMPRAR + CRÉDITO + MENSALIDADE */}
      <form
        onSubmit={handleAutoBuildProposal}
        className="bg-gradient-to-br from-bb-dark via-bb-blue to-blue-900 text-white rounded-xl p-5 shadow-md print:hidden space-y-4 border border-blue-700"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-bb-yellow uppercase tracking-wider">
              <Wand2 className="w-4 h-4" />
              Montador Inteligente de Propostas (Calculadora Reversa)
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              1º Escolha <strong>o que o cliente quer comprar</strong>, 2º digite o{' '}
              <strong>crédito líquido</strong> e a <strong>mensalidade que cabe no bolso dele</strong>. O sistema monta até 3 cenários ideais na hora!
            </p>
          </div>

          <div className="inline-flex rounded-lg bg-white/10 p-0.5 border border-white/15">
            <button
              type="button"
              onClick={() => setPlanoPreferido('Flex')}
              className={`px-3 py-1 rounded-md text-xs font-extrabold transition ${
                planoPreferido === 'Flex'
                  ? 'bg-bb-yellow text-bb-dark'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Plano Flex (-2% Taxa)
            </button>
            <button
              type="button"
              onClick={() => setPlanoPreferido('Master')}
              className={`px-3 py-1 rounded-md text-xs font-extrabold transition ${
                planoPreferido === 'Master'
                  ? 'bg-bb-yellow text-bb-dark'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Plano Master (Taxa Cheia)
            </button>
          </div>
        </div>

        {/* Passo 1: O que o cliente quer comprar? */}
        <div>
          <span className="block text-[11px] font-bold text-bb-yellow uppercase tracking-wider mb-1.5">
            1. O que o cliente quer comprar?
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
            {OBJETIVOS_COMPRA.map((obj) => {
              const active = objetivo === obj.id;
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => setObjetivo(obj.id)}
                  className={`px-2.5 py-2 rounded-lg text-left transition border flex flex-col justify-between ${
                    active
                      ? 'bg-bb-yellow text-bb-dark border-bb-yellow font-extrabold shadow'
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/20 font-medium'
                  }`}
                >
                  <span className="text-base leading-none">{obj.emoji}</span>
                  <span className="text-[11px] leading-tight mt-1">{obj.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Passo 2: Valores do Cliente (Crédito Líquido, Mensalidade Ideal, Recurso Próprio) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start pt-2 border-t border-white/15">
          <div>
            <label className="block text-[11px] text-blue-100 font-semibold mb-1">
              2. Crédito Líquido Desejado
            </label>
            <CurrencyInput
              value={targetLiquido}
              onChange={setTargetLiquido}
              placeholder="Ex: 350.000,00"
              prefixClassName="text-bb-blue"
              inputClassName="bg-white text-slate-900 focus:ring-2 focus:ring-bb-yellow"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {[100000, 200000, 350000, 500000, 1000000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTargetLiquido(v)}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition ${
                    targetLiquido === v
                      ? 'bg-bb-yellow text-bb-dark'
                      : 'bg-white/10 text-blue-100 hover:bg-white/20'
                  }`}
                >
                  {v >= 1000000 ? '1 Mi' : `${v / 1000} mil`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-blue-100 font-semibold mb-1">
              3. Mensalidade Ideal (Opcional)
            </label>
            <CurrencyInput
              value={targetMensalidadeMax}
              onChange={setTargetMensalidadeMax}
              placeholder="Sem limite (0,00)"
              prefixClassName="text-bb-blue"
              inputClassName="bg-white text-slate-900 focus:ring-2 focus:ring-bb-yellow"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {[0, 1500, 2500, 3500, 5000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTargetMensalidadeMax(v)}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition ${
                    targetMensalidadeMax === v
                      ? 'bg-bb-yellow text-bb-dark'
                      : 'bg-white/10 text-blue-100 hover:bg-white/20'
                  }`}
                >
                  {v === 0 ? 'Livre' : `${(v / 1000).toLocaleString('pt-BR')} mil`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-blue-100 font-semibold mb-1">
              4. Lance do Bolso (Opcional)
            </label>
            <CurrencyInput
              value={targetBolsoReais}
              onChange={setTargetBolsoReais}
              placeholder="Ex: 50.000,00"
              prefixClassName="text-bb-blue"
              inputClassName="bg-white text-slate-900 focus:ring-2 focus:ring-bb-yellow"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {[0, 30000, 50000, 100000, 150000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTargetBolsoReais(v)}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition ${
                    targetBolsoReais === v
                      ? 'bg-bb-yellow text-bb-dark'
                      : 'bg-white/10 text-blue-100 hover:bg-white/20'
                  }`}
                >
                  {v === 0 ? 'Zero' : `${v / 1000} mil`}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-5">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-xs font-bold cursor-pointer h-[36px]">
              <input
                type="checkbox"
                checked={targetUsarEmbutido}
                onChange={(e) => setTargetUsarEmbutido(e.target.checked)}
                className="rounded text-bb-yellow"
              />
              <span>Usar 30% Lance Embutido</span>
            </label>
          </div>

          <div className="pt-5">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 h-[36px] rounded-lg bg-bb-yellow hover:bg-bb-yellowHover text-bb-dark text-xs font-black shadow-md transition"
            >
              <Target className="w-4 h-4" />
              Montar 3 Melhores Opções
            </button>
          </div>
        </div>

        {assistantFeedback && (
          <div className="bg-emerald-500/20 border border-emerald-300/40 rounded-lg px-3.5 py-2 text-xs text-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-bb-yellow shrink-0" />
            <span>{assistantFeedback}</span>
          </div>
        )}
      </form>

      {/* Painel Principal: Resultado da Simulação e Ajuste Fino das Propostas */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 print:hidden space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-bb-dark flex items-center gap-2 uppercase tracking-tight">
              <Calculator className="w-5 h-5 text-bb-blue" />
              Resultado da Simulação —{' '}
              <span className="text-bb-blue">
                {OBJETIVOS_COMPRA.find((o) => o.id === objetivo)?.emoji}{' '}
                {OBJETIVOS_COMPRA.find((o) => o.id === objetivo)?.label} (
                {MODALIDADES_LIST.find((m) => m.code === modality)?.label || modality})
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare abaixo os cenários montados para{' '}
              {targetLiquido > 0 ? (
                <strong>crédito líquido de {formatBRL(targetLiquido)}</strong>
              ) : (
                <strong>sua simulação</strong>
              )}
              {targetBolsoReais > 0 ? (
                <>
                  {' '}
                  com <strong>{formatBRL(targetBolsoReais)} de lance do bolso</strong>
                </>
              ) : null}
              . Você pode ajustar qualquer grupo, carta ou lance abaixo:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor PF vs PJ + Seguro Prestamista */}
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setTipoPessoa('PF')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition ${
                  tipoPessoa === 'PF'
                    ? 'bg-bb-blue text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" /> PF (CPF)
              </button>
              <button
                type="button"
                onClick={() => setTipoPessoa('PJ')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition ${
                  tipoPessoa === 'PJ'
                    ? 'bg-bb-blue text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> PJ (CNPJ)
              </button>
            </div>

            <label
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition ${
                incluirSeguro
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-300 text-slate-600'
              }`}
              title="Adiciona o Seguro de Vida Prestamista BB Consórcios conforme Pessoa Física (0,038% a.m.) ou Pessoa Jurídica (0,054% a.m.)"
            >
              <input
                type="checkbox"
                checked={incluirSeguro}
                onChange={(e) => setIncluirSeguro(e.target.checked)}
                className="rounded text-emerald-600"
              />
              <Shield className="w-3.5 h-3.5" />
              Seguro {tipoPessoa} ({ALIQUOTA_SEGURO_MENSAL[tipoPessoa]}% a.m.)
            </label>

            <select
              value={modality}
              onChange={(e) => onChangeModality(e.target.value as CodigoModalidade)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-bb-blue"
            >
              {MODALIDADES_LIST.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} — {m.label}
                </option>
              ))}
            </select>

            <button
              onClick={toggleFlexMaster}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 transition"
              title="Troca todas as cotas abaixo entre a tabela Flex (-2% taxa) e a tabela Master"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Trocar p/ {modality.endsWith('3') ? 'Master (4)' : 'Flex (-2% Taxa)'}
            </button>

            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-bb-blue cursor-pointer">
              <input
                type="checkbox"
                checked={agrupar}
                onChange={(e) => onChangeAgrupar(e.target.checked)}
                className="rounded text-bb-blue focus:ring-bb-blue"
              />
              <Layers className="w-3.5 h-3.5" />
              Somar Cotas
            </label>
          </div>
        </div>

        {/* 4 Slots de Propostas */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {slots.map((slot, idx) => {
            const selectedItem = items.find((i) => i.id === slot.groupId) || null;
            const calc = selectedItem
              ? calculateProposal(slot, selectedItem, tipoPessoa, incluirSeguro)
              : null;
            const currentGroupFilter =
              slotGroupFilter[idx] !== undefined
                ? slotGroupFilter[idx]
                : selectedItem?.grupo || 'TODOS';

            const cardsInSelectedGroup =
              currentGroupFilter === 'TODOS'
                ? modalityItems
                : modalityItems.filter((i) => i.grupo === currentGroupFilter);

            const isEmbutidoNative =
              selectedItem?.tags.includes('Lance Embutido') ||
              selectedItem?.bemDescricao.toUpperCase().includes('EMBUTIDO');
            const isFixo20Native =
              selectedItem?.tags.includes('Lance Fixo 20%') ||
              selectedItem?.bemDescricao.toUpperCase().includes('FIXO 20');

            return (
              <div
                key={idx}
                className={`rounded-xl border p-4 transition flex flex-col justify-between ${
                  slot.enabled
                    ? 'border-bb-blue/40 bg-blue-50/15 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 opacity-75'
                }`}
              >
                <div className="space-y-3">
                  {/* Topo do Card */}
                  <div className="space-y-1.5 pb-2 border-b border-slate-200/70">
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={slot.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            const defaultId =
                              !slot.groupId && modalityItems.length > 0
                                ? modalityItems[Math.min(idx, modalityItems.length - 1)].id
                                : slot.groupId;
                            updateSlot(idx, { enabled, groupId: defaultId });
                          }}
                          className="rounded text-bb-blue focus:ring-bb-blue"
                        />
                        <span className="text-xs font-extrabold text-bb-dark uppercase tracking-wide">
                          Proposta {idx + 1}
                        </span>
                      </label>

                      {slot.enabled && selectedItem && (
                        <div className="flex items-center gap-1 shrink-0">
                          {onOpenAssembleiaGroup && selectedItem.grupo !== '000000' && (
                            <button
                              type="button"
                              onClick={() => onOpenAssembleiaGroup(selectedItem.grupo)}
                              className="px-2 py-1 rounded-md bg-blue-100/80 hover:bg-blue-200 text-bb-blue text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap transition"
                              title="Ver Histórico de Assembleias deste Grupo"
                            >
                              <BarChart3 className="w-3 h-3 shrink-0" /> Assemb.
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => duplicateSlotToNext(idx)}
                            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition"
                            title="Duplicar esta proposta para o próximo card"
                          >
                            <CopyPlus className="w-3 h-3 shrink-0" /> Duplicar
                          </button>
                        </div>
                      )}
                    </div>

                    {slot.enabled && (
                      <div
                        className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-full ${
                          idx === 0
                            ? 'bg-blue-100/70 text-bb-blue'
                            : idx === 1
                            ? 'bg-emerald-100/70 text-emerald-800'
                            : idx === 2
                            ? 'bg-amber-100/80 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span>
                          {idx === 0
                            ? '🎯 Cenário 1: Crédito Líquido Ideal'
                            : idx === 1
                            ? '💰 Cenário 2: Menor Parcela Mensal'
                            : idx === 2
                            ? '⚡ Cenário 3: Menor Lance Mín. (12m)'
                            : '➕ Cenário 4: Comparativo Extra'}
                        </span>
                      </div>
                    )}
                  </div>

                  {slot.enabled ? (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          1º Filtrar Grupo (Prazo / Regra / Vagas)
                        </label>
                        <select
                          value={currentGroupFilter}
                          onChange={(e) => {
                            const grp = e.target.value;
                            setSlotGroupFilter((prev) => ({ ...prev, [idx]: grp }));
                            if (grp !== 'TODOS') {
                              const firstCard = modalityItems.find((i) => i.grupo === grp);
                              if (firstCard) {
                                updateSlot(idx, { groupId: firstCard.id });
                              }
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-bb-blue"
                        >
                          <option value="TODOS">
                            Todos os Grupos ({uniqueGroupsSummary.length} disponíveis)
                          </option>
                          {uniqueGroupsSummary.map((g) => (
                            <option key={g.grupo} value={g.grupo}>
                              G.{g.grupo} • {g.prazo}m • {g.bemDescricao} ({g.vagas} vagas)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          2º Valor da Carta (Crédito Unitário)
                        </label>
                        <select
                          value={slot.groupId || ''}
                          onChange={(e) => {
                            const newId = e.target.value ? Number(e.target.value) : null;
                            const found = items.find((i) => i.id === newId);
                            if (found) {
                              setSlotGroupFilter((prev) => ({ ...prev, [idx]: found.grupo }));
                            }
                            updateSlot(idx, { groupId: newId });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-bb-blue/50 rounded-lg bg-white font-bold text-bb-blue focus:ring-2 focus:ring-bb-blue"
                        >
                          {cardsInSelectedGroup.map((it) => (
                            <option key={it.id} value={it.id}>
                              {formatBRL(it.valorBem)} — Parc: {formatBRL(it.parcela)} ({it.prazo}m | G.{it.grupo})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedItem && (
                        <div className="bg-white rounded-lg p-2 border border-slate-200 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                            <span className="font-bold text-slate-700 truncate max-w-[160px]">
                              {selectedItem.bemDescricao}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                selectedItem.vagas > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {selectedItem.vagas > 0
                                ? `${selectedItem.vagas} vagas`
                                : 'Em Formação'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 text-[10px]">
                            {isEmbutidoNative && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                                ✓ Aceita Embutido
                              </span>
                            )}
                            {isFixo20Native && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                                ✓ Lance Fixo 20%
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const minGrupo = Number(selectedItem.percMinContemp.toFixed(2));
                                const emb = isEmbutidoNative ? Math.min(30, minGrupo) : 0;
                                const bolso = Math.max(0, Number((minGrupo - emb).toFixed(2)));
                                updateSlot(idx, {
                                  lanceEmbutidoPerc: emb,
                                  lanceRecursoProprioPerc: bolso,
                                });
                              }}
                              className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold inline-flex items-center gap-0.5 transition"
                              title="Clique para preencher automaticamente com o Lance Mínimo deste grupo"
                            >
                              <TrendingDown className="w-3 h-3" />
                              Usar Mín. 12m ({formatPercent(selectedItem.percMinContemp, 1)})
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Qtd. de Cotas
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={slot.cotas}
                            onChange={(e) =>
                              updateSlot(idx, { cotas: Math.max(1, Number(e.target.value) || 1) })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-indigo-700 mb-1">
                            Lance Embutido (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={30}
                            step={5}
                            value={slot.lanceEmbutidoPerc}
                            onChange={(e) =>
                              updateSlot(idx, {
                                lanceEmbutidoPerc: Math.max(
                                  0,
                                  Math.min(30, Number(e.target.value) || 0)
                                ),
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-indigo-300 rounded-lg bg-indigo-50/60 font-bold text-indigo-900"
                          />
                        </div>
                      </div>

                      {calc && (
                        <div className="bg-slate-100/80 p-2.5 rounded-lg border border-slate-200 space-y-2">
                          <div className="text-[11px] font-bold text-slate-700">
                            Lance Recurso Próprio (Bolso — digite em % ou R$):
                          </div>
                          <div className="grid grid-cols-12 gap-1.5">
                            <div className="col-span-5">
                              <span className="block text-[10px] text-slate-500 mb-0.5">
                                Em %
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={95}
                                step={0.5}
                                value={Number(slot.lanceRecursoProprioPerc.toFixed(2))}
                                onChange={(e) =>
                                  updateSlot(idx, {
                                    lanceRecursoProprioPerc: Math.max(
                                      0,
                                      Number(e.target.value) || 0
                                    ),
                                  })
                                }
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-bold text-bb-blue"
                              />
                            </div>
                            <div className="col-span-7">
                              <span className="block text-[10px] text-slate-500 mb-0.5">
                                Ou Valor em R$
                              </span>
                              <CurrencyInput
                                value={Number(calc.valorLanceRecursoProprio.toFixed(2))}
                                onChange={(reais) => {
                                  const perc =
                                    calc.creditoBruto > 0
                                      ? (reais / calc.creditoBruto) * 100
                                      : 0;
                                  updateSlot(idx, {
                                    lanceRecursoProprioPerc: Math.min(95, perc),
                                  });
                                }}
                                placeholder="0,00"
                                showClear={false}
                                allowZeroDisplay={true}
                                prefixClassName="text-emerald-700"
                                inputClassName="py-1 border border-slate-300 rounded bg-white font-bold text-emerald-800"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateSlot(idx, { lanceRecursoProprioPerc: 0, lanceEmbutidoPerc: 0 })
                          }
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium"
                        >
                          0%
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSlot(idx, { lanceRecursoProprioPerc: 20, lanceEmbutidoPerc: 0 })
                          }
                          className="text-[10px] px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold"
                        >
                          Fixo 20%
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSlot(idx, { lanceRecursoProprioPerc: 0, lanceEmbutidoPerc: 30 })
                          }
                          className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold"
                        >
                          30% Emb.
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSlot(idx, { lanceRecursoProprioPerc: 15, lanceEmbutidoPerc: 30 })
                          }
                          className="text-[10px] px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold"
                        >
                          30% Emb + 15% Bolso
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const defaultId =
                            modalityItems.length > 0
                              ? modalityItems[Math.min(idx, modalityItems.length - 1)].id
                              : null;
                          updateSlot(idx, { enabled: true, groupId: defaultId });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:border-bb-blue text-slate-700"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ativar Proposta {idx + 1}
                      </button>
                    </div>
                  )}
                </div>

                {slot.enabled && calc && (
                  <div className="mt-3 pt-2.5 border-t border-blue-200/60 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Crédito Bruto:</span>
                      <span className="font-bold text-slate-800">{formatBRL(calc.creditoBruto)}</span>
                    </div>
                    <div className="flex justify-between bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-900 font-extrabold">
                      <span>Crédito Líquido:</span>
                      <span>{formatBRL(calc.creditoLiquido)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Parcela {incluirSeguro ? `c/ Seg. ${tipoPessoa}` : 'Inicial'}:
                      </span>
                      <span className="font-bold text-bb-blue">
                        {calc.prazo}x {formatBRL(calc.parcelaMensalTotal)}
                      </span>
                    </div>
                    {calc.lanceTotalPerc > 0 && (
                      <>
                        <div className="flex justify-between text-slate-700">
                          <span>Lance do Bolso:</span>
                          <span className="font-bold">
                            {formatBRL(calc.valorLanceRecursoProprio)} (
                            {formatPercent(calc.lanceRecursoProprioPerc, 1)})
                          </span>
                        </div>
                        <div className="flex justify-between text-bb-dark font-extrabold">
                          <span>Pós-Lance ({formatPercent(calc.lanceTotalPerc, 1)}):</span>
                          <span>{formatBRL(calc.parcelaPosLance)}</span>
                        </div>
                        <div
                          className={`mt-1 px-2 py-1 rounded text-[10px] font-bold flex items-center justify-between ${
                            calc.lanceTotalPerc >= calc.item.percMinContemp
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <span>
                            {calc.lanceTotalPerc >= calc.item.percMinContemp
                              ? '🔥 Acima da média 12m'
                              : '⚠️ Abaixo da média 12m'}
                          </span>
                          <span>
                            Seu: {formatPercent(calc.lanceTotalPerc, 1)} | Grupo:{' '}
                            {formatPercent(calc.item.percMinContemp, 1)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dados do Cliente e Botões de Ação */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nome do Cliente ({tipoPessoa})
            </label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder={
                tipoPessoa === 'PF' ? 'Ex: João da Silva' : 'Ex: Agropecuária Boa Vista LTDA'
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Telefone / WhatsApp Cliente
            </label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 90000-0000"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Especialista Responsável
            </label>
            <input
              type="text"
              value={especialista}
              onChange={(e) => setEspecialista(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Observação Interna (CRM)
            </label>
            <input
              type="text"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Ex: Cliente quer Trator c/ 30% embutido"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-bb-blue hover:bg-bb-dark text-white transition"
            >
              {savedToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savedToast ? 'Salvo!' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition"
            >
              {copiedWhats ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedWhats ? 'Copiado!' : 'WhatsApp'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold bg-bb-yellow hover:bg-bb-yellowHover text-bb-dark transition"
            >
              <Printer className="w-4 h-4" />
              PDF / Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* FOLHA DE PROPOSTA OFICIAL */}
      {calculatedProposals.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden print:shadow-none print:border-none">
          <div className="bg-bb-blue text-white px-6 py-5 border-b-4 border-bb-yellow flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-xl px-3 py-1.5 shadow-sm flex items-center justify-center shrink-0">
                <img
                  src="./logo-bb-consorcios.png"
                  alt="BB Consórcios"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-bb-yellow font-bold flex items-center gap-2">
                  <span>Proposta Comercial — BB Consórcios</span>
                  <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px]">
                    {tipoPessoa === 'PF' ? 'Pessoa Física (CPF)' : 'Pessoa Jurídica (CNPJ)'}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold mt-0.5">
                  Simulação de Consórcio:{' '}
                  {OBJETIVOS_COMPRA.find((o) => o.id === objetivo)?.label || ''} —{' '}
                  {MODALIDADES_LIST.find((m) => m.code === modality)?.label || modality}
                </h3>
                {cliente && (
                  <p className="text-xs text-blue-100 mt-1">
                    Cliente: <strong>{cliente}</strong> {telefone ? `(${telefone})` : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-bb-yellow">{especialista}</div>
              {telefoneEspecialista && <div className="text-blue-100">{telefoneEspecialista}</div>}
              <div className="text-[11px] text-blue-200 mt-0.5">
                Data: {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-3 text-xs text-slate-500 flex items-center justify-between print:hidden">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-bb-blue" />
                Desmarque qualquer caixa na coluna esquerda caso queira ocultar aquela linha na impressão / PDF.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="py-2.5 px-3 text-left w-64">Grupo / Parâmetros</th>
                    {calculatedProposals.map((p, idx) => (
                      <th key={idx} className="py-2.5 px-3 text-center">
                        <div>Grupo {p.item.grupo}</div>
                        <div className="text-[10px] font-normal text-bb-yellow">
                          Opção {idx + 1} ({p.item.plano})
                        </div>
                      </th>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <th className="py-2.5 px-3 text-center bg-bb-dark text-bb-yellow">
                        <div>Total Agrupado</div>
                        <div className="text-[10px] font-normal text-white">
                          ({aggregated.cotasTotal} cotas)
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className={!visibleRows.bemRegra ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.bemRegra}
                          onChange={() => toggleRow('bemRegra')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Bem de Referência / Regra BB
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-medium text-slate-700">
                        {p.item.bemDescricao}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center bg-blue-50/40 font-semibold text-slate-700">
                        Múltiplas Cotas
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.creditoBruto ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.creditoBruto}
                          onChange={() => toggleRow('creditoBruto')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Valor da Carta (Crédito Bruto)
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-bold text-slate-900">
                        {formatBRL(p.creditoBruto)}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center font-extrabold text-bb-blue bg-blue-50/40">
                        {formatBRL(aggregated.creditoBrutoTotal)}
                      </td>
                    )}
                  </tr>

                  <tr
                    className={
                      !visibleRows.lanceEmbutido ? 'opacity-40 print:hidden' : 'bg-indigo-50/40'
                    }
                  >
                    <td className="py-2 px-3 font-semibold text-indigo-900 bg-indigo-50/70">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.lanceEmbutido}
                          onChange={() => toggleRow('lanceEmbutido')}
                          className="print:hidden rounded text-indigo-600"
                        />
                        (-) Lance Embutido (da própria carta)
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-semibold text-indigo-800">
                        {p.lanceEmbutidoPerc > 0
                          ? `${formatPercent(p.lanceEmbutidoPerc, 1)} (${formatBRL(
                              p.valorLanceEmbutido
                            )})`
                          : 'Não utilizado (0%)'}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center font-bold text-indigo-900 bg-indigo-100/50">
                        {aggregated.lanceEmbutidoTotal > 0
                          ? `${formatPercent(aggregated.lanceEmbutidoPercMedio, 1)} (${formatBRL(
                              aggregated.lanceEmbutidoTotal
                            )})`
                          : 'R$ 0,00'}
                      </td>
                    )}
                  </tr>

                  <tr
                    className={
                      !visibleRows.creditoLiquido ? 'opacity-40 print:hidden' : 'bg-emerald-50/60'
                    }
                  >
                    <td className="py-2.5 px-3 font-extrabold text-emerald-900 bg-emerald-100/60">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.creditoLiquido}
                          onChange={() => toggleRow('creditoLiquido')}
                          className="print:hidden rounded text-emerald-700"
                        />
                        (=) Crédito Líquido a Liberar
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td
                        key={idx}
                        className="py-2.5 px-3 text-center font-extrabold text-emerald-800 text-sm"
                      >
                        {formatBRL(p.creditoLiquido)}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2.5 px-3 text-center font-extrabold text-emerald-900 bg-emerald-100/80 text-sm">
                        {formatBRL(aggregated.creditoLiquidoTotal)}
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.prazo ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.prazo}
                          onChange={() => toggleRow('prazo')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Qtd. Parcelas em Meses
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-semibold">
                        {p.prazo} meses
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center bg-blue-50/40 font-semibold">-</td>
                    )}
                  </tr>

                  <tr className={!visibleRows.seguroPrestamista ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.seguroPrestamista}
                          onChange={() => toggleRow('seguroPrestamista')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Seguro Prestamista ({tipoPessoa})
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center text-slate-700">
                        {incluirSeguro
                          ? `${formatBRL(p.valorSeguroMensal)}/mês (${p.aliquotaSeguroMensal}% a.m.)`
                          : 'Opcional / Não incluso (R$ 0,00)'}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center font-semibold bg-blue-50/40">
                        {incluirSeguro
                          ? `${formatBRL(aggregated.valorSeguroMensalTotal)}/mês`
                          : 'R$ 0,00'}
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.parcelaMensal ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.parcelaMensal}
                          onChange={() => toggleRow('parcelaMensal')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Parcela Mensal {incluirSeguro ? `(c/ Seguro ${tipoPessoa})` : '(Antes do Lance)'}
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-bold text-bb-blue">
                        {formatBRL(p.parcelaMensalTotal)}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center font-extrabold text-bb-blue bg-blue-50/40">
                        {formatBRL(aggregated.parcelaMensalTotal)}
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.lanceRecursoProprio ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.lanceRecursoProprio}
                          onChange={() => toggleRow('lanceRecursoProprio')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Lance Recurso Próprio (Desembolso)
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-semibold text-slate-800">
                        {formatPercent(p.lanceRecursoProprioPerc, 1)} (
                        {formatBRL(p.valorLanceRecursoProprio)})
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center font-bold text-slate-900 bg-blue-50/40">
                        {formatPercent(aggregated.lanceProprioPercMedio, 2)} (
                        {formatBRL(aggregated.lanceRecursoProprioTotal)})
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.lanceTotal ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.lanceTotal}
                          onChange={() => toggleRow('lanceTotal')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Lance Total Ofertado (Bolso + Embutido)
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-bold text-slate-900">
                        {formatPercent(p.lanceTotalPerc, 1)} ({formatBRL(p.valorLanceTotal)})
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center font-extrabold text-slate-900 bg-blue-50/40">
                        {formatPercent(aggregated.lanceTotalPercMedio, 2)} (
                        {formatBRL(aggregated.lanceTotalValor)})
                      </td>
                    )}
                  </tr>

                  <tr
                    className={
                      !visibleRows.parcelaPosLance ? 'opacity-40 print:hidden' : 'bg-amber-50/50'
                    }
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-800 bg-amber-100/50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.parcelaPosLance}
                          onChange={() => toggleRow('parcelaPosLance')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Parcela Após Diluir o Lance
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2.5 px-3 text-center font-extrabold text-bb-dark">
                        {formatBRL(p.parcelaPosLance)}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2.5 px-3 text-center font-extrabold text-bb-dark bg-amber-100/60">
                        {aggregated.faixasParcelaPosLance.map((fx, i) => (
                          <div key={i}>{fx}</div>
                        ))}
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.prazoPosLance ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.prazoPosLance}
                          onChange={() => toggleRow('prazoPosLance')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Qtd. Parcelas Após Abater Prazo
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-semibold">
                        {p.prazoPosLance} meses
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center font-bold bg-blue-50/40">
                        {aggregated.prazoPosLanceMax} meses
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.valorUnitario ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.valorUnitario}
                          onChange={() => toggleRow('valorUnitario')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Valor Unitário da Cota
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center">
                        {formatBRL(p.valorUnitario)}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center bg-blue-50/40">
                        {formatBRL(aggregated.creditoBrutoTotal)}
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.cotas ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.cotas}
                          onChange={() => toggleRow('cotas')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Qtd. de Cotas
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-semibold">
                        {p.cotas}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center font-bold bg-blue-50/40">
                        {aggregated.cotasTotal}
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.taxaMensalizada ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.taxaMensalizada}
                          onChange={() => toggleRow('taxaMensalizada')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Taxa de Adm. Mensalizada
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center">
                        {formatPercent(p.taxaMensalizada, 2)} a.m.
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center bg-blue-50/40">
                        {formatPercent(aggregated.taxaMensalizadaMedia, 2)} a.m.
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.taxaAnual ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.taxaAnual}
                          onChange={() => toggleRow('taxaAnual')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Taxa de Adm. Anualizada
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center">
                        {formatPercent(p.taxaAnual, 2)} a.a.
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center bg-blue-50/40">
                        {formatPercent(aggregated.taxaAnualMedia, 2)} a.a.
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.taxaAdm ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.taxaAdm}
                          onChange={() => toggleRow('taxaAdm')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Taxa de Administração Total
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center">
                        {formatPercent(p.taxaAdm, 2)}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center bg-blue-50/40">
                        {formatPercent(aggregated.taxaAdmMedia, 2)}
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.fundoReserva ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.fundoReserva}
                          onChange={() => toggleRow('fundoReserva')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Fundo de Reserva
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center">
                        {formatPercent(p.fundoReserva, 2)}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center bg-blue-50/40">
                        {formatPercent(aggregated.fundoReservaMedio, 2)}
                      </td>
                    )}
                  </tr>

                  <tr className={!visibleRows.indiceCorrecao ? 'opacity-40 print:hidden' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-700 bg-slate-50">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleRows.indiceCorrecao}
                          onChange={() => toggleRow('indiceCorrecao')}
                          className="print:hidden rounded text-bb-blue"
                        />
                        Índice de Correção Anual
                      </label>
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td key={idx} className="py-2 px-3 text-center font-semibold">
                        {p.indiceCorrecao}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center bg-blue-50/40">-</td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div
                className={`border border-slate-200 rounded-lg p-4 ${
                  !visibleRows.diferenciais ? 'opacity-40 print:hidden' : ''
                }`}
              >
                <div className="font-bold text-xs text-bb-blue uppercase tracking-wider mb-2 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleRows.diferenciais}
                      onChange={() => toggleRow('diferenciais')}
                      className="print:hidden rounded text-bb-blue"
                    />
                    Diferenciais do Plano
                  </label>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                  {DIFERENCIAIS_LIST.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              <div
                className={`border border-slate-200 rounded-lg p-4 ${
                  !visibleRows.beneficios ? 'opacity-40 print:hidden' : ''
                }`}
              >
                <div className="font-bold text-xs text-bb-blue uppercase tracking-wider mb-2 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleRows.beneficios}
                      onChange={() => toggleRow('beneficios')}
                      className="print:hidden rounded text-bb-blue"
                    />
                    Principais Benefícios BB Consórcios
                  </label>
                </div>
                <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                  {BENEFICIOS_LIST.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 text-[10px] text-slate-400 text-center">
              Simulação sujeita à disponibilidade de vagas no grupo na data da adesão. Valores em Reais (R$) atualizados conforme tabela vigente BB Consórcios.
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          Selecione pelo menos um grupo em uma das 4 propostas acima para visualizar a Folha de Proposta.
        </div>
      )}
    </div>
  );
};
