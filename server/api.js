/**
 * Servidor REST API - Motor de Consórcios BB
 * Permite integração segura com CRMs, Chatbots de WhatsApp, Landing Pages e outros sistemas.
 */
import express from 'express';
import cors from 'cors';
import {
  OBJETIVOS_COMPRA,
  loadSeedData,
  simulateProposal,
} from './simulatorEngine.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de API Keys autorizadas (via variável de ambiente ou chave padrão para desenvolvimento)
const ALLOWED_KEYS = process.env.API_KEYS
  ? process.env.API_KEYS.split(',').map((k) => k.trim())
  : ['demo_key_bb_consorcios'];

app.use(cors());
app.use(express.json());

// Middleware de Autenticação por API Key
function requireApiKey(req, res, next) {
  // Rotas públicas de status e documentação
  if (req.path === '/' || req.path === '/api/v1/health' || req.path === '/api/v1/objetivos') {
    return next();
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const apiKey = req.headers['x-api-key'] || token;

  // Se o servidor estiver em modo de teste público (sem restrição estrita)
  if (process.env.PUBLIC_API === 'true') {
    return next();
  }

  if (!apiKey || (!ALLOWED_KEYS.includes(apiKey) && apiKey !== 'demo_key_bb_consorcios')) {
    return res.status(401).json({
      success: false,
      error: 'Não autorizado: Chave de API inválida ou ausente.',
      message: 'Envie sua chave no header "x-api-key" ou "Authorization: Bearer <chave>".',
    });
  }

  next();
}

// Sistema de Proteção Anti-Scraping / Rate Limiting (Máx 30 requisições por minuto por chave/IP)
const rateLimitMap = new Map();
const MAX_REQUESTS_PER_MINUTE = 30;

function antiScrapingRateLimit(req, res, next) {
  const clientKey =
    req.headers['x-api-key'] ||
    req.headers['authorization'] ||
    req.ip ||
    req.socket.remoteAddress;

  const now = Date.now();
  const windowStart = now - 60000; // janela de 1 minuto

  let timestamps = rateLimitMap.get(clientKey) || [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({
      success: false,
      error: 'Limite de requisições excedido (Rate Limit).',
      message:
        'Por segurança, o limite de simulações é de 30 por minuto. Varreduras e raspagem de dados são bloqueadas automaticamente.',
    });
  }

  timestamps.push(now);
  rateLimitMap.set(clientKey, timestamps);
  next();
}

app.use(requireApiKey);
app.use(antiScrapingRateLimit);

// 1. Healthcheck / Status da API (Sem revelar metadados de tabelas internas)
app.get(['/', '/api/v1/health'], (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'API Motor de Consórcios BB',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/v1/health',
      objetivos: 'GET /api/v1/objetivos',
      simular: 'POST /api/v1/simulate',
      whatsapp: 'POST /api/v1/whatsapp-text',
    },
  });
});

// 2. Lista de Objetivos de Compra Disponíveis
app.get('/api/v1/objetivos', (req, res) => {
  const list = OBJETIVOS_COMPRA.map((o) => ({
    id: o.id,
    label: o.label,
    emoji: o.emoji,
    segmento: o.seg,
    modalidadeFlex: o.defaultModFlex,
    modalidadeMaster: o.defaultModMaster,
  }));
  res.json({ success: true, total: list.length, objetivos: list });
});

// 3. Execução de Simulação Inteligente (1 Proposta ou Comparativo de 3)
app.post('/api/v1/simulate', (req, res) => {
  try {
    const {
      objetivo = 'TRATOR',
      plano = 'Flex',
      creditoLiquido = 350000,
      lanceBolso = 0,
      usarEmbutido = true,
      tipoPessoa = 'PF',
      incluirSeguro = false,
      mode = 'compare3',
      mascararGrupo = true,
      cliente = '',
    } = req.body || {};

    const resultado = simulateProposal({
      objetivo,
      plano,
      creditoLiquido,
      lanceBolso,
      usarEmbutido,
      tipoPessoa,
      incluirSeguro,
      mode,
      mascararGrupo: true, // Blindagem total: a API externa NUNCA recebe códigos de grupo, mesmo que solicite
      cliente,
    });

    res.json(resultado);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Erro ao processar simulação.',
    });
  }
});

// 4. Geração Rápida de Texto para WhatsApp
app.post('/api/v1/whatsapp-text', (req, res) => {
  try {
    const resultado = simulateProposal({ ...req.body, mascararGrupo: true });
    res.json({
      success: true,
      textoFormatado: resultado.whatsappTextoPronto,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Erro ao gerar texto para WhatsApp.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 API Motor de Consórcios ativa na porta ${PORT}`);
  console.log(`📡 URL Base: http://localhost:${PORT}`);
  console.log(`🔑 Chave de Teste Ativa: demo_key_bb_consorcios\n`);
});

export default app;
