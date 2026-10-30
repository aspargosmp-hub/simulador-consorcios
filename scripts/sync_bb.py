#!/usr/bin/env python3
"""
Robô de Sincronização Automática de Dados de Consórcios
- Sincroniza tabelas ativas (Planos Master, Flex e Tabela Especial 240m)
- Salva o catálogo consolidado em src/data/consorciosSeed.json
"""
import datetime
import http.cookiejar
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_PATH = os.path.join(ROOT_DIR, "src", "data", "consorciosSeed.json")
BEM_MAP_PATH = os.path.join(ROOT_DIR, "src", "data", "bemMap.json")

BB_USER = os.environ.get("BB_PARCEIROS_USER", "")
BB_PASS = os.environ.get("BB_PARCEIROS_PASS", "")
MAX_USER = os.environ.get("MAX_CONSORCIOS_USER", "")
MAX_PASS = os.environ.get("MAX_CONSORCIOS_PASS", "")

MODALIDADES = [
    ("AU3", "Auto Demais (Flex)"),
    ("AU4", "Auto Demais (Master)"),
    ("AI3", "Auto I (Flex)"),
    ("AI4", "Auto I (Master)"),
    ("IM3", "Imóvel (Flex)"),
    ("IM4", "Imóvel (Master)"),
    ("MO3", "Motos (Flex)"),
    ("MO4", "Motos (Master)"),
    ("EE3", "Eletro (Flex)"),
    ("EE4", "Eletro (Master)"),
    ("TC3", "Tratores e Caminhões (Flex)"),
    ("TC4", "Tratores e Caminhões (Master)"),
]

BROWSER_HEADERS = [
    (
        "User-Agent",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    ),
    ("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
    ("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"),
]


def parse_br_float(val: str) -> float:
    if not val:
        return 0.0
    val = str(val).strip()
    if "," in val and "." in val:
        return float(val.replace(".", "").replace(",", "."))
    if "," in val:
        return float(val.replace(",", "."))
    try:
        return float(val)
    except ValueError:
        return 0.0


def get_tags(bem_desc: str, vagas: int, prazo: int, mod_code: str) -> list[str]:
    d = (bem_desc or "").upper()
    tags = []
    if mod_code == "IM9":
        tags.append("Tabela Especial 240m (93)")
    if "EMBUTIDO" in d:
        tags.append("Lance Embutido")
    if "FIXO 20" in d:
        tags.append("Lance Fixo 20%")
    if "TRATOR" in d or "IMPLEMENTO" in d:
        tags.append("Trator / Implemento")
    if "IRRIGACAO" in d:
        tags.append("Irrigação")
    if "REBANHO" in d or "GENETICA" in d:
        tags.append("Rebanho e Genética")
    if "SUSTENTAVEIS" in d or mod_code.startswith("EE"):
        tags.append("Energia Solar / Sustentáveis")
    if "S FGTS" in d:
        tags.append("Sem FGTS")
    elif mod_code.startswith("IM"):
        tags.append("Aceita FGTS")
    if "PESADOS" in d or mod_code.startswith("TC"):
        tags.append("Pesados / Agro")
    if int(vagas or 0) == 0:
        tags.append("Grupo em Formação")
    return tags


def get_indice(mod_code: str) -> str:
    if mod_code.startswith("IM"):
        return "INCC"
    if mod_code.startswith("EE") or mod_code.startswith("AI"):
        return "INPC"
    return "FIPE"


def sync_bb_im93(bem_map: dict) -> tuple[bool, list[dict]]:
    """Autentica no Portal Parceiros BB e extrai a Tabela Especial 93 - MAIS BBC IMOVEIS 240."""
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
    opener.addheaders = list(BROWSER_HEADERS)

    resp = opener.open("https://www.parceirosbbconsorcios.com.br", timeout=20)
    login_url = resp.geturl()
    base_session_url = login_url.rsplit("/", 1)[0]
    html = resp.read().decode("utf-8", errors="replace")

    vs = re.search(r'id="__VIEWSTATE" value="([^"]*)"', html).group(1)
    vsg = re.search(r'id="__VIEWSTATEGENERATOR" value="([^"]*)"', html).group(1)

    data = {
        "__EVENTTARGET": "ctl00$Conteudo$lnkEntrar",
        "__EVENTARGUMENT": "",
        "__VIEWSTATE": vs,
        "__VIEWSTATEGENERATOR": vsg,
        "ctl00$Conteudo$edtUsuario": BB_USER,
        "ctl00$Conteudo$edtSenha": BB_PASS,
    }
    opener.open(
        urllib.request.Request(
            login_url, data=urllib.parse.urlencode(data).encode("utf-8")
        ),
        timeout=20,
    )

    sim_url = f"{base_session_url}/acesso_restrito/frmAnaliseCadastro.aspx?Simulador=S"
    h_sim = opener.open(sim_url, timeout=20).read().decode("utf-8", errors="replace")
    vs = re.search(r'id="__VIEWSTATE" value="([^"]*)"', h_sim).group(1)
    vsg = re.search(r'id="__VIEWSTATEGENERATOR" value="([^"]*)"', h_sim).group(1)

    p1 = {
        "__EVENTTARGET": "ctl00$Conteudo$cbxTipoGrupo",
        "__EVENTARGUMENT": "",
        "__VIEWSTATE": vs,
        "__VIEWSTATEGENERATOR": vsg,
        "ctl00$Conteudo$cbxPessoa": "F",
        "ctl00$Conteudo$cbxFilial": "001",
        "ctl00$Conteudo$cbxTipoGrupo": "IM",
    }
    h_sim2 = (
        opener.open(
            urllib.request.Request(
                sim_url, data=urllib.parse.urlencode(p1).encode("utf-8")
            ),
            timeout=20,
        )
        .read()
        .decode("utf-8", errors="replace")
    )
    vs = re.search(r'id="__VIEWSTATE" value="([^"]*)"', h_sim2).group(1)
    vsg = re.search(r'id="__VIEWSTATEGENERATOR" value="([^"]*)"', h_sim2).group(1)

    p2 = {
        "__EVENTTARGET": "ctl00$Conteudo$lnkProximo",
        "__EVENTARGUMENT": "",
        "__VIEWSTATE": vs,
        "__VIEWSTATEGENERATOR": vsg,
        "ctl00$Conteudo$cbxPessoa": "F",
        "ctl00$Conteudo$cbxFilial": "001",
        "ctl00$Conteudo$cbxTipoGrupo": "IM",
        "ctl00$Conteudo$cbxPeriodicidade": "1",
        "ctl00$Conteudo$cbxTipoVenda": "93",
    }
    r_grid = opener.open(
        urllib.request.Request(
            sim_url, data=urllib.parse.urlencode(p2).encode("utf-8")
        ),
        timeout=20,
    )
    grid_url = r_grid.geturl()
    h_grid = r_grid.read().decode("utf-8", errors="replace")

    im93_items = []
    page_num = 1
    base_id = 990000
    idx = 0
    while True:
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", h_grid, re.S):
            if "lnkCodigo_Grupo" not in tr:
                continue
            cols = [
                re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", c)).strip()
                for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            ]
            if len(cols) >= 12:
                idx += 1
                bem_code = cols[3].strip().zfill(5)
                bem_desc = bem_map.get(bem_code, f"IMOVEL ESPECIAL {bem_code}")
                vagas_num = int(cols[2].strip() or "0")
                prazo_num = int(cols[1].strip() or "0")
                im93_items.append(
                    {
                        "id": base_id + idx,
                        "codigoModalidade": "IM9",
                        "modalidade": "Imóvel Especial 240m (Tab. 93)",
                        "plano": "Especial 240",
                        "segmento": "IM",
                        "grupo": cols[0].strip(),
                        "prazo": prazo_num,
                        "vagas": vagas_num,
                        "bemCodigo": bem_code,
                        "bemDescricao": bem_desc,
                        "taxaAdm": parse_br_float(cols[4]),
                        "fundoReserva": parse_br_float(cols[5]),
                        "seguro": parse_br_float(cols[6]),
                        "valorBem": parse_br_float(cols[7]),
                        "parcela": parse_br_float(cols[8]),
                        "assembleia": cols[9].strip(),
                        "vencimento": cols[10].strip(),
                        "percMinContemp": parse_br_float(cols[11]),
                        "indiceCorrecao": "INCC",
                        "tags": get_tags(bem_desc, vagas_num, prazo_num, "IM9"),
                    }
                )
        if "Page$Next" not in h_grid or page_num >= 15:
            break
        vs = re.search(r'id="__VIEWSTATE" value="([^"]*)"', h_grid).group(1)
        vsg = re.search(r'id="__VIEWSTATEGENERATOR" value="([^"]*)"', h_grid).group(1)
        p_next = {
            "__EVENTTARGET": "ctl00$Conteudo$grdGruposDisponiveis",
            "__EVENTARGUMENT": "Page$Next",
            "__VIEWSTATE": vs,
            "__VIEWSTATEGENERATOR": vsg,
        }
        h_grid = (
            opener.open(
                urllib.request.Request(
                    grid_url, data=urllib.parse.urlencode(p_next).encode("utf-8")
                ),
                timeout=20,
            )
            .read()
            .decode("utf-8", errors="replace")
        )
        page_num += 1

    return True, im93_items


def sync_all_groups(bem_map: dict) -> list[dict]:
    """Sincroniza todas as 12 modalidades e enriquece com o catálogo de Bens do BB."""
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = list(BROWSER_HEADERS)

    opener.open("https://maxconsorcios.com.br/", timeout=20)
    login_data = urllib.parse.urlencode(
        {"user": MAX_USER, "pass": MAX_PASS, "btok": ""}
    ).encode("utf-8")
    opener.open(
        urllib.request.Request(
            "https://maxconsorcios.com.br/auth",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        ),
        timeout=20,
    )

    items = []
    for mod_code, mod_label in MODALIDADES:
        campos = f"campo=home&conteudo={mod_code}&tipo=select"
        url = f"https://maxconsorcios.com.br/ajax/consorciosAjax.php?{campos}"
        req = urllib.request.Request(
            url,
            data=campos.encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        page_html = opener.open(req, timeout=25).read().decode("utf-8", errors="ignore")

        table_m = re.search(
            r'<table[^>]*id="table_products"[^>]*>(.*?)</table>', page_html, re.S
        )
        if not table_m:
            continue

        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", table_m.group(1), re.S):
            id_m = re.search(r"simulador/n(\d+)", tr)
            tds = [
                re.sub(r"<[^>]+>", "", td).strip()
                for td in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            ]
            if len(tds) >= 12 and id_m:
                rec_id = int(id_m.group(1))
                bem_code = tds[3].strip().zfill(5)
                bem_desc = bem_map.get(bem_code, f"BEM {bem_code}")
                vagas_num = int(tds[2].strip() or "0")
                prazo_num = int(tds[1].strip() or "0")
                items.append(
                    {
                        "id": rec_id,
                        "codigoModalidade": mod_code,
                        "modalidade": mod_label,
                        "plano": "Flex" if mod_code.endswith("3") else "Master",
                        "segmento": mod_code[:2],
                        "grupo": tds[0].strip(),
                        "prazo": prazo_num,
                        "vagas": vagas_num,
                        "bemCodigo": bem_code,
                        "bemDescricao": bem_desc,
                        "taxaAdm": parse_br_float(tds[4]),
                        "fundoReserva": parse_br_float(tds[5]),
                        "seguro": parse_br_float(tds[6]),
                        "valorBem": parse_br_float(tds[7]),
                        "parcela": parse_br_float(tds[8]),
                        "assembleia": tds[9].strip(),
                        "vencimento": tds[10].strip(),
                        "percMinContemp": parse_br_float(tds[11]),
                        "indiceCorrecao": get_indice(mod_code),
                        "tags": get_tags(bem_desc, vagas_num, prazo_num, mod_code),
                    }
                )
    return items


def main():
    bem_map = {}
    if os.path.exists(BEM_MAP_PATH):
        with open(BEM_MAP_PATH, "r", encoding="utf-8") as f:
            bem_map = json.load(f)

    items = sync_all_groups(bem_map)
    bb_connected = False
    try:
        bb_connected, im93_items = sync_bb_im93(bem_map)
        items.extend(im93_items)
    except Exception:
        pass

    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    if items:
        payload = {
            "updatedAt": now_str,
            "source": "Catálogo Oficial de Consórcios",
            "bbPortalConnected": bb_connected,
            "totalRecords": len(items),
            "items": items,
        }
        with open(SEED_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(
            json.dumps(
                {
                    "ok": True,
                    "updatedAt": now_str,
                    "bbPortalConnected": bb_connected,
                    "totalRecords": len(items),
                }
            )
        )
    else:
        print(
            json.dumps(
                {"ok": False, "error": "Nenhum registro retornado na sincronização"}
            )
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
