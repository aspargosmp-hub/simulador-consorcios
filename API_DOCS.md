# 🚀 Documentação Oficial da API — Motor de Consórcios BB

Esta API disponibiliza dois níveis de integração com arquitetura de alta performance e proteção anti-scraping:

1. **API Comercial (Simulador Caixa-Preta):** Para captação de leads em websites, chatbots e CRMs. Entrega apenas as propostas calculadas (crédito, parcelas, prazos, lances e texto para WhatsApp), **sem expor códigos de grupo ou dados da esteira bancária**.
2. **API Master Operacional (Emissão e Fechamento):** Exclusiva para parceiros credenciados. Permite simular por código de grupo específico ou obter os dados contratuais da cota para formalização da venda.

> 🛡️ **BLINDAGEM ANTI-EXPORTAÇÃO ATIVA:**  
> A API **NÃO possui endpoints de listagem, catálogo ou exportação em lote de tabelas**.  
> Qualquer tentativa de varredura automatizada (consultas sequenciais de grupos) aciona o bloqueio de segurança imediato (`HTTP 429: Bloqueio de Segurança`).

---

## 🔐 1. Níveis de Autenticação

Envie a chave no cabeçalho HTTP de cada requisição:

```http
x-api-key: SUA_CHAVE_AQUI
```
ou
```http
Authorization: Bearer SUA_CHAVE_AQUI
```

| Nível | Chave de Teste | Endpoints Permitidos | Descrição |
| :--- | :--- | :--- | :--- |
| **Comercial (Standard)** | `demo_key_bb_consorcios` | `/api/v1/simulate`, `/api/v1/whatsapp-text` | Simulação limpa sem revelar dados de grupos. |
| **Master Operacional** | `master_key_bb_consorcios` | Todos os endpoints + `/api/v1/simulate/master` | Emissão de proposta com grupo e dados contratuais. |

---

## 📡 2. Endpoints

### A. API Comercial — `POST /api/v1/simulate`
Simula automaticamente as melhores cotas sem entregar informações do grupo do banco.

* **Headers:** `x-api-key: <CHAVE_COMERCIAL>`
* **Body (JSON):**
```json
{
  "objetivo": "TRATOR",
  "plano": "Flex",
  "creditoLiquido": 350000,
  "lanceBolso": 30000,
  "usarEmbutido": true,
  "tipoPessoa": "PF",
  "mode": "compare3"
}
```

* **Exemplo de Retorno (Apenas Resultados Financeiros):**
```json
{
  "success": true,
  "propostas": [
    {
      "opcao": 1,
      "plano": "Plano Flex (-2% Taxa)",
      "objetivo": "Trator / Agrícola",
      "cotas": 4,
      "prazoMeses": 82,
      "creditoBruto": 499872.0,
      "creditoLiquido": 349910.4,
      "lanceEmbutido": { "percentual": 30.0, "valor": 149961.6 },
      "lanceBolso": { "percentual": 6.0, "valor": 29992.32 },
      "lanceTotal": { "percentual": 36.0, "valor": 179953.92 },
      "parcelaMensalSemLance": 7796.48,
      "parcelaPosLanceEstimada": 5518.22,
      "taxas": {
        "taxaAdmTotal": 26.9,
        "taxaMensalizada": 0.33,
        "taxaAnual": 3.96,
        "indiceCorrecao": "FIPE"
      }
    }
  ],
  "whatsappTextoPronto": "*PROPOSTA DE CONSÓRCIO BB...*"
}
```

---

### B. API Master Operacional — `POST /api/v1/simulate/master`
Exclusivo para parceiros credenciados emitirem a proposta formal de contratação ou simularem um grupo específico que já possuem.

* **Headers:** `x-api-key: <CHAVE_MASTER>`
* **Body para Simulação por Grupo Específico (JSON):**
```json
{
  "grupo": "001583",
  "cotas": 2,
  "lanceBolso": 50000,
  "usarEmbutido": true
}
```

* **Retorno Master (Com Dados para Contrato):**
```json
{
  "success": true,
  "propostas": [
    {
      "opcao": 1,
      "grupo": "001583",
      "bemCodigo": "00095",
      "bemDescricao": "50 PULSE DRIVE 1 3 8V FLEX AT",
      "assembleiaProxima": "27/11/2026",
      "historicoLanceMinimo12m": "46.9%",
      "cotas": 2,
      "prazoMeses": 53,
      "creditoLiquido": 79368.10,
      "parcelaPosLanceEstimada": 2017.85
    }
  ]
}
```

---

### C. Geração de Texto para WhatsApp — `POST /api/v1/whatsapp-text`
Devolve diretamente a mensagem formatada para WhatsApp:

* **Retorno:**
```json
{
  "success": true,
  "textoFormatado": "*PROPOSTA DE CONSÓRCIO BB — TRATOR / AGRÍCOLA*\n📋 *Plano:* Flex (-2% Taxa)..."
}
```

---

## 🛡️ 3. Regras de Segurança e Proteção de Dados

1. **Zero Listagem de Tabelas:** A API processa exclusivamente simulações individuais. Não há rotas para exportação em massa de tabelas.
2. **Proteção Anti-Varredura:** Se uma mesma chave tentar consultar mais de 6 grupos distintos em menos de 1 minuto, a requisição é bloqueada automaticamente (`HTTP 429`).
3. **Limite de Taxa (Rate Limit):** Limite de 30 chamadas por minuto para simulações comerciais.
