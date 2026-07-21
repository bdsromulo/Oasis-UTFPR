"""Valida data/eng-comp/matriz-844.json. A importação só vale com 0 erros.

Regras aprendidas com a fonte (Figura 5 do PPC + Turmas Abertas do Portal):

E1. Todo código é único.
E2. Todo pré-requisito aponta para uma disciplina que existe na própria matriz.
E3. Pré-requisito sempre vem de um período ANTERIOR ao da disciplina. Numa
    matriz de 10 períodos com cadeia longa, um pré-requisito no mesmo período
    ou depois é sempre erro de leitura posicional, não característica do curso.
E4. Não há ciclo na cadeia de pré-requisitos.
E5. Período entre 1 e 10.
E6. Coordenada da figura ("P.L") é única e o P bate com o período da coluna.

E7. A carga horária vem da conversão TA * 5/6 (hora-aula de 50 min). Deve ser
    múltipla de 15 e coerente com o total de horas-aula da figura.

A1. Disciplina sem equivalente na oferta é AVISO, não erro: pode simplesmente
    não ter sido ofertada nos semestres lidos. Fica registrada para auditoria.
A2. Disciplina sem carga horária é AVISO: as células de Atividades
    Complementares e Estágio são desenhadas fora do padrão na figura.

Uso: python tools/validate_matriz_844.py [data/eng-comp/matriz-844.json]
"""

from __future__ import annotations

import json
import sys
from collections import Counter

CAMINHO_PADRAO = "data/eng-comp/matriz-844.json"


def validar(dados: dict) -> tuple[list[str], list[str]]:
    erros: list[str] = []
    avisos: list[str] = []
    disciplinas = dados["disciplinas"]
    por_codigo = {d["codigo"]: d for d in disciplinas}

    # E1
    for codigo, n in Counter(d["codigo"] for d in disciplinas).items():
        if n > 1:
            erros.append(f"E1: código repetido {codigo} ({n}x)")

    for d in disciplinas:
        # E5
        if not 1 <= d["periodo"] <= 10:
            erros.append(f"E5: {d['codigo']} com período {d['periodo']}")

        for p in d["prerequisitos"]:
            # E2
            if p not in por_codigo:
                erros.append(f"E2: pré-requisito {p} de {d['codigo']} não existe na matriz")
                continue
            # E3
            if por_codigo[p]["periodo"] >= d["periodo"]:
                erros.append(
                    f"E3: {d['codigo']} (P{d['periodo']}) depende de {p} "
                    f"(P{por_codigo[p]['periodo']}), que não é anterior"
                )

        # E7 — coerência da conversão de horas-aula para carga horária
        ta = d.get("horas_aula_figura")
        if ta:
            esperado = round(ta * 5 / 6)
            if d["horas"]["total"] != esperado:
                erros.append(
                    f"E7: {d['codigo']} tem {d['horas']['total']}h para {ta} horas-aula "
                    f"(esperado {esperado}h)"
                )

        # A1 / A2
        if not d.get("equivalentes"):
            avisos.append(f"A1: {d['codigo']} ({d['nome']}) sem equivalente na oferta")
        if not d["horas"].get("total"):
            avisos.append(f"A2: {d['codigo']} ({d['nome']}) sem carga horária")

    # E4 — ciclo
    estado: dict[str, int] = {}

    def visitar(codigo: str, caminho: list[str]) -> None:
        if estado.get(codigo) == 2:
            return
        if estado.get(codigo) == 1:
            erros.append(f"E4: ciclo de pré-requisitos: {' -> '.join(caminho + [codigo])}")
            return
        estado[codigo] = 1
        for p in por_codigo.get(codigo, {}).get("prerequisitos", []):
            if p in por_codigo:
                visitar(p, caminho + [codigo])
        estado[codigo] = 2

    for d in disciplinas:
        visitar(d["codigo"], [])

    # E6
    coords = [d["coord_figura"] for d in disciplinas if d.get("coord_figura")]
    for coord, n in Counter(coords).items():
        if n > 1:
            erros.append(f"E6: coordenada {coord} usada por {n} disciplinas")
    for d in disciplinas:
        if not d.get("coord_figura"):
            continue
        periodo_coord = int(str(d["coord_figura"]).split(".")[0])
        if periodo_coord != d["periodo"]:
            erros.append(
                f"E6: {d['codigo']} está na coluna do período {d['periodo']} "
                f"mas a coordenada da figura diz {d['coord_figura']}"
            )

    return erros, avisos


def main() -> int:
    caminho = sys.argv[1] if len(sys.argv) > 1 else CAMINHO_PADRAO
    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)

    erros, avisos = validar(dados)
    print(f"{len(dados['disciplinas'])} disciplinas · {len(erros)} erros · {len(avisos)} avisos")
    for e in erros:
        print(f"  ERRO   {e}")
    for a in avisos:
        print(f"  aviso  {a}")
    return 1 if erros else 0


if __name__ == "__main__":
    raise SystemExit(main())
