import { CalculatedProposal, TipoPessoa } from '../types';
import { AggregatedProposals, formatBRL, formatPercent } from './calculations';

interface ExportImageOptions {
  proposals: CalculatedProposal[];
  aggregated: AggregatedProposals;
  agrupar: boolean;
  modalidadeLabel: string;
  objetivoLabel: string;
  tipoPessoa: TipoPessoa;
  incluirSeguro: boolean;
  cliente: string;
  telefone: string;
  especialista: string;
  telefoneEspecialista: string;
  visibleRows: Record<string, boolean>;
}

/**
 * Desenha um retângulo com cantos arredondados no Canvas 2D
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Desenha um retângulo com apenas os cantos superiores arredondados
 */
function roundTopRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Gera um Blob PNG em alta definição (Retina 2x) do Novo Design Executivo BB Consórcios
 */
export async function generateProposalPngBlob(
  opts: ExportImageOptions
): Promise<Blob | null> {
  const {
    proposals,
    aggregated,
    agrupar,
    modalidadeLabel,
    tipoPessoa,
    incluirSeguro,
    cliente,
    especialista,
    telefoneEspecialista,
    visibleRows,
  } = opts;

  if (proposals.length === 0) return null;

  const showAggregatedCol = agrupar && proposals.length > 1;
  const colsCount = proposals.length + (showAggregatedCol ? 1 : 0);
  const isSingle = proposals.length === 1;

  // Dados principais para os 3 Hero Cards de Resumo Rápido
  const heroProposal = proposals[0];
  const heroLiquido = showAggregatedCol
    ? aggregated.creditoLiquidoTotal
    : heroProposal.creditoLiquido;
  const heroBruto = showAggregatedCol
    ? aggregated.creditoBrutoTotal
    : heroProposal.creditoBruto;
  const heroBolsoValor = showAggregatedCol
    ? aggregated.lanceRecursoProprioTotal
    : heroProposal.valorLanceRecursoProprio;
  const heroBolsoPerc =
    heroBruto > 0 ? (heroBolsoValor / heroBruto) * 100 : heroProposal.lanceRecursoProprioPerc;
  const heroParcelaInicial = showAggregatedCol
    ? aggregated.parcelaMensalTotal
    : heroProposal.parcelaMensalTotal;
  const heroParcelaPos = showAggregatedCol
    ? aggregated.parcelaPosLanceTotal
    : heroProposal.parcelaPosLance;
  const heroLanceTotalValor = showAggregatedCol
    ? aggregated.lanceTotalValor
    : heroProposal.valorLanceTotal;
  const reducaoParcelaPerc =
    heroParcelaInicial > 0 && heroLanceTotalValor > 0
      ? Math.max(0, Math.round(((heroParcelaInicial - heroParcelaPos) / heroParcelaInicial) * 100))
      : 0;

  const hasAnyEmbutido = proposals.some((p) => p.lanceEmbutidoPerc > 0);
  const hasAnyLance = proposals.some((p) => p.lanceTotalPerc > 0);

  interface SectionRow {
    label: string;
    values: string[];
    style?: 'normal' | 'indigo' | 'amber' | 'highlight-green' | 'highlight-blue' | 'highlight-slate' | 'muted';
  }

  const getColValues = (fn: (p: CalculatedProposal) => string, aggVal: string): string[] => {
    const arr = proposals.map(fn);
    if (showAggregatedCol) arr.push(aggVal);
    return arr;
  };

  // SEÇÃO 1: COMPOSIÇÃO DO CRÉDITO
  const secCreditoRows: SectionRow[] = [];
  if (!isSingle) {
    secCreditoRows.push({
      label: 'Proposta / Grupo',
      values: getColValues(
        (p) => `G.${p.item.grupo.replace(/^0+/, '')} (${p.cotas} ${p.cotas === 1 ? 'cota' : 'cotas'})`,
        `Soma (${aggregated.cotasTotal} cotas)`
      ),
      style: 'highlight-slate',
    });
  }
  if (visibleRows.creditoBruto) {
    secCreditoRows.push({
      label:
        isSingle && heroProposal.cotas > 1
          ? `Valor da Carta de Crédito (${heroProposal.cotas} cotas de ${formatBRL(heroProposal.valorUnitario)})`
          : 'Valor da Carta de Crédito (Bruto)',
      values: getColValues(
        (p) => formatBRL(p.creditoBruto),
        formatBRL(aggregated.creditoBrutoTotal)
      ),
      style: 'normal',
    });
  }
  if (hasAnyEmbutido && visibleRows.lanceEmbutido) {
    secCreditoRows.push({
      label: '(-) Lance Embutido (descontado da própria carta)',
      values: getColValues(
        (p) =>
          p.lanceEmbutidoPerc > 0
            ? `- ${formatBRL(p.valorLanceEmbutido)} (${formatPercent(p.lanceEmbutidoPerc, 0)})`
            : 'R$ 0,00',
        `- ${formatBRL(aggregated.lanceEmbutidoTotal)}`
      ),
      style: 'indigo',
    });
  }
  if (visibleRows.creditoLiquido) {
    secCreditoRows.push({
      label: '(=) Crédito Líquido a Liberar para Compra do Bem',
      values: getColValues(
        (p) => formatBRL(p.creditoLiquido),
        formatBRL(aggregated.creditoLiquidoTotal)
      ),
      style: 'highlight-green',
    });
  }

  // SEÇÃO 2: ESTRATÉGIA DE LANCE
  const secLanceRows: SectionRow[] = [];
  if (hasAnyLance) {
    if (hasAnyEmbutido && visibleRows.lanceEmbutido) {
      secLanceRows.push({
        label: 'Lance usando a própria Carta (Embutido)',
        values: getColValues(
          (p) =>
            p.lanceEmbutidoPerc > 0
              ? `${formatBRL(p.valorLanceEmbutido)} (${formatPercent(p.lanceEmbutidoPerc, 1)})`
              : 'Não utilizado',
          formatBRL(aggregated.lanceEmbutidoTotal)
        ),
        style: 'indigo',
      });
    }
    if (visibleRows.lanceRecursoProprio) {
      secLanceRows.push({
        label: '(+) Lance do Seu Bolso (Recurso Próprio)',
        values: getColValues(
          (p) =>
            `${formatBRL(p.valorLanceRecursoProprio)} (${formatPercent(
              p.lanceRecursoProprioPerc,
              1
            )})`,
          formatBRL(aggregated.lanceRecursoProprioTotal)
        ),
        style: 'amber',
      });
    }
    if (visibleRows.lanceTotal) {
      secLanceRows.push({
        label: '(=) Lance Total Ofertado na Assembleia',
        values: getColValues(
          (p) => `${formatBRL(p.valorLanceTotal)} (${formatPercent(p.lanceTotalPerc, 2)})`,
          `${formatBRL(aggregated.lanceTotalValor)} (${formatPercent(
            aggregated.lanceTotalPercMedio,
            2
          )})`
        ),
        style: 'highlight-slate',
      });
    }
  }

  // SEÇÃO 3: PLANO DE PARCELAS
  const secParcelasRows: SectionRow[] = [];
  if (visibleRows.parcelaMensal) {
    secParcelasRows.push({
      label: `Parcela Mensal Inicial (${
        incluirSeguro ? `c/ Seg. ${tipoPessoa}` : 'antes da contemplação'
      })`,
      values: getColValues(
        (p) => `${p.prazo}x de ${formatBRL(p.parcelaMensalTotal)}`,
        `${Math.max(...proposals.map((p) => p.prazo))}x de ${formatBRL(
          aggregated.parcelaMensalTotal
        )}`
      ),
      style: 'normal',
    });
  }
  if (hasAnyLance && visibleRows.parcelaPosLance) {
    secParcelasRows.push({
      label: 'Nova Parcela Após Contemplação (diluindo o lance)',
      values: getColValues(
        (p) => `${Math.max(1, p.prazo - 1)}x de ${formatBRL(p.parcelaPosLance)}`,
        `${Math.max(1, Math.max(...proposals.map((p) => p.prazo)) - 1)}x de ${formatBRL(
          aggregated.parcelaPosLanceTotal
        )}`
      ),
      style: 'highlight-blue',
    });
  }
  if (hasAnyLance && visibleRows.prazoPosLance) {
    secParcelasRows.push({
      label: isSingle
        ? `Opção alternativa: manter a parcela de ${formatBRL(
            heroProposal.parcelaMensalTotal
          )} e quitar em menos tempo`
        : 'Opção alternativa: manter parcela inicial e reduzir prazo para',
      values: getColValues(
        (p) => `${p.prazoPosLance} parcelas restantes`,
        `${aggregated.prazoPosLanceMax} parcelas restantes`
      ),
      style: 'muted',
    });
  }

  // SEÇÃO 4 (Para múltiplas propostas, usa linhas; para 1 proposta, usa 4 cartões lado a lado)
  const secTaxasMultiRows: SectionRow[] = [];
  if (!isSingle) {
    if (visibleRows.taxaMensalizada) {
      secTaxasMultiRows.push({
        label: 'Taxa de Administração Mensalizada',
        values: getColValues(
          (p) => `${formatPercent(p.taxaMensalizada, 2)} a.m.`,
          `${formatPercent(aggregated.taxaMensalizadaMedia, 2)} a.m.`
        ),
        style: 'normal',
      });
    }
    if (visibleRows.taxaAnual) {
      secTaxasMultiRows.push({
        label: 'Taxa de Administração Anual',
        values: getColValues(
          (p) => `${formatPercent(p.taxaAnual, 2)} a.a.`,
          `${formatPercent(aggregated.taxaAnualMedia, 2)} a.a.`
        ),
        style: 'normal',
      });
    }
    if (visibleRows.indiceCorrecao) {
      secTaxasMultiRows.push({
        label: 'Índice de Correção Anual',
        values: getColValues((p) => p.indiceCorrecao, proposals[0]?.indiceCorrecao || '-'),
        style: 'normal',
      });
    }
  }

  // Cálculo dinâmico de dimensões
  const scale = 2;
  const width = colsCount === 1 ? 760 : Math.min(1120, 480 + colsCount * 190);
  const cardMarginX = 24;
  const cardMarginY = 20;
  const cardW = width - cardMarginX * 2;
  const innerPadX = 20;
  const contentX = cardMarginX + innerPadX;
  const contentW = cardW - innerPadX * 2;

  const showHeroCards = isSingle || showAggregatedCol;
  const rowH = 38;
  const highlightRowH = 42;
  const secHeaderH = 28;
  const secGap = 16;

  const calcSecHeight = (rows: SectionRow[]) => {
    if (rows.length === 0) return 0;
    let h = secHeaderH + 6;
    rows.forEach((r) => {
      h += r.style?.startsWith('highlight-') ? highlightRowH + 4 : rowH;
    });
    return h + secGap;
  };

  const headerGoldH = 84;
  const subBlueH = 44;
  const heroBlockH = showHeroCards ? 104 : 0;
  const sec1H = calcSecHeight(secCreditoRows);
  const sec2H = calcSecHeight(secLanceRows);
  const sec3H = calcSecHeight(secParcelasRows);
  const sec4H = isSingle
    ? secHeaderH + 8 + 64 + secGap
    : calcSecHeight(secTaxasMultiRows);
  const footerH = 44;

  const cardH =
    headerGoldH +
    subBlueH +
    18 +
    heroBlockH +
    sec1H +
    sec2H +
    sec3H +
    sec4H +
    footerH;
  const height = cardH + cardMarginY * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);

  // Fundo cinza-azulado suave externo
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, width, height);

  // Sombra e corpo do Card Principal
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, cardMarginX, cardMarginY, cardW, cardH, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  roundRect(ctx, cardMarginX, cardMarginY, cardW, cardH, 20);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Topo Amarelo Ouro BB Consórcios
  let curY = cardMarginY;
  roundTopRect(ctx, cardMarginX, curY, cardW, headerGoldH, 20);
  ctx.fillStyle = '#FFCC00';
  ctx.fill();

  const logoImg = await loadImage('./logo-bb-consorcios.png');
  if (logoImg) {
    const targetH = 58;
    const targetW = (logoImg.width / logoImg.height) * targetH;
    ctx.drawImage(
      logoImg,
      width / 2 - targetW / 2,
      curY + (headerGoldH - targetH) / 2,
      targetW,
      targetH
    );
  } else {
    ctx.fillStyle = '#0038A8';
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BB CONSÓRCIOS', width / 2, curY + 52);
  }

  curY += headerGoldH;

  // Sub-barra Azul Marinho BB
  const blueGrad = ctx.createLinearGradient(cardMarginX, curY, cardMarginX + cardW, curY);
  blueGrad.addColorStop(0, '#002D62');
  blueGrad.addColorStop(1, '#0F4C81');
  ctx.fillStyle = blueGrad;
  ctx.fillRect(cardMarginX, curY, cardW, subBlueH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  const titleText = cliente.trim()
    ? `PROPOSTA BB CONSÓRCIOS • ${modalidadeLabel.toUpperCase()} • ${cliente.trim().toUpperCase()}`
    : `PROPOSTA DE CONSÓRCIO • ${modalidadeLabel.toUpperCase()}`;
  ctx.fillText(titleText, contentX, curY + 27);

  // Badge Amarelo à direita na barra azul
  const badgeText = isSingle
    ? `GRUPO ${heroProposal.item.grupo.replace(/^0+/, '')} • ${heroProposal.cotas} ${
        heroProposal.cotas === 1 ? 'COTA' : 'COTAS'
      }`
    : `${proposals.length} OPÇÕES`;
  ctx.font = '900 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const badgeW = Math.max(118, ctx.measureText(badgeText).width + 24);
  const badgeX = cardMarginX + cardW - innerPadX - badgeW;
  roundRect(ctx, badgeX, curY + 10, badgeW, 24, 12);
  ctx.fillStyle = '#FFCC00';
  ctx.fill();
  ctx.fillStyle = '#002D62';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeW / 2, curY + 26);

  curY += subBlueH + 18;

  // 3 HERO CARDS (Resumo em 3 segundos)
  if (showHeroCards) {
    const gap = 14;
    const hCardW = (contentW - gap * 2) / 3;
    const hCardH = 86;

    // Hero 1: Crédito Livre (Verde)
    const h1X = contentX;
    roundRect(ctx, h1X, curY, hCardW, hCardH, 14);
    ctx.fillStyle = '#ECFDF5';
    ctx.fill();
    ctx.strokeStyle = '#6EE7B7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#047857';
    ctx.font = '800 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('1. CRÉDITO LIVRE NA MÃO', h1X + 16, curY + 24);
    ctx.fillStyle = '#065F46';
    ctx.font = '900 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(formatBRL(heroLiquido), h1X + 16, curY + 53);
    ctx.fillStyle = '#047857';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Liberado p/ compra do bem', h1X + 16, curY + 72);

    // Hero 2: Lance do Bolso (Âmbar)
    const h2X = contentX + hCardW + gap;
    roundRect(ctx, h2X, curY, hCardW, hCardH, 14);
    ctx.fillStyle = '#FFFBEB';
    ctx.fill();
    ctx.strokeStyle = '#FCD34D';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#B45309';
    ctx.font = '800 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('2. LANCE DO SEU BOLSO', h2X + 16, curY + 24);
    ctx.fillStyle = '#78350F';
    ctx.font = '900 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(formatBRL(heroBolsoValor), h2X + 16, curY + 53);
    ctx.fillStyle = '#B45309';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      heroBolsoValor > 0
        ? `Pago só se contemplado (${formatPercent(heroBolsoPerc, 1)})`
        : '100% coberto pela própria carta',
      h2X + 16,
      curY + 72
    );

    // Hero 3: Nova Parcela Pós-Lance (Azul)
    const h3X = contentX + (hCardW + gap) * 2;
    roundRect(ctx, h3X, curY, hCardW, hCardH, 14);
    ctx.fillStyle = '#EFF6FF';
    ctx.fill();
    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#1D4ED8';
    ctx.font = '800 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      hasAnyLance ? '3. PARCELA PÓS-LANCE' : '3. PARCELA MENSAL',
      h3X + 16,
      curY + 24
    );
    ctx.fillStyle = '#1E3A8A';
    ctx.font = '900 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      formatBRL(hasAnyLance ? heroParcelaPos : heroParcelaInicial),
      h3X + 16,
      curY + 53
    );
    ctx.fillStyle = '#1D4ED8';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      reducaoParcelaPerc > 0
        ? `C/ redução de ${reducaoParcelaPerc}% após lance`
        : `Prazo de ${heroProposal.prazo} meses`,
      h3X + 16,
      curY + 72
    );

    curY += heroBlockH;
  }

  // Função auxiliar para desenhar cada Seção com cabeçalho suave e linhas limpas
  const labelW = colsCount === 1 ? contentW * 0.62 : contentW * 0.42;
  const valColW = (contentW - labelW) / colsCount;

  const drawSection = (title: string, rows: SectionRow[]) => {
    if (rows.length === 0) return;

    // Barra de título da seção
    roundRect(ctx, contentX, curY, contentW, secHeaderH, 6);
    ctx.fillStyle = '#F1F5F9';
    ctx.fill();

    ctx.fillStyle = '#0F4C81';
    ctx.font = '900 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, contentX + 14, curY + 18);

    curY += secHeaderH + 6;

    rows.forEach((row, idx) => {
      const isHighlight = row.style?.startsWith('highlight-');
      const currentH = isHighlight ? highlightRowH : rowH;

      if (row.style === 'highlight-green') {
        roundRect(ctx, contentX, curY, contentW, currentH, 8);
        ctx.fillStyle = '#ECFDF5';
        ctx.fill();
        ctx.strokeStyle = '#A7F3D0';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (row.style === 'highlight-blue') {
        roundRect(ctx, contentX, curY, contentW, currentH, 8);
        ctx.fillStyle = '#EFF6FF';
        ctx.fill();
        ctx.strokeStyle = '#BFDBFE';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (row.style === 'highlight-slate') {
        roundRect(ctx, contentX, curY, contentW, currentH, 8);
        ctx.fillStyle = '#F8FAFC';
        ctx.fill();
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (idx < rows.length - 1 && !rows[idx + 1]?.style?.startsWith('highlight-')) {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(contentX, curY + currentH);
        ctx.lineTo(contentX + contentW, curY + currentH);
        ctx.stroke();
      }

      // Cor e peso do texto do rótulo
      let labelColor = '#334155';
      let valueColor = '#1E293B';
      let labelFont = '600 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      let valueFont = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      if (row.style === 'indigo') {
        labelColor = '#4338CA';
        valueColor = '#4338CA';
      } else if (row.style === 'amber') {
        labelColor = '#1E293B';
        valueColor = '#B45309';
        labelFont = '800 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        valueFont = '900 14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      } else if (row.style === 'highlight-green') {
        labelColor = '#065F46';
        valueColor = '#065F46';
        labelFont = '900 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        valueFont = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      } else if (row.style === 'highlight-blue') {
        labelColor = '#1E3A8A';
        valueColor = '#1E3A8A';
        labelFont = '900 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        valueFont = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      } else if (row.style === 'highlight-slate') {
        labelColor = '#0F4C81';
        valueColor = '#0F4C81';
        labelFont = '800 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        valueFont = '900 14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      } else if (row.style === 'muted') {
        labelColor = '#64748B';
        valueColor = '#334155';
        labelFont = '600 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        valueFont = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      }

      const textY = curY + currentH / 2 + 5;
      ctx.fillStyle = labelColor;
      ctx.font = labelFont;
      ctx.textAlign = 'left';
      ctx.fillText(row.label, contentX + 14, textY);

      ctx.fillStyle = valueColor;
      ctx.font = valueFont;
      row.values.forEach((val, cIdx) => {
        if (colsCount === 1) {
          ctx.textAlign = 'right';
          ctx.fillText(val, contentX + contentW - 14, textY);
        } else {
          ctx.textAlign = 'center';
          const cx = contentX + labelW + cIdx * valColW + valColW / 2;
          ctx.fillText(val, cx, textY);
        }
      });

      curY += currentH + (isHighlight ? 4 : 0);
    });

    curY += secGap;
  };

  drawSection('COMPOSIÇÃO DO CRÉDITO', secCreditoRows);
  drawSection('ESTRATÉGIA DE LANCE (OFERTA NA ASSEMBLEIA)', secLanceRows);
  drawSection('PLANO DE PARCELAS (ANTES E DEPOIS DA CONTEMPLAÇÃO)', secParcelasRows);

  if (isSingle) {
    // Seção 4 em formato de 4 cartões modernos lado a lado
    roundRect(ctx, contentX, curY, contentW, secHeaderH, 6);
    ctx.fillStyle = '#F1F5F9';
    ctx.fill();

    ctx.fillStyle = '#0F4C81';
    ctx.font = '900 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CARACTERÍSTICAS DO GRUPO E TAXAS', contentX + 14, curY + 18);

    curY += secHeaderH + 8;

    const pillGap = 12;
    const pillW = (contentW - pillGap * 3) / 4;
    const pillH = 62;
    const pills = [
      {
        label: 'Taxa Mensalizada',
        value: `${formatPercent(heroProposal.taxaMensalizada, 2)} a.m.`,
      },
      {
        label: 'Taxa Anual',
        value: `${formatPercent(heroProposal.taxaAnual, 2)} a.a.`,
      },
      {
        label: 'Índice de Correção',
        value: heroProposal.indiceCorrecao,
      },
      {
        label: 'Grupo / Cotas',
        value: `G.${heroProposal.item.grupo.replace(/^0+/, '')} (${heroProposal.cotas} ${
          heroProposal.cotas === 1 ? 'cota' : 'cotas'
        })`,
      },
    ];

    pills.forEach((p, idx) => {
      const px = contentX + idx * (pillW + pillGap);
      roundRect(ctx, px, curY, pillW, pillH, 10);
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748B';
      ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(p.label, px + pillW / 2, curY + 23);

      ctx.fillStyle = '#0F4C81';
      ctx.font = '900 15.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(p.value, px + pillW / 2, curY + 47);
    });

    curY += pillH + secGap;
  } else {
    drawSection('CARACTERÍSTICAS DO GRUPO E TAXAS', secTaxasMultiRows);
  }

  // Linha divisória e Rodapé Institucional
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, curY);
  ctx.lineTo(contentX + contentW, curY);
  ctx.stroke();

  const footerTextY = curY + 24;
  ctx.fillStyle = '#64748B';
  ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Simulação BB Consórcios (${tipoPessoa}) • ${new Date().toLocaleDateString('pt-BR')}`,
    contentX,
    footerTextY
  );

  if (especialista.trim()) {
    ctx.fillStyle = '#0F4C81';
    ctx.font = '800 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${especialista.trim()}${
        telefoneEspecialista.trim() ? ` • ${telefoneEspecialista.trim()}` : ''
      }`,
      contentX + contentW,
      footerTextY
    );
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}
