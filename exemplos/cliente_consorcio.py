#!/usr/bin/env python3
"""
Exemplo de Integração em Python com a API de Consórcios
Mostra como qualquer sistema parceiro (CRM, Chatbot de WhatsApp, etc.) pode simular cotas.
"""
import json
import urllib.request

API_URL = "http://localhost:3001/api/v1/simulate"
API_KEY = "demo_key_bb_consorcios"

payload = {
    "objetivo": "TRATOR",         # TRATOR, CAMINHAO, IMOVEL, CARRO_FIPE, SOLAR, etc.
    "plano": "Flex",             # "Flex" (-2% taxa) ou "Master"
    "creditoLiquido": 350000,    # Crédito livre que o cliente quer receber
    "lanceBolso": 30000,         # Recurso próprio para lance (opcional)
    "usarEmbutido": True,        # Abater até 30% da própria carta
    "tipoPessoa": "PF",          # "PF" ou "PJ"
    "mode": "compare3",          # "single" (1 proposta) ou "compare3" (3 cenários)
    "cliente": "Agropecuária São José"
}

req = urllib.request.Request(
    API_URL,
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        
        print("=" * 60)
        print("✅ SIMULAÇÃO PROCESSADA COM SUCESSO!")
        print("=" * 60)
        print(f"Total de propostas geradas: {len(data['propostas'])}\n")
        
        for p in data["propostas"]:
            print(f"--- OPÇÃO {p['opcao']}: {p['plano']} ({p['cotas']} cota(s)) ---")
            print(f"Crédito Líquido:  R$ {p['creditoLiquido']:,.2f}")
            print(f"Parcela Mensal:   R$ {p['parcelaMensalSemLance']:,.2f}")
            print(f"Parcela Pós-Lance: R$ {p['parcelaPosLanceEstimada']:,.2f}")
            print(f"Lance Total:      R$ {p['lanceTotal']['valor']:,.2f} ({p['lanceTotal']['percentual']}%)")
            print(f"Prazo:            {p['prazoMeses']} meses")
            print(f"Taxa Adm Total:   {p['taxas']['taxaAdmTotal']}% ({p['taxas']['taxaMensalizada']}% a.m.)")
            print(f"Status do Grupo:  {p['grupo']}\n")
            
        print("=" * 60)
        print("📱 TEXTO GERADO PARA WHATSAPP:")
        print("=" * 60)
        print(data["whatsappTextoPronto"])

except Exception as err:
    print(f"❌ Erro ao consultar a API: {err}")
