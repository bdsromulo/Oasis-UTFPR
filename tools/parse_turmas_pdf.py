# -*- coding: utf-8 -*-
"""Parser do PDF 'Turmas Abertas' do Portal do Aluno UTFPR -> JSON canônico de turmas.

Uso: python tools/parse_turmas_pdf.py <turmas.pdf> <semestre ex: 2026-1> [saida.json]
Após gerar, rode tools/validate_turmas.py — a importação só vale com 0 erros.
"""
import pdfplumber, re, json, sys, os

PDF = sys.argv[1] if len(sys.argv) > 1 else r"I:\Meu Drive\Oásis UTFPR\Turmas Abertas - Portal do Aluno UTFPR.pdf"
SEM = sys.argv[2] if len(sys.argv) > 2 else "2026-1"
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data", "turmas", f"{SEM}.json")

# fronteiras de coluna (x0) medidas na página
COLS = [
    ("turma",       35,  70),
    ("enquadr",     70, 175),
    ("vagas_total",175, 230),
    ("vagas_cal",  230, 242),
    ("reserva",    242, 283),
    ("prioridade", 283, 341),
    ("horario",    341, 431),
    ("professor",  431, 488),
    ("optativa",   488, 600),
]

RE_TURMA = re.compile(r"^[A-Z]\d{2}$")
RE_HORARIO = re.compile(r"^([2-7])([MTN])(\d)(?:\((\*{0,2})([A-Z]{1,2}-?[A-Z0-9]*)\))?$")
RE_COD_DISC = re.compile(r"^[A-Z]{2,4}[A-Z0-9]{1,4}$")

def col_of(x):
    for name, a, b in COLS:
        if a <= x < b:
            return name
    return None

def group_rows(words, tol=3.5):
    rows = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if rows and abs(rows[-1][0] - w["top"]) <= tol:
            rows[-1][1].append(w)
        else:
            rows.append([w["top"], [w]])
    return rows

def parse():
    disciplinas = []
    disc = None          # disciplina corrente
    turma = None         # turma corrente
    header_buf = []      # linhas do cabeçalho de disciplina (pode quebrar em 2+ linhas)

    def flush_header():
        nonlocal disc, header_buf
        if not header_buf:
            return
        text = " ".join(header_buf)
        m = re.match(
            r"^([A-Z0-9]{4,7}) - (.+?) \(([\d,]*) Aulas semanais presenciais, ([\d,]*) Aulas semanais ass[ií]ncronas, ([\d,]*) horas semestrais extensionistas\)$",
            text)
        def num(s):
            # a fonte às vezes imprime frações com vírgula (ex.: CSX41 "1,7333...")
            return round(float(s.replace(",", ".") or 0), 2) if s else 0
        if m:
            disc = {
                "codigo": m.group(1), "nome": m.group(2),
                "aulas_semanais_presenciais": num(m.group(3)),
                "aulas_semanais_assincronas": num(m.group(4)),
                "horas_semestrais_extensionistas": num(m.group(5)),
                "turmas": [],
            }
            disciplinas.append(disc)
        else:
            print("!! header nao casou:", text[:120], file=sys.stderr)
        header_buf = []

    def new_turma(cells):
        nonlocal turma
        turma = {
            "codigo": cells.get("turma", [""])[0],
            "enquadramento": " ".join(cells.get("enquadr", [])),
            "vagas_total": int(cells["vagas_total"][0]) if cells.get("vagas_total") else None,
            "vagas_calouros": int(cells["vagas_cal"][0]) if cells.get("vagas_cal") else None,
            "reserva": " ".join(cells.get("reserva", [])),
            "_prio_raw": [], "_hor_raw": [], "_prof_raw": [], "_opt_raw": [],
        }
        disc["turmas"].append(turma)
        absorb(cells)

    def absorb(cells):
        if not turma:
            return
        turma["_prio_raw"] += cells.get("prioridade", [])
        turma["_hor_raw"]  += cells.get("horario", [])
        turma["_prof_raw"] += cells.get("professor", [])
        turma["_opt_raw"]  += cells.get("optativa", [])
        # reserva pode quebrar linha ("Sem" / "Reserva")
        if cells.get("reserva") and turma["reserva"] and cells["reserva"][0] != turma["reserva"]:
            extra = " ".join(cells["reserva"])
            if extra not in turma["reserva"]:
                turma["reserva"] = (turma["reserva"] + " " + extra).strip()

    with pdfplumber.open(PDF) as pdf:
        for page in pdf.pages:
            words = [w for w in page.extract_words()
                     if w["top"] > 25 and not w["text"].startswith("http")
                     and not re.match(r"^\d+/\d+$", w["text"])]
            for top, ws in group_rows(words):
                ws.sort(key=lambda w: w["x0"])
                line = " ".join(w["text"] for w in ws)
                # lixo de cabeçalho de tabela / avisos / rodapé
                if ("TurmaEnquadramento" in line or "TotalCalouros" in line
                        or "alteração)Equivalências)" in line or "alterao)Equivalncias)" in line
                        or line.startswith("Turmas Abertas") or "Semestre de" in line
                        or line.startswith("Disciplinas da Matriz") or line.startswith("Imprimir")
                        or line.startswith("Pesquisar") or "Arquivo gerado" in line
                        or "Tipos de Reserva" in line or line.startswith("A turma do tipo")
                        or "coeficiente de" in line or "rendimento" in line
                        or "matriz curricular" in line or "prioridade e" in line
                        or "na ordem de" in line or "disciplina na" in line
                        or "Horários marcados" in line or line == "SIST DE INFORMAÇÃO"):
                    continue
                first = ws[0]
                # header de disciplina? começa na coluna 1 com CODIGO - ... ou continuação do header
                if header_buf:
                    header_buf.append(line)
                    if line.rstrip().endswith(")"):
                        flush_header()
                    continue
                if (first["x0"] < 70 and RE_COD_DISC.match(first["text"])
                        and len(ws) > 1 and ws[1]["text"] == "-"
                        and not RE_TURMA.match(first["text"])
                        or (first["x0"] < 70 and RE_COD_DISC.match(first["text"])
                            and "Aulas" in line)):
                    # inicio de header (pode terminar nesta linha ou não)
                    header_buf.append(line)
                    if line.rstrip().endswith(")") and "Aulas" in line and "extensionistas)" in line:
                        flush_header()
                    continue
                # linha de dados
                cells = {}
                for w in ws:
                    c = col_of(w["x0"])
                    if c:
                        cells.setdefault(c, []).append(w["text"])
                if disc is None:
                    continue
                if cells.get("turma") and RE_TURMA.match(cells["turma"][0]):
                    new_turma(cells)
                else:
                    absorb(cells)

    # pós-processamento dos campos crus
    for d in disciplinas:
        for t in d["turmas"]:
            # prioridades: tokens tipo "1 - Eng De Computação 2 - Sist De Informação".
            # Dígito só inicia prioridade se o próximo token for "-" (nomes de curso
            # podem terminar em dígito, ex.: "Lic Fisica 9").
            toks = t.pop("_prio_raw")
            prio, cur = [], None
            for i, tok in enumerate(toks):
                nxt = toks[i + 1] if i + 1 < len(toks) else None
                if re.match(r"^\d+$", tok) and nxt == "-":
                    cur = {"ordem": int(tok), "curso": ""}
                    prio.append(cur)
                elif tok == "-" and cur is not None and not cur["curso"]:
                    continue
                elif cur is not None:
                    cur["curso"] = (cur["curso"] + " " + tok).strip()
            t["prioridade_cursos"] = prio
            # horários
            hors = []
            for tok in t.pop("_hor_raw"):
                if tok in ("-",):
                    continue
                m = RE_HORARIO.match(tok)
                if m:
                    hors.append({
                        "dia": int(m.group(1)), "turno": m.group(2), "aula": int(m.group(3)),
                        "sala": m.group(5) or None,
                        "sede": {"": "Centro", "*": "Ecoville", "**": "Neoville"}[m.group(4) or ""],
                    })
                else:
                    # salas soltas em linha própria: "(*EL-208)" coladas ao horário anterior
                    m2 = re.match(r"^\((\*{0,2})([A-Z]{1,2}-?[A-Z0-9]*)\)$", tok)
                    if m2 and hors and hors[-1]["sala"] is None:
                        hors[-1]["sala"] = m2.group(2)
                        hors[-1]["sede"] = {"": "Centro", "*": "Ecoville", "**": "Neoville"}[m2.group(1)]
                    elif tok:
                        t.setdefault("_hor_lixo", []).append(tok)
            t["horarios"] = hors
            # professor: string única (separação de múltiplos nomes fica para v2);
            # tokens "Matriz:NNN" na fronteira da coluna pertencem à coluna optativa
            prof_toks, leaked = [], []
            for tok in t.pop("_prof_raw"):
                clean = re.sub(r"Matriz:\d+", lambda mm: (leaked.append(mm.group(0)), "")[1], tok)
                # "Não" da coluna Optativa pode colar no fim do nome (gap < tolerância)
                clean = re.sub(r"(?<=[a-zà-úA-ZÀ-Ú])Não$", "", clean)
                if clean:
                    prof_toks.append(clean)
            t["professores_raw"] = " ".join(prof_toks)
            # optativa
            opt = [x for x in t.pop("_opt_raw") if x] + leaked
            joined = " ".join(opt)
            t["optativa_matrizes"] = re.findall(r"Matriz:(\d+)", joined)
            t["optativa"] = bool(t["optativa_matrizes"])

    return disciplinas

if __name__ == "__main__":
    ds = parse()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"curso": "SIST DE INFORMAÇÃO", "semestre": SEM,
                   "fonte": "Turmas Abertas - Portal do Aluno", "disciplinas": ds},
                  f, ensure_ascii=False, indent=1)
    nt = sum(len(d["turmas"]) for d in ds)
    nh = sum(len(t["horarios"]) for d in ds for t in d["turmas"])
    print(f"disciplinas: {len(ds)}  turmas: {nt}  horarios: {nh}")
    print("salvo em", OUT)
