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
 * Gera um Blob PNG em alta definição (Retina 2x) do Quadro de Simulação BB Consórcios
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

  // Monta as 3 seções de linhas inspiradas no modelo clássico da BB Consórcios, porém com design moderno
  interface RowDef {
    label: string;
    values: string[];
    highlight?: 'green' | 'blue' | 'gold';
    bold?: boolean;
  }

  const getColValues = (fn: (p: CalculatedProposal) => string, aggVal: string): string[] => {
    const arr = proposals.map(fn);
    if (showAggregatedCol) arr.push(aggVal);
    return arr;
  };

  const hasAnyEmbutido = proposals.some((p) => p.lanceEmbutidoPerc > 0);
  const hasAnyLance = proposals.some((p) => p.lanceTotalPerc > 0);

  const block1Rows: RowDef[] = [
    {
      label: 'Grupo',
      values: getColValues((p) => p.item.grupo.replace(/^0+/, '') || p.item.grupo, 'Soma Cotas'),
      bold: true,
    },
  ];

  if (hasAnyEmbutido && visibleRows.creditoBruto) {
    block1Rows.push({
      label: 'Valor da Carta (Bruto)',
      values: getColValues(
        (p) => formatBRL(p.creditoBruto),
        formatBRL(aggregated.creditoBrutoTotal)
      ),
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
        `${formatBRL(aggregated.lanceEmbutidoTotal)}`
      ),
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
      bold: true,
    });
  }

  if (visibleRows.parcelaMensal) {
    block1Rows.push({
      label: incluirSeguro ? `Parcela Mensal (c/ Seg. ${tipoPessoa})` : 'Parcela Mensal',
      values: getColValues(
        (p) => formatBRL(p.parcelaMensalTotal),
        formatBRL(aggregated.parcelaMensalTotal)
      ),
      bold: true,
    });
  }

  if (hasAnyLance && visibleRows.lanceTotal) {
    block1Rows.push({
      label: 'Lance Proposto',
      values: getColValues(
        (p) => formatPercent(p.lanceTotalPerc, 2),
        formatPercent(aggregated.lanceTotalPercMedio, 2)
      ),
      bold: true,
    });
    block1Rows.push({
      label: 'Valor do Lance Total',
      values: getColValues(
        (p) => formatBRL(p.valorLanceTotal),
        formatBRL(aggregated.lanceTotalValor)
      ),
      bold: true,
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

  if (visibleRows.valorUnitario) {
    block1Rows.push({
      label: 'Valor Unitário',
      values: getColValues((p) => formatBRL(p.valorUnitario), '-'),
    });
  }

  if (visibleRows.cotas) {
    block1Rows.push({
      label: 'Qntd. Cotas',
      values: getColValues((p) => `${p.cotas}`, `${aggregated.cotasTotal}`),
      bold: true,
    });
  }

  const block2Rows: RowDef[] = [];
  if (visibleRows.taxaMensalizada) {
    block2Rows.push({
      label: 'Taxa Mensalizada',
      values: getColValues(
        (p) => formatPercent(p.taxaMensalizada, 2),
        formatPercent(aggregated.taxaMensalizadaMedia, 2)
      ),
      bold: true,
    });
  }
  if (visibleRows.taxaAnual) {
    block2Rows.push({
      label: 'Taxa Anual',
      values: getColValues(
        (p) => formatPercent(p.taxaAnual, 2),
        formatPercent(aggregated.taxaAnualMedia, 2)
      ),
      bold: true,
    });
  }
  if (visibleRows.indiceCorrecao) {
    block2Rows.push({
      label: 'Índice de Correção',
      values: getColValues((p) => p.indiceCorrecao, proposals[0]?.indiceCorrecao || '-'),
      bold: true,
    });
  }

  const block3Rows: RowDef[] = [];
  if (hasAnyLance && visibleRows.prazoPosLance) {
    block3Rows.push({
      label: 'Qntd. Parcelas Após Diluir o Lance',
      values: getColValues((p) => `${p.prazoPosLance}`, '-'),
      bold: true,
    });
  }

  const scale = 2; // Retina 2x
  const width = colsCount === 1 ? 680 : Math.min(1080, 440 + colsCount * 200);
  const padX = 28;
  const rowH = 38;
  const headerLogoH = 88;
  const subBannerH = 44;
  const gapBetweenBlocks = 16;

  const totalRowsCount = block1Rows.length + block2Rows.length + block3Rows.length;
  const footerH = 44;
  const height =
    24 +
    headerLogoH +
    subBannerH +
    totalRowsCount * rowH +
    (block2Rows.length > 0 ? gapBetweenBlocks : 0) +
    (block3Rows.length > 0 ? gapBetweenBlocks : 0) +
    footerH +
    20;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);

  // Fundo branco geral
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Faixa superior Amarela BB Consórcios (#FFCC00)
  let curY = 20;
  roundRect(ctx, padX, curY, width - padX * 2, headerLogoH, 10);
  ctx.fillStyle = '#FFCC00';
  ctx.fill();

  const logoImg = await loadImage('./logo-bb-consorcios.png');
  if (logoImg) {
    const targetH = 64;
    const targetW = (logoImg.width / logoImg.height) * targetH;
    ctx.drawImage(
      logoImg,
      width / 2 - targetW / 2,
      curY + (headerLogoH - targetH) / 2,
      targetW,
      targetH
    );
  } else {
    ctx.fillStyle = '#003399';
    ctx.font = '900 32px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BB CONSÓRCIOS', width / 2, curY + 54);
  }

  curY += headerLogoH + 8;

  // Sub-banner Azul Escuro BB ("Modalidade: ...")
  const tableW = width - padX * 2;
  ctx.fillStyle = '#0F4C81';
  ctx.fillRect(padX, curY, tableW, subBannerH);
  ctx.strokeStyle = '#0B2E59';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, curY, tableW, subBannerH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 15px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Modalidade: ${modalidadeLabel}`, padX + 14, curY + 27);

  if (cliente.trim()) {
    ctx.font = '600 13px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFCC00';
    ctx.fillText(`Cliente: ${cliente.trim()}`, width - padX - 14, curY + 27);
  }

  curY += subBannerH;

  const labelColW = colsCount === 1 ? Math.round(tableW * 0.44) : Math.round(tableW * 0.36);
  const valColW = (tableW - labelColW) / colsCount;

  const drawBlock = (rows: RowDef[]) => {
    if (rows.length === 0) return;
    const blockStartY = curY;
    rows.forEach((row, rIdx) => {
      const y = curY;
      // Fundo da linha
      if (row.highlight === 'green') {
        ctx.fillStyle = '#ECFDF5';
      } else if (row.highlight === 'blue') {
        ctx.fillStyle = '#EFF6FF';
      } else {
        ctx.fillStyle = rIdx % 2 === 0 ? '#FFFFFF' : '#F1F5F9';
      }
      ctx.fillRect(padX, y, tableW, rowH);

      // Linha divisória horizontal
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX, y + rowH);
      ctx.lineTo(padX + tableW, y + rowH);
      ctx.stroke();

      // Texto do rótulo (esquerda)
      ctx.fillStyle =
        row.highlight === 'green'
          ? '#065F46'
          : row.highlight === 'blue'
          ? '#1E3A8A'
          : '#1E40AF';
      ctx.font = `${row.bold ? '800' : '700'} 14px Inter, Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(row.label, padX + 14, y + 24);

      // Valores (colunas à direita)
      row.values.forEach((val, cIdx) => {
        const colX = padX + labelColW + cIdx * valColW;
        // Divisória vertical
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colX, y);
        ctx.lineTo(colX, y + rowH);
        ctx.stroke();

        ctx.fillStyle =
          row.highlight === 'green'
            ? '#047857'
            : row.highlight === 'blue'
            ? '#0F3B82'
            : '#0F4C81';
        ctx.font = `${row.bold ? '800' : '700'} 15px Inter, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(val, colX + valColW / 2, y + 24);
      });

      curY += rowH;
    });

    // Borda externa do bloco
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padX, blockStartY, tableW, rows.length * rowH);
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

  // Rodapé institucional discreto
  curY += 24;
  ctx.fillStyle = '#64748B';
  ctx.font = '600 11px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Simulação BB Consórcios (${tipoPessoa}) • Data: ${new Date().toLocaleDateString('pt-BR')}`,
    padX,
    curY
  );

  if (especialista.trim()) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F4C81';
    ctx.font = '700 11px Inter, Arial, sans-serif';
    ctx.fillText(
      `${especialista.trim()}${
        telefoneEspecialista.trim() ? ` • ${telefoneEspecialista.trim()}` : ''
      }`,
      width - padX,
      curY
    );
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}
