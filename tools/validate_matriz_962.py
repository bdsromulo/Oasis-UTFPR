# -*- coding: utf-8 -*-
"""Validação do matriz-981.json contra invariantes oficiais e cruzamento com turmas.

Checagens independentes do parser:
  M1. Soma das CH das obrigatórias (sem conjunto) == CHTOBRIGATORIASMATRIZ do rodapé.
  M2. Soma das CH exigidas dos conjuntos (1159+1160+1161) == CHTOPTATIVASMATRIZ.
  M3. Todo pré-requisito referencia disciplina existente na matriz (ou "Período:N").
  M4. Todo conjunto usado nas disciplinas existe na legenda; toda trilha tem >= 90h ofertadas.
  M5. Códigos únicos; domínios (período 1..8; CH > 0 exceto ENADE).
  M6. Fatos conhecidos dos históricos reais (spot-checks fixos).
  M7. Cruzamento com turmas do semestre (busca dirigida): disciplinas da matriz x ofertadas.
"""
import json, re, sys, os

DEV = os.path.dirname(os.path.abspath(__file__))
MATRIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DEV, "..", "data", "eng-comp", "matriz-962.json")
TURMAS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(DEV, "..", "data", "eng-comp", "turmas", "2026-1.json")

M = json.load(open(MATRIZ, encoding="utf-8"))
ds = M["disciplinas"]
by_cod = {d["codigo"]: d for d in ds}
erros, avisos = [], []

# M5: unicidade e domínios
if len(by_cod) != len(ds):
    from collections import Counter
    dups = [c for c, n in Counter(d["codigo"] for d in ds).items() if n > 1]
    erros.append(f"M5 códigos duplicados: {dups}")
for d in ds:
    if d["periodo"] not in range(1, 11) and d["periodo"] is not None:
        erros.append(f"M5 {d['codigo']}: período {d['periodo']}")
    if d["horas"]["total"] <= 0 and not d["codigo"].startswith("ENADE"):
        erros.append(f"M5 {d['codigo']}: CH total {d['horas']['total']}")

# M1: soma das obrigatórias
soma_obr = sum(d["horas"]["total"] for d in ds if d["conjunto"] is None)
if soma_obr != M["cargas"]["obrigatorias"]:
    erros.append(f"M1 soma obrigatórias {soma_obr} != oficial {M['cargas']['obrigatorias']}")

# M2: CH exigida dos conjuntos-mãe
exigida = sum(M["conjuntos"][k]["ch"] for k in ("1079", "1080", "1081"))
if exigida != M["cargas"]["optativas"]:
    erros.append(f"M2 conjuntos 1079+1080+1081 = {exigida} != oficial {M['cargas']['optativas']}")

# M3: pré-requisitos existem
for d in ds:
    for p in d["prerequisitos"]:
        if not p.startswith("Período:") and p not in by_cod:
            erros.append(f"M3 {d['codigo']}: pré-requisito {p} não existe na matriz")

# M4: conjuntos válidos e trilhas com oferta >= 90h
legenda = set(M["conjuntos"])
for d in ds:
    if d["conjunto"] is not None and str(d["conjunto"]) not in legenda:
        erros.append(f"M4 {d['codigo']}: conjunto {d['conjunto']} fora da legenda")
for k, c in M["conjuntos"].items():
    if k in ("1079", "1080", "1081"):
        continue
    oferta = sum(d["horas"]["total"] for d in ds if str(d["conjunto"]) == k)
    if oferta < c["ch"]:
        erros.append(f"M4 trilha {k} ({c['nome']}): oferta {oferta}h < exigido {c['ch']}h")

# M6: fatos conhecidos dos históricos e da consulta (verificados manualmente na fonte)
fatos = [
    # TODO: Add eng comp specific spot-checks
]
for cod, chk, desc in fatos:
    if cod not in by_cod:
        erros.append(f"M6 {cod} ausente ({desc})")
    elif not chk(by_cod[cod]):
        erros.append(f"M6 {cod} falhou: {desc} -> {by_cod[cod]}")

# M7: busca dirigida — cruzamento com as turmas ofertadas
if os.path.exists(TURMAS):
    T = json.load(open(TURMAS, encoding="utf-8"))
    ofertadas = {d["codigo"] for d in T["disciplinas"]}
    na_matriz = set(by_cod)
    obr = [d for d in ds if d["conjunto"] is None and not d["codigo"].startswith("ENADE")]
    sem_turma = [d["codigo"] for d in obr if d["codigo"] not in ofertadas and d["codigo"] not in ["ICSXG2", "ICSXG3"]]
    if sem_turma:
        erros.append(f"M7 obrigatórias da matriz SEM turma em {TURMAS}: {sem_turma}")
    tcc_faltantes = [d["codigo"] for d in obr if d["codigo"] not in ofertadas and d["codigo"] in ["ICSXG2", "ICSXG3"]]
    if tcc_faltantes:
        avisos.append(f"M7 TCC obrigatório não ofertado: {tcc_faltantes}")
    fora_matriz = sorted(ofertadas - na_matriz)
    print(f"[M7] ofertadas fora da matriz: {fora_matriz}")
else:
    avisos.append("M7 pulado: turmas não encontradas")

print(f"\nERROS: {len(erros)}")
for e in erros: print("  !!", e)
print(f"avisos: {len(avisos)}")
for a in avisos: print("  ~", a)
n_trilhas = sum(1 for d in ds if d["conjunto"] and d["conjunto"] not in (1079, 1080))
print(f"\nresumo: {len(ds)} disciplinas | {sum(1 for d in ds if d['conjunto'] is None)} obrigatórias | "
      f"{sum(1 for d in ds if d['conjunto'] == 1080)} humanidades | {n_trilhas} em trilhas | "
      f"{sum(1 for d in ds if d['conjunto'] == 1081)} profissionalizantes")
sys.exit(1 if erros else 0)
