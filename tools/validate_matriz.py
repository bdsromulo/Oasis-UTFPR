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
MATRIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DEV, "..", "data", "matriz-981.json")
TURMAS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(DEV, "..", "data", "turmas", "2026-1.json")

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
    if d["periodo"] not in range(1, 9):
        erros.append(f"M5 {d['codigo']}: período {d['periodo']}")
    if d["horas"]["total"] <= 0 and not d["codigo"].startswith("ENADE"):
        erros.append(f"M5 {d['codigo']}: CH total {d['horas']['total']}")

# M1: soma das obrigatórias
soma_obr = sum(d["horas"]["total"] for d in ds if d["conjunto"] is None)
if soma_obr != M["cargas"]["obrigatorias"]:
    erros.append(f"M1 soma obrigatórias {soma_obr} != oficial {M['cargas']['obrigatorias']}")

# M2: CH exigida dos conjuntos-mãe
exigida = sum(M["conjuntos"][k]["ch"] for k in ("1159", "1160", "1161"))
if exigida != M["cargas"]["optativas"]:
    erros.append(f"M2 conjuntos 1159+1160+1161 = {exigida} != oficial {M['cargas']['optativas']}")

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
    if k in ("1159", "1160", "1161"):
        continue
    oferta = sum(d["horas"]["total"] for d in ds if str(d["conjunto"]) == k)
    if oferta < c["ch"]:
        erros.append(f"M4 trilha {k} ({c['nome']}): oferta {oferta}h < exigido {c['ch']}h")

# M6: fatos conhecidos dos históricos e da consulta (verificados manualmente na fonte)
fatos = [
    ("ICSX20", lambda d: d["horas"]["chext"] == 60, "CHEXT de TI1 = 60h (consta no histórico)"),
    ("ICSX20", lambda d: d["prerequisitos"] == ["ICSF20"], "pré-req de TI1 = ICSF20"),
    ("ICSX40", lambda d: d["prerequisitos"] == ["ICSX30"], "pré-req de TC1 = ICSX30 (oficial)"),
    ("ICSS30", lambda d: sorted(d["prerequisitos"]) == ["ICSO30", "ICSR30"], "pré-reqs de Sist. Distribuídos"),
    ("EST70C", lambda d: any(e["codigo"] == "EST70A" for e in d["equivalentes"]), "EST70C ≡ EST70A (aplicada no histórico da Namie)"),
    ("ICSF13", lambda d: d["horas"]["total"] == 90, "Fund. Prog. 1 = 90h"),
    ("ICSX51", lambda d: d["horas"]["total"] == 200 and d["prerequisitos"] == ["Período:4"], "Estágio 1: 200h, req. período 4"),
    ("ICSB56", lambda d: d["conjunto"] == 1165, "Ciência de Dados na trilha Banco de Dados (consta no histórico)"),
    ("FCH7HC", lambda d: d["conjunto"] == 1161, "Capitalismo Cont. no Ciclo de Humanidades (consta no histórico)"),
    ("ICSHX0", lambda d: d["horas"]["chext"] == 45, "Acessibilidade: 45h extensionistas (consta em Turmas Abertas)"),
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
    sem_oferta = sorted(c for c in na_matriz - ofertadas
                        if not c.startswith("ENADE") and by_cod[c]["conjunto"] is None
                        and not c.startswith("ICSX5"))
    fora_matriz = sorted(ofertadas - na_matriz)
    print(f"[M7] obrigatórias da matriz SEM turma em {T['semestre']}: {sem_oferta or 'nenhuma'}")
    print(f"[M7] ofertadas fora da matriz 981 (eletivas/equivalentes): {fora_matriz}")
else:
    avisos.append("M7 pulado: turmas não encontradas")

print(f"\nERROS: {len(erros)}")
for e in erros: print("  !!", e)
print(f"avisos: {len(avisos)}")
for a in avisos: print("  ~", a)
n_trilhas = sum(1 for d in ds if d["conjunto"] and d["conjunto"] not in (1159, 1161))
print(f"\nresumo: {len(ds)} disciplinas | {sum(1 for d in ds if d['conjunto'] is None)} obrigatórias | "
      f"{sum(1 for d in ds if d['conjunto'] == 1159)} 2º estrato | {n_trilhas} em trilhas | "
      f"{sum(1 for d in ds if d['conjunto'] == 1161)} humanidades")
sys.exit(1 if erros else 0)
