/**
 * Motor de Simulação e Inteligência de Consórcios BB
 * Utilizado pela API REST para outros sistemas (CRMs, Chatbots, Landing Pages, Apps)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_PATH = path.resolve(__dirname, '../src/data/consorciosSeed.json');

export const OBJETIVOS_COMPRA = [
  {
    id: 'TRATOR',
    label: 'Trator / Agrícola',
    emoji: '🚜',
    seg: 'TC',
    defaultModFlex: 'TC3',
    defaultModMaster: 'TC4',
    filterFn: (i) => i.segmento === 'TC' && !i.bemDescricao.includes('SUSTENTAVEIS'),
  },
  {
    id: 'CAMINHAO',
    label: 'Caminhão / Pesados',
    emoji: '🚛',
    seg: 'TC',
    defaultModFlex: 'TC3',
    defaultModMaster: 'TC4',
    filterFn: (i) => i.segmento === 'TC' && !i.bemDescricao.includes('SUSTENTAVEIS'),
  },
  {
    id: 'IRRIGACAO',
    label: 'Irrigação / Pivô',
    emoji: '💧',
    seg: 'TC',
    defaultModFlex: 'TC3',
    defaultModMaster: 'TC4',
    filterFn: (i) => i.segmento === 'TC' && !i.bemDescricao.includes('SUSTENTAVEIS'),
  },
  {
    id: 'REBANHO',
    label: 'Rebanho / Pecuária',
    emoji: '🐄',
    seg: 'EE',
    defaultModFlex: 'EE3',
    defaultModMaster: 'EE4',
    filterFn: (i) => i.tags.includes('Rebanho e Genética') || i.bemDescricao.includes('REBANHO'),
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
    label: 'Energia Solar / Sustentáveis',
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

export const ALIQUOTA_SEGURO_MENSAL = {
  PF: 0.038, // 0,038% a.m. Pessoa Física
  PJ: 0.054, // 0,054% a.m. Pessoa Jurídica
};

export function loadSeedData() {
  try {
    const raw = fs.readFileSync(SEED_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao carregar consorciosSeed.json:', err);
    return { updatedAt: '', totalRecords: 0, items: [] };
  }
}

export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value, decimals = 2) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Executa simulação inteligente com base nos parâmetros da requisição
 */
export function simulateProposal({
  objetivo = 'TRATOR',
  plano = 'Flex',
  creditoLiquido = 350000,
  lanceBolso = 0,
  usarEmbutido = true,
  tipoPessoa = 'PF',
  incluirSeguro = false,
  mode = 'single', // 'single' ou 'compare3'
  mascararGrupo = true,
  cliente = '',
  grupoExato = '', // Opcional: simula especificamente para um grupo informado (somente Modo Master)
  cotasFixas = 0,  // Opcional: fixa quantidade de cotas
}) {
  const seed = loadSeedData();
  const items = seed.items || [];

  const objConfig =
    OBJETIVOS_COMPRA.find((o) => o.id === (objetivo || '').toUpperCase()) || OBJETIVOS_COMPRA[0];

  const targetMod =
    (plano || '').toLowerCase() === 'master'
      ? objConfig.defaultModMaster
      : objConfig.defaultModFlex;

  const liquidoDesejado = Math.max(1000, Number(creditoLiquido) || 0);
  const bolsoReais = Math.max(0, Number(lanceBolso) || 0);

  // Se foi fornecido um grupo exato (apenas API Master)
  let pool = [];
  if (grupoExato && !mascararGrupo) {
    pool = items.filter((i) => i.grupo === String(grupoExato).trim());
  }

  if (pool.length === 0) {
    pool = items.filter(
      (i) => i.codigoModalidade === targetMod && objConfig.filterFn(i) && i.vagas > 0
    );
  }
  if (pool.length === 0) {
    pool = items.filter((i) => i.codigoModalidade === targetMod && i.vagas > 0);
  }
  if (pool.length === 0) {
    pool = items.filter((i) => i.codigoModalidade === targetMod);
  }
  if (pool.length === 0) {
    throw new Error(`Nenhum grupo ativo disponível para os parâmetros solicitados.`);
  }

  const candidates = [];

  for (const item of pool) {
    const embOptions = usarEmbutido ? [30, 0] : [0];

    for (const embPerc of embOptions) {
      if (usarEmbutido && embPerc === 0 && item.percMinContemp > 30 && bolsoReais === 0) {
        continue;
      }

      const fatorLiq = 1 - embPerc / 100;

      const cotasRange = cotasFixas > 0 ? [cotasFixas] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      for (const cotas of cotasRange) {
        const creditoBruto = item.valorBem * cotas;
        const calcCreditoLiquido = creditoBruto * fatorLiq;
        const parcelaInicial = item.parcela * cotas;

        let bolsoPerc = 15;
        if (bolsoReais > 0 && creditoBruto > 0) {
          bolsoPerc = Math.min(69, (bolsoReais / creditoBruto) * 100);
        } else if (embPerc === 0 && (item.tags || []).includes('Lance Fixo 20%')) {
          bolsoPerc = 20;
        } else if (bolsoReais === 0 && usarEmbutido) {
          bolsoPerc = 0;
        }

        const lanceTotalPerc = embPerc + bolsoPerc;
        const lanceTotalValor = creditoBruto * (lanceTotalPerc / 100);
        const saldoTotal = parcelaInicial * item.prazo;
        const parcelaPosLance =
          item.prazo > 1
            ? Math.max(0, (saldoTotal - parcelaInicial - lanceTotalValor) / (item.prazo - 1))
            : parcelaInicial;

        const scoreCredito = Math.abs(calcCreditoLiquido - liquidoDesejado) / liquidoDesejado;

        const reasonableCredit =
          calcCreditoLiquido >= liquidoDesejado * 0.90 &&
          calcCreditoLiquido <= liquidoDesejado * 1.15;

        if (reasonableCredit) {
          candidates.push({
            item,
            cotas,
            embPerc,
            bolsoPerc,
            creditoBruto,
            creditoLiquido: calcCreditoLiquido,
            parcelaInicial,
            parcelaPosLance,
            lanceTotalPerc,
            scoreCredito,
          });
        }
      }
    }
  }

  // Fallback se não houver na faixa estreita
  if (candidates.length === 0) {
    for (const item of pool) {
      const embPerc = usarEmbutido ? 30 : 0;
      const fatorLiq = 1 - embPerc / 100;
      for (let cotas = 1; cotas <= 15; cotas++) {
        const creditoBruto = item.valorBem * cotas;
        const calcCreditoLiquido = creditoBruto * fatorLiq;
        const parcelaInicial = item.parcela * cotas;
        const bolsoPerc = bolsoReais > 0 ? (bolsoReais / creditoBruto) * 100 : 0;
        const lanceTotalPerc = embPerc + bolsoPerc;
        const lanceTotalValor = creditoBruto * (lanceTotalPerc / 100);
        const saldoTotal = parcelaInicial * item.prazo;
        const parcelaPosLance =
          item.prazo > 1
            ? Math.max(0, (saldoTotal - parcelaInicial - lanceTotalValor) / (item.prazo - 1))
            : parcelaInicial;

        const scoreCredito = Math.abs(calcCreditoLiquido - liquidoDesejado) / liquidoDesejado;
        candidates.push({
          item,
          cotas,
          embPerc,
          bolsoPerc,
          creditoBruto,
          creditoLiquido: calcCreditoLiquido,
          parcelaInicial,
          parcelaPosLance,
          lanceTotalPerc,
          scoreCredito,
        });
      }
    }
  }

  candidates.sort((a, b) => a.scoreCredito - b.scoreCredito || a.parcelaPosLance - b.parcelaPosLance);

  const c1 = candidates[0];
  let chosen = [c1];

  if (mode === 'compare3') {
    const c2 =
      candidates.find((c) => c.item.grupo !== c1.item.grupo) ||
      candidates.find((c) => c.embPerc !== c1.embPerc || c.cotas !== c1.cotas) ||
      c1;

    const c3 =
      candidates.find(
        (c) => c.item.grupo !== c1.item.grupo && c.item.grupo !== c2.item.grupo
      ) ||
      candidates.find((c) => c.item.grupo !== c1.item.grupo) ||
      c1;

    chosen = [c1, c2, c3].filter(
      (v, idx, self) =>
        idx ===
        self.findIndex(
          (t) => t.item.id === v.item.id && t.cotas === v.cotas && t.embPerc === v.embPerc
        )
    );
  }

  const aliquotaSeguro = incluirSeguro ? ALIQUOTA_SEGURO_MENSAL[tipoPessoa] || 0.038 : 0;

  const proposals = chosen.map((c, index) => {
    const item = c.item;
    const taxaTotalPerc = item.taxaAdm + item.fundoReserva + item.seguro;
    const valorCategoria = c.creditoBruto * (1 + taxaTotalPerc / 100);
    const seguroMensal = incluirSeguro ? valorCategoria * (aliquotaSeguro / 100) : 0;

    const parcelaMensal = c.parcelaInicial + seguroMensal;
    const parcelaPosLance = c.parcelaPosLance + seguroMensal;

    const taxaMensalizada = Number((item.taxaAdm / Math.max(1, item.prazo)).toFixed(2));
    const taxaAnual = Number((taxaMensalizada * 12).toFixed(2));

    const lanceProprioValor = c.creditoBruto * (c.bolsoPerc / 100);
    const lanceEmbutidoValor = c.creditoBruto * (c.embPerc / 100);
    const lanceTotalValor = lanceProprioValor + lanceEmbutidoValor;

    const pOut = {
      opcao: index + 1,
      plano: (plano || '').toLowerCase() === 'master' ? 'Plano Master' : 'Plano Flex (-2% Taxa)',
      objetivo: objConfig.label,
      cotas: c.cotas,
      prazoMeses: item.prazo,
      creditoBruto: Number(c.creditoBruto.toFixed(2)),
      creditoLiquido: Number(c.creditoLiquido.toFixed(2)),
      lanceEmbutido: {
        percentual: Number(c.embPerc.toFixed(2)),
        valor: Number(lanceEmbutidoValor.toFixed(2)),
      },
      lanceBolso: {
        percentual: Number(c.bolsoPerc.toFixed(2)),
        valor: Number(lanceProprioValor.toFixed(2)),
      },
      lanceTotal: {
        percentual: Number(c.lanceTotalPerc.toFixed(2)),
        valor: Number(lanceTotalValor.toFixed(2)),
      },
      parcelaMensalSemLance: Number(parcelaMensal.toFixed(2)),
      parcelaPosLanceEstimada: Number(parcelaPosLance.toFixed(2)),
      taxas: {
        taxaAdmTotal: Number(item.taxaAdm.toFixed(2)),
        taxaMensalizada: taxaMensalizada,
        taxaAnual: taxaAnual,
        indiceCorrecao: item.indiceCorrecao || 'FIPE',
      },
      seguroPrestamistaIncluso: incluirSeguro,
      valorSeguroMensal: Number(seguroMensal.toFixed(2)),
    };

    if (!mascararGrupo) {
      pOut.grupo = item.grupo;
      pOut.bemCodigo = item.bemCodigo;
      pOut.bemDescricao = item.bemDescricao;
      pOut.assembleiaProxima = item.assembleia;
      pOut.historicoLanceMinimo12m = `${Number(item.percMinContemp.toFixed(2))}%`;
    }

    return pOut;
  });

  // Geração de texto pronto para WhatsApp
  const lines = [];
  lines.push(`*PROPOSTA DE CONSÓRCIO BB — ${objConfig.label.toUpperCase()}*`);
  lines.push(
    `📋 *Plano:* ${
      (plano || '').toLowerCase() === 'master' ? 'Master (Taxa Cheia)' : 'Flex (-2% Taxa)'
    } | *Titular:* ${tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}`
  );
  if (cliente.trim()) lines.push(`👤 *Cliente:* ${cliente.trim()}`);
  lines.push('');

  proposals.forEach((p) => {
    lines.push(`📌 *Opção ${p.opcao} (${p.cotas} cota${p.cotas > 1 ? 's' : ''})*`);
    lines.push(`• Crédito a Liberar (Líquido): *${formatBRL(p.creditoLiquido)}*`);
    lines.push(`• Crédito Total da Carta: ${formatBRL(p.creditoBruto)}`);
    if (p.lanceEmbutido.percentual > 0) {
      lines.push(
        `• (-) Lance Embutido (${formatPercent(p.lanceEmbutido.percentual, 1)}): ${formatBRL(
          p.lanceEmbutido.valor
        )}`
      );
    }
    if (p.lanceBolso.valor > 0) {
      lines.push(
        `• Lance do Bolso (${formatPercent(p.lanceBolso.percentual, 1)}): ${formatBRL(
          p.lanceBolso.valor
        )}`
      );
    }
    lines.push(
      `• *Lance Proposto Total:* *${formatPercent(p.lanceTotal.percentual, 1)}* (${formatBRL(
        p.lanceTotal.valor
      )})`
    );
    lines.push(`• Prazo: *${p.prazoMeses} meses*`);
    lines.push(`• Parcela Inicial: ${formatBRL(p.parcelaMensalSemLance)}`);
    lines.push(`• *Parcela Pós-Lance:* *${formatBRL(p.parcelaPosLanceEstimada)}*`);
    lines.push(
      `• Taxa Adm: ${formatPercent(p.taxas.taxaAdmTotal)} (${formatPercent(
        p.taxas.taxaMensalizada
      )} a.m. / ${formatPercent(p.taxas.taxaAnual)} a.a.)`
    );
    lines.push('');
  });

  lines.push(`✅ *Simulação gerada em:* ${new Date().toLocaleString('pt-BR')}`);
  lines.push(`⚠️ Valores sujeitos à disponibilidade das vagas e alteração conforme assembleia.`);

  return {
    success: true,
    parametrosSimulacao: {
      objetivo: objConfig.label,
      plano: (plano || '').toLowerCase() === 'master' ? 'Master' : 'Flex',
      creditoLiquidoDesejado: liquidoDesejado,
      lanceBolsoInformado: bolsoReais,
      tipoPessoa,
      incluirSeguro,
      modo: mode,
    },
    propostas: proposals,
    whatsappTextoPronto: lines.join('\n'),
  };
}
