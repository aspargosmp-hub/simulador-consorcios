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
 * Gera um Blob PNG em alta definição (Retina 2x) exatamente no layout refinado de planilha clássica
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

  interface RowDef {
    label: string;
    values: string[];
    highlight?: 'green' | 'blue' | 'amber';
    isZebra?: boolean;
    bold?: boolean;
    isEmbutido?: boolean;
  }

  const getColValues = (fn: (p: CalculatedProposal) => string, aggVal: string): string[] => {
    const arr = proposals.map(fn);
    if (showAggregatedCol) arr.push(aggVal);
    return arr;
  };

  const hasAnyEmbutido = proposals.some((p) => p.lanceEmbutidoPerc > 0);
  const hasAnyLance = proposals.some((p) => p.lanceTotalPerc > 0);

  // MONTAGEM DO BLOCO 1
  const block1Rows: RowDef[] = [
    {
      label: 'Grupo',
      values: getColValues((p) => p.item.grupo.replace(/^0+/, '') || p.item.grupo, 'Soma Cotas'),
      bold: true,
      isZebra: false,
    },
  ];

  if (visibleRows.creditoBruto) {
    block1Rows.push({
      label: 'Valor da Carta (Bruto)',
      values: getColValues(
        (p) => formatBRL(p.creditoBruto),
        formatBRL(aggregated.creditoBrutoTotal)
      ),
      isZebra: true,
    });
  }

  if (hasAnyEmbutido && visibleRows.lanceEmbutido) {
    block1Rows.push({
      label: '(-) Lance Embutido da Carta',
      values: getColValues(
        (p) =>
          p.lanceEmbutidoPerc > 0
            ? `${formatBRL(p.valorLanceEmbutido)} (${formatPercent(p.lanceEmbutidoPerc, 0)})`
            : 'Não utilizado',
        `- ${formatBRL(aggregated.lanceEmbutidoTotal)}`
      ),
      isEmbutido: true,
      isZebra: false,
    });
  }

  if (visibleRows.creditoLiquido) {
    block1Rows.push({
      label: 'Crédito a Liberar',
      values: getColValues(
        (p) => formatBRL(p.creditoLiquido),
        formatBRL(aggregated.creditoLiquidoTotal)
      ),
      highlight: 'green',
      bold: true,
    });
  }

  if (visibleRows.prazo) {
    block1Rows.push({
      label: 'Qntd. Parcelas em Meses',
      values: getColValues(
        (p) => `${p.prazo}`,
        `${Math.max(...proposals.map((p) => p.prazo))}`
      ),
      isZebra: false,
    });
  }

  if (visibleRows.parcelaMensal) {
    block1Rows.push({
      label: incluirSeguro ? `Parcela Mensal (c/ Seg. ${tipoPessoa})` : 'Parcela Mensal',
      values: getColValues(
        (p) => formatBRL(p.parcelaMensalTotal),
        formatBRL(aggregated.parcelaMensalTotal)
      ),
      isZebra: true,
    });
  }

  if (hasAnyLance && visibleRows.lanceTotal) {
    block1Rows.push({
      label: 'Lance Proposto',
      values: getColValues(
        (p) => formatPercent(p.lanceTotalPerc, 2),
        formatPercent(aggregated.lanceTotalPercMedio, 2)
      ),
      isZebra: false,
    });
    block1Rows.push({
      label: 'Valor do Lance',
      values: getColValues(
        (p) => formatBRL(p.valorLanceTotal),
        formatBRL(aggregated.lanceTotalValor)
      ),
      isZebra: true,
    });
  }

  if (hasAnyEmbutido && hasAnyLance && visibleRows.lanceRecursoProprio) {
    block1Rows.push({
      label: 'Lance do Bolso (Recurso Próprio)',
      values: getColValues(
        (p) =>
          `${formatBRL(p.valorLanceRecursoProprio)} (${formatPercent(
            p.lanceRecursoProprioPerc,
            1
          )})`,
        formatBRL(aggregated.lanceRecursoProprioTotal)
      ),
      highlight: 'amber',
      bold: true,
      isZebra: false,
    });
  }

  if (hasAnyLance && visibleRows.parcelaPosLance) {
    block1Rows.push({
      label: 'Parcela Após Diluir o Lance',
      values: getColValues(
        (p) => formatBRL(p.parcelaPosLance),
        formatBRL(aggregated.parcelaPosLanceTotal)
      ),
      highlight: 'blue',
      bold: true,
    });
  }

  // Oculta Valor Unitário se todas as propostas forem de 1 cota
  const hasMultipleCotas = proposals.some((p) => p.cotas > 1);
  if (hasMultipleCotas && visibleRows.valorUnitario) {
    block1Rows.push({
      label: 'Valor Unitário',
      values: getColValues((p) => formatBRL(p.valorUnitario), '-'),
      isZebra: true,
    });
  }

  if (visibleRows.cotas) {
    block1Rows.push({
      label: 'Qntd. Cotas',
      values: getColValues(
        (p) => `${p.cotas} ${p.cotas === 1 ? 'cota' : 'cotas'}`,
        `${aggregated.cotasTotal} cotas`
      ),
      bold: true,
      isZebra: false,
    });
  }

  // MONTAGEM DO BLOCO 2
  const block2Rows: RowDef[] = [];
  if (visibleRows.taxaMensalizada) {
    block2Rows.push({
      label: 'Taxa Mensalizada',
      values: getColValues(
        (p) => `${formatPercent(p.taxaMensalizada, 2)} a.m.`,
        `${formatPercent(aggregated.taxaMensalizadaMedia, 2)} a.m.`
      ),
      isZebra: true,
      bold: true,
    });
  }
  if (visibleRows.taxaAnual) {
    block2Rows.push({
      label: 'Taxa Anual',
      values: getColValues(
        (p) => `${formatPercent(p.taxaAnual, 2)} a.a.`,
        `${formatPercent(aggregated.taxaAnualMedia, 2)} a.a.`
      ),
      isZebra: false,
      bold: true,
    });
  }
  if (visibleRows.indiceCorrecao) {
    block2Rows.push({
      label: 'Índice de Correção',
      values: getColValues((p) => p.indiceCorrecao, proposals[0]?.indiceCorrecao || '-'),
      isZebra: true,
    });
  }

  // MONTAGEM DO BLOCO 3
  const block3Rows: RowDef[] = [];
  if (hasAnyLance && visibleRows.prazoPosLance) {
    block3Rows.push({
      label: 'Opção Alternativa (Redução de Prazo)',
      values: getColValues(
        (p) => `${p.prazoPosLance} parcelas (mantendo parcela cheia)`,
        `${aggregated.prazoPosLanceMax} parcelas (mantendo parcela cheia)`
      ),
      bold: true,
      isZebra: false,
    });
  }

  // DIMENSÕES E DIAGRAMAÇÃO EXATA
  const scale = 2; // Retina 2x
  const cardW = isSingle ? 720 : Math.min(1080, 480 + colsCount * 190);
  const outerPadX = 24;
  const outerPadY = 24;
  const width = cardW + outerPadX * 2;

  const innerPad = 24;
  const tableW = cardW - innerPad * 2;
  const rowH = 45; // Linhas arejadas como na prévia aprovada
  const headerLogoH = 74;
  const subBannerH = 42;
  const gapBetweenBlocks = 18;

  const totalTableRows = block1Rows.length + block2Rows.length + block3Rows.length;
  const footerH = 46;

  const cardH =
    innerPad +
    headerLogoH +
    10 +
    subBannerH +
    10 +
    block1Rows.length * rowH +
    (block2Rows.length > 0 ? gapBetweenBlocks + block2Rows.length * rowH : 0) +
    (block3Rows.length > 0 ? gapBetweenBlocks + block3Rows.length * rowH : 0) +
    footerH +
    innerPad;

  const height = cardH + outerPadY * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);

  // 1. Fundo externo suave cinza-azulado (#F1F5F9)
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, width, height);

  // 2. Card Principal Branco com Sombra e Borda (#CBD5E1)
  const cardX = outerPadX;
  const cardY = outerPadY;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 3. Topo Amarelo Ouro Oficial BB Consórcios
  let curY = cardY + innerPad;
  const contentX = cardX + innerPad;

  roundRect(ctx, contentX, curY, tableW, headerLogoH, 10);
  ctx.fillStyle = '#FFCC00';
  ctx.fill();

  const logoImg = await loadImage('./logo-bb-consorcios.png');
  if (logoImg) {
    const targetH = 54;
    const targetW = (logoImg.width / logoImg.height) * targetH;
    ctx.drawImage(
      logoImg,
      cardX + cardW / 2 - targetW / 2,
      curY + (headerLogoH - targetH) / 2,
      targetW,
      targetH
    );
  } else {
    ctx.fillStyle = '#0038A8';
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BB CONSÓRCIOS', cardX + cardW / 2, curY + 46);
  }

  curY += headerLogoH + 10;

  // 4. Sub-barra Azul Gradiente da Modalidade
  const blueGrad = ctx.createLinearGradient(contentX, curY, contentX + tableW, curY);
  blueGrad.addColorStop(0, '#002D62');
  blueGrad.addColorStop(1, '#0F4C81');
  roundRect(ctx, contentX, curY, tableW, subBannerH, 8);
  ctx.fillStyle = blueGrad;
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  const modTitle = `MODALIDADE: ${modalidadeLabel.toUpperCase()}${
    incluirSeguro ? ` (SEGURO ${tipoPessoa})` : ''
  }`;
  ctx.fillText(modTitle, contentX + 16, curY + 26);

  if (cliente.trim()) {
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFCC00';
    ctx.fillText(`CLIENTE: ${cliente.trim().toUpperCase()}`, contentX + tableW - 16, curY + 26);
  }

  curY += subBannerH + 10;

  // 5. Função de Desenho de Bloco de Tabela Refinada
  const labelColW = isSingle ? 310 : Math.round(tableW * 0.42);
  const valColW = (tableW - labelColW) / colsCount;

  const drawBlock = (rows: RowDef[]) => {
    if (rows.length === 0) return;
    const blockStartY = curY;
    const blockH = rows.length * rowH;

    // Fundo base e cantos arredondados do bloco
    ctx.save();
    roundRect(ctx, contentX, blockStartY, tableW, blockH, 8);
    ctx.clip();

    rows.forEach((row, rIdx) => {
      const y = curY;

      // Fundo da linha
      if (row.highlight === 'green') {
        ctx.fillStyle = '#ECFDF5';
      } else if (row.highlight === 'blue') {
        ctx.fillStyle = '#EFF6FF';
      } else if (row.isZebra) {
        ctx.fillStyle = '#F8FAFC';
      } else {
        ctx.fillStyle = '#FFFFFF';
      }
      ctx.fillRect(contentX, y, tableW, rowH);

      // Linha divisória horizontal
      if (rIdx < rows.length - 1) {
        ctx.strokeStyle =
          row.highlight === 'green'
            ? '#A7F3D0'
            : row.highlight === 'blue'
            ? '#BFDBFE'
            : '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(contentX, y + rowH);
        ctx.lineTo(contentX + tableW, y + rowH);
        ctx.stroke();
      }

      // Texto do Rótulo (Esquerda)
      ctx.fillStyle =
        row.highlight === 'green'
          ? '#065F46'
          : row.highlight === 'blue'
          ? '#1E3A8A'
          : row.highlight === 'amber'
          ? '#B45309'
          : row.isEmbutido
          ? '#4338CA'
          : '#334155';
      ctx.font = `${
        row.highlight || row.bold ? '800' : '700'
      } 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(row.label, contentX + 18, y + 27);

      // Valores (Direita / Centralizados nas colunas)
      row.values.forEach((val, cIdx) => {
        const colX = contentX + labelColW + cIdx * valColW;

        // Divisória vertical
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(colX, y);
        ctx.lineTo(colX, y + rowH);
        ctx.stroke();

        ctx.fillStyle =
          row.highlight === 'green'
            ? '#047857'
            : row.highlight === 'blue'
            ? '#1D4ED8'
            : row.highlight === 'amber'
            ? '#B45309'
            : row.isEmbutido
            ? '#4338CA'
            : row.bold
            ? '#0F4C81'
            : '#1E293B';
        ctx.font = `${
          row.highlight === 'green' || row.highlight === 'blue'
            ? '900 16px'
            : row.highlight === 'amber'
            ? '900 14px'
            : row.bold
            ? '900 14px'
            : '800 13.5px'
        } -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(val, colX + valColW / 2, y + 27);
      });

      curY += rowH;
    });

    ctx.restore();

    // Borda externa elegante do bloco (#94A3B8)
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    roundRect(ctx, contentX, blockStartY, tableW, blockH, 8);
    ctx.stroke();
  };

  drawBlock(block1Rows);

  if (block2Rows.length > 0) {
    curY += gapBetweenBlocks;
    drawBlock(block2Rows);
  }

  if (block3Rows.length > 0) {
    curY += gapBetweenBlocks;
    drawBlock(block3Rows);
  }

  // 6. Rodapé Institucional
  curY += 28;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, curY);
  ctx.lineTo(contentX + tableW, curY);
  ctx.stroke();

  curY += 20;
  ctx.fillStyle = '#64748B';
  ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Simulação BB Consórcios (${tipoPessoa}) • ${new Date().toLocaleDateString('pt-BR')}`,
    contentX,
    curY
  );

  if (especialista.trim()) {
    ctx.fillStyle = '#0F4C81';
    ctx.font = '800 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${especialista.trim()}${
        telefoneEspecialista.trim() ? ` • ${telefoneEspecialista.trim()}` : ''
      }`,
      contentX + tableW,
      curY
    );
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}
