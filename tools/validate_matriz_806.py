# -*- coding: utf-8 -*-
"""Validação do matriz-806.json (BSI, matriz antiga) contra invariantes oficiais.

A 806 é a matriz anterior da BSI e tem a mesma arquitetura de estratos da 981 —
obrigatórias, 2º estrato, trilhas do 3º estrato e um bloco de optativas — com três
diferenças que estas checagens fixam:

  D1. NÃO tem extensão curricular. O rodapé declara `extensao: 0`, e nenhuma
      disciplina traz CHEXT nas obrigatórias. Uma 806 que passasse a cobrar
      extensão seria erro de leitura, não mudança de currículo.
  D2. O bloco optativo de humanidades é o conjunto `948 Optativas`, sem o rótulo
      "Ciclo de Humanidades" que a 981 usa. As disciplinas são as mesmas famílias
      (FCH7*, ES70*, QB70*).
  D3. As eletivas NÃO formam conjunto. A 981 declara a pool como `1199`; aqui a
      exigência de 180h existe só no rodapé, e o acompanhamento vem do bloco de
      eletivas do Histórico Escolar.

Checagens independentes do parser:
  M1. Soma das CH das obrigatórias (sem conjunto) == CHTOBRIGATORIASMATRIZ.
  M2. Soma das CH exigidas dos conjuntos de TOPO (pai == null) == CHTOPTATIVASMATRIZ.
  M3. Todo pré-requisito referencia disciplina existente na matriz (ou "Período:N").
  M4. Todo conjunto citado por disciplina existe; todo `pai` aponta para conjunto
      existente; toda trilha oferta ao menos a CH que exige.
  M5. Códigos únicos; domínios (período 1..8; CH > 0 salvo ENADE).
  M6. Fatos conhecidos, conferidos à mão no PDF da matriz.
  M7. Cruzamento com as turmas do semestre (busca dirigida).

Anomalia da fonte já auditada no texto cru do PDF — não é erro de leitura:
  A1. O PDF da 806 tem largura de coluna própria: os números começam em x≈296,
      contra x≈300 da 981, e CHEAD/carga horária ficam ~10pt adiante. Lido com o
      perfil da 981, saíam 162 disciplinas com 0h e o nome contaminado pela coluna
      "modelo de disciplina". Por isso `parse_matriz.py` tem um perfil de colunas
      próprio para a 806, escolhido pelo número da matriz no cabeçalho.

Uso: python tools/validate_matriz_806.py [matriz.json] [turmas.json]
"""
import json, sys, os
from collections import Counter

DEV = os.path.dirname(os.path.abspath(__file__))
MATRIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DEV, "..", "data", "matriz-806.json")
TURMAS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(DEV, "..", "data", "turmas", "2026-1.json")

M = json.load(open(MATRIZ, encoding="utf-8"))
ds = M["disciplinas"]
cj = M["conjuntos"]
cargas = M["cargas"]
by_cod = {d["codigo"]: d for d in ds}
erros, avisos = [], []

AGREGADOR_TRILHAS = "934"
SEGUNDO_ESTRATO = "947"
OPTATIVAS = "948"
SEM_CARGA = {"ENADEI", "ENADEC"}

# ---------- M5: unicidade e domínios ----------
if len(by_cod) != len(ds):
    dups = [c for c, n in Counter(d["codigo"] for d in ds).items() if n > 1]
    erros.append(f"M5 códigos duplicados: {dups}")
for d in ds:
    if d["periodo"] not in range(1, 9):
        erros.append(f"M5 {d['codigo']} período fora de 1..8: {d['periodo']}")
    if d["horas"]["total"] <= 0 and d["codigo"] not in SEM_CARGA:
        erros.append(f"M5 {d['codigo']} sem carga horária: {d['horas']}")

# ---------- M1: obrigatórias ----------
soma_obr = sum(d["horas"]["total"] for d in ds if d["conjunto"] is None)
if soma_obr != cargas["obrigatorias"]:
    erros.append(f"M1 obrigatórias somam {soma_obr}h, rodapé declara {cargas['obrigatorias']}h")

# ---------- M2: optativas ----------
topo = [k for k, v in cj.items() if v.get("pai") is None]
soma_topo = sum(cj[k]["ch"] for k in topo)
if soma_topo != cargas["optativas"]:
    erros.append(f"M2 conjuntos de topo somam {soma_topo}h, rodapé declara {cargas['optativas']}h")
if set(topo) != {AGREGADOR_TRILHAS, SEGUNDO_ESTRATO, OPTATIVAS}:
    erros.append(f"M2 conjuntos de topo inesperados: {sorted(topo)}")

# ---------- M3: pré-requisitos ----------
for d in ds:
    for p in d["prerequisitos"]:
        if p.startswith("Período:"):
            continue
        if p not in by_cod:
            erros.append(f"M3 {d['codigo']} exige {p}, que não existe na matriz")

# ---------- M4: árvore de conjuntos e oferta ----------
usados = {str(d["conjunto"]) for d in ds if d["conjunto"] is not None}
for c in usados:
    if c not in cj:
        erros.append(f"M4 conjunto {c} é citado por disciplina mas não está na legenda")
for c, v in cj.items():
    pai = v.get("pai")
    if pai is not None and str(pai) not in cj:
        erros.append(f"M4 conjunto {c} aponta para pai inexistente {pai}")

ofertada = Counter()
for d in ds:
    if d["conjunto"] is not None:
        ofertada[str(d["conjunto"])] += d["horas"]["total"]

for c, v in cj.items():
    # o agregador não tem disciplina própria: a carga mora nas trilhas filhas
    if c == AGREGADOR_TRILHAS:
        continue
    if ofertada[c] < v["ch"]:
        erros.append(f"M4 conjunto {c} ({v['nome']}) exige {v['ch']}h e oferta só {ofertada[c]}h")

filhas = [k for k, v in cj.items() if str(v.get("pai")) == AGREGADOR_TRILHAS]
if len(filhas) != 12:
    erros.append(f"M4 a 806 tem 12 trilhas no 3º estrato; encontradas {len(filhas)}")

# ---------- M6: fatos conferidos à mão no PDF ----------
FATOS = [
    ("CSX51", "Estágio 1", 200, 5),
    ("CSX52", "Estágio 2", 200, 6),
    ("CSX40", "Trabalho De Conclusão De Curso 1", 30, 7),
    ("CSX41", "Trabalho De Conclusão De Curso 2", 30, 8),
    ("CSF13", "Fundamentos De Programação 1", 90, 1),
]
for cod, nome, ch, periodo in FATOS:
    d = by_cod.get(cod)
    if not d:
        erros.append(f"M6 {cod} sumiu da matriz")
        continue
    if d["horas"]["total"] != ch:
        erros.append(f"M6 {cod} deveria ter {ch}h, tem {d['horas']['total']}h")
    if d["periodo"] != periodo:
        erros.append(f"M6 {cod} deveria estar no {periodo}º período, está no {d['periodo']}º")
    if not d["nome"].startswith(nome.split()[0]):
        erros.append(f"M6 {cod} nome inesperado: {d['nome']!r}")

# D1: a 806 não tem extensão curricular
if cargas.get("extensao", 0) != 0:
    erros.append(f"D1 a 806 não tem extensão curricular; rodapé trouxe {cargas['extensao']}h")
com_chext = [d["codigo"] for d in ds if d["conjunto"] is None and d["horas"].get("chext")]
if com_chext:
    erros.append(f"D1 obrigatórias com CHEXT numa matriz sem extensão: {com_chext}")

# D3: as eletivas não formam conjunto, mas a exigência existe no rodapé
if cargas.get("eletiva", 0) <= 0:
    erros.append("D3 rodapé sem exigência de eletivas")
nomes_conjunto = " ".join(v["nome"].lower() for v in cj.values())
if "eletiva" in nomes_conjunto:
    avisos.append("D3 apareceu conjunto de eletivas — a 806 não declarava um; confira a fonte")

# ---------- M7: cruzamento com a oferta ----------
# A oferta é uma só para a BSI e vem com os códigos da matriz NOVA (ICS…, GEE…),
# enquanto a 806 usa os antigos (CS…). Contar só o casamento direto mediria 8 de
# 77 e pareceria oferta quebrada; o que vale é o casamento pela equivalência, que
# é como a plataforma resolve identidade curricular. As que sobram existem apenas
# na matriz nova, e isso é esperado numa oferta compartilhada.
COBERTURA_MINIMA = 0.75
try:
    T = json.load(open(TURMAS, encoding="utf-8"))
    ofertados = {d["codigo"] for d in T["disciplinas"]}
    por_equivalencia = set()
    for d in ds:
        for e in d.get("equivalentes") or []:
            por_equivalencia.add(e["codigo"])
    resolvidas = {c for c in ofertados if c in by_cod or c in por_equivalencia}
    if not resolvidas:
        erros.append("M7 nenhuma disciplina ofertada resolve na 806 — arquivo de turmas errado?")
    else:
        taxa = len(resolvidas) / len(ofertados)
        if taxa < COBERTURA_MINIMA:
            erros.append(
                f"M7 só {len(resolvidas)}/{len(ofertados)} ({taxa:.0%}) das ofertadas resolvem na "
                f"806; abaixo de {COBERTURA_MINIMA:.0%} indica equivalência faltando"
            )
        avisos.append(
            f"M7 {len(resolvidas)}/{len(ofertados)} ofertadas resolvem na 806 "
            f"({len(ofertados & set(by_cod))} direto, {len(resolvidas) - len(ofertados & set(by_cod))} por equivalência)"
        )
except FileNotFoundError:
    avisos.append(f"M7 turmas não encontradas em {TURMAS}; cruzamento pulado")

# ---------- relatório ----------
print(f"disciplinas: {len(ds)} | conjuntos: {len(cj)} | obrigatórias: {soma_obr}h | optativas: {soma_topo}h")
for a in avisos:
    print(f"  aviso: {a}")
if erros:
    print(f"\n{len(erros)} ERRO(S):")
    for e in erros:
        print(f"  - {e}")
    sys.exit(1)
print("\nvalidação da 806: 0 erros")
