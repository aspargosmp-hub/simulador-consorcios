#!/usr/bin/env python3
"""
Servidor REST API em Python — Motor de Consórcios BB
Zero dependências externas: roda diretamente com `python3 server/api.py`.
Suporta CORS, autenticação por API Key, cálculo inteligente e texto pronto para WhatsApp.
"""
import datetime
import http.server
import json
import os
import sys
from urllib.parse import parse_qs, urlparse

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_PATH = os.path.join(ROOT_DIR, "src", "data", "consorciosSeed.json")

PORT = int(os.environ.get("PORT", 3001))
ALLOWED_KEYS = [
    k.strip()
    for k in os.environ.get("API_KEYS", "demo_key_bb_consorcios").split(",")
    if k.strip()
]

OBJETIVOS_CONFIG = [
    {
        "id": "TRATOR",
        "label": "Trator / Agrícola",
        "emoji": "🚜",
        "seg": "TC",
        "defaultModFlex": "TC3",
        "defaultModMaster": "TC4",
    },
    {
        "id": "CAMINHAO",
        "label": "Caminhão / Pesados",
        "emoji": "🚛",
        "seg": "TC",
        "defaultModFlex": "TC3",
        "defaultModMaster": "TC4",
    },
    {
        "id": "IRRIGACAO",
        "label": "Irrigação / Pivô",
        "emoji": "💧",
        "seg": "TC",
        "defaultModFlex": "TC3",
        "defaultModMaster": "TC4",
    },
    {
        "id": "REBANHO",
        "label": "Rebanho / Pecuária",
        "emoji": "🐄",
        "seg": "EE",
        "defaultModFlex": "EE3",
        "defaultModMaster": "EE4",
    },
    {
        "id": "IMOVEL",
        "label": "Casa / Imóvel / Terreno",
        "emoji": "🏠",
        "seg": "IM",
        "defaultModFlex": "IM3",
        "defaultModMaster": "IM4",
    },
    {
        "id": "CARRO_FIPE",
        "label": "Carro / Picape (FIPE)",
        "emoji": "🚗",
        "seg": "AU",
        "defaultModFlex": "AU3",
        "defaultModMaster": "AU4",
    },
    {
        "id": "CARRO_IPCA",
        "label": "Carro / Utilitário (IPCA)",
        "emoji": "🚙",
        "seg": "AI",
        "defaultModFlex": "AI3",
        "defaultModMaster": "AI4",
    },
    {
        "id": "SOLAR",
        "label": "Energia Solar / Sustentáveis",
        "emoji": "☀️",
        "seg": "EE",
        "defaultModFlex": "EE3",
        "defaultModMaster": "EE4",
    },
    {
        "id": "MOTO",
        "label": "Motocicleta",
        "emoji": "🏍️",
        "seg": "MO",
        "defaultModFlex": "MO3",
        "defaultModMaster": "MO4",
    },
]

ALIQUOTA_SEGURO_MENSAL = {
    "PF": 0.038,  # 0,038% a.m. para Pessoa Física
    "PJ": 0.054,  # 0,054% a.m. para Pessoa Jurídica
}


def load_seed() -> dict:
    if not os.path.exists(SEED_PATH):
        return {"updatedAt": "", "totalRecords": 0, "items": []}
    with open(SEED_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def format_brl(val: float) -> str:
    try:
        val_str = f"{val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"R$ {val_str}"
    except Exception:
        return f"R$ {val:.2f}"


def format_percent(val: float, decimals: int = 2) -> str:
    fmt = f"{{:.{decimals}f}}%"
    return fmt.format(val).replace(".", ",")


def filter_obj_items(items: list[dict], obj_id: str, mod_code: str) -> list[dict]:
    res = []
    for i in items:
        if i.get("codigoModalidade") != mod_code:
            continue
        desc = (i.get("bemDescricao") or "").upper()
        seg = i.get("segmento") or ""
        tags = i.get("tags") or []

        if obj_id in ["TRATOR", "CAMINHAO", "IRRIGACAO"]:
            if seg == "TC" and "SUSTENTAVEIS" not in desc:
                res.append(i)
        elif obj_id == "REBANHO":
            if "Rebanho e Genética" in tags or "REBANHO" in desc:
                res.append(i)
        elif obj_id == "IMOVEL":
            if seg == "IM":
                res.append(i)
        elif obj_id == "CARRO_FIPE":
            if seg == "AU":
                res.append(i)
        elif obj_id == "CARRO_IPCA":
            if seg == "AI":
                res.append(i)
        elif obj_id == "SOLAR":
            if seg == "EE":
                res.append(i)
        elif obj_id == "MOTO":
            if seg == "MO":
                res.append(i)
        else:
            res.append(i)
    return res


def run_simulation(params: dict) -> dict:
    seed = load_seed()
    items = seed.get("items", [])
    if not items:
        raise ValueError("Catálogo de consórcios está vazio ou não encontrado.")

    obj_id = str(params.get("objetivo") or "TRATOR").upper()
    obj_cfg = next((o for o in OBJETIVOS_CONFIG if o["id"] == obj_id), OBJETIVOS_CONFIG[0])

    plano = str(params.get("plano") or "Flex").capitalize()
    target_mod = (
        obj_cfg["defaultModMaster"] if plano == "Master" else obj_cfg["defaultModFlex"]
    )

    liquido_desejado = max(1000.0, float(params.get("creditoLiquido") or 350000))
    bolso_reais = max(0.0, float(params.get("lanceBolso") or 0))
    usar_embutido = bool(params.get("usarEmbutido", True))
    tipo_pessoa = "PJ" if str(params.get("tipoPessoa", "PF")).upper() == "PJ" else "PF"
    incluir_seguro = bool(params.get("incluirSeguro", False))
    mode = str(params.get("mode") or "compare3").lower()
    mascarar_grupo = bool(params.get("mascararGrupo", True))
    cliente = str(params.get("cliente") or "").strip()

    pool = filter_obj_items(items, obj_id, target_mod)
    pool_com_vagas = [i for i in pool if int(i.get("vagas") or 0) > 0]
    final_pool = pool_com_vagas if pool_com_vagas else pool
    if not final_pool:
        final_pool = [i for i in items if i.get("codigoModalidade") == target_mod]
    if not final_pool:
        raise ValueError(f"Nenhum grupo ativo encontrado para a modalidade {target_mod}")

    candidates = []
    emb_options = [30.0, 0.0] if usar_embutido else [0.0]

    for item in final_pool:
        val_bem = float(item.get("valorBem") or 0)
        parcela_base = float(item.get("parcela") or 0)
        prazo = max(1, int(item.get("prazo") or 1))
        min_contemp = float(item.get("percMinContemp") or 0)
        tags = item.get("tags") or []

        for emb_perc in emb_options:
            if usar_embutido and emb_perc == 0.0 and min_contemp > 30 and bolso_reais == 0:
                continue

            fator_liq = 1.0 - (emb_perc / 100.0)

            for cotas in range(1, 13):
                credito_bruto = val_bem * cotas
                credito_liquido = credito_bruto * fator_liq
                parcela_inicial = parcela_base * cotas

                bolso_perc = 15.0
                if bolso_reais > 0 and credito_bruto > 0:
                    bolso_perc = min(69.0, (bolso_reais / credito_bruto) * 100.0)
                elif emb_perc == 0.0 and "Lance Fixo 20%" in tags:
                    bolso_perc = 20.0
                elif bolso_reais == 0 and usar_embutido:
                    bolso_perc = 0.0

                lance_total_perc = emb_perc + bolso_perc
                lance_total_valor = credito_bruto * (lance_total_perc / 100.0)
                saldo_total = parcela_inicial * prazo
                parcela_pos_lance = (
                    max(0.0, (saldo_total - parcela_inicial - lance_total_valor) / (prazo - 1))
                    if prazo > 1
                    else parcela_inicial
                )

                score = abs(credito_liquido - liquido_desejado) / liquido_desejado

                if 0.90 * liquido_desejado <= credito_liquido <= 1.15 * liquido_desejado:
                    candidates.append(
                        {
                            "item": item,
                            "cotas": cotas,
                            "emb_perc": emb_perc,
                            "bolso_perc": bolso_perc,
                            "credito_bruto": credito_bruto,
                            "credito_liquido": credito_liquido,
                            "parcela_inicial": parcela_inicial,
                            "parcela_pos_lance": parcela_pos_lance,
                            "lance_total_perc": lance_total_perc,
                            "score": score,
                        }
                    )

    if not candidates:
        for item in final_pool:
            val_bem = float(item.get("valorBem") or 0)
            parcela_base = float(item.get("parcela") or 0)
            prazo = max(1, int(item.get("prazo") or 1))
            emb_perc = 30.0 if usar_embutido else 0.0
            fator_liq = 1.0 - (emb_perc / 100.0)
            for cotas in range(1, 15):
                credito_bruto = val_bem * cotas
                credito_liquido = credito_bruto * fator_liq
                parcela_inicial = parcela_base * cotas
                bolso_perc = (bolso_reais / credito_bruto * 100.0) if bolso_reais > 0 else 0.0
                lance_total_perc = emb_perc + bolso_perc
                lance_total_valor = credito_bruto * (lance_total_perc / 100.0)
                saldo_total = parcela_inicial * prazo
                parcela_pos_lance = (
                    max(0.0, (saldo_total - parcela_inicial - lance_total_valor) / (prazo - 1))
                    if prazo > 1
                    else parcela_inicial
                )
                score = abs(credito_liquido - liquido_desejado) / liquido_desejado
                candidates.append(
                    {
                        "item": item,
                        "cotas": cotas,
                        "emb_perc": emb_perc,
                        "bolso_perc": bolso_perc,
                        "credito_bruto": credito_bruto,
                        "credito_liquido": credito_liquido,
                        "parcela_inicial": parcela_inicial,
                        "parcela_pos_lance": parcela_pos_lance,
                        "lance_total_perc": lance_total_perc,
                        "score": score,
                    }
                )

    candidates.sort(key=lambda c: (c["score"], c["parcela_pos_lance"]))
    c1 = candidates[0]
    chosen = [c1]

    if mode == "compare3":
        c2 = next((c for c in candidates if c["item"]["grupo"] != c1["item"]["grupo"]), None)
        if not c2:
            c2 = next(
                (
                    c
                    for c in candidates
                    if c["emb_perc"] != c1["emb_perc"] or c["cotas"] != c1["cotas"]
                ),
                c1,
            )
        c3 = next(
            (
                c
                for c in candidates
                if c["item"]["grupo"] != c1["item"]["grupo"]
                and c["item"]["grupo"] != c2["item"]["grupo"]
            ),
            None,
        )
        if not c3:
            c3 = next((c for c in candidates if c["item"]["grupo"] != c1["item"]["grupo"]), c1)

        unique_list = []
        for cand in [c1, c2, c3]:
            ident = (cand["item"]["id"], cand["cotas"], cand["emb_perc"])
            if ident not in [(u["item"]["id"], u["cotas"], u["emb_perc"]) for u in unique_list]:
                unique_list.append(cand)
        chosen = unique_list

    aliquota_seguro = ALIQUOTA_SEGURO_MENSAL.get(tipo_pessoa, 0.038) if incluir_seguro else 0.0
    proposals_out = []

    for idx, c in enumerate(chosen):
        it = c["item"]
        taxa_adm = float(it.get("taxaAdm") or 0)
        fundo_res = float(it.get("fundoReserva") or 0)
        seguro_tx = float(it.get("seguro") or 0)
        prazo_it = max(1, int(it.get("prazo") or 1))

        tot_taxas = taxa_adm + fundo_res + seguro_tx
        val_cat = c["credito_bruto"] * (1.0 + tot_taxas / 100.0)
        seguro_mensal = val_cat * (aliquota_seguro / 100.0) if incluir_seguro else 0.0

        parc_mensal = c["parcela_inicial"] + seguro_mensal
        parc_pos = c["parcela_pos_lance"] + seguro_mensal

        taxa_m = round(taxa_adm / prazo_it, 2)
        taxa_a = round(taxa_m * 12.0, 2)

        emb_v = round(c["credito_bruto"] * (c["emb_perc"] / 100.0), 2)
        bolso_v = round(c["credito_bruto"] * (c["bolso_perc"] / 100.0), 2)
        lance_tot_v = round(emb_v + bolso_v, 2)

        p_item = {
            "opcao": idx + 1,
            "plano": "Plano Master" if plano == "Master" else "Plano Flex (-2% Taxa)",
            "objetivo": obj_cfg["label"],
            "prazoMeses": prazo_it,
            "creditoBruto": round(c["credito_bruto"], 2),
            "creditoLiquido": round(c["credito_liquido"], 2),
            "lanceEmbutido": {"percentual": round(c["emb_perc"], 2), "valor": emb_v},
            "lanceBolso": {"percentual": round(c["bolso_perc"], 2), "valor": bolso_v},
            "lanceTotal": {"percentual": round(c["lance_total_perc"], 2), "valor": lance_tot_v},
            "parcelaMensalSemLance": round(parc_mensal, 2),
            "parcelaPosLanceEstimada": round(parc_pos, 2),
            "taxas": {
                "taxaAdmTotal": round(taxa_adm, 2),
                "taxaMensalizada": taxa_m,
                "taxaAnual": taxa_a,
                "indiceCorrecao": it.get("indiceCorrecao", "FIPE"),
            },
            "seguroPrestamistaIncluso": incluir_seguro,
            "valorSeguroMensal": round(seguro_mensal, 2),
        }
        if not mascarar_grupo:
            p_item["grupo"] = it["grupo"]
            p_item["bemCodigo"] = it.get("bemCodigo", "")
            p_item["assembleiaProxima"] = it.get("assembleia", "")
            p_item["historicoLanceMinimo12m"] = f"{float(it.get('percMinContemp') or 0):.2f}%"

        proposals_out.append(p_item)

    # Monta texto para WhatsApp
    lines = [
        f"*PROPOSTA DE CONSÓRCIO BB — {obj_cfg['label'].upper()}*",
        f"📋 *Plano:* {'Master (Taxa Cheia)' if plano == 'Master' else 'Flex (-2% Taxa)'} | *Titular:* {'Pessoa Jurídica' if tipo_pessoa == 'PJ' else 'Pessoa Física'}",
    ]
    if cliente:
        lines.append(f"👤 *Cliente:* {cliente}")
    lines.append("")

    for p in proposals_out:
        cotas_s = f"{p['cotas']} cota{'s' if p['cotas'] > 1 else ''}"
        lines.append(f"📌 *Opção {p['opcao']} ({cotas_s})*")
        lines.append(f"• Crédito a Liberar (Líquido): *{format_brl(p['creditoLiquido'])}*")
        lines.append(f"• Crédito Total da Carta: {format_brl(p['creditoBruto'])}")
        if p["lanceEmbutido"]["percentual"] > 0:
            lines.append(
                f"• (-) Lance Embutido ({format_percent(p['lanceEmbutido']['percentual'], 1)}): {format_brl(p['lanceEmbutido']['valor'])}"
            )
        if p["lanceBolso"]["valor"] > 0:
            lines.append(
                f"• Lance do Bolso ({format_percent(p['lanceBolso']['percentual'], 1)}): {format_brl(p['lanceBolso']['valor'])}"
            )
        lines.append(
            f"• *Lance Proposto Total:* *{format_percent(p['lanceTotal']['percentual'], 1)}* ({format_brl(p['lanceTotal']['valor'])})"
        )
        lines.append(f"• Prazo: *{p['prazoMeses']} meses*")
        lines.append(f"• Parcela Inicial: {format_brl(p['parcelaMensalSemLance'])}")
        lines.append(f"• *Parcela Pós-Lance:* *{format_brl(p['parcelaPosLanceEstimada'])}*")
        lines.append(
            f"• Taxa Adm: {format_percent(p['taxas']['taxaAdmTotal'])} ({format_percent(p['taxas']['taxaMensalizada'])} a.m. / {format_percent(p['taxas']['taxaAnual'])} a.a.)"
        )
        lines.append("")

    now_str = datetime.datetime.now().strftime("%d/%m/%Y, %H:%M:%S")
    lines.append(f"✅ *Simulação gerada em:* {now_str}")
    lines.append("⚠️ Valores sujeitos à disponibilidade das vagas e alteração conforme assembleia.")

    return {
        "success": True,
        "parametrosSimulacao": {
            "objetivo": obj_cfg["label"],
            "plano": plano,
            "creditoLiquidoDesejado": liquido_desejado,
            "lanceBolsoInformado": bolso_reais,
            "tipoPessoa": tipo_pessoa,
            "incluirSeguro": incluir_seguro,
            "modo": mode,
        },
        "propostas": proposals_out,
        "whatsappTextoPronto": "\n".join(lines),
    }


# Rate Limiter Anti-Scraping (Máx 30 requisições por minuto por chave/IP)
RATE_LIMIT_STORE = {}
MAX_REQS_PER_MIN = 30


def check_rate_limit(client_id: str) -> bool:
    import time
    now = time.time()
    window = now - 60.0
    history = [t for t in RATE_LIMIT_STORE.get(client_id, []) if t > window]
    if len(history) >= MAX_REQS_PER_MIN:
        RATE_LIMIT_STORE[client_id] = history
        return False
    history.append(now)
    RATE_LIMIT_STORE[client_id] = history
    return True


class ApiHandler(http.server.BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header(
            "Access-Control-Allow-Headers", "Content-Type, x-api-key, Authorization"
        )
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def check_auth(self) -> bool:
        auth = self.headers.get("Authorization", "")
        token = auth[7:].strip() if auth.startswith("Bearer ") else ""
        key = self.headers.get("x-api-key") or token
        if os.environ.get("PUBLIC_API") == "true":
            return True
        return bool(key in ALLOWED_KEYS or key == "demo_key_bb_consorcios")

    def do_GET(self):
        url = urlparse(self.path)
        path = url.path.rstrip("/")
        if path in ["", "/api/v1/health"]:
            data = {
                "status": "ONLINE",
                "service": "API Motor de Consórcios BB (Python Core)",
                "version": "1.0.0",
                "endpoints": {
                    "health": "GET /api/v1/health",
                    "objetivos": "GET /api/v1/objetivos",
                    "simular": "POST /api/v1/simulate",
                    "whatsapp": "POST /api/v1/whatsapp-text",
                },
            }
            self.send_json(200, data)
        elif path == "/api/v1/objetivos":
            self.send_json(200, {"success": True, "total": len(OBJETIVOS_CONFIG), "objetivos": OBJETIVOS_CONFIG})
        else:
            self.send_json(404, {"success": False, "error": "Rota não encontrada"})

    def do_POST(self):
        url = urlparse(self.path)
        path = url.path.rstrip("/")

        if not self.check_auth():
            self.send_json(
                401,
                {
                    "success": False,
                    "error": "Não autorizado: Chave de API inválida ou ausente.",
                    "message": "Envie sua chave no header 'x-api-key' ou 'Authorization: Bearer <chave>'.",
                },
            )
            return

        client_id = self.headers.get("x-api-key") or self.client_address[0]
        if not check_rate_limit(client_id):
            self.send_json(
                429,
                {
                    "success": False,
                    "error": "Limite de requisições excedido (Rate Limit).",
                    "message": "Por segurança, o limite é de 30 simulações por minuto. Varreduras automatizadas são bloqueadas.",
                },
            )
            return

        try:
            content_len = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_len) if content_len > 0 else b"{}"
            payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception as e:
            self.send_json(400, {"success": False, "error": f"JSON inválido: {str(e)}"})
            return

        if path == "/api/v1/simulate":
            try:
                res = run_simulation(payload)
                self.send_json(200, res)
            except Exception as e:
                self.send_json(400, {"success": False, "error": str(e)})
        elif path == "/api/v1/whatsapp-text":
            try:
                payload["mascararGrupo"] = True
                res = run_simulation(payload)
                self.send_json(200, {"success": True, "textoFormatado": res["whatsappTextoPronto"]})
            except Exception as e:
                self.send_json(400, {"success": False, "error": str(e)})
        else:
            self.send_json(404, {"success": False, "error": "Endpoint não encontrado."})

    def send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)


def main():
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), ApiHandler)
    print(f"\n🐍 API Python de Consórcios rodando na porta {PORT}...")
    print(f"📡 URL Local: http://localhost:{PORT}")
    print(f"🔑 Chave de Teste Ativa: demo_key_bb_consorcios\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando servidor Python...")
        server.server_close()


if __name__ == "__main__":
    main()
