import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BarChart3,
  Building2,
  Calculator,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  CopyPlus,
  Download,
  Layers,
  Plus,
  Printer,
  Save,
  Shield,
  SlidersHorizontal,
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
import { generateProposalPngBlob } from '../utils/exportProposalImage';
import { CurrencyInput } from './CurrencyInput';

interface SimulatorTabProps {
  items: ConsorcioItem[];
  modality: CodigoModalidade;
  onChangeModality: (mod: CodigoModalidade) => void;
  slots: ProposalSlot[];
  onChangeSlots: (slots: ProposalSlot[]) => void;
  agrupar: boolean;
  onChangeAgrupar: (val: boolean) => void;
  onApplyAutoProposal?: (
    mod: CodigoModalidade,
    slots: ProposalSlot[],
    agrupar: boolean
  ) => void;
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
      i.segmento === 'TC' && !i.bemDescricao.includes('SUSTENTAVEIS'),
  },
  {
    id: 'CAMINHAO',
    label: 'Caminhão / Pesados',
    emoji: '🚛',
    seg: 'TC',
    defaultModFlex: 'TC3',
    defaultModMaster: 'TC4',
    filterFn: (i) =>
      i.segmento === 'TC' && !i.bemDescricao.includes('SUSTENTAVEIS'),
  },
  {
    id: 'IRRIGACAO',
    label: 'Irrigação / Pivô',
    emoji: '💧',
    seg: 'TC',
    defaultModFlex: 'TC3',
    defaultModMaster: 'TC4',
    // Na BB Consórcios, qualquer grupo PESADOS / TRATOR / IRRIGAÇÃO do segmento TC fatura Pivô e Irrigação
    filterFn: (i) =>
      i.segmento === 'TC' && !i.bemDescricao.includes('SUSTENTAVEIS'),
  },
  {
    id: 'REBANHO',
    label: 'Rebanho / Pecuária',
    emoji: '🐄',
    seg: 'EE',
    defaultModFlex: 'EE3',
    defaultModMaster: 'EE4',
    filterFn: (i) =>
      i.tags.includes('Rebanho e Genética') || i.bemDescricao.includes('REBANHO'),
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
  onApplyAutoProposal,
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
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [justUpdated, setJustUpdated] = useState<boolean>(false);
  const [showRowConfig, setShowRowConfig] = useState<boolean>(false);

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

  // MOTOR DE RECOMENDAÇÃO INTELIGENTE (Modo 1 Proposta Exata ou Comparativo de 3 Cenários)
  const runProposalBuilder = (mode: 'single' | 'compare3') => {
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

    interface CandidateScenario {
      item: ConsorcioItem;
      cotas: number;
      embPerc: number;
      bolsoPerc: number;
      creditoBruto: number;
      creditoLiquido: number;
      parcelaInicial: number;
      parcelaPosLance: number;
      lanceTotalPerc: number;
      scoreCredito: number;
      withinBudget: boolean;
      beatsGroupMin: boolean;
    }

    const candidates: CandidateScenario[] = [];

    for (const item of pool) {
      const embOptions = targetUsarEmbutido ? [30, 0] : [0];

      for (const embPerc of embOptions) {
        if (targetUsarEmbutido && embPerc === 0 && item.percMinContemp > 30 && bolsoReais === 0) {
          continue;
        }

        const fatorLiq = 1 - embPerc / 100;

        // Avalia de 1 até 12 cotas para atender desde cartas pequenas até R$ 1 Milhão+
        for (let cotas = 1; cotas <= 12; cotas++) {
          const creditoBruto = item.valorBem * cotas;
          const creditoLiquido = creditoBruto * fatorLiq;
          const parcelaInicial = item.parcela * cotas;

          let bolsoPerc = 15;
          if (bolsoReais > 0 && creditoBruto > 0) {
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

          const scoreCredito =
            liquidoDesejado > 0
              ? Math.abs(creditoLiquido - liquidoDesejado) / liquidoDesejado
              : mensalidadeMax > 0
              ? Math.abs(parcelaPosLance - mensalidadeMax) / mensalidadeMax
              : 0;

          const refParcela = lanceTotalPerc > 0 ? parcelaPosLance : parcelaInicial;
          const withinBudget = mensalidadeMax <= 0 || refParcela <= mensalidadeMax * 1.12;
          const beatsGroupMin = lanceTotalPerc >= item.percMinContemp;

          // Margem estrita (-8% a +14% do crédito líquido pedido) para nunca sugerir valores desconexos
          const reasonableCredit =
            liquidoDesejado <= 0 ||
            (creditoLiquido >= liquidoDesejado * 0.92 &&
              creditoLiquido <= liquidoDesejado * 1.14);

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
              lanceTotalPerc,
              scoreCredito,
              withinBudget,
              beatsGroupMin,
            });
          }
        }
      }
    }

    // Fallback caso o valor digitado seja muito baixo ou muito alto para a faixa de -8% a +14%
    if (candidates.length === 0 && liquidoDesejado > 0) {
      for (const item of pool) {
        const embPerc = targetUsarEmbutido ? 30 : 0;
        const fatorLiq = 1 - embPerc / 100;
        for (let cotas = 1; cotas <= 15; cotas++) {
          const creditoBruto = item.valorBem * cotas;
          const creditoLiquido = creditoBruto * fatorLiq;
          const parcelaInicial = item.parcela * cotas;
          const bolsoPerc =
            bolsoReais > 0 && creditoBruto > 0
              ? Math.min(69, (bolsoReais / creditoBruto) * 100)
              : 0;
          const lanceTotalPerc = embPerc + bolsoPerc;
          const lanceTotalValor = creditoBruto * (lanceTotalPerc / 100);
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
            lanceTotalPerc,
            scoreCredito,
            withinBudget,
            beatsGroupMin: lanceTotalPerc >= item.percMinContemp,
          });
        }
      }
    }

    const workingList =
      candidates.filter((c) => c.withinBudget).length > 0
        ? candidates.filter((c) => c.withinBudget)
        : candidates;

    if (workingList.length === 0) return;

    // 1. Proposta Principal (Prioriza quem usa a preferência de embutido, supera a média do grupo e crava o crédito líquido)
    const preferredEmb = targetUsarEmbutido ? 30 : 0;
    const byBestFit = [...workingList].sort((a, b) => {
      const aPref = a.embPerc === preferredEmb ? 0 : 1;
      const bPref = b.embPerc === preferredEmb ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;
      if (a.beatsGroupMin !== b.beatsGroupMin) return a.beatsGroupMin ? -1 : 1;
      return a.scoreCredito - b.scoreCredito;
    });
    const c1 = byBestFit[0];

    let chosenScenarios: CandidateScenario[] = [c1];

    if (mode === 'compare3') {
      // 2. Menor Parcela Pós-Lance (mantendo o MESMO crédito líquido em outro grupo ou sem embutido)
      const byLowestInstallment = [...workingList].sort(
        (a, b) => a.parcelaPosLance - b.parcelaPosLance
      );
      const c2 =
        byLowestInstallment.find((c) => c.item.grupo !== c1.item.grupo) ||
        byLowestInstallment.find(
          (c) => c.item.id !== c1.item.id || c.embPerc !== c1.embPerc
        ) ||
        c1;

      // 3. Menor Lance Mínimo Histórico 12m (Grupo mais fácil de contemplar para o mesmo crédito)
      const byFastestContemp = [...workingList].sort(
        (a, b) => a.item.percMinContemp - b.item.percMinContemp || a.scoreCredito - b.scoreCredito
      );
      const c3 =
        byFastestContemp.find(
          (c) => c.item.grupo !== c1.item.grupo && c.item.grupo !== c2.item.grupo
        ) ||
        byFastestContemp.find((c) => c.item.grupo !== c1.item.grupo) ||
        c1;

      chosenScenarios = [c1, c2, c3].filter(
        (v, index, self) =>
          index ===
          self.findIndex(
            (t) => t.item.id === v.item.id && t.cotas === v.cotas && t.embPerc === v.embPerc
          )
      );
    }

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

    if (onApplyAutoProposal) {
      onApplyAutoProposal(targetMod, nextSlots, false);
    } else {
      onChangeModality(targetMod);
      onChangeAgrupar(false);
      onChangeSlots(nextSlots);
    }

    const newGroupFilters: Record<number, string> = {};
    chosenScenarios.forEach((sc, idx) => {
      newGroupFilters[idx] = sc.item.grupo;
    });
    setSlotGroupFilter(newGroupFilters);

    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1200);

    const hora = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (mode === 'single') {
      setAssistantFeedback(
        `[${hora}] Simulação atualizada para ${objConfig.label} (${targetMod}): Grupo ${
          c1.item.grupo
        } (${c1.cotas} cota${c1.cotas > 1 ? 's' : ''}) • Crédito Líquido: ${formatBRL(
          c1.creditoLiquido
        )} • Parcela Pós-Lance: ${formatBRL(c1.parcelaPosLance)}/mês.`
      );
    } else {
      setAssistantFeedback(
        `[${hora}] Comparativo de ${chosenScenarios.length} cenários para ${formatBRL(
          liquidoDesejado
        )} líquidos em ${objConfig.label} (${targetMod}) atualizado abaixo!`
      );
    }
  };

  const handleAutoBuildProposal = (e: React.FormEvent) => {
    e.preventDefault();
    runProposalBuilder('single');
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

  const handleCopyImage = async () => {
    if (calculatedProposals.length === 0) return;
    const modObj = MODALIDADES_LIST.find((m) => m.code === modality);
    const objObj = OBJETIVOS_COMPRA.find((o) => o.id === objetivo);
    const blob = await generateProposalPngBlob({
      proposals: calculatedProposals,
      aggregated,
      agrupar,
      modalidadeLabel: modObj?.label || modality,
      objetivoLabel: objObj?.label || '',
      tipoPessoa,
      incluirSeguro,
      cliente,
      telefone,
      especialista,
      telefoneEspecialista,
      visibleRows,
    });
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 3500);
    } catch {
      // Fallback para download caso o navegador bloqueie escrita de imagem no clipboard
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta-bb-${modality.toLowerCase()}-${Date.now().toString().slice(-4)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadImage = async () => {
    if (calculatedProposals.length === 0) return;
    const modObj = MODALIDADES_LIST.find((m) => m.code === modality);
    const objObj = OBJETIVOS_COMPRA.find((o) => o.id === objetivo);
    const blob = await generateProposalPngBlob({
      proposals: calculatedProposals,
      aggregated,
      agrupar,
      modalidadeLabel: modObj?.label || modality,
      objetivoLabel: objObj?.label || '',
      tipoPessoa,
      incluirSeguro,
      cliente,
      telefone,
      especialista,
      telefoneEspecialista,
      visibleRows,
    });
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposta-bb-${modality.toLowerCase()}-${Date.now().toString().slice(-4)}.png`;
    a.click();
    URL.revokeObjectURL(url);
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
      {/* SIMULADOR INTELIGENTE: OBJETIVO DE COMPRA + CRÉDITO + MENSALIDADE + LANCE */}
      <form
        onSubmit={handleAutoBuildProposal}
        className="bg-gradient-to-br from-bb-dark via-bb-blue to-blue-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg print:hidden space-y-5 border border-blue-700/80"
      >
        {/* Cabeçalho do Simulador Inteligente */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/15">
          <div>
            <div className="inline-flex items-center gap-2 text-lg sm:text-xl font-black text-bb-yellow uppercase tracking-tight">
              <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              Simulador Inteligente
            </div>
            <p className="text-xs sm:text-sm text-blue-100 mt-1">
              Escolha o bem que o cliente deseja adquirir, informe quanto ele precisa receber{' '}
              <strong className="text-white">livre na mão</strong> e a{' '}
              <strong className="text-white">parcela mensal</strong> ideal.
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-blue-950/60 p-1 border border-white/20 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => setPlanoPreferido('Flex')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition ${
                planoPreferido === 'Flex'
                  ? 'bg-bb-yellow text-bb-dark shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Plano Flex (-2% Taxa)
            </button>
            <button
              type="button"
              onClick={() => setPlanoPreferido('Master')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition ${
                planoPreferido === 'Master'
                  ? 'bg-bb-yellow text-bb-dark shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Plano Master (Taxa Cheia)
            </button>
          </div>
        </div>

        {/* Passo 1: O que o cliente deseja comprar? */}
        <div>
          <span className="block text-xs sm:text-sm font-extrabold text-bb-yellow uppercase tracking-wide mb-2">
            1. O que o cliente deseja comprar?
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {OBJETIVOS_COMPRA.map((obj) => {
              const active = objetivo === obj.id;
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => setObjetivo(obj.id)}
                  className={`px-3 py-2.5 rounded-xl text-left transition border flex flex-col justify-between ${
                    active
                      ? 'bg-bb-yellow text-bb-dark border-bb-yellow font-black shadow-md ring-2 ring-white/40'
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/20 font-semibold'
                  }`}
                >
                  <span className="text-lg sm:text-xl leading-none">{obj.emoji}</span>
                  <span className="text-[11px] sm:text-xs leading-tight mt-1.5">{obj.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Passo 2: Valores do Cliente (3 Colunas Amplas e Alinhadas) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-white/15">
          {/* Coluna 1: Crédito Líquido */}
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <label className="block text-xs sm:text-sm text-bb-yellow font-extrabold uppercase tracking-wide">
              2. Valor do Crédito Líquido
            </label>
            <span className="block text-[11px] text-blue-100 mb-2">
              Quanto o cliente precisa livre na mão para comprar o bem
            </span>
            <CurrencyInput
              value={targetLiquido}
              onChange={setTargetLiquido}
              placeholder="Ex: 350.000,00"
              prefixClassName="text-bb-blue"
              inputClassName="bg-white text-slate-900 py-2.5 text-sm focus:ring-2 focus:ring-bb-yellow"
            />
            <div className="grid grid-cols-5 gap-1 mt-2">
              {[100000, 200000, 350000, 500000, 1000000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTargetLiquido(v)}
                  className={`text-[11px] py-1 rounded-md font-extrabold text-center transition ${
                    targetLiquido === v
                      ? 'bg-bb-yellow text-bb-dark shadow-sm'
                      : 'bg-white/10 text-blue-100 hover:bg-white/20'
                  }`}
                >
                  {v >= 1000000 ? '1 Mi' : `${v / 1000} mil`}
                </button>
              ))}
            </div>
          </div>

          {/* Coluna 2: Parcela Mensal Ideal */}
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <label className="block text-xs sm:text-sm text-bb-yellow font-extrabold uppercase tracking-wide">
              3. Parcela Mensal Ideal
            </label>
            <span className="block text-[11px] text-blue-100 mb-2">
              Valor máximo que cabe no bolso por mês (ou deixe Livre)
            </span>
            <CurrencyInput
              value={targetMensalidadeMax}
              onChange={setTargetMensalidadeMax}
              placeholder="Sem limite (Livre)"
              prefixClassName="text-bb-blue"
              inputClassName="bg-white text-slate-900 py-2.5 text-sm focus:ring-2 focus:ring-bb-yellow"
            />
            <div className="grid grid-cols-5 gap-1 mt-2">
              {[0, 1500, 2500, 3500, 5000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTargetMensalidadeMax(v)}
                  className={`text-[11px] py-1 rounded-md font-extrabold text-center transition ${
                    targetMensalidadeMax === v
                      ? 'bg-bb-yellow text-bb-dark shadow-sm'
                      : 'bg-white/10 text-blue-100 hover:bg-white/20'
                  }`}
                >
                  {v === 0 ? 'Livre' : `${(v / 1000).toLocaleString('pt-BR')} mil`}
                </button>
              ))}
            </div>
          </div>

          {/* Coluna 3: Lance do Bolso */}
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <label className="block text-xs sm:text-sm text-bb-yellow font-extrabold uppercase tracking-wide">
              4. Lance do Bolso (Entrada)
            </label>
            <span className="block text-[11px] text-blue-100 mb-2">
              Valor em dinheiro próprio para ofertar de lance (Opcional)
            </span>
            <CurrencyInput
              value={targetBolsoReais}
              onChange={setTargetBolsoReais}
              placeholder="Sem lance do bolso (0,00)"
              prefixClassName="text-bb-blue"
              inputClassName="bg-white text-slate-900 py-2.5 text-sm focus:ring-2 focus:ring-bb-yellow"
            />
            <div className="grid grid-cols-5 gap-1 mt-2">
              {[0, 30000, 50000, 100000, 150000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTargetBolsoReais(v)}
                  className={`text-[11px] py-1 rounded-md font-extrabold text-center transition ${
                    targetBolsoReais === v
                      ? 'bg-bb-yellow text-bb-dark shadow-sm'
                      : 'bg-white/10 text-blue-100 hover:bg-white/20'
                  }`}
                >
                  {v === 0 ? 'Zero' : `${v / 1000} mil`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Barra Inferior: Opção de Lance Embutido + 2 Botões de Ação com Mesma Evidência */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-white/15">
          <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 cursor-pointer transition">
            <input
              type="checkbox"
              checked={targetUsarEmbutido}
              onChange={(e) => setTargetUsarEmbutido(e.target.checked)}
              className="w-4 h-4 rounded text-bb-yellow focus:ring-bb-yellow"
            />
            <div>
              <span className="block text-xs sm:text-sm font-extrabold text-white">
                Somar 30% de Lance Embutido (da própria carta)
              </span>
              <span className="block text-[11px] text-blue-200">
                Usa parte da carta como lance e já ajusta o valor bruto para entregar o crédito líquido exato
              </span>
            </div>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-bb-yellow hover:bg-bb-yellowHover text-bb-dark text-xs sm:text-sm font-black uppercase tracking-wide shadow-md transition"
            >
              <Target className="w-4 h-4 shrink-0" />
              Simular 1 Proposta Ideal
            </button>
            <button
              type="button"
              onClick={() => runProposalBuilder('compare3')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-blue-50 text-bb-dark border-2 border-bb-yellow text-xs sm:text-sm font-black uppercase tracking-wide shadow-md transition"
            >
              <Layers className="w-4 h-4 text-bb-blue shrink-0" />
              Simular 3 Propostas
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
      <div
        className={`bg-white rounded-xl shadow-sm border p-5 print:hidden space-y-5 transition-all duration-300 ${
          justUpdated
            ? 'border-bb-yellow ring-2 ring-bb-yellow bg-amber-50/10'
            : 'border-slate-200'
        }`}
      >
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
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-bold bg-bb-blue hover:bg-bb-dark text-white whitespace-nowrap transition"
            >
              {savedToast ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {savedToast ? 'Salvo!' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap transition"
            >
              {copiedWhats ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedWhats ? 'Copiado!' : 'WhatsApp'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-extrabold bg-bb-yellow hover:bg-bb-yellowHover text-bb-dark whitespace-nowrap transition"
            >
              <Printer className="w-3.5 h-3.5" />
              PDF / Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* QUADRO VISUAL DE PROPOSTA (PRONTO PARA PRINT / COPIAR IMAGEM / PDF) */}
      {calculatedProposals.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5 print:p-0 print:shadow-none print:border-none space-y-5">
          {/* Barra Superior de Exportação da Imagem / Print */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 print:hidden">
            <div>
              <h3 className="text-sm font-extrabold text-bb-dark uppercase tracking-wide flex items-center gap-2">
                <Camera className="w-4 h-4 text-bb-blue" />
                Quadro Visual da Proposta (Pronto para Print ou Copiar Imagem)
              </h3>
              <p className="text-xs text-slate-500">
                Visual limpo e sem caixinhas na tela: tire print direto ou clique em{' '}
                <strong>Copiar Imagem</strong> para colar (Ctrl+V) no WhatsApp do cliente!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRowConfig((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition ${
                  showRowConfig
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Personalizar Linhas
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black bg-bb-blue hover:bg-bb-dark text-white shadow-sm transition"
              >
                {copiedImage ? (
                  <Check className="w-4 h-4 text-bb-yellow" />
                ) : (
                  <Camera className="w-4 h-4 text-bb-yellow" />
                )}
                {copiedImage ? 'Imagem Copiada! (Cole no WhatsApp)' : 'Copiar Imagem p/ WhatsApp'}
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar PNG
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold bg-bb-yellow hover:bg-bb-yellowHover text-bb-dark transition"
              >
                <Printer className="w-3.5 h-3.5" />
                PDF / Imprimir
              </button>
            </div>
          </div>

          {/* Gaveta Opcional para Ocultar/Exibir Linhas (Fora da área de Print!) */}
          {showRowConfig && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 print:hidden">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Marque ou desmarque as informações que deseja exibir no quadro abaixo:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                {[
                  { key: 'creditoBruto', label: 'Crédito Bruto' },
                  { key: 'lanceEmbutido', label: 'Lance Embutido' },
                  { key: 'creditoLiquido', label: 'Crédito a Liberar' },
                  { key: 'prazo', label: 'Qtd. Parcelas' },
                  { key: 'parcelaMensal', label: 'Parcela Mensal' },
                  { key: 'lanceTotal', label: 'Lance Proposto' },
                  { key: 'lanceRecursoProprio', label: 'Lance do Bolso' },
                  { key: 'parcelaPosLance', label: 'Parcela Pós-Lance' },
                  { key: 'valorUnitario', label: 'Valor Unitário' },
                  { key: 'cotas', label: 'Qtd. Cotas' },
                  { key: 'taxaMensalizada', label: 'Taxa Mensalizada' },
                  { key: 'taxaAnual', label: 'Taxa Anual' },
                  { key: 'indiceCorrecao', label: 'Índice Correção' },
                  { key: 'prazoPosLance', label: 'Prazo Após Lance' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium"
                  >
                    <input
                      type="checkbox"
                      checked={visibleRows[item.key]}
                      onChange={() => toggleRow(item.key)}
                      className="rounded text-bb-blue"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ÁREA DE PRINT LIMPA E CENTRALIZADA (ESTILO EXECUTIVO BB CONSÓRCIOS) */}
          <div
            className={`mx-auto bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none ${
              calculatedProposals.length === 1 ? 'max-w-[680px]' : 'max-w-[960px]'
            }`}
          >
            {/* Topo Amarelo Ouro Oficial BB Consórcios */}
            <div className="bg-[#FFCC00] rounded-lg py-3.5 px-6 flex items-center justify-center shadow-sm mb-2">
              <img
                src="./logo-bb-consorcios.png"
                alt="BB Consórcios"
                className="h-14 sm:h-16 w-auto object-contain"
              />
            </div>

            {/* Sub-barra Azul Escuro Institucional ("Modalidade: ...") */}
            <div className="bg-[#0F4C81] text-white px-4 py-2.5 border-2 border-slate-900 border-b-0 flex flex-wrap items-center justify-between gap-2">
              <div className="font-extrabold text-sm tracking-tight">
                Modalidade:{' '}
                {MODALIDADES_LIST.find((m) => m.code === modality)?.label || modality}
                {incluirSeguro ? ` • Seguro ${tipoPessoa}` : ''}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {cliente.trim() && (
                  <span className="font-bold text-[#FFCC00]">Cliente: {cliente.trim()}</span>
                )}
                {calculatedProposals.length > 1 && (
                  <span className="text-blue-100 font-semibold">
                    Comparativo ({calculatedProposals.length} opções)
                  </span>
                )}
              </div>
            </div>

            {/* BLOCO 1: Dados Principais do Grupo, Crédito e Lance */}
            <div className="border-2 border-slate-900 overflow-hidden">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <tbody className="divide-y divide-slate-300">
                  {/* Linha Grupo */}
                  <tr className="bg-white">
                    <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] w-[45%] border-r border-slate-400">
                      Grupo
                    </td>
                    {calculatedProposals.map((p, idx) => (
                      <td
                        key={idx}
                        className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                      >
                        {p.item.grupo.replace(/^0+/, '') || p.item.grupo}
                      </td>
                    ))}
                    {agrupar && calculatedProposals.length > 1 && (
                      <td className="py-2 px-3 text-center font-extrabold text-bb-dark bg-amber-50">
                        Soma ({aggregated.cotasTotal} cotas)
                      </td>
                    )}
                  </tr>

                  {/* Se houver Lance Embutido, exibe Valor da Carta Bruto e Lance Embutido para transparência total */}
                  {calculatedProposals.some((p) => p.lanceEmbutidoPerc > 0) &&
                    visibleRows.creditoBruto && (
                      <tr className="bg-slate-100/90">
                        <td className="py-2 px-3.5 font-bold text-[#0F4C81] border-r border-slate-400">
                          Valor da Carta (Bruto)
                        </td>
                        {calculatedProposals.map((p, idx) => (
                          <td
                            key={idx}
                            className="py-2 px-3 text-center font-bold text-slate-700 border-r border-slate-300 last:border-r-0"
                          >
                            {formatBRL(p.creditoBruto)}
                          </td>
                        ))}
                        {agrupar && calculatedProposals.length > 1 && (
                          <td className="py-2 px-3 text-center font-bold text-slate-800 bg-amber-50/60">
                            {formatBRL(aggregated.creditoBrutoTotal)}
                          </td>
                        )}
                      </tr>
                    )}

                  {calculatedProposals.some((p) => p.lanceEmbutidoPerc > 0) &&
                    visibleRows.lanceEmbutido && (
                      <tr className="bg-white">
                        <td className="py-2 px-3.5 font-bold text-indigo-900 border-r border-slate-400">
                          (-) Lance Embutido da Carta
                        </td>
                        {calculatedProposals.map((p, idx) => (
                          <td
                            key={idx}
                            className="py-2 px-3 text-center font-bold text-indigo-800 border-r border-slate-300 last:border-r-0"
                          >
                            {p.lanceEmbutidoPerc > 0
                              ? `${formatBRL(p.valorLanceEmbutido)} (${formatPercent(
                                  p.lanceEmbutidoPerc,
                                  0
                                )})`
                              : 'Não utilizado'}
                          </td>
                        ))}
                        {agrupar && calculatedProposals.length > 1 && (
                          <td className="py-2 px-3 text-center font-bold text-indigo-900 bg-amber-50/60">
                            {formatBRL(aggregated.lanceEmbutidoTotal)}
                          </td>
                        )}
                      </tr>
                    )}

                  {/* Crédito a Liberar */}
                  {visibleRows.creditoLiquido && (
                    <tr className="bg-emerald-50/90">
                      <td className="py-2.5 px-3.5 font-extrabold text-emerald-900 border-r border-slate-400">
                        Crédito a Liberar
                      </td>
                      {calculatedProposals.map((p, idx) => (
                        <td
                          key={idx}
                          className="py-2.5 px-3 text-center font-black text-emerald-800 text-sm sm:text-base border-r border-slate-300 last:border-r-0"
                        >
                          {formatBRL(p.creditoLiquido)}
                        </td>
                      ))}
                      {agrupar && calculatedProposals.length > 1 && (
                        <td className="py-2.5 px-3 text-center font-black text-emerald-900 bg-emerald-100 text-sm sm:text-base">
                          {formatBRL(aggregated.creditoLiquidoTotal)}
                        </td>
                      )}
                    </tr>
                  )}

                  {/* Qntd. Parcelas em Meses */}
                  {visibleRows.prazo && (
                    <tr className="bg-white">
                      <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] border-r border-slate-400">
                        Qntd. Parcelas em Meses
                      </td>
                      {calculatedProposals.map((p, idx) => (
                        <td
                          key={idx}
                          className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                        >
                          {p.prazo}
                        </td>
                      ))}
                      {agrupar && calculatedProposals.length > 1 && (
                        <td className="py-2 px-3 text-center font-extrabold text-[#0F4C81] bg-amber-50/60">
                          {Math.max(...calculatedProposals.map((p) => p.prazo))}
                        </td>
                      )}
                    </tr>
                  )}

                  {/* Parcela Mensal */}
                  {visibleRows.parcelaMensal && (
                    <tr className="bg-slate-100/90">
                      <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] border-r border-slate-400">
                        Parcela Mensal{incluirSeguro ? ` (c/ Seg. ${tipoPessoa})` : ''}
                      </td>
                      {calculatedProposals.map((p, idx) => (
                        <td
                          key={idx}
                          className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                        >
                          {formatBRL(p.parcelaMensalTotal)}
                        </td>
                      ))}
                      {agrupar && calculatedProposals.length > 1 && (
                        <td className="py-2 px-3 text-center font-extrabold text-[#0F4C81] bg-amber-50/60">
                          {formatBRL(aggregated.parcelaMensalTotal)}
                        </td>
                      )}
                    </tr>
                  )}

                  {/* Lance Proposto (%) */}
                  {visibleRows.lanceTotal && (
                    <tr className="bg-white">
                      <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] border-r border-slate-400">
                        Lance Proposto
                      </td>
                      {calculatedProposals.map((p, idx) => (
                        <td
                          key={idx}
                          className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                        >
                          {formatPercent(p.lanceTotalPerc, 2)}
                        </td>
                      ))}
                      {agrupar && calculatedProposals.length > 1 && (
                        <td className="py-2 px-3 text-center font-extrabold text-[#0F4C81] bg-amber-50/60">
                          {formatPercent(aggregated.lanceTotalPercMedio, 2)}
                        </td>
                      )}
                    </tr>
                  )}

                  {/* Valor do Lance (R$) */}
                  {visibleRows.lanceTotal && (
                    <tr className="bg-slate-100/90">
                      <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] border-r border-slate-400">
                        Valor do Lance
                      </td>
                      {calculatedProposals.map((p, idx) => (
                        <td
                          key={idx}
                          className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                        >
                          {formatBRL(p.valorLanceTotal)}
                        </td>
                      ))}
                      {agrupar && calculatedProposals.length > 1 && (
                        <td className="py-2 px-3 text-center font-extrabold text-[#0F4C81] bg-amber-50/60">
                          {formatBRL(aggregated.lanceTotalValor)}
                        </td>
                      )}
                    </tr>
                  )}

                  {/* Se houver Lance Embutido + Bolso, explicita quanto sai do bolso */}
                  {calculatedProposals.some(
                    (p) => p.lanceEmbutidoPerc > 0 && p.lanceRecursoProprioPerc > 0
                  ) &&
                    visibleRows.lanceRecursoProprio && (
                      <tr className="bg-white">
                        <td className="py-2 px-3.5 font-bold text-slate-700 border-r border-slate-400">
                          Lance do Bolso (Recurso Próprio)
                        </td>
                        {calculatedProposals.map((p, idx) => (
                          <td
                            key={idx}
                            className="py-2 px-3 text-center font-bold text-slate-800 border-r border-slate-300 last:border-r-0"
                          >
                            {formatBRL(p.valorLanceRecursoProprio)} (
                            {formatPercent(p.lanceRecursoProprioPerc, 1)})
                          </td>
                        ))}
                        {agrupar && calculatedProposals.length > 1 && (
                          <td className="py-2 px-3 text-center font-bold text-slate-900 bg-amber-50/60">
                            {formatBRL(aggregated.lanceRecursoProprioTotal)}
                          </td>
                        )}
                      </tr>
                    )}

                  {/* Parcela Após Diluir o Lance */}
                  {visibleRows.parcelaPosLance && (
                    <tr className="bg-blue-50/90">
                      <td className="py-2.5 px-3.5 font-extrabold text-[#0F4C81] border-r border-slate-400">
                        Parcela Após Diluir o Lance
                      </td>
                      {calculatedProposals.map((p, idx) => (
                        <td
                          key={idx}
                          className="py-2.5 px-3 text-center font-black text-[#0F4C81] text-sm sm:text-base border-r border-slate-300 last:border-r-0"
                        >
                          {formatBRL(p.parcelaPosLance)}
                        </td>
                      ))}
                      {agrupar && calculatedProposals.length > 1 && (
                        <td className="py-2.5 px-3 text-center font-black text-[#0F4C81] bg-blue-100/80 text-sm">
                          {formatBRL(aggregated.parcelaPosLanceTotal)}
                        </td>
                      )}
                    </tr>
                  )}

                  {/* Valor Unitário */}
                  {visibleRows.valorUnitario && (
                    <tr className="bg-slate-100/90">
                      <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] border-r border-slate-400">
                        Valor Unitário
                      </td>
                      {calculatedProposals.map((p, idx) => (
                        <td
                          key={idx}
                          className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                        >
                          {formatBRL(p.valorUnitario)}
                        </td>
                      ))}
                      {agrupar && calculatedProposals.length > 1 && (
                        <td className="py-2 px-3 text-center font-bold text-slate-600 bg-amber-50/60">
                          -
                        </td>
                      )}
                    </tr>
                  )}

                  {/* Qntd. Cotas */}
                  {visibleRows.cotas && (
                    <tr className="bg-white">
                      <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] border-r border-slate-400">
                        Qntd. Cotas
                      </td>
                      {calculatedProposals.map((p, idx) => (
                        <td
                          key={idx}
                          className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                        >
                          {p.cotas}
                        </td>
                      ))}
                      {agrupar && calculatedProposals.length > 1 && (
                        <td className="py-2 px-3 text-center font-extrabold text-[#0F4C81] bg-amber-50/60">
                          {aggregated.cotasTotal}
                        </td>
                      )}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* BLOCO 2: Taxa Mensalizada, Taxa Anual e Índice de Correção (Separado igual ao modelo clássico) */}
            {(visibleRows.taxaMensalizada ||
              visibleRows.taxaAnual ||
              visibleRows.indiceCorrecao) && (
              <div className="border-2 border-slate-900 mt-3.5 overflow-hidden">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <tbody className="divide-y divide-slate-300">
                    {visibleRows.taxaMensalizada && (
                      <tr className="bg-slate-100/90">
                        <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] w-[45%] border-r border-slate-400">
                          Taxa Mensalizada
                        </td>
                        {calculatedProposals.map((p, idx) => (
                          <td
                            key={idx}
                            className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                          >
                            {formatPercent(p.taxaMensalizada, 2)}
                          </td>
                        ))}
                        {agrupar && calculatedProposals.length > 1 && (
                          <td className="py-2 px-3 text-center font-extrabold text-[#0F4C81] bg-amber-50/60">
                            {formatPercent(aggregated.taxaMensalizadaMedia, 2)}
                          </td>
                        )}
                      </tr>
                    )}

                    {visibleRows.taxaAnual && (
                      <tr className="bg-white">
                        <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] border-r border-slate-400">
                          Taxa Anual
                        </td>
                        {calculatedProposals.map((p, idx) => (
                          <td
                            key={idx}
                            className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                          >
                            {formatPercent(p.taxaAnual, 2)}
                          </td>
                        ))}
                        {agrupar && calculatedProposals.length > 1 && (
                          <td className="py-2 px-3 text-center font-extrabold text-[#0F4C81] bg-amber-50/60">
                            {formatPercent(aggregated.taxaAnualMedia, 2)}
                          </td>
                        )}
                      </tr>
                    )}

                    {visibleRows.indiceCorrecao && (
                      <tr className="bg-slate-100/90">
                        <td className="py-2 px-3.5 font-extrabold text-[#0F4C81] border-r border-slate-400">
                          Índice de Correção
                        </td>
                        {calculatedProposals.map((p, idx) => (
                          <td
                            key={idx}
                            className="py-2 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                          >
                            {p.indiceCorrecao}
                          </td>
                        ))}
                        {agrupar && calculatedProposals.length > 1 && (
                          <td className="py-2 px-3 text-center font-extrabold text-[#0F4C81] bg-amber-50/60">
                            {calculatedProposals[0]?.indiceCorrecao}
                          </td>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* BLOCO 3: Qntd. Parcelas Após Diluir o Lance (Separado no rodapé igual ao modelo clássico) */}
            {visibleRows.prazoPosLance && (
              <div className="border-2 border-slate-900 mt-3.5 overflow-hidden">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <tbody>
                    <tr className="bg-white">
                      <td className="py-2.5 px-3.5 font-extrabold text-[#0F4C81] w-[45%] border-r border-slate-400">
                        Qntd. Parcelas Após Diluir o Lance
                      </td>
                      {calculatedProposals.map((p, idx) => (
                        <td
                          key={idx}
                          className="py-2.5 px-3 text-center font-extrabold text-[#0F4C81] border-r border-slate-300 last:border-r-0"
                        >
                          {p.prazoPosLance}
                        </td>
                      ))}
                      {agrupar && calculatedProposals.length > 1 && (
                        <td className="py-2.5 px-3 text-center font-extrabold text-[#0F4C81] bg-amber-50/60">
                          {aggregated.prazoPosLanceMax}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Rodapé Institucional Discreto */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium px-1">
              <span>
                Simulação BB Consórcios ({tipoPessoa}) • {new Date().toLocaleDateString('pt-BR')}
              </span>
              {especialista.trim() && (
                <span className="font-bold text-[#0F4C81]">
                  {especialista.trim()}
                  {telefoneEspecialista.trim() ? ` • ${telefoneEspecialista.trim()}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Barra Repetida no Rodapé da Proposta Comercial (para não precisar rolar de volta ao topo) */}
          <div className="pt-5 border-t border-slate-200 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nome do Cliente ({tipoPessoa})
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder={
                    tipoPessoa === 'PF'
                      ? 'Ex: João da Silva'
                      : 'Ex: Agropecuária Boa Vista LTDA'
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
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-bold bg-bb-blue hover:bg-bb-dark text-white whitespace-nowrap transition"
                >
                  {savedToast ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {savedToast ? 'Salvo!' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap transition"
                  title="Copia a imagem PNG pronta para colar (Ctrl+V) no WhatsApp"
                >
                  {copiedImage ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  {copiedImage ? 'Copiada!' : 'Imagem'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-extrabold bg-bb-yellow hover:bg-bb-yellowHover text-bb-dark whitespace-nowrap transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  PDF / Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          Selecione pelo menos um grupo em uma das 4 propostas acima para visualizar o Quadro da Proposta.
        </div>
      )}
    </div>
  );
};
