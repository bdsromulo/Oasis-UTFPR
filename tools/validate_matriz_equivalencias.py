# -*- coding: utf-8 -*-
"""Validação das equivalências de qualquer matriz (independente de curso).

Motivação — anomalia E1/E2 aprendida na matriz 844: quando a lista de
equivalentes é mais longa que o corpo da disciplina, a fonte imprime as últimas
linhas DEPOIS do link "Turmas" que fecha o bloco visual (e às vezes depois da
moldura da página). O parser posicional fechava o bloco no "Turmas" e essas
sobras eram atribuídas à disciplina SEGUINTE — foi assim que "Estrutura De
Dados 2" (CSF30) herdou QBI7QE/QBI7QT (equivalentes de Química, QB70C) e
"Probabilidade E Estatística" (MA70H) herdou MA70Z/MAT7ED (de Equações
Diferenciais, MA70G). O efeito prático era o motor de elegibilidade resolver a
turma de outra disciplina pelo primeiro equivalente com oferta.

Checagens independentes do parser posicional:
  E1. A fonte lista os equivalentes em ordem alfabética dentro de cada
      disciplina. Sequência fora de ordem = linhas de outra disciplina no bloco.
      Exceção documentada: a matriz antiga 823 preserva no próprio PDF ordens
      não alfabéticas (por exemplo MAT7C1, MA61A, MA71Z em MA71A). Nela, E1 não
      se aplica e o cruzamento exato E2 é obrigatório para validar os blocos.
  E2. Cruzamento com o texto cru do PDF (opcional, exige o PDF oficial): o
      conjunto (código, CHT) declarado no JSON tem que bater exatamente com o
      que aparece entre a linha da disciplina e a da próxima no PDF.
  E3. Nenhum código é declarado duas vezes na mesma disciplina.

Uso:
  python tools/validate_matriz_equivalencias.py data/eng-comp/matriz-844.json [matriz.pdf]
"""
import json, re, sys, os

DEV = os.path.dirname(os.path.abspath(__file__))
MATRIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DEV, "..", "data", "matriz-981.json")
PDF = sys.argv[2] if len(sys.argv) > 2 else None

M = json.load(open(MATRIZ, encoding="utf-8"))
ds = M["disciplinas"]
erros, avisos = [], []

# E1: ordem alfabética dos equivalentes dentro da disciplina. A fonte 823 é a
# exceção conhecida e só pode ser validada com E2 contra o PDF recebido.
if M.get("matriz") == 823 and not PDF:
    erros.append("E1 matriz 823 exige o PDF oficial para validar equivalências via E2")
elif M.get("matriz") != 823:
    for d in ds:
        codigos = [e["codigo"] for e in d["equivalentes"]]
        if codigos != sorted(codigos):
            erros.append(f"E1 {d['codigo']} ({d['nome']}): equivalentes fora de ordem "
                         f"{codigos} — provável sobra de outra disciplina no bloco")

# E3: sem repetição interna
for d in ds:
    codigos = [e["codigo"] for e in d["equivalentes"]]
    if len(set(codigos)) != len(codigos):
        erros.append(f"E3 {d['codigo']}: equivalentes repetidos {codigos}")

# E2: cruzamento com o texto cru do PDF oficial
# Linha de início de disciplina: "<período> [<conjunto>] <CÓDIGO> NOME ...".
RE_INICIO = re.compile(r"^\d{1,2} (?:\[\d{3,4}\] )?([A-Z][A-Z0-9]{3,7}) ")
# Equivalente: sempre no fim da linha, como "<CÓDIGO> <CHT> [<GRUPO>]".
RE_EQUIV = re.compile(r"([A-Z][A-Z0-9]{3,7}) (\d{2,3})(?: (\d{1,2}))?$")

if PDF:
    import pdfplumber
    with pdfplumber.open(PDF) as pdf:
        linhas = [l for p in pdf.pages for l in (p.extract_text() or "").split("\n")]

    bruto, atual = {}, None
    for l in linhas:
        m = RE_INICIO.match(l)
        if m:
            atual = m.group(1)
            # ENADE quebra o código em duas linhas na coluna; no texto cru sai
            # como "10 ENADE ENADE CONCLUINTE" / "10 ENADE I ENADE INGRESSANTE"
            if atual == "ENADE":
                atual = "ENADEI" if " ENADE INGRESSANTE" in l else "ENADEC"
            bruto.setdefault(atual, [])
        if atual is None:
            continue
        e = RE_EQUIV.search(l)
        if e:
            bruto[atual].append((e.group(1), int(e.group(2))))

    for d in ds:
        if d["codigo"] not in bruto:
            avisos.append(f"E2 {d['codigo']}: não localizado no texto cru do PDF")
            continue
        no_pdf = sorted(bruto[d["codigo"]])
        no_json = sorted((e["codigo"], e["cht"]) for e in d["equivalentes"])
        if no_pdf != no_json:
            erros.append(f"E2 {d['codigo']} ({d['nome']}): equivalentes divergem do PDF "
                         f"— json {no_json} x pdf {no_pdf}")
else:
    avisos.append("E2 pulado: PDF da matriz não informado (fica fora do repositório)")

print(f"\nERROS: {len(erros)}")
for e in erros: print("  !!", e)
print(f"avisos: {len(avisos)}")
for a in avisos: print("  ~", a)
total = sum(len(d["equivalentes"]) for d in ds)
print(f"\nresumo: matriz {M['matriz']} | {len(ds)} disciplinas | {total} equivalências")
sys.exit(1 if erros else 0)
