# -*- coding: utf-8 -*-
"""Valida a matriz 973 de Engenharia Mecatrônica contra o PDF do Portal.

As invariantes refletem a Consulta Curso e Matriz Curricular oficial salva em
04/08/2026. O projeto K-Matrizes foi usado apenas como apoio inicial; quando os
dois divergiram, prevaleceu o PDF oficial mantido fora do repositório.

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

# K1 — identidade e totais declarados no rodapé oficial.
if matriz.get("matriz") != 973:
    erros.append(f"K1 matriz {matriz.get('matriz')} != 973")
if matriz.get("campus") != "Curitiba":
    erros.append(f"K1 campus inesperado: {matriz.get('campus')}")
esperado = {
    "obrigatorias": 3435,
    "optativas": 300,
    "extensao": 420,
    "eletiva": 0,
    "soma": 4155,
    "soma_sem_ext": 3735,
    "ch_total_ppc": 4155,
}
for campo, valor in esperado.items():
    if matriz["cargas"].get(campo) != valor:
        erros.append(f"K1 carga {campo} = {matriz['cargas'].get(campo)} != {valor}")

# K2 — o PDF contém 208 unidades, incluindo ENADE ingressante e concluinte.
if len(disciplinas) != 208:
    erros.append(f"K2 {len(disciplinas)} disciplinas != 208 da fonte oficial")
duplicados = [
    codigo
    for codigo, quantidade in Counter(d["codigo"] for d in disciplinas).items()
    if quantidade > 1
]
if duplicados:
    erros.append(f"K2 códigos duplicados: {duplicados}")

obrigatorias = [d for d in disciplinas if d["conjunto"] is None]
if len(obrigatorias) != 63:
    erros.append(f"K2 {len(obrigatorias)} registros obrigatórios != 63")
obrigatorias_com_carga = [d for d in obrigatorias if not d["codigo"].startswith("ENADE")]
if len(obrigatorias_com_carga) != 61:
    erros.append(f"K2 {len(obrigatorias_com_carga)} obrigatórias com carga != 61")
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
    if disciplina["horas"]["total"] <= 0 and not codigo.startswith("ENADE"):
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

# K4 — Humanidades agregadas em 60h e duas trilhas formativas de 120h.
if conjuntos.get("1135", {}).get("pai") != "1122":
    erros.append("K4 Ciências Humanas (1135) não aponta para o Ciclo 1122")
if conjuntos.get("1222", {}).get("pai") != "1122":
    erros.append("K4 opções adicionais (1222) não apontam para o Ciclo 1122")
for codigo in ("1120", "1121"):
    if conjuntos.get(codigo, {}).get("ch") != 120:
        erros.append(f"K4 conjunto {codigo} não exige 120h")
if conjuntos.get("1122", {}).get("ch") != 60:
    erros.append("K4 Ciclo de Humanidades 1122 não exige 60h")
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
    "SMCHAL": (2, 120, 1224),
    "SMPROJ": (2, 120, 1224),
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

for removido in ("LICOM7AA", "LICOM7AB"):
    if removido in por_codigo:
        erros.append(f"K5 {removido} não consta na consulta oficial de 04/08/2026")

# K6 — anomalia textual preservada: o próprio rodapé imprime 4155 no campo
# CHEXT_DISCOPTATIVAS, embora a exigência de extensão seja 420h. O campo não é
# usado pelos motores; mantê-lo literal evita transformar uma correção inferida
# em dado oficial.
if matriz["cargas"].get("chext_disc_optativas") != 4155:
    erros.append("K6 CHEXT_DISCOPTATIVAS diverge dos 4155 publicados no rodapé")

print(f"ERROS: {len(erros)}")
for erro in erros:
    print("  !!", erro)
print(
    f"resumo: {len(disciplinas)} disciplinas | {soma_obrigatorias}h obrigatórias | "
    f"{len(conjuntos)} conjuntos"
)
sys.exit(1 if erros else 0)
