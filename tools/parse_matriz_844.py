"""Extrai a Matriz Curricular 844 (Eng. de Computação) do PPC do curso.

Diferente da BSI/981, o curso de Eng. Comp. não tem PDF de "Consulta Curso e
Matriz Curricular" disponível: a matriz vigente só existe como a **Figura 5** do
Projeto Pedagógico, que é uma tabela desenhada (10 colunas de período, uma célula
por disciplina). A leitura é posicional, como nos demais parsers do projeto.

Anatomia de uma célula, tomando `cx` = x do código e `cy` = y do código. A célula
se divide em duas sub-colunas:

    coluna principal, x em [cx-16, cx+30)
        cy-22 .. cy-11   nome da disciplina, quebrado em várias linhas
        cy               CÓDIGO da disciplina
        cy+6             natureza (B = básica, P = profissional, PE = específica)

    sub-coluna numérica, x em [cx+30, cx+46)
        cy-22            coordenada da célula na figura, ex. "3.2"
        cy-5             aulas teóricas/práticas, ex. "2/1"
        cy+6             carga horária em horas

    faixa de pré-requisitos, x em [cx-18, cx+20), y em cy+6
        coordenadas dos PRÉ-REQUISITOS desta célula. Quando há mais de um, eles
        se empilham na horizontal (o 1º em cx-11, o 2º em cx-0, e assim por
        diante), então não basta ler a calha à esquerda: é preciso varrer até
        antes da sub-coluna numérica.

A calha é a armadilha da figura: a coordenada do pré-requisito é desenhada onde a
seta entra na célula, ou seja, **à esquerda da disciplina que ela habilita** — e
não junto da disciplina que é pré-requisito. Ler essa coordenada como se
pertencesse à célula anterior inverte o sentido de toda a cadeia.

Os pré-requisitos aparecem como coordenadas de célula ("1.2"), não como códigos —
por isso o parser primeiro mapeia coordenada -> código e só depois resolve.

Uso:
    python tools/parse_matriz_844.py "<ppc>.pdf" data/matriz-844.json
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict

import fitz  # PyMuPDF

# Página da Figura 5 (1-indexada no PDF original do PPC versão 3)
PAGINA_FIGURA = 48

# Limites das sub-colunas, relativos ao x do código
X_CALHA_INI, X_CALHA_FIM = -18.0, 20.0
X_PRINCIPAL_INI, X_PRINCIPAL_FIM = -16.0, 30.0
X_NUMERICA_INI, X_NUMERICA_FIM = 30.0, 46.0

RE_CODIGO = re.compile(r"^[A-Z]{2}[A-Z0-9]{3}$")
RE_COORD = re.compile(r"^(\d{1,2})\.(\d{1,2})$")
RE_AULAS = re.compile(r"^(\d+)/(\d+)$")
RE_NATUREZA = re.compile(r"^(B|P|PE)$")

# Casam com RE_CODIGO mas são texto de cabeçalho/rodapé da figura, não disciplina
FALSOS_POSITIVOS = {"CURSO", "MATRIZ", "CARGA", "TOTAL", "UTFPR", "HORAS", "GERAL"}

# Células que a figura desenha fora do padrão: são faixas largas, sem carga na
# sub-coluna numérica, e acabam capturando o rótulo da célula vizinha. Nome vem
# do texto corrido do PPC; coordenada e pré-requisitos são descartados por não
# serem legíveis com confiança.
CELULAS_ESPECIAIS = {
    "CSX50": "Atividades Complementares",
    "CSX51": "Estágio Supervisionado",
}


def limpar(texto: str) -> str:
    """Normaliza espaços e corrige o mojibake de acentos do PDF."""
    return re.sub(r"\s+", " ", texto).strip()


def titulo(nome: str) -> str:
    """Title Case preservando preposições, como nos demais dados do projeto."""
    miudas = {"de", "da", "do", "das", "dos", "e", "em", "a", "o", "para", "à", "às"}
    partes = nome.lower().split()
    saida = []
    for i, p in enumerate(partes):
        saida.append(p if i > 0 and p in miudas else p.capitalize())
    return " ".join(saida)


def sem_acento(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def extrair_palavras(pdf: str) -> list[tuple[float, float, str]]:
    doc = fitz.open(pdf)
    pagina = doc[PAGINA_FIGURA - 1]
    return [(w[0], w[1], w[4]) for w in pagina.get_text("words")]


def descobrir_colunas(palavras) -> list[float]:
    """x de cada coluna de período, agrupado a partir dos códigos de disciplina."""
    xs = sorted(
        x for x, y, t in palavras if y > 100 and RE_CODIGO.fullmatch(t) and t not in FALSOS_POSITIVOS
    )
    colunas: list[float] = []
    for x in xs:
        if not colunas or x - colunas[-1] > 20:
            colunas.append(x)
        else:  # mesma coluna: mantém o menor x observado
            colunas[-1] = min(colunas[-1], x)
    return colunas


def parse(pdf: str) -> dict:
    palavras = extrair_palavras(pdf)
    colunas = descobrir_colunas(palavras)

    def coluna_de(x: float) -> int | None:
        for i, cx in enumerate(colunas):
            if cx - 2 <= x < cx + X_PRINCIPAL_FIM:
                return i
        return None

    # 1) localiza as células pelo código da disciplina
    celulas = []
    for x, y, t in palavras:
        if not RE_CODIGO.fullmatch(t) or t in FALSOS_POSITIVOS:
            continue
        if y < 100:  # cabeçalho da página
            continue
        col = coluna_de(x)
        if col is None:
            continue
        celulas.append({"x": x, "y": y, "codigo": t, "periodo": col + 1})

    # 2) preenche cada célula lendo cada sub-coluna na sua faixa vertical
    por_coord: dict[str, str] = {}
    for c in celulas:
        cx, cy = c["x"], c["y"]

        def bloco(dx0: float, dx1: float, dy0: float, dy1: float) -> list[str]:
            itens = [
                (x, y, t)
                for x, y, t in palavras
                if cx + dx0 <= x < cx + dx1 and cy + dy0 <= y <= cy + dy1
            ]
            return [t for x, y, t in sorted(itens, key=lambda i: (round(i[1], 1), i[0]))]

        principal = lambda dy0, dy1: bloco(X_PRINCIPAL_INI, X_PRINCIPAL_FIM, dy0, dy1)
        numerica = lambda dy0, dy1: bloco(X_NUMERICA_INI, X_NUMERICA_FIM, dy0, dy1)

        coord = next((t for t in numerica(-25, -19) if RE_COORD.fullmatch(t)), None)
        # em algumas células a coordenada foi desenhada dentro da coluna principal
        no_nome = principal(-26, -6.5)
        if coord is None:
            coord = next((t for t in no_nome if RE_COORD.fullmatch(t)), None)
        # dígitos soltos aqui fazem parte do nome ("Estrutura de Dados 1"); os
        # números de carga moram na sub-coluna numérica e já ficaram de fora
        nome_tokens = [t for t in no_nome if not RE_COORD.fullmatch(t)]
        aulas = next((t for t in numerica(-8, -3) if RE_AULAS.fullmatch(t)), None)
        ch = next((int(t) for t in numerica(4, 9) if t.isdigit()), None)
        natureza = next((t for t in principal(4, 9) if RE_NATUREZA.fullmatch(t)), None)
        # pré-requisitos DESTA célula (podem ser vários, empilhados na horizontal)
        prereq_coords = [
            t for t in bloco(X_CALHA_INI, X_CALHA_FIM, 4, 9) if RE_COORD.fullmatch(t)
        ]

        c["coord"] = coord
        c["nome"] = titulo(limpar(" ".join(nome_tokens)))
        c["natureza"] = natureza
        c["ch"] = ch
        c["prereq_coords"] = prereq_coords
        if aulas:
            m = RE_AULAS.fullmatch(aulas)
            c["aulas"] = {"teoricas": int(m.group(1)), "praticas": int(m.group(2))}
        else:
            c["aulas"] = {"teoricas": None, "praticas": None}

        if c["codigo"] in CELULAS_ESPECIAIS:
            c["nome"] = CELULAS_ESPECIAIS[c["codigo"]]
            c["coord"] = None
            c["prereq_coords"] = []
            coord = None

        # A coordenada é dado explícito da figura; a coluna é inferida do x. Quando
        # divergem (célula desenhada transbordando para a coluna vizinha), a
        # coordenada manda.
        if coord:
            periodo_coord = int(coord.split(".")[0])
            if 1 <= periodo_coord <= 10:
                c["periodo"] = periodo_coord
            por_coord[coord] = c["codigo"]

    # 3) resolve pré-requisitos de coordenada para código
    disciplinas = []
    nao_resolvidos = []
    for c in sorted(celulas, key=lambda c: (c["periodo"], c["y"])):
        prereqs = []
        for coord in c["prereq_coords"]:
            alvo = por_coord.get(coord)
            if alvo:
                prereqs.append(alvo)
            else:
                nao_resolvidos.append({"disciplina": c["codigo"], "coord": coord})
        disciplinas.append(
            {
                "codigo": c["codigo"],
                "nome": c["nome"],
                "periodo": c["periodo"],
                "coord": c["coord"],
                "natureza": c["natureza"],
                "aulas_semanais": c["aulas"],
                "horas": {"total": c["ch"]},
                "prerequisitos": prereqs,
            }
        )

    return {
        "matriz": 844,
        "curso": "ENGENHARIA DE COMPUTAÇÃO (212)",
        "campus": "Curitiba",
        "fonte": "Figura 5 do Projeto Pedagógico do Curso (PPC versão 3) — Matriz 844",
        "disciplinas": disciplinas,
        "_prereqs_nao_resolvidos": nao_resolvidos,
    }


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    dados = parse(sys.argv[1])
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=1)
    print(f"{len(dados['disciplinas'])} disciplinas -> {sys.argv[2]}", file=sys.stderr)
    if dados["_prereqs_nao_resolvidos"]:
        print(f"AVISO: {len(dados['_prereqs_nao_resolvidos'])} pré-requisitos não resolvidos", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
