#!/usr/bin/env python3
"""
Consulta de Histórico de Assembleias de Grupo
Uso: python3 scripts/query_assembleia.py 001583 [data_inicial] [data_final]
"""
import datetime
import json
import os
import re
import sys
import urllib.parse
import urllib.request

BB_USER = os.environ.get("BB_PARCEIROS_USER", "")
BB_PASS = os.environ.get("BB_PARCEIROS_PASS", "")


def query_group(grupo: str, dt_ini: str, dt_fim: str) -> list[dict]:
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
    opener.addheaders = [
        (
            "User-Agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        )
    ]

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

    ass_url = f"{base_session_url}/acesso_restrito/frmResultadoAssembleia.aspx"
    h_ass = opener.open(ass_url, timeout=20).read().decode("utf-8", errors="replace")
    vs = re.search(r'id="__VIEWSTATE" value="([^"]*)"', h_ass).group(1)
    vsg = re.search(r'id="__VIEWSTATEGENERATOR" value="([^"]*)"', h_ass).group(1)

    p_ass = {
        "__EVENTTARGET": "ctl00$Conteudo$lnkPesquisar",
        "__EVENTARGUMENT": "",
        "__VIEWSTATE": vs,
        "__VIEWSTATEGENERATOR": vsg,
        "ctl00$Conteudo$edtCD_Grupo": grupo.strip().zfill(6),
        "ctl00$Conteudo$edtDT_Assembleia_Inicial": dt_ini,
        "ctl00$Conteudo$edtDT_Assembleia_Final": dt_fim,
    }
    h_res = (
        opener.open(
            urllib.request.Request(
                ass_url, data=urllib.parse.urlencode(p_ass).encode("utf-8")
            ),
            timeout=20,
        )
        .read()
        .decode("utf-8", errors="replace")
    )

    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", h_res, re.S):
        cols = [
            re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", c)).strip()
            for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        ]
        if len(cols) >= 6 and cols[0].isdigit() and len(cols[0]) == 6:
            rows.append(
                {
                    "grupo": cols[0],
                    "assembleia": cols[1],
                    "data": cols[2],
                    "qtdContemplados": int(cols[3]) if cols[3].isdigit() else 0,
                    "maiorLance": float(cols[4].replace(".", "").replace(",", "."))
                    if "," in cols[4]
                    else 0.0,
                    "menorLance": float(cols[5].replace(".", "").replace(",", "."))
                    if "," in cols[5]
                    else 0.0,
                }
            )
    return rows


def main():
    grupo = sys.argv[1] if len(sys.argv) > 1 else "001583"
    now = datetime.datetime.now()
    one_year_ago = now - datetime.timedelta(days=365)
    dt_ini = sys.argv[2] if len(sys.argv) > 2 else one_year_ago.strftime("%d/%m/%Y")
    dt_fim = sys.argv[3] if len(sys.argv) > 3 else now.strftime("%d/%m/%Y")

    try:
        rows = query_group(grupo, dt_ini, dt_fim)
        print(json.dumps({"ok": True, "grupo": grupo.zfill(6), "items": rows}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
