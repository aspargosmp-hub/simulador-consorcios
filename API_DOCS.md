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
Simula automaticamente as melhores cotas sem entregar metadados contratuais e focada em crédito nominal e parcela pura (a engenharia de lance embutido de até 30% e parcela pós-lance é exclusiva do Plano Master).

* **Headers:** `x-api-key: <CHAVE_COMERCIAL>`
* **Body (JSON):**
```json
{
  "objetivo": "TRATOR",
  "plano": "Flex",
  "creditoLiquido": 350000,
  "tipoPessoa": "PF",
  "mode": "compare3"
}
```

* **Exemplo de Retorno (Apenas Resultados Financeiros Básicos):**
```json
{
  "success": true,
  "propostas": [
    {
      "opcao": 1,
      "plano": "Plano Flex (-2% Taxa)",
      "objetivo": "Trator / Agrícola",
      "cotas": 3,
      "prazoMeses": 82,
      "creditoBruto": 374904.0,
      "creditoLiquido": 374904.0,
      "lanceEmbutido": { "percentual": 0.0, "valor": 0.0 },
      "lanceBolso": { "percentual": 0.0, "valor": 0.0 },
      "lanceTotal": { "percentual": 0.0, "valor": 0.0 },
      "parcelaMensalSemLance": 5847.36,
      "parcelaPosLanceEstimada": 5847.36,
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

## ⚠️ 3. Política de Uso Aceitável, Monitoramento Anti-Scraping e Riscos Legais

A API do Motor de Consórcios é um serviço de inteligência transacional sob demanda. Para garantir a segurança dos dados, a disponibilidade do cluster e a integridade da propriedade intelectual, **todas as requisições são ativamente auditadas em tempo real**.

### A. Condutas Estritamente Proibidas (Tolerância Zero)

1. **Varredura Automatizada & Crawling:** É expressamente proibido rodar scripts, bots ou rotinas em looping com o objetivo de iterar valores, prazos ou códigos de grupos para mapear o catálogo completo de cotas.
2. **Raspagem de Dados (*Data Scraping*) e Exportação (*Data Dumping*):** Não é permitida a extração massiva de dados para armazenamento em bancos locais, planilhas ou plataformas externas.
3. **Engenharia Reversa:** Tentativas de descompilar, analisar parâmetros estatísticos ou inferir a lógica interna de parametrização e precificação do banco.
4. **Sublicenciamento ou Repasse de Chave:** Cada chave de API é intransferível e vinculada ao CNPJ do cliente signatário. É proibido expor as chaves em repositórios públicos (GitHub, GitLab), frontends desprotegidos ou ceder acesso a terceiros não autorizados.

---

### B. Mecanismos de Detecção e Telemetria em Tempo Real

* **Heurística Comportamental Anti-Dump:** O cluster monitora a dispersão e a frequência das chamadas. Se uma mesma chave de acesso consultar **mais de 6 grupos distintos em menos de 60 segundos**, ou demonstrar padrão característico de script de raspagem, o sistema ativa imediatamente o gatilho de defesa.
* **Rate Limiting Restritivo:** O teto de simulações comerciais é fixado em 30 requisições por minuto por chave/IP.
* **Trilha Forense Imutável:** Todas as chamadas geram registros com *timestamp*, endereço IP de origem, *User-Agent*, parâmetros enviados e assinatura digital da requisição, arquivados para comprovação pericial.

---

### C. Consequências do Descumprimento

A identificação de tentativas de raspagem, dump ou uso indevido acarreta consequências automáticas imediatas:

#### 1. Consequências Técnicas Imediatas
* **Revogação Instantânea da Chave de Acesso (`HTTP 429 / HTTP 403`):** O tráfego de produção do cliente é interrompido em milissegundos pelo gateway, sem aviso prévio.
* **Bloqueio de IP em Nível de Firewall (WAF):** O endereço IP e a faixa de rede do agressor entram em quarentena automática permanente.
* **Suspensão dos Ambientes de Homologação e Produção.**

#### 2. Consequências Jurídicas e Contratuais
* **Rescisão Imediata do Contrato por Justa Causa:** Perda integral de quaisquer valores pagos a título de Taxa de Licenciamento, Setup e Mensalidades, sem direito a reembolso ou indenização.
* **Execução da Cláusula Penal Indenizatória:** Cobrança imediata da multa rescisória fixada no Contrato de Prestação de Serviços por violação grave de segurança.
* **Medidas Judiciais Cabíveis:** Ajuizamento de ação de reparação por perdas e danos e apuração de responsabilidade civil e criminal por concorrência desleal e infração de direitos de software, nos termos da:
  * **Lei nº 9.609/1998** (Lei do Software);
  * **Lei nº 9.279/1996** (Lei da Propriedade Industrial - Art. 195, Concorrência Desleal e Violação de Segredo de Negócio);
  * **Lei nº 12.965/2014** (Marco Civil da Internet).

---

### D. Boas Práticas Recomendadas aos Desenvolvedores

Para operar em total conformidade e evitar bloqueios acidentais:
* **Integração Orientada ao Usuário:** Dispare a API apenas quando o usuário final realizar uma ação real (ex: submissão de formulário no site, clique no simulador ou envio de mensagem no chatbot do WhatsApp).
* **Tratamento de Exceções:** Implemente tratamento para os códigos `401` (chave inválida), `403` (permissão insuficiente) e `429` (limite excedido) no seu código.
* **Armazenamento Seguro:** Mantenha sua `x-api-key` armazenada exclusivamente em variáveis de ambiente no seu backend (`process.env.CONSORCIO_API_KEY`). **Nunca exponha sua chave no código JavaScript do frontend do cliente.**
