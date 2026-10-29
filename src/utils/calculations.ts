import {
  CalculatedProposal,
  CodigoModalidade,
  ConsorcioItem,
  ProposalSlot,
  TipoPessoa,
} from '../types';

export const MODALIDADES_LIST: {
  code: CodigoModalidade;
  label: string;
  shortLabel: string;
  segmento: string;
  plano: 'Flex' | 'Master' | 'Especial 240';
}[] = [
  { code: 'AU3', label: 'Auto FIPE (Flex)', shortLabel: 'Auto FIPE Flex', segmento: 'AU', plano: 'Flex' },
  { code: 'AU4', label: 'Auto FIPE (Master)', shortLabel: 'Auto FIPE Master', segmento: 'AU', plano: 'Master' },
  { code: 'AI3', label: 'Auto IPCA (Flex)', shortLabel: 'Auto IPCA Flex', segmento: 'AI', plano: 'Flex' },
  { code: 'AI4', label: 'Auto IPCA (Master)', shortLabel: 'Auto IPCA Master', segmento: 'AI', plano: 'Master' },
  { code: 'IM3', label: 'Imóvel (Flex)', shortLabel: 'Imóvel Flex', segmento: 'IM', plano: 'Flex' },
  { code: 'IM4', label: 'Imóvel (Master)', shortLabel: 'Imóvel Master', segmento: 'IM', plano: 'Master' },
  { code: 'IM9', label: 'Imóvel Especial 240m (Tab. 93)', shortLabel: 'Imóvel 240m (Tab.93)', segmento: 'IM', plano: 'Especial 240' },
  { code: 'TC3', label: 'Tratores e Caminhões (Flex)', shortLabel: 'Agro / Pesados Flex', segmento: 'TC', plano: 'Flex' },
  { code: 'TC4', label: 'Tratores e Caminhões (Master)', shortLabel: 'Agro / Pesados Master', segmento: 'TC', plano: 'Master' },
  { code: 'EE3', label: 'Eletro / Solar (Flex)', shortLabel: 'Eletro / Solar Flex', segmento: 'EE', plano: 'Flex' },
  { code: 'EE4', label: 'Eletro / Solar (Master)', shortLabel: 'Eletro / Solar Master', segmento: 'EE', plano: 'Master' },
  { code: 'MO3', label: 'Motos (Flex)', shortLabel: 'Motos Flex', segmento: 'MO', plano: 'Flex' },
  { code: 'MO4', label: 'Motos (Master)', shortLabel: 'Motos Master', segmento: 'MO', plano: 'Master' },
];

// Alíquotas mensais de referência do Seguro Prestamista BB Consórcios sobre o valor da categoria
export const ALIQUOTA_SEGURO_MENSAL: Record<TipoPessoa, number> = {
  PF: 0.038, // 0,038% a.m. para Pessoa Física
  PJ: 0.054, // 0,054% a.m. para Pessoa Jurídica
};

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${(Number.isFinite(value) ? value : 0).toFixed(decimals)}%`;
}

export function calculateProposal(
  slot: ProposalSlot,
  item: ConsorcioItem,
  tipoPessoa: TipoPessoa = 'PF',
  incluirSeguro = false
): CalculatedProposal {
  const cotas = Math.max(1, slot.cotas || 1);
  const valorUnitario = item.valorBem;
  const creditoBruto = valorUnitario * cotas;

  const totalTaxasPerc = item.taxaAdm + item.fundoReserva + item.seguro;
  const valorCategoriaTotal = creditoBruto * (1 + totalTaxasPerc / 100);

  const parcelaUnitariaCalculada =
    (valorUnitario * (1 + totalTaxasPerc / 100)) / Math.max(1, item.prazo);
  const parcelaUnitariaSemSeguro =
    Math.abs(parcelaUnitariaCalculada - item.parcela) < 0.05
      ? item.parcela
      : parcelaUnitariaCalculada;
  const parcelaMensalSemSeguro = parcelaUnitariaSemSeguro * cotas;

  // Seguro Prestamista Mensal (PF vs PJ)
  const aliquotaSeguroMensal = incluirSeguro ? ALIQUOTA_SEGURO_MENSAL[tipoPessoa] : 0;
  const valorSeguroMensal = incluirSeguro
    ? valorCategoriaTotal * (aliquotaSeguroMensal / 100)
    : 0;

  const parcelaMensalTotal = parcelaMensalSemSeguro + valorSeguroMensal;

  const lanceRecursoProprioPerc = Math.max(0, Math.min(99, slot.lanceRecursoProprioPerc || 0));
  const lanceEmbutidoPerc = Math.max(0, Math.min(30, slot.lanceEmbutidoPerc || 0));
  const lanceTotalPerc = Math.min(99, lanceRecursoProprioPerc + lanceEmbutidoPerc);

  const valorLanceRecursoProprio = creditoBruto * (lanceRecursoProprioPerc / 100);
  const valorLanceEmbutido = creditoBruto * (lanceEmbutidoPerc / 100);
  const valorLanceTotal = valorLanceRecursoProprio + valorLanceEmbutido;

  const creditoLiquido = Math.max(0, creditoBruto - valorLanceEmbutido);

  const saldoTotalSemSeguro = parcelaMensalSemSeguro * item.prazo;
  const parcelaPosLanceSemSeguro =
    lanceTotalPerc > 0 && item.prazo > 1
      ? Math.max(
          0,
          (saldoTotalSemSeguro - parcelaMensalSemSeguro - valorLanceTotal) / (item.prazo - 1)
        )
      : parcelaMensalSemSeguro;

  // Após diluir o lance, o seguro prestamista incide proporcionalmente sobre o novo saldo devedor
  const fatorReducaoSaldo =
    saldoTotalSemSeguro > 0
      ? Math.max(0, (saldoTotalSemSeguro - valorLanceTotal) / saldoTotalSemSeguro)
      : 1;
  const seguroPosLance = valorSeguroMensal * fatorReducaoSaldo;
  const parcelaPosLance = parcelaPosLanceSemSeguro + seguroPosLance;

  const prazoPosLance =
    lanceTotalPerc > 0 && parcelaMensalSemSeguro > 0
      ? Math.max(1, Math.round((saldoTotalSemSeguro - valorLanceTotal) / parcelaMensalSemSeguro))
      : item.prazo;

  const taxaMensalizada = Number((item.taxaAdm / Math.max(1, item.prazo)).toFixed(2));
  const taxaAnual = Number((taxaMensalizada * 12).toFixed(2));

  const aceitaLanceEmbutido =
    item.tags.includes('Lance Embutido') ||
    item.bemDescricao.toUpperCase().includes('EMBUTIDO');

  return {
    slotIndex: slot.slotIndex,
    item,
    cotas,
    tipoPessoa,
    incluirSeguro,
    aliquotaSeguroMensal,
    valorSeguroMensal,
    valorUnitario,
    creditoBruto,
    lanceRecursoProprioPerc,
    lanceEmbutidoPerc,
    lanceTotalPerc,
    valorLanceRecursoProprio,
    valorLanceEmbutido,
    valorLanceTotal,
    creditoLiquido,
    prazo: item.prazo,
    parcelaUnitariaSemSeguro,
    parcelaMensalSemSeguro,
    parcelaMensalTotal,
    parcelaPosLance,
    prazoPosLance,
    taxaAdm: item.taxaAdm,
    fundoReserva: item.fundoReserva,
    seguro: item.seguro,
    taxaMensalizada,
    taxaAnual,
    indiceCorrecao: item.indiceCorrecao,
    aceitaLanceEmbutido,
  };
}

export interface AggregatedProposals {
  creditoBrutoTotal: number;
  creditoLiquidoTotal: number;
  parcelaMensalSemSeguroTotal: number;
  valorSeguroMensalTotal: number;
  parcelaMensalTotal: number;
  lanceRecursoProprioTotal: number;
  lanceEmbutidoTotal: number;
  lanceTotalValor: number;
  lanceTotalPercMedio: number;
  lanceEmbutidoPercMedio: number;
  lanceProprioPercMedio: number;
  parcelaPosLanceTotal: number;
  faixasParcelaPosLance: string[];
  cotasTotal: number;
  taxaMensalizadaMedia: number;
  taxaAnualMedia: number;
  taxaAdmMedia: number;
  fundoReservaMedio: number;
  prazoPosLanceMax: number;
}

export function aggregateProposals(proposals: CalculatedProposal[]): AggregatedProposals {
  const count = Math.max(1, proposals.length);
  const creditoBrutoTotal = proposals.reduce((acc, p) => acc + p.creditoBruto, 0);
  const creditoLiquidoTotal = proposals.reduce((acc, p) => acc + p.creditoLiquido, 0);
  const parcelaMensalSemSeguroTotal = proposals.reduce(
    (acc, p) => acc + p.parcelaMensalSemSeguro,
    0
  );
  const valorSeguroMensalTotal = proposals.reduce((acc, p) => acc + p.valorSeguroMensal, 0);
  const parcelaMensalTotal = proposals.reduce((acc, p) => acc + p.parcelaMensalTotal, 0);
  const lanceRecursoProprioTotal = proposals.reduce((acc, p) => acc + p.valorLanceRecursoProprio, 0);
  const lanceEmbutidoTotal = proposals.reduce((acc, p) => acc + p.valorLanceEmbutido, 0);
  const lanceTotalValor = proposals.reduce((acc, p) => acc + p.valorLanceTotal, 0);
  const parcelaPosLanceTotal = proposals.reduce((acc, p) => acc + p.parcelaPosLance, 0);
  const cotasTotal = proposals.reduce((acc, p) => acc + p.cotas, 0);

  const lanceTotalPercMedio =
    creditoBrutoTotal > 0 ? (lanceTotalValor / creditoBrutoTotal) * 100 : 0;
  const lanceEmbutidoPercMedio =
    creditoBrutoTotal > 0 ? (lanceEmbutidoTotal / creditoBrutoTotal) * 100 : 0;
  const lanceProprioPercMedio =
    creditoBrutoTotal > 0 ? (lanceRecursoProprioTotal / creditoBrutoTotal) * 100 : 0;

  const taxaMensalizadaMedia =
    proposals.reduce((acc, p) => acc + p.taxaMensalizada, 0) / count;
  const taxaAnualMedia = proposals.reduce((acc, p) => acc + p.taxaAnual, 0) / count;
  const taxaAdmMedia = proposals.reduce((acc, p) => acc + p.taxaAdm, 0) / count;
  const fundoReservaMedio =
    proposals.reduce((acc, p) => acc + p.fundoReserva, 0) / count;
  const prazoPosLanceMax = proposals.reduce((max, p) => Math.max(max, p.prazoPosLance), 0);

  const sortedByPrazo = [...proposals].sort((a, b) => a.prazo - b.prazo);
  const uniquePrazos = Array.from(new Set(sortedByPrazo.map((p) => p.prazo)));
  const faixasParcelaPosLance: string[] = [];

  if (uniquePrazos.length <= 1) {
    if (sortedByPrazo.length > 0) {
      faixasParcelaPosLance.push(
        `1 a ${sortedByPrazo[0].prazo}m: ${formatBRL(parcelaPosLanceTotal)}`
      );
    }
  } else {
    let prevMonth = 1;
    for (const prazoCutoff of uniquePrazos) {
      const sumActive = sortedByPrazo
        .filter((p) => p.prazo >= prazoCutoff)
        .reduce((acc, p) => acc + p.parcelaPosLance, 0);
      faixasParcelaPosLance.push(
        `${prevMonth} a ${prazoCutoff}m: ${formatBRL(sumActive)}`
      );
      prevMonth = prazoCutoff + 1;
    }
  }

  return {
    creditoBrutoTotal,
    creditoLiquidoTotal,
    parcelaMensalSemSeguroTotal,
    valorSeguroMensalTotal,
    parcelaMensalTotal,
    lanceRecursoProprioTotal,
    lanceEmbutidoTotal,
    lanceTotalValor,
    lanceTotalPercMedio,
    lanceEmbutidoPercMedio,
    lanceProprioPercMedio,
    parcelaPosLanceTotal,
    faixasParcelaPosLance,
    cotasTotal,
    taxaMensalizadaMedia,
    taxaAnualMedia,
    taxaAdmMedia,
    fundoReservaMedio,
    prazoPosLanceMax,
  };
}
