# -*- coding: utf-8 -*-
"""Valida a matriz 978 de Engenharia de Controle e Automação.

A matriz distribui as 675h optativas em cinco trilhas de formação obrigatórias
de 135h. A quinta trilha (1140) agrega quatro subáreas; portanto, contar pais e
filhos como exigências independentes duplicaria carga.

Uso: python tools/validate_matriz_978.py [matriz.json] [turmas.json]
"""
import json
import os
import sys
from collections import Counter

BASE = os.path.dirname(os.path.abspath(__file__))
MATRIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    BASE, "..", "data", "eng-controle", "matriz-978.json"
)
TURMAS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    BASE, "..", "data", "eng-controle", "turmas", "2026-2.json"
)

with open(MATRIZ, encoding="utf-8") as arquivo:
    matriz = json.load(arquivo)

disciplinas = matriz["disciplinas"]
conjuntos = matriz["conjuntos"]
por_codigo = {d["codigo"]: d for d in disciplinas}
erros, avisos = [], []

# M1 — identidade e totais declarados no rodapé oficial.
esperado = {
    "obrigatorias": 3525,
    "optativas": 675,
    "extensao": 420,
    "eletiva": 0,
    "ch_total_ppc": 4200,
}
if matriz.get("matriz") != 978:
    erros.append(f"M1 matriz {matriz.get('matriz')} != 978")
if matriz.get("campus") != "Curitiba":
    erros.append(f"M1 campus inesperado: {matriz.get('campus')}")
for campo, valor in esperado.items():
    if matriz["cargas"].get(campo) != valor:
        erros.append(f"M1 carga {campo} = {matriz['cargas'].get(campo)} != {valor}")

# M2 — unicidade, domínios e soma das obrigatórias.
if len(por_codigo) != len(disciplinas):
    duplicados = [c for c, n in Counter(d["codigo"] for d in disciplinas).items() if n > 1]
    erros.append(f"M2 códigos duplicados: {duplicados}")
if len(disciplinas) != 173:
    erros.append(f"M2 {len(disciplinas)} disciplinas != 173 da fonte")
for d in disciplinas:
    if d["periodo"] not in range(1, 11):
        erros.append(f"M2 {d['codigo']}: período {d['periodo']}")
    if d["horas"]["total"] <= 0 and not d["codigo"].startswith("ENADE"):
        erros.append(f"M2 {d['codigo']}: CH total {d['horas']['total']}")

soma_obrigatorias = sum(
    d["horas"]["total"] for d in disciplinas if d["conjunto"] is None
)
if soma_obrigatorias != matriz["cargas"]["obrigatorias"]:
    erros.append(
        f"M2 soma obrigatórias {soma_obrigatorias}h != "
        f"{matriz['cargas']['obrigatorias']}h"
    )

# M3 — pré-requisitos e equivalências só podem apontar para códigos conhecidos.
for d in disciplinas:
    for requisito in d["prerequisitos"]:
        if not requisito.startswith("Período:") and requisito not in por_codigo:
            erros.append(f"M3 {d['codigo']}: pré-requisito {requisito} ausente")
    for equivalente in d["equivalentes"]:
        if not equivalente.get("codigo", "").strip():
            erros.append(f"M3 {d['codigo']}: equivalência vazia")

# M4 — árvore de conjuntos e as cinco exigências de topo.
topo = [codigo for codigo, c in conjuntos.items() if c.get("pai") is None]
if topo != ["1136", "1137", "1138", "1139", "1140"]:
    erros.append(f"M4 conjuntos de topo inesperados: {topo}")
if sum(conjuntos[c]["ch"] for c in topo) != 675:
    erros.append("M4 as cinco trilhas de topo não somam 675h")

for d in disciplinas:
    if d["conjunto"] is not None and str(d["conjunto"]) not in conjuntos:
        erros.append(f"M4 {d['codigo']}: conjunto {d['conjunto']} ausente")
for codigo, conjunto in conjuntos.items():
    pai = conjunto.get("pai")
    if pai is not None and str(pai) not in conjuntos:
        erros.append(f"M4 conjunto {codigo}: pai {pai} ausente")

def raiz(codigo, visitados=()):
    if codigo in visitados:
        return None
    pai = conjuntos[codigo].get("pai")
    return codigo if pai is None else raiz(str(pai), visitados + (codigo,))

for codigo in conjuntos:
    if raiz(codigo) is None:
        erros.append(f"M4 ciclo na hierarquia a partir de {codigo}")

hierarquia = {"1146": "1140", "1147": "1140", "1148": "1140", "1149": "1140"}
for filho, pai in hierarquia.items():
    if str(conjuntos.get(filho, {}).get("pai")) != pai:
        erros.append(f"M4 conjunto {filho}: pai diferente de {pai}")

# Cada trilha precisa oferecer carga suficiente. Para 1140, contam os filhos.
def pertence_ao_topo(disciplina, codigo_topo):
    atual = str(disciplina["conjunto"])
    while atual in conjuntos:
        if atual == codigo_topo:
            return True
        pai = conjuntos[atual].get("pai")
        if pai is None:
            break
        atual = str(pai)
    return False

for codigo in topo:
    oferta = sum(
        d["horas"]["total"] for d in disciplinas if pertence_ao_topo(d, codigo)
    )
    if oferta < conjuntos[codigo]["ch"]:
        erros.append(f"M4 trilha {codigo}: oferta {oferta}h < 135h")

# M5 — fatos pontuais conferidos no documento oficial.
fatos = [
    ("ELT71A", lambda d: d["periodo"] == 1 and d["horas"]["total"] == 75,
     "Introdução à Engenharia: 75h no 1º período"),
    ("ELT78C", lambda d: d["modelo"] == "Estágio" and d["horas"]["total"] == 360,
     "Estágio Curricular Obrigatório: 360h"),
    ("ELT7CA", lambda d: str(d["conjunto"]) == "1146",
     "ELT7CA pertence à subárea 1146"),
    ("ELT7BA", lambda d: str(d["conjunto"]) == "1147",
     "ELT7BA pertence à subárea 1147"),
]
for codigo, teste, descricao in fatos:
    if codigo not in por_codigo:
        erros.append(f"M5 {codigo} ausente ({descricao})")
    elif not teste(por_codigo[codigo]):
        erros.append(f"M5 {codigo} falhou: {descricao}")

# M6 — a oferta vigente pertence ao curso e cruza códigos da matriz.
if os.path.exists(TURMAS):
    with open(TURMAS, encoding="utf-8") as arquivo:
        turmas = json.load(arquivo)
    if turmas.get("curso") != "ENG CONTR/AUTOMAÇÃO":
        erros.append(f"M6 curso da oferta inesperado: {turmas.get('curso')}")
    ofertadas = {d["codigo"] for d in turmas["disciplinas"]}
    reconhecidas = ofertadas & set(por_codigo)
    if not reconhecidas:
        erros.append("M6 nenhuma disciplina ofertada cruza a matriz 978")
    print(
        f"[M6] {len(ofertadas)} disciplinas ofertadas | "
        f"{len(reconhecidas)} reconhecidas diretamente pela matriz 978"
    )
else:
    avisos.append("M6 pulado: arquivo de turmas não encontrado")

print(f"\nERROS: {len(erros)}")
for erro in erros:
    print("  !!", erro)
print(f"avisos: {len(avisos)}")
for aviso in avisos:
    print("  ~", aviso)
print(
    f"\nresumo: {len(disciplinas)} disciplinas | "
    f"{soma_obrigatorias}h obrigatórias | {len(conjuntos)} conjuntos | "
    f"{sum(conjuntos[c]['ch'] for c in topo)}h em trilhas de formação"
)
sys.exit(1 if erros else 0)
