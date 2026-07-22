# -*- coding: utf-8 -*-
"""Valida invariantes estruturais de uma oferta de turmas, sem depender da fonte.

Uso:
    py -3 tools/validate_turmas_estrutura.py data/eng-comp/turmas/2025-2.json

Ao contrário de ``validate_turmas.py``, este validador não cruza o JSON com um
PDF. Ele serve também para ofertas extraídas de backups do Grade na Hora e de
outras fontes públicas. Ausência de horário é aviso, pois é legítima em TCC e
componentes EaD; domínio inválido ou dois locais distintos no mesmo slot são
erros. Repetições idênticas de um horário são preservadas: o PDF oficial as
repete quando a turma tem mais de um professor.
"""

import json
import sys
from pathlib import Path


SEDES_VALIDAS = {"Centro", "Ecoville", "Neoville"}
TURNOS_VALIDOS = {"M", "T", "N"}


def erro(erros: list[str], mensagem: str) -> None:
    erros.append(mensagem)


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: py -3 tools/validate_turmas_estrutura.py <turmas.json>")
        return 2

    caminho = Path(sys.argv[1])
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERRO: não foi possível ler {caminho}: {exc}")
        return 2

    erros: list[str] = []
    avisos: list[str] = []
    disciplinas = dados.get("disciplinas")
    if not isinstance(disciplinas, list):
        print("ERROS: 1\n  !! campo disciplinas ausente ou inválido")
        return 1

    codigos_disciplina: set[str] = set()
    total_turmas = 0
    total_horarios = 0

    for indice, disciplina in enumerate(disciplinas, start=1):
        codigo_disciplina = str(disciplina.get("codigo", "")).strip()
        referencia = codigo_disciplina or f"disciplina #{indice}"
        if not codigo_disciplina:
            erro(erros, f"{referencia}: código de disciplina vazio")
        elif codigo_disciplina in codigos_disciplina:
            erro(erros, f"{referencia}: código de disciplina duplicado")
        else:
            codigos_disciplina.add(codigo_disciplina)

        turmas = disciplina.get("turmas")
        if not isinstance(turmas, list):
            erro(erros, f"{referencia}: campo turmas ausente ou inválido")
            continue
        if not turmas:
            avisos.append(f"{referencia}: disciplina sem turma na oferta")

        codigos_turma: set[str] = set()
        for posicao, turma in enumerate(turmas, start=1):
            total_turmas += 1
            codigo_turma = str(turma.get("codigo", "")).strip()
            tag = f"{referencia} {codigo_turma or f'turma #{posicao}'}"
            if not codigo_turma:
                erro(erros, f"{tag}: código de turma vazio")
            elif codigo_turma in codigos_turma:
                erro(erros, f"{tag}: código de turma duplicado na disciplina")
            else:
                codigos_turma.add(codigo_turma)

            horarios = turma.get("horarios")
            if not isinstance(horarios, list):
                erro(erros, f"{tag}: campo horarios ausente ou inválido")
                continue
            if not horarios:
                avisos.append(f"{tag}: turma sem horário (permitido para TCC/EaD)")
                continue

            slots: dict[tuple[int, str, int], tuple[object, object]] = {}
            for horario in horarios:
                total_horarios += 1
                dia = horario.get("dia")
                turno = horario.get("turno")
                aula = horario.get("aula")
                sede = horario.get("sede")
                if not isinstance(dia, int) or not 2 <= dia <= 7:
                    erro(erros, f"{tag}: dia inválido {dia!r}")
                if turno not in TURNOS_VALIDOS:
                    erro(erros, f"{tag}: turno inválido {turno!r}")
                if not isinstance(aula, int) or not 1 <= aula <= 6:
                    erro(erros, f"{tag}: aula inválida {aula!r}")
                if sede not in SEDES_VALIDAS:
                    erro(erros, f"{tag}: sede inválida {sede!r}")

                if isinstance(dia, int) and turno in TURNOS_VALIDOS and isinstance(aula, int):
                    slot = (dia, turno, aula)
                    local = (horario.get("sede"), horario.get("sala"))
                    if slot in slots and slots[slot] != local:
                        erro(erros, f"{tag}: locais diferentes no slot {dia}{turno}{aula}")
                    slots[slot] = local

    print(f"arquivo: {caminho}")
    print(f"disciplinas: {len(disciplinas)} | turmas: {total_turmas} | horários: {total_horarios}")
    print(f"ERROS: {len(erros)}")
    for mensagem in erros:
        print("  !!", mensagem)
    print(f"avisos: {len(avisos)}")
    for mensagem in avisos:
        print("  ~", mensagem)
    return 1 if erros else 0


if __name__ == "__main__":
    raise SystemExit(main())
