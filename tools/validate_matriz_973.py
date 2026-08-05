# -*- coding: utf-8 -*-
"""Valida a importação de apoio da matriz 973 de Engenharia Mecatrônica.

As invariantes refletem os dados declarados na página de Mecatrônica do
K-Matrizes indicada pelo mantenedor. A validação oficial contra o PDF do Portal
continua sendo uma etapa futura e não é simulada por este script.

Uso: python tools/validate_matriz_973.py [matriz.json]
"""
import json
import os
import sys
from collections import Counter

BASE = os.path.dirname(os.path.abspath(__file__))
MATRIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    BASE, "..", "data", "eng-mecatronica", "matriz-973.json"
)

with open(MATRIZ, encoding="utf-8") as arquivo:
    matriz = json.load(arquivo)

disciplinas = matriz["disciplinas"]
conjuntos = matriz["conjuntos"]
por_codigo = {d["codigo"]: d for d in disciplinas}
erros = []

# K1 — identidade e totais declarados pela página de apoio.
if matriz.get("matriz") != 973:
    erros.append(f"K1 matriz {matriz.get('matriz')} != 973")
if matriz.get("campus") != "Curitiba":
    erros.append(f"K1 campus inesperado: {matriz.get('campus')}")
esperado = {
    "obrigatorias": 3435,
    "optativas": 360,
    "extensao": 420,
    "eletiva": 0,
    "ch_total_ppc": 3795,
}
for campo, valor in esperado.items():
    if matriz["cargas"].get(campo) != valor:
        erros.append(f"K1 carga {campo} = {matriz['cargas'].get(campo)} != {valor}")

# K2 — os três arrays do HTML somam 206 unidades sem código duplicado.
if len(disciplinas) != 206:
    erros.append(f"K2 {len(disciplinas)} disciplinas != 206 da fonte de apoio")
duplicados = [
    codigo
    for codigo, quantidade in Counter(d["codigo"] for d in disciplinas).items()
    if quantidade > 1
]
if duplicados:
    erros.append(f"K2 códigos duplicados: {duplicados}")

obrigatorias = [d for d in disciplinas if d["conjunto"] is None]
if len(obrigatorias) != 61:
    erros.append(f"K2 {len(obrigatorias)} obrigatórias != 61")
soma_obrigatorias = sum(d["horas"]["total"] for d in obrigatorias)
if soma_obrigatorias != 3435:
    erros.append(f"K2 soma obrigatórias {soma_obrigatorias}h != 3435h")

contagens = Counter(str(d["conjunto"]) for d in disciplinas if d["conjunto"] is not None)
esperado_por_conjunto = {"1120": 30, "1121": 21, "1135": 25, "1222": 25, "1224": 44}
if dict(contagens) != esperado_por_conjunto:
    erros.append(f"K2 contagem por conjunto inesperada: {dict(contagens)}")

# K3 — domínios e referências internas.
for disciplina in disciplinas:
    codigo = disciplina["codigo"]
    if disciplina["periodo"] not in range(1, 11):
        erros.append(f"K3 {codigo}: período {disciplina['periodo']}")
    if disciplina["horas"]["total"] <= 0:
        erros.append(f"K3 {codigo}: CH total {disciplina['horas']['total']}")
    conjunto = disciplina["conjunto"]
    if conjunto is not None and str(conjunto) not in conjuntos:
        erros.append(f"K3 {codigo}: conjunto {conjunto} ausente")
    for requisito in disciplina["prerequisitos"]:
        if not requisito.startswith("Período:") and requisito not in por_codigo:
            erros.append(f"K3 {codigo}: pré-requisito {requisito} ausente")
    for equivalente in disciplina["equivalentes"]:
        if not equivalente.get("codigo", "").strip():
            erros.append(f"K3 {codigo}: equivalência vazia")

# K4 — Humanidades agregadas e duas trilhas formativas de 120h.
if conjuntos.get("1135", {}).get("pai") != "1122":
    erros.append("K4 Ciências Humanas (1135) não aponta para o Ciclo 1122")
if conjuntos.get("1222", {}).get("pai") != "1122":
    erros.append("K4 opções adicionais (1222) não apontam para o Ciclo 1122")
for codigo in ("1120", "1121", "1122"):
    if conjuntos.get(codigo, {}).get("ch") != 120:
        erros.append(f"K4 conjunto {codigo} não exige 120h")
if conjuntos.get("1224", {}).get("ch") != 0:
    erros.append("K4 pool extensionista 1224 deve ter exigência própria 0h")

# K5 — fatos pontuais que detectam arrays truncados ou trocados.
fatos = {
    "ELN71A": (1, 30, None),
    "ELN70B": (6, 360, None),
    "ELN70A": (10, 15, None),
    "ELE13": (6, 45, 1120),
    "MEC78B": (6, 30, 1121),
    "EDU70I": (4, 45, 1135),
    "ARQ7EA": (4, 60, 1222),
    "ARQ7DH": (2, 90, 1224),
}
for codigo, (periodo, carga, conjunto) in fatos.items():
    disciplina = por_codigo.get(codigo)
    if not disciplina:
        erros.append(f"K5 {codigo} ausente")
    elif (disciplina["periodo"], disciplina["horas"]["total"], disciplina["conjunto"]) != (
        periodo,
        carga,
        conjunto,
    ):
        erros.append(f"K5 {codigo} diverge do fato de referência")

print(f"ERROS: {len(erros)}")
for erro in erros:
    print("  !!", erro)
print(
    f"resumo: {len(disciplinas)} disciplinas | {soma_obrigatorias}h obrigatórias | "
    f"{len(conjuntos)} conjuntos"
)
sys.exit(1 if erros else 0)
