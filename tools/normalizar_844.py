"""Normaliza a matriz 844 (Eng. Comp.) para o schema canônico que o app consome.

Substitui o antigo `reconciliar_844.py`, que invertia a identidade das
disciplinas. A regra correta, confirmada no Histórico Escolar do aluno:

    5 | CSR31 | Comunicação De Dados | ... | Crédito Consignado
          Hermes Irineu Del Monego [disciplina ELET30 - Cursou Equivalente(s)]

O código da MATRIZ (`CSR31`) é a identidade curricular — é por ele que o
histórico registra a disciplina e que se calcula progresso. O código das Turmas
Abertas (`ELET30`) é a disciplina EQUIVALENTE em que o aluno se matriculou. É
exatamente o papel que o campo `equivalentes` já tem na matriz 981, então o
mesmo modelo serve para os dois cursos.

Entradas:
  - matriz-844-ppc.json  estrutura crua da Figura 5 (tools/parse_matriz_844.py)
  - turmas/*.json        ofertas, para descobrir os equivalentes por nome

Saída: matriz-844.json no formato de `Matriz` (src/domain/tipos.ts).

O catálogo de trilhas vem de `conjuntos-844.json`, extraído da seção "Resumo
Optativas" do Histórico Escolar por `tools/extrair_conjuntos_844.py` — a Figura 6
do PPC não serve, porque lista as trilhas só por nome, sem código nem
identificador de conjunto.

LIMITE QUE PERMANECE: sabemos quais trilhas existem e quanto cada uma exige, mas
não quais disciplinas compõem cada trilha. O histórico só associa disciplina a
trilha para as que o aluno cursou. A composição completa exigiria outra fonte.

Uso:
    python tools/normalizar_844.py <matriz_ppc.json> <conjuntos.json> <saida.json> <turmas1.json> [turmas2.json ...]
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata

# Exigências curriculares declaradas no PPC (versão 3, matriz 844).
# "Cada estudante deve completar 360 h à sua escolha, entre Optativas em
#  Trilhas, Optativas Isoladas e Eletivas. Ao menos 270 h deve ser realizada
#  dentre [optativas] ... 90 h deve ser obtido em disciplinas Eletivas"
CH_OPTATIVAS = 270
CH_ELETIVAS = 90
# "cada estudante deve selecionar ao menos duas Trilhas em Engenharia de
#  Computação" / "carga horária mínima para se completar uma Trilha é 90 h"
TRILHAS_EXIGIDAS = 2
CH_POR_TRILHA = 90

# Marcadores da Figura 5 que não são disciplina cursável em turma.
NAO_CURSAVEIS = {"CSX50", "CSX51"}

# A Figura 5 traz, na sub-coluna numérica, o TOTAL DE HORAS-AULA (TA), não a
# carga horária em horas de 60 min. A hora-aula do curso é de 50 min, então
# CH = TA * 5/6. Conferido contra a tabela de equivalências do PPC (p.50), que
# publica as duas colunas lado a lado:
#     ES70R  30h -> TA 36     CSD20  45h -> TA  54
#     CSF13  90h -> TA 108    MA71A  90h -> TA 108
# Sem essa conversão a matriz fica 20% inflada (3456 em vez de 2880).
HORA_AULA_EM_HORAS = 5 / 6


def ta_para_horas(ta: int | None) -> int:
    """Converte total de horas-aula da figura em carga horária de 60 min."""
    if not ta:
        return 0
    return round(ta * HORA_AULA_EM_HORAS)


def normalizar_nome(nome: str) -> str:
    """Nome comparável: sem acento, sem pontuação, minúsculo."""
    s = unicodedata.normalize("NFD", nome)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())


# Equivalências que o nome sozinho não resolve, conferidas contra a oferta.
# Chave = código do PPC; valor = código na oferta.
EQUIVALENCIAS_MANUAIS: dict[str, str] = {
    "CSF20": "ICSF20",  # a figura escreve "Estrutura", o Portal "Estruturas"
    "CSF30": "ICSF30",
    "EEX11": "ELEX10",  # a figura abrevia o título que o Portal escreve por extenso
    "FI71S": "FIS7F1",  # a figura numera a série de Física por letra, o Portal por ordinal
    "FI72S": "FIS7F2",
    "FI73S": "FIS7F3",
    "FI74S": "FIS7F4",
}


def main() -> int:
    if len(sys.argv) < 5:
        print(__doc__)
        return 1
    ppc_path, conjuntos_path, saida_path = sys.argv[1], sys.argv[2], sys.argv[3]
    turmas_paths = sys.argv[4:]

    with open(ppc_path, encoding="utf-8") as f:
        ppc = json.load(f)
    with open(conjuntos_path, encoding="utf-8") as f:
        catalogo = json.load(f)["conjuntos"]

    ofertas = []
    for caminho in turmas_paths:
        with open(caminho, encoding="utf-8") as f:
            ofertas.append(json.load(f))

    # nome normalizado -> código da oferta (primeira ocorrência vence)
    por_nome: dict[str, str] = {}
    for oferta in ofertas:
        for d in oferta["disciplinas"]:
            por_nome.setdefault(normalizar_nome(d["nome"]), d["codigo"])

    disciplinas = []
    sem_equivalente = []
    for d in ppc["disciplinas"]:
        codigo = d["codigo"]  # identidade curricular: fica como está
        equivalente = EQUIVALENCIAS_MANUAIS.get(codigo) or por_nome.get(
            normalizar_nome(d["nome"])
        )

        ch = ta_para_horas(d["horas"]["total"])

        equivalentes = []
        if equivalente and equivalente != codigo:
            equivalentes.append({"codigo": equivalente, "cht": ch, "grupo": "oferta"})
        elif codigo not in NAO_CURSAVEIS:
            sem_equivalente.append({"codigo": codigo, "nome": d["nome"]})

        aulas = d.get("aulas_semanais") or {}
        teoricas = aulas.get("teoricas")
        praticas = aulas.get("praticas")

        disciplinas.append(
            {
                "codigo": codigo,
                "nome": d["nome"],
                "periodo": d["periodo"],
                # obrigatórias da matriz: mesma convenção da 981
                "conjunto": None,
                "modelo": {"B": "Formação Básica", "P": "Formação Profissional", "PE": "Formação Específica"}.get(
                    d.get("natureza") or "", "Formação Profissional"
                ),
                "aulas_semanais": {
                    "teoricas": teoricas or 0,
                    "praticas": praticas or 0,
                    "total": (teoricas or 0) + (praticas or 0),
                    "aps": 0,
                    "apcc": 0,
                },
                "horas": {
                    "ad": 0,
                    "chext": 0,
                    "chead": 0,
                    "total": ch,
                },
                # total de horas-aula como a figura publica, para rastreabilidade
                "horas_aula_figura": d["horas"]["total"],
                "prerequisitos": d["prerequisitos"],
                "equivalentes": equivalentes,
                # rastreabilidade da extração
                "coord_figura": d.get("coord"),
                "natureza": d.get("natureza"),
            }
        )

    ch_obrigatorias = sum(
        x["horas"]["total"] for x in disciplinas if x["codigo"] not in NAO_CURSAVEIS
    )

    saida = {
        "matriz": 844,
        "curso": "ENGENHARIA DE COMPUTAÇÃO",
        "campus": "Curitiba",
        "fonte": (
            "Estrutura e códigos: Figura 5 do PPC (versão 3, matriz 844). "
            "Equivalentes de matrícula: oferta de "
            + ", ".join(o.get("semestre", "?") for o in ofertas)
            + "."
        ),
        "observacao_fonte": (
            "O código da matriz é a identidade curricular (aparece no Histórico "
            "Escolar); o código da oferta entra como equivalente de matrícula. "
            "A composição das trilhas não consta: a Figura 6 do PPC lista as "
            "disciplinas de cada trilha apenas por nome, sem código."
        ),
        "cargas": {
            "obrigatorias": ch_obrigatorias,
            "optativas": CH_OPTATIVAS,
            "eletiva": CH_ELETIVAS,
            "extensao": 0,
            "soma": ch_obrigatorias + CH_OPTATIVAS + CH_ELETIVAS,
            "ch_total_ppc": ch_obrigatorias + CH_OPTATIVAS + CH_ELETIVAS,
        },
        # Catálogo oficial de conjuntos, vindo do Resumo Optativas do histórico.
        # O agregador (959) carrega a exigência total; os demais são as trilhas
        # e as optativas isoladas, de 90h cada.
        "conjuntos": {
            ident: {
                "nome": c["nome"],
                "ch": c["ch"],
                "periodo_inicial": c["periodo_inicial"],
                "periodo_final": c["periodo_final"],
                "ch_semanal": c["ch_semanal"],
                "agregador": c["agregador"],
            }
            for ident, c in sorted(catalogo.items())
        },
        # O PPC exige duas trilhas completas; o próprio histórico confirma, ao
        # dizer que a carga restante é recalculada "quando 2 das subáreas
        # for(em) validada(s)".
        "regra_optativas": {
            "conjunto_agregador": next(
                (k for k, c in catalogo.items() if c["agregador"]), None
            ),
            "ch_total": CH_OPTATIVAS,
            "trilhas_exigidas": TRILHAS_EXIGIDAS,
            "ch_por_trilha": CH_POR_TRILHA,
        },
        "eletiva": {
            "ch": CH_ELETIVAS,
            "periodo_inicial": 7,
            "periodo_final": 10,
            "prereq_periodo": 7,
        },
        "disciplinas": disciplinas,
        "_sem_equivalente_na_oferta": sem_equivalente,
    }

    with open(saida_path, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)

    com_eq = sum(1 for d in disciplinas if d["equivalentes"])
    print(
        f"{len(disciplinas)} disciplinas | {com_eq} com equivalente na oferta | "
        f"{len(sem_equivalente)} sem -> {saida_path}",
        file=sys.stderr,
    )
    for d in sem_equivalente:
        print(f"  sem equivalente: {d['codigo']} {d['nome']}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
