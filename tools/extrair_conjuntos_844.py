"""Extrai o catálogo de conjuntos (trilhas e optativas) da matriz 844.

POR QUE A FONTE É UM HISTÓRICO ESCOLAR
--------------------------------------
Eng. Comp. não tem PDF de "Consulta Curso e Matriz Curricular", que é de onde a
BSI tira seus conjuntos. A Figura 6 do PPC lista as trilhas apenas por nome, sem
código e sem os identificadores de conjunto. Já a seção "Resumo Optativas" do
Histórico Escolar traz o catálogo completo e oficial: identificador, nome,
período inicial e final, e a carga horária EXIGIDA de cada conjunto.

FRONTEIRA DE PRIVACIDADE — LEIA ANTES DE MEXER
-----------------------------------------------
O histórico é dado pessoal e NUNCA entra no repositório. Este script lê um PDF
que mora fora do repo e extrai **apenas metadado de curso**, que é idêntico para
qualquer aluno do mesmo currículo:

    extraído:     identificador, nome, período inicial/final, CH obrigatória
    NÃO extraído: CH cursada, CH validada, CH faltante, nome, RA, notas

As colunas de progresso são deliberadamente descartadas na leitura, e não apenas
omitidas na escrita — ver `COLUNAS_DESCARTADAS`. O progresso do aluno continua
sendo calculado em tempo de execução, no navegador, a partir do PDF dele.

Uso:
    python tools/extrair_conjuntos_844.py "<historico.pdf>" <saida.json>
"""

from __future__ import annotations

import json
import re
import sys

import fitz  # PyMuPDF

# Documenta o que é jogado fora na leitura. Estas colunas existem na tabela do
# histórico logo depois de "CH Obrigatória" e são específicas do aluno.
COLUNAS_DESCARTADAS = ("CH Cursada e Aprovada", "CH Faltante", "CH Validada")

# Linha de conjunto no Resumo Optativas. O "(*)" marca o conjunto agregador.
# Capturamos até a CH obrigatória e paramos: o que vem depois é do aluno.
RE_CONJUNTO = re.compile(
    r"\n(\d{3})(?:\s*\(\*\))?\s*\n"  # identificador
    r"([^\n]+)\n"                     # nome do conjunto
    r"(\d+)\n"                        # período inicial
    r"(\d+)\n"                        # período final
    r"(\d+)\n"                        # CHS
    r"(\d+)\n"                        # CH obrigatória  <- último campo de curso
)


def extrair(pdf: str) -> dict:
    doc = fitz.open(pdf)
    texto = "\n".join(doc[i].get_text() for i in range(doc.page_count))

    inicio = texto.find("Resumo Optativas")
    if inicio < 0:
        raise SystemExit("Seção 'Resumo Optativas' não encontrada neste histórico.")
    # o bloco termina quando começa a seção seguinte
    fim = texto.find("Resumo Eletiva", inicio)
    bloco = texto[inicio : fim if fim > 0 else inicio + 4000]

    vistos: dict[str, dict] = {}
    for m in RE_CONJUNTO.finditer(bloco):
        ident, nome, per_ini, per_fim, chs, ch_obrigatoria = m.groups()
        nome = re.sub(r"\s+", " ", nome).strip()
        if ident in vistos:
            continue
        vistos[ident] = {
            "nome": nome,
            "periodo_inicial": int(per_ini),
            "periodo_final": int(per_fim),
            "ch": int(ch_obrigatoria),
            "ch_semanal": int(chs) or None,
            "agregador": "(*)" in m.group(0),
        }

    return vistos


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    conjuntos = extrair(sys.argv[1])

    agregadores = {k: v for k, v in conjuntos.items() if v["agregador"]}
    trilhas = {k: v for k, v in conjuntos.items() if not v["agregador"]}

    saida = {
        "matriz": 844,
        "fonte": (
            "Seção 'Resumo Optativas' do Histórico Escolar (Portal do Aluno). "
            "Apenas metadado de curso: identificador, nome, períodos e carga "
            "exigida. Nenhum dado de progresso do aluno é lido ou gravado."
        ),
        "conjuntos": dict(sorted(conjuntos.items())),
    }
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)

    print(f"{len(conjuntos)} conjuntos -> {sys.argv[2]}", file=sys.stderr)
    for ident, c in sorted(agregadores.items()):
        print(f"  agregador {ident}: {c['nome']} ({c['ch']}h)", file=sys.stderr)
    print(f"  {len(trilhas)} subconjuntos (trilhas e optativas isoladas)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
