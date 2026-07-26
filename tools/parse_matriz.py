# -*- coding: utf-8 -*-
"""Parser da "Consulta Curso e Matriz Curricular" (Portal do Aluno UTFPR) -> data/matriz-981.json

Fonte: PDF salvo da consulta (paisagem). Extração posicional por coordenadas de
palavras; cada disciplina termina no link "Turmas", usado como delimitador de bloco.

Uso: python tools/parse_matriz.py "caminho/Lista de Matérias Matriz Curricular.pdf" [saida.json] [complemento.json]

O terceiro argumento é opcional e serve para conjuntos que a legenda da matriz
não declara, embora as disciplinas os citem. Acontece na 968: a legenda para em
"1226 Sistemas Iot", mas onze disciplinas apontam para 1227..1233 — subáreas que
só o Histórico Escolar oficial nomeia. O complemento entra como dado à parte,
com a própria procedência registrada, em vez de a fonte principal ser adulterada.
"""
import pdfplumber, re, json, sys, os, unicodedata

PDF = sys.argv[1] if len(sys.argv) > 1 else r"I:\Meu Drive\Oásis UTFPR\Lista de Matérias Matriz Curricular.pdf"
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "matriz-981.json")
COMPLEMENTO = sys.argv[3] if len(sys.argv) > 3 else None

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
                "Curricular", "Grupo",
                # "Matriz: 844 - Matriz 3 De Eng De Computação": o número da
                # matriz cai na faixa x das colunas numéricas e entrava como
                # aula/hora da primeira disciplina da página. O cabeçalho é lido
                # à parte, direto do texto da página 1.
                "Matriz:")

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

def so_equivalencia(ws):
    """A linha tem células apenas nas colunas de equivalência (Disciplina/CHT/Grupo)?"""
    cols = [col_of(w["x0"]) for w in ws]
    return bool(cols) and all(c and c.startswith("eq_") for c in cols)


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
                # Sobra de equivalência: quando a lista de equivalentes é mais
                # longa que o corpo da disciplina, as últimas linhas caem DEPOIS
                # do "Turmas" que fecha o bloco (e às vezes depois da moldura da
                # página). Elas só têm células nas colunas de equivalência —
                # devolvemos ao bloco anterior em vez de deixá-las abrir o bloco
                # da próxima disciplina, que era o que atribuía QBI7QE/QBI7QT
                # (de QB70C) à CSF30 e MA70Z/MAT7ED (de MA70G) à MA70H na 844.
                if not buf and blocks and so_equivalencia(ws):
                    blocks[-1].append(ws)
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

        raw_cod_toks = [t for t in cells.get("codigo", []) if t != "Turmas"]
        cod_toks = []
        nome_extra = []
        for t in raw_cod_toks:
            if not cod_toks and (RE_COD.match(t) or t.startswith("ENADE")):
                cod_toks.append(t)
            # ENADEC/ENADEI são os únicos códigos que a fonte quebra em duas
            # linhas dentro da própria coluna ("ENADE" + "C"/"I"). Sem juntá-los,
            # as duas linhas viram o mesmo código "ENADE": na 962 uma sobrescrevia
            # a outra, e a 968 nasceria com código duplicado. Qualquer outra sobra
            # na coluna do código é continuação do nome (em 962 caem ali
            # fragmentos como "EM", "DE", "DA"), daí a letra única e maiúscula.
            elif cod_toks == ["ENADE"] and re.fullmatch(r"[A-Z]", t):
                cod_toks.append(t)
            else:
                nome_extra.append(t)
        if not cod_toks:
            continue
        codigo = "".join(cod_toks)

        # Nome longo terminado em número transborda a coluna por um ponto e o
        # dígito cai em [modelo]: "TRABALHO DE CONCLUSÃO DE CURSO 1" e "... 2"
        # viravam duas disciplinas de nome idêntico, indistinguíveis na tela.
        # Nenhum modelo da fonte começa com dígito, então o dígito solto na
        # frente do modelo é sempre o fim do nome.
        modelo_toks = cells.get("modelo", [])
        sufixo_nome = []
        if modelo_toks and re.fullmatch(r"\d", modelo_toks[0]):
            sufixo_nome = [modelo_toks[0]]
            modelo_toks = modelo_toks[1:]

        nome_parts = nome_extra + cells.get("nome", []) + sufixo_nome
        nome_str = " ".join(nome_parts).title()

        # As colunas numéricas são lidas por faixa horizontal, e não por col_of,
        # porque o escalonamento do PDF varia e joga um dígito para a coluna
        # vizinha. A faixa sozinha, porém, também captura o cabeçalho da página
        # quando ele vem centralizado: na matriz 968 o "Matriz: 968 - Matriz 3"
        # cai no meio da faixa, e o 968 entrava como se fosse aula prática,
        # empurrando a fileira inteira e zerando a carga horária da primeira
        # disciplina de cada página. Por isso a leitura começa na fileira que
        # traz o próprio código da disciplina — antes dela só há moldura.
        linha_codigo = 0
        for i, ws in enumerate(blk):
            if any(w["text"] == cod_toks[0] and col_of(w["x0"]) == "codigo" for w in ws):
                linha_codigo = i
                break
        raw_nums = []
        for ws in blk[linha_codigo:]:
            for w in ws:
                if 310 <= w["x0"] <= 645 and re.match(r"^\d+$", w["text"]):
                    raw_nums.append((w["x0"], int(w["text"])))
        raw_nums.sort()
        nums = {}
        for i, c in enumerate(NUM_COLS):
            nums[c] = raw_nums[i][1] if i < len(raw_nums) else 0
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
        # Dois dígitos: os cursos de engenharia vão até o 10º período, e com um
        # dígito só toda disciplina do 10º saía com período nulo — some do
        # Catálogo, do Fluxograma e da projeção do Simulador. A leitura começa na
        # fileira do código pelo mesmo motivo das colunas numéricas.
        per_vals = [
            w["text"]
            for ws in blk[linha_codigo:]
            for w in ws
            if col_of(w["x0"]) == "periodo" and re.fullmatch(r"\d{1,2}", w["text"])
        ]
        disciplinas.append({
            "codigo": codigo,
            "nome": nome_str,
            "periodo": int(per_vals[0]) if per_vals else None,
            "conjunto": opt,   # null = obrigatória do 1º estrato
            "modelo": " ".join(modelo_toks).title(),
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
    # ---- legenda das optativas: conjuntos e o aninhamento entre eles ----
    #
    # A legenda declara "Período inicial/final" APENAS nos conjuntos de topo;
    # os subconjuntos vêm logo abaixo do respectivo pai, sem período. É essa a
    # única marca de hierarquia na fonte, e ela é o que separa um grupo de
    # escolha de uma subárea dele:
    #   BSI:            1160 Trilhas Em Computação -> 1162..1173
    #   Eng. Eletrônica 1174 Ciclo De Humanidades  -> 1213..1217
    #                   1180 Trilhas De Aprofund.  -> 1181..1186, 1226
    #                   1187 Opções De Circuitos   -> 1188, 1189
    # Sem o vínculo, cada subárea aparecia no app como se fosse uma trilha de
    # topo — em Eng. Eletrônica isso multiplicava por três a lista de trilhas.
    conjuntos = {}
    pai_atual = None
    for m in re.finditer(r"\[(\d{3,4})\]\s*(.+?)\s*-\s*Créditos:.*?(?:Período inicial/final:\s*(\d+)/(\d+).*?)?Carga [Hh]orária:?\s*0*(\d+)(?:-\s*Carga horária semanal:\s*(\d+))?", foot):
        cod, ehTopo = m.group(1), m.group(3) is not None
        conjuntos[cod] = {
            "nome": m.group(2).strip(),
            "pai": None if ehTopo else pai_atual,
            # subconjunto não declara período; herda o do pai (ajuste abaixo)
            "periodo_inicial": int(m.group(3)) if ehTopo else None,
            "periodo_final": int(m.group(4)) if ehTopo else None,
            "ch": int(m.group(5)),
            "ch_semanal": int(m.group(6)) if m.group(6) else None,
        }
        if ehTopo:
            pai_atual = cod

    def periodo_herdado(cod, visitados=()):
        """Período do primeiro ancestral que o declara."""
        c = conjuntos.get(cod)
        if c is None or cod in visitados:
            return None
        if c["periodo_inicial"] is not None:
            return (c["periodo_inicial"], c["periodo_final"])
        return periodo_herdado(c["pai"], visitados + (cod,))

    for cod, c in conjuntos.items():
        if c["periodo_inicial"] is None:
            c["periodo_inicial"], c["periodo_final"] = periodo_herdado(c["pai"]) or (4, 8)

    # Conjunto citado por disciplina que a legenda não declara é anomalia da
    # fonte, não do parser: na 968 as onze disciplinas de Sistemas IoT apontam
    # para 1227..1233, que só o Histórico Escolar nomeia. Denunciar alto — o
    # validador da matriz decide se aceita.
    citados = {str(d["conjunto"]) for d in disciplinas if d["conjunto"] is not None}
    if COMPLEMENTO:
        with open(COMPLEMENTO, encoding="utf-8") as f:
            extra = json.load(f)
        for cod, c in extra["conjuntos"].items():
            if cod in conjuntos:
                print(f"AVISO: complemento redeclara o conjunto {cod} da legenda", file=sys.stderr)
                continue
            conjuntos[cod] = {**c, "fonte": extra["fonte"]}
    orfaos = sorted(citados - set(conjuntos), key=int)
    if orfaos:
        print(
            "AVISO: conjuntos citados por disciplina e ausentes da legenda: "
            + ", ".join(orfaos),
            file=sys.stderr,
        )

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
