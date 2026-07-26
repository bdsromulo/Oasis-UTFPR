# -*- coding: utf-8 -*-
"""Validação do matriz-968.json (Eng. Eletrônica) contra invariantes oficiais.

A 968 é a primeira matriz servida pela plataforma que aninha conjuntos em mais
de dois níveis: o Quadro Resumo do Histórico Escolar declara
`1180 Trilhas De Aprofundamento` -> `1226 Sistemas Iot` -> `1228 Unidades
Curriculares Formadoras` -> `1230..1233`. As checagens abaixo existem justamente
para que esse aninhamento não se perca nem se invente sozinho.

Checagens independentes do parser:
  M1. Soma das CH das obrigatórias (sem conjunto) == CHTOBRIGATORIASMATRIZ.
  M2. Soma das CH exigidas dos conjuntos de TOPO (pai == null) == CHTOPTATIVASMATRIZ.
  M3. Todo pré-requisito referencia disciplina existente na matriz (ou "Período:N").
  M4. Todo conjunto citado por disciplina existe; todo `pai` aponta para conjunto
      existente; a árvore não tem ciclo; todo conjunto-folha oferta pelo menos a
      CH que exige.
  M5. Códigos únicos; domínios (período 1..10; CH > 0 salvo exceções conhecidas).
  M6. Fatos conhecidos, conferidos à mão no PDF da matriz e no Histórico Escolar.
  M7. Cruzamento com as turmas do semestre (busca dirigida).

Anomalias da fonte já auditadas no texto cru do PDF — não são erro de leitura:
  A1. `ELTD12 Processamento de Imagens` e `ELTD13 Aprendizado Profundo` trazem
      `Total de horas EAD = 60` e `Carga horária total = 0`. A linha do PDF é
      literalmente "0 0 0 0 0 0 0 60 0 horas". A carga real dessas duas é a CHEAD,
      e a própria matriz confirma: sem elas a trilha `1184 Processamento Sinais,
      Imagens E Padrões` ofertaria 240h para uma exigência de 300h — seria
      impossível de validar.
  A2. A legenda da matriz declara conjuntos só até `1226 Sistemas Iot`. As onze
      disciplinas de IoT (ELTF01..ELTF12) citam `1227..1233`, que apenas o
      Histórico Escolar nomeia — entram por
      `data/eng-eletronica/conjuntos-968-complemento.json`, com procedência.
  A3. `1186 Optativas` e `1185 Eletivas` são subáreas de `1180`, e não trilhas de
      aprofundamento: somam para as 300h do bloco sem nunca valer como trilha.

Uso: python tools/validate_matriz_968.py [matriz.json] [turmas.json]
"""
import json, sys, os
from collections import Counter

DEV = os.path.dirname(os.path.abspath(__file__))
MATRIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DEV, "..", "data", "eng-eletronica", "matriz-968.json")
TURMAS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(DEV, "..", "data", "eng-eletronica", "turmas", "2026-2.json")

M = json.load(open(MATRIZ, encoding="utf-8"))
ds = M["disciplinas"]
cj = M["conjuntos"]
by_cod = {d["codigo"]: d for d in ds}
erros, avisos = [], []

# A1: as duas únicas disciplinas em que a fonte declara carga total 0 com CHEAD 60
CH_ZERO_CONHECIDA = {"ELTD12", "ELTD13"}

# ---------- M5: unicidade e domínios ----------
if len(by_cod) != len(ds):
    dups = [c for c, n in Counter(d["codigo"] for d in ds).items() if n > 1]
    erros.append(f"M5 códigos duplicados: {dups}")
for d in ds:
    if d["periodo"] is not None and d["periodo"] not in range(1, 11):
        erros.append(f"M5 {d['codigo']}: período {d['periodo']}")
    if d["horas"]["total"] <= 0 and not d["codigo"].startswith("ENADE"):
        if d["codigo"] in CH_ZERO_CONHECIDA:
            if d["horas"]["chead"] <= 0:
                erros.append(f"M5/A1 {d['codigo']}: CH total 0 e CHEAD 0 — a anomalia mudou de forma")
        else:
            erros.append(f"M5 {d['codigo']}: CH total {d['horas']['total']}")

# ---------- M1: soma das obrigatórias ----------
soma_obr = sum(d["horas"]["total"] for d in ds if d["conjunto"] is None)
if soma_obr != M["cargas"]["obrigatorias"]:
    erros.append(f"M1 soma obrigatórias {soma_obr}h != oficial {M['cargas']['obrigatorias']}h")

# ---------- M2: CH exigida dos conjuntos de topo ----------
# Só os conjuntos de topo somam: contar também as subáreas contaria a mesma
# exigência duas ou três vezes (1180 já embute 1226, que já embute 1228).
topo = [k for k, c in cj.items() if c.get("pai") is None]
exigida = sum(cj[k]["ch"] for k in topo)
if exigida != M["cargas"]["optativas"]:
    erros.append(
        f"M2 soma dos {len(topo)} conjuntos de topo = {exigida}h != oficial {M['cargas']['optativas']}h"
    )

# ---------- M3: pré-requisitos existem ----------
for d in ds:
    for p in d["prerequisitos"]:
        if not p.startswith("Período:") and p not in by_cod:
            erros.append(f"M3 {d['codigo']}: pré-requisito {p} não existe na matriz")

# ---------- M4: integridade da árvore de conjuntos ----------
for d in ds:
    if d["conjunto"] is not None and str(d["conjunto"]) not in cj:
        erros.append(f"M4 {d['codigo']}: conjunto {d['conjunto']} não declarado")

for k, c in cj.items():
    pai = c.get("pai")
    if pai is not None and str(pai) not in cj:
        erros.append(f"M4 conjunto {k} ({c['nome']}): pai {pai} não declarado")

def raiz(k, vistos=()):
    """Sobe até o topo, denunciando ciclo."""
    if k in vistos:
        return None
    pai = cj[k].get("pai")
    return k if pai is None else raiz(str(pai), vistos + (k,))

for k in cj:
    if raiz(k) is None:
        erros.append(f"M4 conjunto {k} ({cj[k]['nome']}): ciclo na hierarquia")

# Um conjunto tem de ofertar pelo menos o que exige, contando as disciplinas
# próprias mais as dos descendentes. Duas ressalvas vindas da própria fonte:
#
#   - Subárea que repete a CH do pai é POOL ALTERNATIVO, não exigência própria:
#     no Ciclo de Humanidades cada uma das cinco áreas (1213..1217) declara as
#     mesmas 210h do 1174, porque o aluno pode fechar as 210h em qualquer
#     combinação delas. Cobrar 210h de "Saúde" isoladamente reprovaria a matriz
#     oficial, que oferta uma única disciplina nessa área.
#   - Conjunto "Eletivas" (1185, 1217) não lista disciplina: eletiva é, por
#     definição, disciplina de fora da matriz do curso.
filhos = {}
for k, c in cj.items():
    if c.get("pai") is not None:
        filhos.setdefault(str(c["pai"]), []).append(k)

def oferta(k, vistos=()):
    """CH ofertada pelo conjunto e por toda a sua descendência."""
    if k in vistos:
        return 0
    propria = sum(
        # A1: nas duas disciplinas EAD a carga real é a CHEAD, não o total zerado
        d["horas"]["total"] or d["horas"]["chead"]
        for d in ds
        if str(d["conjunto"]) == k
    )
    return propria + sum(oferta(f, vistos + (k,)) for f in filhos.get(k, []))

for k, c in cj.items():
    pai = c.get("pai")
    if pai is not None and cj[str(pai)]["ch"] == c["ch"]:
        continue  # pool alternativo: quem exige é o pai
    if "eletiva" in c["nome"].lower() and not filhos.get(k):
        continue  # eletiva vem de fora da matriz
    if oferta(k) < c["ch"]:
        erros.append(f"M4 conjunto {k} ({c['nome']}): oferta {oferta(k)}h < exigido {c['ch']}h")

# ---------- M6: fatos conferidos à mão na fonte ----------
# PDF da matriz, página 1: "1 ELB11 ALGORITMOS DE PROGRAMAÇÃO ... 45 horas".
# Era exatamente esta linha que o cabeçalho centralizado da página corrompia.
fatos = [
    ("ELB11", lambda d: d["horas"]["total"] == 45 and d["periodo"] == 1,
     "Algoritmos de Programação: 45h no 1º período"),
    ("ELP61", lambda d: d["conjunto"] is None,
     "Eletrônica Analógica 3 é obrigatória (consta como faltante no histórico de referência)"),
    ("ELS02", lambda d: d["conjunto"] is None,
     "Estágio Curricular Obrigatório é obrigatório"),
    ("ELTF01", lambda d: str(d["conjunto"]) == "1227",
     "Introdução e Fundamentos de Internet pertence a 1227 Fundamentos"),
    ("ELF66", lambda d: str(d["conjunto"]) == "1205",
     "Sistemas Operacionais está em Opções De Idioma: Sistemas Operacionais"),
]
for cod, chk, desc in fatos:
    if cod not in by_cod:
        erros.append(f"M6 {cod} ausente ({desc})")
    elif not chk(by_cod[cod]):
        erros.append(f"M6 {cod} falhou: {desc} -> {by_cod[cod]}")

# Hierarquia declarada pelo Histórico Escolar, conferida linha a linha.
hierarquia = [
    ("1213", "1174"), ("1214", "1174"), ("1215", "1174"), ("1216", "1174"), ("1217", "1174"),
    ("1181", "1180"), ("1182", "1180"), ("1183", "1180"), ("1184", "1180"),
    ("1185", "1180"), ("1186", "1180"), ("1226", "1180"),
    ("1188", "1187"), ("1189", "1187"),
    ("1191", "1190"), ("1192", "1190"),
    ("1227", "1226"), ("1228", "1226"), ("1229", "1226"),
    ("1230", "1228"), ("1231", "1228"), ("1232", "1228"), ("1233", "1228"),
]
for filho, pai in hierarquia:
    if filho not in cj:
        erros.append(f"M6 conjunto {filho} ausente")
    elif str(cj[filho].get("pai")) != pai:
        erros.append(f"M6 conjunto {filho}: pai {cj[filho].get('pai')} != {pai} (Histórico Escolar)")

# ---------- M7: cruzamento com a oferta ----------
if os.path.exists(TURMAS):
    T = json.load(open(TURMAS, encoding="utf-8"))
    ofertadas = {d["codigo"] for d in T["disciplinas"]}
    obr = [d for d in ds if d["conjunto"] is None and not d["codigo"].startswith("ENADE")]
    # Estágio, TCC e Atividades Complementares não abrem turma com horário.
    SEM_TURMA_ESPERADA = {"ELS02", "ELS03", "ELE91", "ELE92"}
    sem_turma = [d["codigo"] for d in obr
                 if d["codigo"] not in ofertadas and d["codigo"] not in SEM_TURMA_ESPERADA]
    if sem_turma:
        avisos.append(f"M7 obrigatórias sem turma em {os.path.basename(TURMAS)}: {sem_turma}")
    print(f"[M7] {len(ofertadas)} disciplinas ofertadas | "
          f"{len(ofertadas & set(by_cod))} reconhecidas pela matriz 968")
else:
    avisos.append("M7 pulado: turmas não encontradas")

# ---------- relatório ----------
print(f"\nERROS: {len(erros)}")
for e in erros:
    print("  !!", e)
print(f"avisos: {len(avisos)}")
for a in avisos:
    print("  ~", a)
def nivel(k, vistos=()):
    pai = cj[k].get("pai")
    return 1 if pai is None or k in vistos else 1 + nivel(str(pai), vistos + (k,))

print(
    f"\nresumo: {len(ds)} disciplinas | {sum(1 for d in ds if d['conjunto'] is None)} obrigatórias ({soma_obr}h) | "
    f"{len(cj)} conjuntos ({len(topo)} de topo, {exigida}h) | "
    f"aninhamento máximo: {max(nivel(k) for k in cj)} níveis"
)
sys.exit(1 if erros else 0)
