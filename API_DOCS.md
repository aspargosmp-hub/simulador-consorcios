# 🚀 Documentação da API REST — Motor de Cálculo & Proposta de Consórcios

Esta API opera no modelo **Caixa-Preta (Motor de Inteligência Transacional)**.  
> ⚠️ **IMPORTANTE:** A API **NÃO entrega, NÃO exporta e NÃO lista tabelas brutas de dados ou cotas**.  
> O sistema parceiro envia apenas os parâmetros do cliente (*ex: Objetivo Trator, Crédito R$ 350.000*) e a API devolve **exclusivamente a proposta calculada** (parcela inicial, parcela pós-lance reduzida, percentual de lance recomendado e texto formatado para WhatsApp). Toda a base de dados interna permanece 100% protegida e retida no servidor.

---

## 🔐 1. Autenticação

Todas as requisições aos endpoints de simulação exigem uma chave de API válida enviada nos headers HTTP:

```http
x-api-key: SUA_CHAVE_AQUI
```
ou
```http
Authorization: Bearer SUA_CHAVE_AQUI
```

> **Chave de Desenvolvimento / Teste:**  
> `demo_key_bb_consorcios`

---

## 📡 2. Endpoints da API

### `GET /api/v1/health`
Verifica se o motor está online e a data da última sincronização da base de dados.

* **Autenticação:** Não necessária.
* **Exemplo de Resposta:**
```json
{
  "status": "ONLINE",
  "service": "API Motor de Consórcios BB",
  "version": "1.0.0",
  "dataAtualizacaoBase": "30/10/2026 12:57:25",
  "totalCotasDisponiveis": 1253
}
```

---

### `GET /api/v1/objetivos`
Lista os 9 segmentos e categorias de bens suportados pelo motor de cálculo.

* **Autenticação:** Não necessária.
* **Exemplo de Resposta:**
```json
{
  "success": true,
  "total": 9,
  "objetivos": [
    { "id": "TRATOR", "label": "Trator / Agrícola", "emoji": "🚜", "segmento": "TC" },
    { "id": "CAMINHAO", "label": "Caminhão / Pesados", "emoji": "🚛", "segmento": "TC" },
    { "id": "IRRIGACAO", "label": "Irrigação / Pivô", "emoji": "💧", "segmento": "TC" },
    { "id": "REBANHO", "label": "Rebanho / Pecuária", "emoji": "🐄", "segmento": "EE" },
    { "id": "IMOVEL", "label": "Casa / Imóvel / Terreno", "emoji": "🏠", "segmento": "IM" },
    { "id": "CARRO_FIPE", "label": "Carro / Picape (FIPE)", "emoji": "🚗", "segmento": "AU" },
    { "id": "CARRO_IPCA", "label": "Carro / Utilitário (IPCA)", "emoji": "🚙", "segmento": "AI" },
    { "id": "SOLAR", "label": "Energia Solar / Sustentáveis", "emoji": "☀️", "segmento": "EE" },
    { "id": "MOTO", "label": "Motocicleta", "emoji": "🏍️", "segmento": "MO" }
  ]
}
```

---

### `POST /api/v1/simulate` (Principal)
Executa a simulação automática calculando as melhores opções de cotas, parcelas e lances.

* **Headers:**  
  `Content-Type: application/json`  
  `x-api-key: <SUA_CHAVE>`

* **Parâmetros do Body (JSON):**

| Campo | Tipo | Obrigatório | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `objetivo` | `string` | Sim | `"TRATOR"` | Código do bem: `TRATOR`, `CAMINHAO`, `IMOVEL`, `CARRO_FIPE`, `SOLAR`, etc. |
| `plano` | `string` | Não | `"Flex"` | `"Flex"` (-2% taxa promocional) ou `"Master"` (taxa cheia). |
| `creditoLiquido`| `number` | Sim | - | Valor que o cliente precisa receber livre na mão (ex: `350000`). |
| `lanceBolso` | `number` | Não | `0` | Valor em R$ que o cliente tem de recurso próprio para ofertar de lance. |
| `usarEmbutido` | `boolean`| Não | `true` | Se `true`, utiliza até 30% da própria carta para compor o lance. |
| `tipoPessoa` | `string` | Não | `"PF"` | `"PF"` (Pessoa Física) ou `"PJ"` (Pessoa Jurídica). |
| `incluirSeguro`| `boolean`| Não | `false`| Se `true`, adiciona o Seguro Prestamista BB mensal. |
| `mode` | `string` | Não | `"compare3"`| `"single"` (1 proposta ideal) ou `"compare3"` (3 cenários comparativos). |
| `mascararGrupo`| `boolean`| Não | `true` | **Segurança:** oculta o número do grupo e cota para parceiros externos. |
| `cliente` | `string` | Não | `""` | Nome do cliente para personalizar a mensagem de retorno. |

* **Exemplo de Envio:**
```json
{
  "objetivo": "IMOVEL",
  "plano": "Flex",
  "creditoLiquido": 500000,
  "lanceBolso": 60000,
  "usarEmbutido": true,
  "tipoPessoa": "PF",
  "incluirSeguro": true,
  "mode": "single",
  "cliente": "Marcos Oliveira"
}
```

* **Exemplo de Resposta (200 OK):**
```json
{
  "success": true,
  "dataAtualizacaoBase": "30/10/2026 12:57:25",
  "totalCotasDisponiveis": 1253,
  "propostas": [
    {
      "opcao": 1,
      "plano": "Plano Flex (-2% Taxa)",
      "modalidadeCodigo": "IM3",
      "objetivoLabel": "Casa / Imóvel / Terreno",
      "grupo": "*** (Disponível na Contratação)",
      "cotas": 5,
      "prazoMeses": 179,
      "creditoBruto": 500000,
      "creditoLiquido": 500000,
      "lanceEmbutido": { "percentual": 0, "valor": 0 },
      "lanceBolso": { "percentual": 12, "valor": 60000 },
      "lanceTotal": { "percentual": 12, "valor": 60000 },
      "parcelaMensalSemLance": 3592.82,
      "parcelaPosLanceEstimada": 3255.74,
      "taxas": {
        "taxaAdmTotal": 19.43,
        "taxaMensalizada": 0.11,
        "taxaAnual": 1.32,
        "fundoReserva": 1,
        "indiceCorrecao": "INCC"
      },
      "seguroPrestamistaIncluso": true,
      "valorSeguroMensal": 228.82,
      "historicoLanceMinimo12m": "71.69%"
    }
  ],
  "whatsappTextoPronto": "*PROPOSTA DE CONSÓRCIO BB — CASA / IMÓVEL / TERRENO*\n📋 *Plano:* Flex (-2% Taxa) | *Titular:* Pessoa Física\n👤 *Cliente:* Marcos Oliveira\n\n📌 *Opção 1 (5 cotas)*\n• Crédito a Liberar (Líquido): *R$ 500.000,00*..."
}
```

---

## 💻 3. Exemplos de Integração em Outros Sistemas

### JavaScript / Node.js / Fetch (Chatbot, Front-end ou CRM)
```javascript
const response = await fetch('http://localhost:3001/api/v1/simulate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'demo_key_bb_consorcios'
  },
  body: JSON.stringify({
    objetivo: 'TRATOR',
    plano: 'Flex',
    creditoLiquido: 350000,
    lanceBolso: 50000,
    mode: 'compare3'
  })
});

const data = await response.json();
console.log('Propostas calculadas:', data.propostas);
console.log('Texto para WhatsApp:', data.whatsappTextoPronto);
```

### Python (Automação, Chatbot ou FastAPI)
```python
import requests

url = "http://localhost:3001/api/v1/simulate"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "demo_key_bb_consorcios"
}
payload = {
    "objetivo": "IMOVEL",
    "creditoLiquido": 400000,
    "mode": "single"
}

res = requests.post(url, json=payload, headers=headers)
print(res.json()["propostas"][0]["parcelaPosLanceEstimada"])
```

### PHP (WordPress, Laravel ou cPanel)
```php
<?php
$ch = curl_init('http://localhost:3001/api/v1/simulate');
$payload = json_encode([
    'objetivo' => 'CARRO_FIPE',
    'creditoLiquido' => 120000,
    'mode' => 'single'
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: demo_key_bb_consorcios'
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

$response = json_decode(curl_exec($ch), true);
curl_close($ch);

echo "Parcela pós-lance: R$ " . $response['propostas'][0]['parcelaPosLanceEstimada'];
?>
```

---

## 🛡️ 4. Como Executar o Servidor da API

Para iniciar o servidor localmente ou em sua VPS/hospedagem:

```bash
npm run api
```

Para definir uma porta personalizada e chaves de acesso privadas em produção:

```bash
PORT=8080 API_KEYS=chave_secreta_crm,chave_secreta_whatsapp npm run api
```
