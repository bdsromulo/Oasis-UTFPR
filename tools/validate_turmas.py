# -*- coding: utf-8 -*-
"""Suíte de validação do turmas-*.json contra o PDF de origem.

Roda a cada importação de semestre. Qualquer linha não explicada = ERRO (falha alto).
Regras aprendidas na auditoria de 2026/1 (cada uma verificada no texto cru do PDF):
  R1. Cobertura total: todo token de horário/Matriz:/header do PDF deve estar no JSON.
  R2. Horários únicos × N repetições, onde N = nº de professores da turma
      (a fonte imprime o bloco de horários uma vez por professor; ex.: FCH7XG, ICSX10).
  R3. presenciais + assíncronas = nº de horários únicos (aulas EAD têm slot; ex.: GEE74F D-PTO).
  R4. Turmas Especiais (código E*) e casos como CSX41 podem não ter horário impresso.
  R5. "Sem Reserva" PODE vir com lista de prioridades (a fonte contradiz a própria
      documentação; ex.: FCH7SB S02/S06) — aceitar e preservar.
  R6. Enquadramentos válidos: Presencial, EaD.
  R7. A fonte pode imprimir mais horários que as aulas/sem declaradas (ex.: MAT7GA S02,
      5 horários p/ 4 aulas) — vira AVISO, não erro: leitura fiel > expectativa.
  R8. Busca dirigida: todo código de disciplina da matriz 981 que aparece no texto cru
      do PDF deve estar no JSON (e vice-versa, todo código do JSON deve estar no cru).

Uso: python tools/validate_turmas.py <turmas.pdf> <turmas.json> [matriz.json]
"""
import json, re, sys, os, pdfplumber
from collections import Counter

DEV = os.path.dirname(os.path.abspath(__file__))
PDF = sys.argv[1] if len(sys.argv) > 1 else r"I:\Meu Drive\Oásis UTFPR\Turmas Abertas - Portal do Aluno UTFPR.pdf"
JSN = sys.argv[2] if len(sys.argv) > 2 else os.path.join(DEV, "..", "data", "turmas", "2026-1.json")
MTZ = sys.argv[3] if len(sys.argv) > 3 else os.path.join(DEV, "..", "data", "matriz-981.json")

J = json.load(open(JSN, encoding="utf-8"))
ds = J["disciplinas"]
erros, avisos = [], []

# ---- R1: cobertura de tokens ----
with pdfplumber.open(PDF) as pdf:
    raw = " ".join(w["text"] for p in pdf.pages for w in p.extract_words())
raw_h = len(re.findall(r"\b[2-7][MTN]\d\(\*{0,2}[A-Z]{1,2}-?[A-Z0-9]*\)", raw))
raw_m = len(re.findall(r"Matriz:\d+", raw))
raw_d = len(re.findall(r"\b[A-Z0-9]{4,7} - .*?\([\d,]* Aulas semanais presenciais", raw))
got_h = sum(len(t["horarios"]) for d in ds for t in d["turmas"])
got_m = sum(len(t["optativa_matrizes"]) for d in ds for t in d["turmas"])
if raw_h != got_h: erros.append(f"R1 horários: PDF={raw_h} JSON={got_h}")
if raw_m != got_m: erros.append(f"R1 Matriz: PDF={raw_m} JSON={got_m}")
if raw_d != len(ds): erros.append(f"R1 disciplinas: PDF={raw_d} JSON={len(ds)}")

for d in ds:
    for t in d["turmas"]:
        tag = f"{d['codigo']} {t['codigo']}"
        # dominio basico
        if t["reserva"] not in ("Sem Reserva", "Aberta", "Fechada"):
            erros.append(f"{tag}: reserva '{t['reserva']}'")
        if t["enquadramento"] not in ("Presencial", "EaD"):
            erros.append(f"{tag}: enquadramento '{t['enquadramento']}'")
        for h in t["horarios"]:
            if not (2 <= h["dia"] <= 7 and h["turno"] in "MTN" and 1 <= h["aula"] <= 6):
                erros.append(f"{tag}: horário fora do domínio {h}")
        # R2/R3: repetição uniforme e total esperado
        c = Counter((h["dia"], h["turno"], h["aula"], h["sala"]) for h in t["horarios"])
        reps = set(c.values())
        if len(reps) > 1:
            erros.append(f"{tag}: repetição de horários não uniforme {dict(c)}")
        n_unicos = len(c)
        esperado = d["aulas_semanais_presenciais"] + d["aulas_semanais_assincronas"]
        # aulas fracionárias (ex.: CSX41 "1,73") = registro degenerado da fonte: só aviso
        fracionaria = (d["aulas_semanais_presenciais"] != int(d["aulas_semanais_presenciais"])
                       or d["aulas_semanais_assincronas"] != int(d["aulas_semanais_assincronas"]))
        if t["enquadramento"] == "Presencial" and n_unicos == 0 and not t["codigo"].startswith("E") \
           and esperado and not fracionaria:
            erros.append(f"{tag}: presencial sem horários (esperado {esperado})")
        elif fracionaria:
            avisos.append(f"{tag}: aulas/sem fracionárias na fonte ({d['aulas_semanais_presenciais']}+{d['aulas_semanais_assincronas']})")
        elif n_unicos and esperado and n_unicos != esperado:
            avisos.append(f"{tag}: {n_unicos} horários únicos vs {esperado} aulas/sem (R7)")
        # prioridades bem formadas
        for p in t["prioridade_cursos"]:
            if not p["curso"].strip():
                erros.append(f"{tag}: prioridade sem curso {p}")

# ---- R8: busca dirigida com os códigos conhecidos da matriz ----
if os.path.exists(MTZ):
    matriz = json.load(open(MTZ, encoding="utf-8"))
    cods_matriz = {d["codigo"] for d in matriz["disciplinas"]}
    cods_json = {d["codigo"] for d in ds}
    # códigos da matriz presentes no texto cru como cabeçalho "COD - "
    no_cru = {c for c in cods_matriz if re.search(r"\b" + re.escape(c) + r" - ", raw)}
    perdidos = sorted(no_cru - cods_json)
    if perdidos:
        erros.append(f"R8 códigos da matriz no PDF mas fora do JSON: {perdidos}")
    fantasmas = sorted(c for c in cods_json if not re.search(r"\b" + re.escape(c) + r"\b", raw))
    if fantasmas:
        erros.append(f"R8 códigos no JSON que não existem no PDF: {fantasmas}")
    print(f"[R8] matriz x oferta: {len(no_cru & cods_json)} | fora da matriz 981 (eletivas etc.): "
          f"{sorted(cods_json - cods_matriz)}")
else:
    avisos.append("R8 pulado: matriz-981.json não encontrado")

print(f"ERROS: {len(erros)}")
for e in erros: print("  !!", e)
print(f"avisos (anomalias conhecidas da fonte): {len(avisos)}")
for a in avisos: print("  ~", a)
sys.exit(1 if erros else 0)
