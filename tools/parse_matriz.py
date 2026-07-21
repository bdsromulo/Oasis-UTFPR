# -*- coding: utf-8 -*-
"""Parser da "Consulta Curso e Matriz Curricular" (Portal do Aluno UTFPR) -> data/matriz-981.json

Fonte: PDF salvo da consulta (paisagem). Extração posicional por coordenadas de
palavras; cada disciplina termina no link "Turmas", usado como delimitador de bloco.

Uso: python tools/parse_matriz.py "caminho/Lista de Matérias Matriz Curricular.pdf" [saida.json]
"""
import pdfplumber, re, json, sys, os, unicodedata

PDF = sys.argv[1] if len(sys.argv) > 1 else r"I:\Meu Drive\Oásis UTFPR\Lista de Matérias Matriz Curricular.pdf"
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "matriz-981.json")

# fronteiras de coluna (x0) medidas no PDF (A4 paisagem, 841.92 x 1191.12)
COLS = [
    ("periodo",   30,  69),
    ("opt",       69, 102.5),
    ("codigo",   102.5, 141),
    ("nome",     141, 242),
    ("modelo",   242, 300),
    ("teoricas", 300, 350),
    ("praticas", 350, 397),
    ("total",    397, 440),
    ("aps",      440, 470),
    ("apcc",     470, 500),
    ("ad",       500, 530),
    ("chext",    530, 565),
    ("chead",    565, 605),
    ("ch",       605, 645),
    ("prereq",   645, 711),
    ("eq_disc",  711, 761),
    ("eq_cht",   761, 784),
    ("eq_grupo", 784, 842),
]
NUM_COLS = ("teoricas", "praticas", "total", "aps", "apcc", "ad", "chext", "chead", "ch")
RE_COD = re.compile(r"^[A-Z0-9]{4,7}$")

# palavras que só ocorrem nas linhas de cabeçalho/moldura da página
HEADER_MARKS = ("teóricas", "práticas", "requisito(s)", "Equivalentes", "APCC",
                "Consulta", "Câmpus:", "Curso(s):", "Versão", "primir", "(CHEAD)",
                "Curricular", "Grupo")

# Deslocamento horizontal do documento em relação às fronteiras medidas acima.
# O PDF da matriz de Eng. Comp. tem o mesmo layout do de BSI, porém deslocado
# ~2pt — o bastante para o código da disciplina cair na coluna [OPT] e o parser
# não achar disciplina nenhuma. Em vez de duplicar COLS por curso, calibramos
# pelo âncora "Turmas", que aparece sob a coluna de código em todos eles.
X_TURMAS_REFERENCIA = 102.9
_offset = 0.0


def calibrar(paginas) -> float:
    """Mede o deslocamento do documento pela posição do âncora 'Turmas'."""
    xs = [
        w["x0"]
        for pagina in paginas
        for w in pagina.extract_words()
        if w["text"] == "Turmas"
    ]
    if not xs:
        return 0.0
    # moda arredondada: robusta a uma ocorrência fora de lugar
    from collections import Counter
    modal = Counter(round(x, 1) for x in xs).most_common(1)[0][0]
    return modal - X_TURMAS_REFERENCIA


def col_of(x):
    x -= _offset
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
    return [sorted(ws, key=lambda w: w["x0"]) for _, ws in rows]

def parse():
    global _offset
    blocks, buf, footer_lines, in_footer = [], [], [], False
    with pdfplumber.open(PDF) as pdf:
        _offset = calibrar(pdf.pages)
        cabecalho_texto = pdf.pages[0].extract_text() or ""
        if abs(_offset) > 0.05:
            print(f"calibração: documento deslocado {_offset:+.1f}pt", file=sys.stderr)
        for page in pdf.pages:
            for ws in group_rows(page.extract_words()):
                line = " ".join(w["text"] for w in ws)
                if re.match(r"^\d{2}/\d{2}/\d{2}", ws[0]["text"]) or ws[0]["text"].startswith("http"):
                    continue
                if line.startswith("CÂMPUS:"):
                    in_footer = True
                if in_footer:
                    footer_lines.append(line)
                    continue
                if any(m in line for m in HEADER_MARKS):
                    continue
                buf.append(ws)
                # "Turmas" na coluna código encerra o bloco da disciplina
                if any(w["text"] == "Turmas" and col_of(w["x0"]) == "codigo" for w in ws):
                    blocks.append(buf)
                    buf = []

    disciplinas = []
    for blk in blocks:
        cells = {}   # coluna -> lista de tokens (ordem de leitura)
        eq_lines = []
        for ws in blk:
            eq_line = {}
            for w in ws:
                c = col_of(w["x0"])
                if not c:
                    continue
                if c.startswith("eq_"):
                    eq_line.setdefault(c, []).append(w["text"])
                cells.setdefault(c, []).append(w["text"])
            if eq_line:
                eq_lines.append(eq_line)

        cod_toks = [t for t in cells.get("codigo", []) if t != "Turmas"]
        if not cod_toks:
            continue
        codigo = "".join(cod_toks)
        nums = {}
        for c in NUM_COLS:
            vals = [t for t in cells.get(c, []) if re.match(r"^\d+$", t)]
            nums[c] = int(vals[0]) if vals else 0
        prereqs = [t for t in cells.get("prereq", [])
                   if RE_COD.match(t) or re.match(r"^Período:\d$", t)]
        equivalentes = []
        for el in eq_lines:
            codes = [t for t in el.get("eq_disc", []) if RE_COD.match(t)]
            chts  = [t for t in el.get("eq_cht", []) if re.match(r"^\d+$", t)]
            grupo = " ".join(el.get("eq_grupo", [])) or None
            for i, c in enumerate(codes):
                equivalentes.append({"codigo": c,
                                     "cht": int(chts[i]) if i < len(chts) else None,
                                     "grupo": grupo})
        opt = None
        m = re.search(r"\[(\d{3,4})\]", " ".join(cells.get("opt", [])))
        if m:
            opt = int(m.group(1))
        per_vals = [t for t in cells.get("periodo", []) if re.match(r"^\d$", t)]
        disciplinas.append({
            "codigo": codigo,
            "nome": " ".join(cells.get("nome", [])).title(),
            "periodo": int(per_vals[0]) if per_vals else None,
            "conjunto": opt,   # null = obrigatória do 1º estrato
            "modelo": " ".join(cells.get("modelo", [])).title(),
            "aulas_semanais": {"teoricas": nums["teoricas"], "praticas": nums["praticas"],
                               "total": nums["total"], "aps": nums["aps"], "apcc": nums["apcc"]},
            "horas": {"ad": nums["ad"], "chext": nums["chext"], "chead": nums["chead"],
                      "total": nums["ch"]},
            "prerequisitos": prereqs,
            "equivalentes": equivalentes,
        })

    # ---- rodapé: totais oficiais + legenda dos conjuntos ----
    foot = "\n".join(footer_lines)
    def fnum(key):
        m = re.search(r"(?<![A-Z])" + key + r":?\s*(\d+)", foot)
        return int(m.group(1)) if m else None
    cargas = {
        "obrigatorias": fnum("CHTOBRIGATORIASMATRIZ"),
        "optativas": fnum("CHTOPTATIVASMATRIZ"),
        "extensao": fnum("CHEXTENSAO"),
        "eletiva": fnum("CHELETIVA"),
        "soma": fnum("SOMACH"),
        "soma_sem_ext": fnum("SOMACHSEMEXT"),
        "chext_disc_obrigatorias": fnum("CHEXT_DISCOBRIGATORIAS"),
        "chext_disc_optativas": fnum("CHEXT_DISCOPTATIVAS"),
        "ch_total_ppc": fnum("CHTOTALPPC"),
    }
    conjuntos = {}
    for m in re.finditer(r"\[(\d{3,4})\]\s*(.+?)\s*-\s*Créditos:.*?(?:Período inicial/final:\s*(\d+)/(\d+).*?)?Carga [Hh]orária:?\s*0*(\d+)(?:-\s*Carga horária semanal:\s*(\d+))?", foot):
        conjuntos[m.group(1)] = {
            "nome": m.group(2).strip(),
            # Trilha não declara período na legenda; herda do conjunto
            # agregador que a precede (BSI: 1160 = 04/08; Eng. Comp.: 959 =
            # 08/10). Ver ajuste logo abaixo do laço.
            "periodo_inicial": int(m.group(3)) if m.group(3) else None,
            "periodo_final": int(m.group(4)) if m.group(4) else None,
            "ch": int(m.group(5)),
            "ch_semanal": int(m.group(6)) if m.group(6) else None,
        }
    # A legenda declara período para os conjuntos agregadores, mas não para as
    # trilhas — que herdam o do agregador ao qual pertencem. Identificamos o
    # agregador pelo NOME, não pela ordem numérica: em BSI o 1161 (Humanidades,
    # 03/06) fica entre o 1160 (Trilhas, 04/08) e as trilhas 1162+, então
    # "o anterior" daria o período errado.
    #   BSI:        1160 "Terceiro Estrato - Trilhas Em Computação"  -> 04/08
    #   Eng. Comp.:  959 "Optativas"                                 -> 08/10
    agregador = None
    for c in conjuntos.values():
        if c["periodo_inicial"] is None:
            continue
        nome = c["nome"].lower()
        if "trilha" in nome:
            agregador = c  # o mais específico vence
            break
        if "optativa" in nome and agregador is None:
            agregador = c
    padrao = (agregador["periodo_inicial"], agregador["periodo_final"]) if agregador else (4, 8)
    for c in conjuntos.values():
        if c["periodo_inicial"] is None:
            c["periodo_inicial"], c["periodo_final"] = padrao

    m = re.search(r"Eletiva - Carga horária total:\s*(\d+).*?Período inicial/final:\s*(\d+)/(\d+).*?Pré-Requisito \(Período Inicial\):\s*(\d+)", foot)
    eletiva = ({"ch": int(m.group(1)), "periodo_inicial": int(m.group(2)),
                "periodo_final": int(m.group(3)), "prereq_periodo": int(m.group(4))} if m else None)

    # cabeçalho: "Curso(s): Eng De Computação (212)" / "Matriz: 844 - ..."
    cab = cabecalho_texto
    mm = re.search(r"Matriz:\s*(\d+)", cab)
    mc = re.search(r"Curso\(s\):\s*(.+)", cab)
    mcamp = re.search(r"C[âa]mpus:\s*(.+)", cab)

    return {
        "matriz": int(mm.group(1)) if mm else 981,
        "curso": (mc.group(1).strip().upper() if mc else "BACHARELADO EM SISTEMAS DE INFORMAÇÃO (236)"),
        "campus": (mcamp.group(1).strip() if mcamp else "Curitiba"),
        "fonte": "Consulta Curso e Matriz Curricular - Portal do Aluno UTFPR",
        "cargas": cargas,
        "conjuntos": conjuntos,
        "eletiva": eletiva,
        "disciplinas": disciplinas,
    }

if __name__ == "__main__":
    data = parse()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"disciplinas: {len(data['disciplinas'])} | conjuntos: {len(data['conjuntos'])}")
    print("cargas:", data["cargas"])
    print("salvo em", os.path.abspath(OUT))
