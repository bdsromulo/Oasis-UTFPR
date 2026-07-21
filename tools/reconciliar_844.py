"""Reconcilia a estrutura da matriz 844 (PPC) com os códigos reais do Portal.

!!! DEFEITO CONHECIDO — NÃO USE A SAÍDA DESTE SCRIPT COMO ESTÁ !!!

Este script inverte a identidade das disciplinas. Ele assume que o código do
Portal (Turmas Abertas) é a identidade curricular e reescreve o código do PPC
para ele. O Histórico Escolar do aluno de Eng. Comp. mostra que é o contrário:

    5 | CSR31 | Comunicação De Dados | ... | Crédito Consignado
          Hermes Irineu Del Monego [disciplina ELET30 - Cursou Equivalente(s)]

O código da MATRIZ (CSR31) é a identidade curricular — é ele que aparece no
histórico e é por ele que se calcula progresso. O código das Turmas Abertas
(ELET30) é a disciplina EQUIVALENTE em que o aluno se matriculou de fato.

Correção pendente: manter `codigo` = código do PPC e mover o código do Portal
para uma lista `equivalentes`, como a matriz 981 já modela. Enquanto isso não
for feito, a saída não casa com o histórico e não deve alimentar nenhuma tela.


ANOMALIA DA FONTE (auditada em 2026-07):
A Figura 5 do PPC de Eng. de Computação identifica as disciplinas por um código
interno do projeto pedagógico (CSD20, MA71A, EEQ31...) que **não é** o código
usado pelo Portal do Aluno nem pelo PDF de Turmas Abertas (ICSD20, MAT7C1,
ELEQ30...). Dos 58 códigos da figura, apenas 2 coincidem com os do Portal.

O que casa é o **nome** da disciplina: 44 dos 58 batem por nome normalizado.
Portanto:

  - a FIGURA é a fonte da estrutura  -> período, pré-requisitos, carga horária;
  - o PORTAL é a fonte da identidade -> código com que o aluno se matricula.

Este script cruza os dois e emite a matriz final já com o código do Portal,
preservando o código do PPC em `codigo_ppc` para rastreabilidade. Disciplina que
não casa por nome fica com o código do PPC e `codigo_confirmado: false` — é o
sinal para auditoria manual, nunca um palpite.

Aceita vários arquivos de turmas: quanto mais semestres, mais disciplinas
conseguem um código do Portal (uma disciplina sem oferta num semestre pode ter
no outro).

Uso:
    python tools/reconciliar_844.py <matriz_ppc.json> <saida.json> <turmas1.json> [turmas2.json ...]
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata


def normalizar(nome: str) -> str:
    """Nome comparável: sem acento, sem pontuação, minúsculo."""
    s = unicodedata.normalize("NFD", nome)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())


# Equivalências que o nome sozinho não resolve, conferidas uma a uma contra o
# PDF de Turmas Abertas. Só entram aqui casos em que o Portal usa outro título
# para a mesma disciplina da figura.
EQUIVALENCIAS_MANUAIS: dict[str, str] = {
    # singular/plural: a figura escreve "Estrutura", o Portal "Estruturas"
    "CSF20": "ICSF20",  # Estrutura(s) de Dados 1
    "CSF30": "ICSF30",  # Estrutura(s) de Dados 2
    # a figura abrevia o título que o Portal escreve por extenso
    "EEX11": "ELEX10",  # Intr. a Prát. de Lab. em Eletric. e Eletrônica
    # a figura numera a série de Física por letra, o Portal por ordinal
    "FI71S": "FIS7F1",  # Física Teórica A -> 1
    "FI72S": "FIS7F2",  # Física Teórica B -> 2
    "FI73S": "FIS7F3",  # Física Teórica C -> 3
    "FI74S": "FIS7F4",  # Física Teórica D -> 4
    # Deliberadamente FORA daqui, por não haver equivalência inequívoca:
    #   MA71B  a figura traz "Geometria Analítica e Álgebra Linear" (108h) num
    #          bloco só; o Portal oferta as duas separadas (MAT7GA + MAT7AL).
    #   MA70H  "Probabilidade e Estatística" x "Probabilidade e Estatística
    #          Aplicada" (ELB31) — títulos próximos, equivalência não confirmada.
    #   MA73A, QB70C, GE70D  sem oferta no semestre lido, nada com que casar.
}


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 1
    ppc_path, saida_path = sys.argv[1], sys.argv[2]
    turmas_paths = sys.argv[3:]

    with open(ppc_path, encoding="utf-8") as f:
        ppc = json.load(f)

    ofertas = []
    for caminho in turmas_paths:
        with open(caminho, encoding="utf-8") as f:
            ofertas.append(json.load(f))

    por_nome: dict[str, str] = {}
    nomes_portal: dict[str, str] = {}
    for oferta in ofertas:
        for d in oferta["disciplinas"]:
            por_nome.setdefault(normalizar(d["nome"]), d["codigo"])
            nomes_portal.setdefault(d["codigo"], d["nome"])

    mapa: dict[str, str] = {}
    for d in ppc["disciplinas"]:
        alvo = EQUIVALENCIAS_MANUAIS.get(d["codigo"]) or por_nome.get(normalizar(d["nome"]))
        if alvo:
            mapa[d["codigo"]] = alvo

    disciplinas = []
    sem_codigo_portal = []
    for d in ppc["disciplinas"]:
        portal = mapa.get(d["codigo"])
        confirmado = portal is not None
        if not confirmado:
            sem_codigo_portal.append({"codigo_ppc": d["codigo"], "nome": d["nome"]})
        disciplinas.append(
            {
                "codigo": portal or d["codigo"],
                "codigo_ppc": d["codigo"],
                "codigo_confirmado": confirmado,
                # o Portal é a fonte do título quando ele existe
                "nome": nomes_portal.get(portal, d["nome"]),
                "periodo": d["periodo"],
                "coord": d["coord"],
                "natureza": d["natureza"],
                "aulas_semanais": d["aulas_semanais"],
                "horas": d["horas"],
                # pré-requisitos também passam para o código do Portal
                "prerequisitos": [mapa.get(p, p) for p in d["prerequisitos"]],
                "prerequisitos_ppc": d["prerequisitos"],
            }
        )

    saida = {
        "matriz": 844,
        "curso": "ENGENHARIA DE COMPUTAÇÃO",
        "campus": "Curitiba",
        "fonte": (
            "Estrutura: Figura 5 do PPC (versão 3, matriz 844). "
            "Códigos e títulos: oferta de turmas de "
            + ", ".join(o.get("semestre", "?") for o in ofertas)
            + "."
        ),
        "observacao_fonte": (
            "Os códigos da Figura 5 do PPC são internos e divergem dos códigos do "
            "Portal; a reconciliação é feita por nome de disciplina."
        ),
        "disciplinas": disciplinas,
        "_sem_codigo_portal": sem_codigo_portal,
    }

    with open(saida_path, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)

    total = len(disciplinas)
    ok = total - len(sem_codigo_portal)
    print(f"{ok}/{total} disciplinas com código do Portal -> {saida_path}", file=sys.stderr)
    for d in sem_codigo_portal:
        print(f"  sem correspondência: {d['codigo_ppc']} {d['nome']}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
