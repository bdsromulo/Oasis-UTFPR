# -*- coding: utf-8 -*-
"""Leitor SECUNDÁRIO (fallback): converte o JSON do Grade na Hora para o schema canônico.

Fonte primária de turmas é o PDF oficial de Turmas Abertas (parse_turmas_pdf.py).
Este leitor existe para (a) semestres dos quais só resta o backup do GNH (ex.: 2025-2)
e (b) contingência caso o PDF mude de layout no meio do caminho.

Limitações conhecidas do GNH em relação ao PDF oficial:
  - não distingue aulas presenciais x assíncronas (só "creditos"/aulas por semana);
  - não traz horas extensionistas da disciplina;
  - snapshot do início do semestre (pode divergir do estado final).

Uso: python tools/parse_gnh.py <gnh.json | URL> <semestre ex: 2025-2> [saida.json]
URL padrão do GNH: https://gradenahora.com.br/utfpr/{AAAA-S}/listahorario01{AAAA0S}00236.json
"""
import json, re, sys, os, urllib.request

SRC = sys.argv[1] if len(sys.argv) > 1 else None
SEM = sys.argv[2] if len(sys.argv) > 2 else "2025-2"
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data", "turmas", f"{SEM}.json")

if SRC is None:
    SRC = f"https://gradenahora.com.br/utfpr/{SEM}/listahorario01{SEM.replace('-', '0')}00236.json"

SEDES = {"": "Centro", "*": "Ecoville", "**": "Neoville"}
RE_HOR = re.compile(r"^([2-7])([MTN])(\d)$")

def load(src):
    if src.startswith("http"):
        with urllib.request.urlopen(src) as r:
            return json.loads(r.read().decode("utf-8"))
    return json.load(open(src, encoding="utf-8"))

def conv_horario(h):
    m = RE_HOR.match(h.get("horario", ""))
    if not m:
        return None
    sala = h.get("sala") or ""
    ast = len(sala) - len(sala.lstrip("*"))
    return {"dia": int(m.group(1)), "turno": m.group(2), "aula": int(m.group(3)),
            "sala": sala.lstrip("*") or None, "sede": SEDES["*" * ast]}

def convert(g):
    disciplinas = []
    for d in g["disciplinas"]:
        turmas = []
        for t in d["turmas"]:
            prio = [{"ordem": i + 1, "curso": curso}
                    for i, grupo in enumerate(t.get("prioridade_cursos") or [])
                    for curso in grupo]
            hors = [x for x in (conv_horario(h) for h in t.get("horarios") or []) if x]
            mats = [m.replace("Matriz:", "") for m in t.get("optativa_matrizes") or []]
            turmas.append({
                "codigo": t["codigo"],
                "enquadramento": t.get("enquadramento") or "",
                "vagas_total": t.get("vagas_total"),
                "vagas_calouros": t.get("vagas_calouros"),
                "reserva": t.get("reserva") or "",
                "prioridade_cursos": prio,
                "horarios": hors,
                "professores": t.get("professores") or [],
                "professores_raw": ", ".join(t.get("professores") or []),
                "optativa_matrizes": mats,
                "optativa": bool(mats),
            })
        disciplinas.append({
            "codigo": d["codigo"],
            "nome": d["nome"],
            "aulas_semanais_presenciais": d.get("creditos"),  # GNH não separa presencial/assíncrona
            "aulas_semanais_assincronas": None,
            "horas_semestrais_extensionistas": None,
            "turmas": turmas,
        })
    return {"curso": g.get("curso", "SIST DE INFORMAÇÃO"), "semestre": SEM,
            "fonte": f"Grade na Hora (backup) - atualizado {g.get('ultima_atualizacao', '?')}",
            "disciplinas": disciplinas}

if __name__ == "__main__":
    data = convert(load(SRC))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    nt = sum(len(d["turmas"]) for d in data["disciplinas"])
    nh = sum(len(t["horarios"]) for d in data["disciplinas"] for t in d["turmas"])
    print(f"disciplinas: {len(data['disciplinas'])}  turmas: {nt}  horarios: {nh}")
    print("salvo em", os.path.abspath(OUT))
