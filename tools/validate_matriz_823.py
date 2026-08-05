# -*- coding: utf-8 -*-
"""Valida a matriz 823 de Engenharia Mecatrônica contra a fonte oficial.

As invariantes refletem a Consulta Curso e Matriz Curricular e o Histórico
Escolar de referência mantidos fora do repositório. A matriz antiga possui uma
única categoria optativa (932 Humanidades), 240h eletivas e uma lista extensa
de equivalências para os códigos atuais. Diferentemente das matrizes recentes,
o próprio PDF não ordena alfabeticamente essas equivalências; por isso a
validação exata contra o PDF fica em ``validate_matriz_equivalencias.py``.

Uso: python tools/validate_matriz_823.py [matriz.json] [turmas.json]
"""
import json
import os
import sys
from collections import Counter

BASE = os.path.dirname(os.path.abspath(__file__))
MATRIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    BASE, "..", "data", "eng-mecatronica", "matriz-823.json"
)
TURMAS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    BASE, "..", "data", "eng-mecatronica", "turmas", "2026-2.json"
)

with open(MATRIZ, encoding="utf-8") as arquivo:
    matriz = json.load(arquivo)

disciplinas = matriz["disciplinas"]
conjuntos = matriz["conjuntos"]
por_codigo = {d["codigo"]: d for d in disciplinas}
erros, avisos = [], []

# K1 — identidade e totais declarados no rodapé oficial.
esperado = {
    "obrigatorias": 4066,
    "optativas": 90,
    "extensao": 0,
    "eletiva": 240,
    "soma": 4396,
    "soma_sem_ext": 4396,
    "ch_total_ppc": 4396,
}
if matriz.get("matriz") != 823:
    erros.append(f"K1 matriz {matriz.get('matriz')} != 823")
if matriz.get("campus") != "Curitiba":
    erros.append(f"K1 campus inesperado: {matriz.get('campus')}")
for campo, valor in esperado.items():
    if matriz["cargas"].get(campo) != valor:
        erros.append(f"K1 carga {campo} = {matriz['cargas'].get(campo)} != {valor}")

# K2 — 89 registros, incluindo os dois ENADE sem carga.
if len(disciplinas) != 89:
    erros.append(f"K2 {len(disciplinas)} disciplinas != 89 da fonte oficial")
duplicados = [
    codigo
    for codigo, quantidade in Counter(d["codigo"] for d in disciplinas).items()
    if quantidade > 1
]
if duplicados:
    erros.append(f"K2 códigos duplicados: {duplicados}")
if set(c for c in por_codigo if c.startswith("ENADE")) != {"ENADEI", "ENADEC"}:
    erros.append("K2 os registros ENADEI/ENADEC não foram preservados")

obrigatorias = [d for d in disciplinas if d["conjunto"] is None]
if len(obrigatorias) != 68:
    erros.append(f"K2 {len(obrigatorias)} registros obrigatórios != 68")
soma_obrigatorias = sum(d["horas"]["total"] for d in obrigatorias)
if soma_obrigatorias != 4066:
    erros.append(f"K2 soma obrigatórias {soma_obrigatorias}h != 4066h")

# K3 — domínios, conjuntos e referências internas.
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

# K4 — único conjunto optativo: 90h de Humanidades no 2º/3º períodos.
if set(conjuntos) != {"932"}:
    erros.append(f"K4 conjuntos inesperados: {sorted(conjuntos)}")
humanidades = conjuntos.get("932", {})
if humanidades.get("ch") != 90:
    erros.append("K4 conjunto 932 não exige 90h")
if (humanidades.get("periodo_inicial"), humanidades.get("periodo_final")) != (2, 3):
    erros.append("K4 conjunto 932 não está distribuído no 2º/3º períodos")
opcoes_humanidades = [d for d in disciplinas if d["conjunto"] == 932]
if len(opcoes_humanidades) != 21:
    erros.append(f"K4 {len(opcoes_humanidades)} disciplinas de Humanidades != 21")
if sum(d["horas"]["total"] for d in opcoes_humanidades) != 825:
    erros.append("K4 oferta total de Humanidades diferente de 825h")

# K5 — fatos pontuais que detectam deslocamento de coluna e blocos truncados.
fatos = {
    "CE70B": (1, 30, None),
    "EL70A": (2, 180, None),
    "FCH7FC": (2, 45, 932),
    "EL76A": (6, 60, None),
    "EL70B": (7, 400, None),
    "EL79D": (9, 60, None),
    "EL70D": (10, 60, None),
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

if sum(len(d["equivalentes"]) for d in disciplinas) != 264:
    erros.append("K5 total de equivalências diferente de 264")

# K6 — a oferta é compartilhada com a matriz 973 e precisa cruzar por código ou
# equivalência. O histórico confirma que os códigos atuais são consignados para
# as exigências da 823, portanto não se duplica arquivo de oferta por matriz.
if os.path.exists(TURMAS):
    with open(TURMAS, encoding="utf-8") as arquivo:
        turmas = json.load(arquivo)
    if turmas.get("curso") != "ENG MECATRÔNICA":
        erros.append(f"K6 curso da oferta inesperado: {turmas.get('curso')}")
    ofertadas = {d["codigo"] for d in turmas["disciplinas"]}
    reconhecidas = set(por_codigo) & ofertadas
    equivalentes = {
        equivalente["codigo"]
        for disciplina in disciplinas
        for equivalente in disciplina["equivalentes"]
    }
    reconhecidas_por_equivalencia = ofertadas & equivalentes
    if not reconhecidas or not reconhecidas_por_equivalencia:
        erros.append("K6 a oferta compartilhada não cruza códigos diretos e equivalentes da 823")
    print(
        f"[K6] {len(ofertadas)} disciplinas ofertadas | "
        f"{len(reconhecidas)} diretas | {len(reconhecidas_por_equivalencia)} equivalentes"
    )
else:
    avisos.append("K6 pulado: arquivo de turmas não encontrado")

print(f"\nERROS: {len(erros)}")
for erro in erros:
    print("  !!", erro)
print(f"avisos: {len(avisos)}")
for aviso in avisos:
    print("  ~", aviso)
print(
    f"\nresumo: {len(disciplinas)} disciplinas | {soma_obrigatorias}h obrigatórias | "
    f"{len(opcoes_humanidades)} opções de Humanidades | 264 equivalências"
)
sys.exit(1 if erros else 0)
