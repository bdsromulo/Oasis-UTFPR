# -*- coding: utf-8 -*-
"""Leitor TERCIÁRIO: extrai turmas da PÁGINA SALVA do Grade na Hora (HTML).

Ordem de preferência das fontes de turmas:
  1. PDF oficial de Turmas Abertas  -> tools/parse_turmas_pdf.py
  2. JSON da API do Grade na Hora   -> tools/parse_gnh.py
  3. Página HTML salva do GNH       -> este arquivo

Este leitor existe para o caso em que só restou o "[ BACKUP AAAA/S ]" salvo do
site — situação de Eng. de Computação em 2025.2, sem PDF nem JSON disponíveis.

Estrutura da página (uma disciplina por bloco):
    <span class="disc"><code>[ICSHX0]</code> Nome Da Disciplina (3 aulas/sem)</span>
    <span class="tur"> ... <label ...>S73 — Professor [ 2N1(CB-105) - 2T5(CB-105) ]</label> ...
    <span class="tur"> ... (demais turmas da mesma disciplina)

Limitações herdadas do GNH, além das já listadas em parse_gnh.py:
  - não há vagas, reserva nem prioridade de curso: o HTML não exibe esses campos;
  - o marcador de aula presencial vem de um ícone (title="Possui aulas presenciais").

Uso: python tools/parse_gnh_html.py <pagina.html> <semestre ex: 2025-2> [saida.json]
Depois de gerar, confira com tools/validate_turmas.py.
"""
from __future__ import annotations

import html
import io
import json
import os
import re
import sys

SEDES = {0: "Centro", 1: "Ecoville", 2: "Neoville"}

# Alguns backups de Controle e Automação omitem por completo o sufixo
# "(N aulas/sem)" em disciplinas isoladas. Exigir o sufixo fazia a expressão
# saltar essa disciplina e consumir seu nome, turmas e horários como continuação
# da anterior. Primeiro delimitamos cada <span class="disc">; a carga semanal é
# separada depois e fica 0 somente quando a própria fonte a omitiu.
RE_DISCIPLINA = re.compile(
    r'<span class="disc"><code>\[([A-Z0-9]+)\]</code>\s*(.*?)</span>',
    re.S,
)
RE_AULAS_SEMANAIS = re.compile(r"\s*\((\d+)\s*aulas?/sem\)\s*$", re.I)
# Turma e professor: "S73 - Fulano de Tal". O separador e normalizado antes,
# em corrigir_mojibake(), entao aqui basta aceitar travessao, meia-risca e hifen.
RE_LABEL = re.compile(r"<label[^>]*>(.*?)</label>", re.S)
# o professor é opcional: há turma listada só com o código (ex.: GEE7F1 S01)
RE_TURMA_PROF = re.compile(r"^\s*([A-Z]\d{1,2}[A-Z]?)(?:\s*[—–-]\s*(.*?))?\s*$")
RE_BLOCO_HORARIOS = re.compile(r"\[\s*(.*?)\s*\]")
# A sala pode vir colada ("2N1(CB-105)") ou separada por espaço, porque o GNH
# embrulha salas de outra sede num <span class="eco">, e remover a tag deixa um
# espaço no meio do token.
RE_HORARIO = re.compile(r"^([2-7])([MTN])(\d)\s*(?:\(\s*(\*{0,2})\s*([^)]*)\))?$")


# O encoding da página varia conforme COMO ela foi salva, e o arquivo não pode ser
# lido às cegas em cp1252: o backup de 2025-2 de Eng. Comp. é UTF-8 puro (declara
# charset=UTF-8, tem 458 bytes-líder 0xC3 e nenhum acento de byte único), e lê-lo
# como cp1252 gravou "Introdução À Estatística" em 113 dos 157 nomes de disciplina
# — nomes corrompidos degradam o casamento por nome do motor de identidade.
# Por isso decodificar() tenta UTF-8 primeiro e só cai em cp1252 quando os bytes
# não são UTF-8 válido. Nesse segundo caso o encoding é MISTO — acentos em cp1252
# de byte único (ã = 0xE3) e travessão em UTF-8 (0xE2 0x80 0x94) —, e as sequências
# conhecidas que sobram são consertadas abaixo.
MOJIBAKE = {
    "â€”": "—",  # em dash
    "â€“": "–",  # en dash
    "â€™": "’",  # apóstrofo tipográfico
    "Ã§": "ç", "Ã£": "ã", "Ã¡": "á", "Ã©": "é", "Ãª": "ê",
    "Ã­": "í", "Ã³": "ó", "Ãµ": "õ", "Ãº": "ú", "Ã´": "ô",
    "Ãƒ": "Ã", "Ã‡": "Ç", "Ã”": "Ô",
}


def corrigir_mojibake(texto: str) -> str:
    for errado, certo in MOJIBAKE.items():
        texto = texto.replace(errado, certo)
    return texto


def decodificar(caminho: str) -> str:
    """Texto da página, respeitando o encoding com que ela foi salva."""
    bruto = io.open(caminho, "rb").read()
    try:
        return bruto.decode("utf-8")
    except UnicodeDecodeError:
        # cp1252 com travessão em UTF-8: um byte inválido isolado impede o strict
        return corrigir_mojibake(bruto.decode("cp1252", errors="replace"))


def limpar_tags(trecho: str) -> str:
    """Remove marcação e normaliza espaços/entidades, preservando o texto."""
    texto = re.sub(r"<[^>]+>", " ", trecho)
    texto = html.unescape(texto).replace("\xa0", " ")
    return re.sub(r"\s+", " ", texto).strip()


def parse_horario(token: str) -> dict | None:
    m = RE_HORARIO.match(token.strip())
    if not m:
        return None
    dia, turno, aula, asteriscos, sala = m.groups()
    sala = (sala or "").strip()
    # o asterisco pode vir colado na sala em vez de antes dela
    extras = len(sala) - len(sala.lstrip("*"))
    sala = sala.lstrip("*").strip()
    n_ast = len(asteriscos or "") + extras
    return {
        "dia": int(dia),
        "turno": turno,
        "aula": int(aula),
        "sala": sala or None,
        "sede": SEDES.get(min(n_ast, 2), "Centro"),
    }


def parse(caminho: str, semestre: str) -> dict:
    pagina = decodificar(caminho)

    curso = "DESCONHECIDO"
    m = re.search(r"Curso:\s*<strong>(.*?)</strong>", pagina)
    if m:
        curso = limpar_tags(m.group(1))

    atualizacao = None
    m = re.search(r"ltima atualiza\S*o:\s*<strong>(.*?)</strong>", pagina)
    if m:
        atualizacao = limpar_tags(m.group(1))

    # fatia a página em blocos, um por disciplina
    marcas = list(RE_DISCIPLINA.finditer(pagina))
    disciplinas = []
    for i, marca in enumerate(marcas):
        codigo, nome = marca.group(1), limpar_tags(marca.group(2))
        carga = RE_AULAS_SEMANAIS.search(nome)
        aulas = int(carga.group(1)) if carga else 0
        if carga:
            nome = nome[: carga.start()].strip()
        fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(pagina)
        bloco = pagina[marca.end() : fim]

        turmas = []
        for label in RE_LABEL.finditer(bloco):
            # Trabalha sobre o texto já sem marcação. Tentar recortar o <span> dos
            # horários no HTML cru não funciona: quando a sala é de outra sede ele
            # traz um <span class="eco"> aninhado, e o fechamento não-guloso casa
            # com a tag interna — o que fazia sumir justamente Ecoville/Neoville.
            texto = limpar_tags(label.group(1))

            horarios = []
            mh = RE_BLOCO_HORARIOS.search(texto)
            if mh:
                for token in mh.group(1).split(" - "):
                    h = parse_horario(token)
                    if h:
                        horarios.append(h)

            # o cabeçalho é tudo que vem antes do bloco de horários
            cabecalho = texto[: mh.start()] if mh else texto
            mt = RE_TURMA_PROF.match(cabecalho.strip())
            if not mt:
                continue
            cod_turma, professor = mt.group(1), (mt.group(2) or "").strip()

            turmas.append(
                {
                    "codigo": cod_turma,
                    "enquadramento": "Presencial",
                    # o HTML do GNH não expõe estes campos
                    "vagas_total": None,
                    "vagas_calouros": None,
                    "reserva": "",
                    "prioridade_cursos": [],
                    "horarios": horarios,
                    "professores": [professor] if professor else [],
                    "professores_raw": professor,
                    "optativa_matrizes": [],
                    "optativa": False,
                }
            )

        disciplinas.append(
            {
                "codigo": codigo,
                "nome": nome,
                "aulas_semanais_presenciais": aulas,
                "aulas_semanais_assincronas": None,
                "horas_semestrais_extensionistas": None,
                "turmas": turmas,
            }
        )

    disciplinas.sort(key=lambda d: d["nome"])
    return {
        "curso": curso,
        "semestre": semestre,
        "fonte": (
            f"Backup HTML do Grade na Hora ({semestre})"
            + (f", atualizado em {atualizacao}" if atualizacao else "")
        ),
        "disciplinas": disciplinas,
    }


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    caminho, semestre = sys.argv[1], sys.argv[2]
    saida = (
        sys.argv[3]
        if len(sys.argv) > 3
        else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "turmas", f"{semestre}.json")
    )
    dados = parse(caminho, semestre)
    with io.open(saida, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=1)

    n_turmas = sum(len(d["turmas"]) for d in dados["disciplinas"])
    n_hor = sum(len(t["horarios"]) for d in dados["disciplinas"] for t in d["turmas"])
    print(
        f"curso: {dados['curso']} | disciplinas: {len(dados['disciplinas'])} "
        f"turmas: {n_turmas} horarios: {n_hor} -> {saida}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
