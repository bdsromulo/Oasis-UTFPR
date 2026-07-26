# -*- coding: utf-8 -*-
"""Aplica a camada de anotações sobre a matriz recém-parseada do PDF oficial.

Existe para separar o que a fonte oficial diz do que a curadoria acrescentou —
a regra do REPOSITORIO.md: correções da vivência entram em camada própria e
nunca adulteram o dado cru. Antes desta camada, `data/matriz-981.json` era o
parse do PDF com 13 disciplinas e 7 equivalências editadas à mão por cima, e
rodar `parse_matriz.py` sobre o arquivo apagava tudo isso em silêncio.

O que a anotação pode fazer (só acrescentar; nunca sobrescrever a fonte):
  - cabecalho:    trocar campos de topo (o PDF abrevia o nome do curso);
  - conjuntos:    declarar conjunto que só aparece no rodapé, sem lista própria;
  - disciplinas:  acrescentar disciplina ausente da Consulta. O campo opcional
                  "apos" fixa a posição logo depois do código indicado; sem ele
                  a disciplina vai para o fim da lista;
  - equivalentes: acrescentar equivalências ausentes da coluna do PDF.

ERRO ALTO, NÃO SILENCIOSO: se a fonte passar a trazer o que a anotação
acrescenta, a aplicação FALHA em vez de duplicar. Isso obriga a revisar a
anotação quando a universidade publica uma Consulta mais completa.

Uso:
  python tools/parse_matriz.py "<matriz.pdf>" /tmp/base.json
  python tools/aplicar_anotacoes.py /tmp/base.json data/anotacoes-981.json data/matriz-981.json
"""
import json, sys, os

if len(sys.argv) < 3:
    print(__doc__)
    sys.exit(2)

BASE = sys.argv[1]
ANOT = sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else BASE

base = json.load(open(BASE, encoding="utf-8"))
anot = json.load(open(ANOT, encoding="utf-8"))
erros = []

if anot.get("matriz") != base.get("matriz"):
    erros.append(f"anotação é da matriz {anot.get('matriz')}, base é da {base.get('matriz')}")

for campo, valor in anot.get("cabecalho", {}).items():
    base[campo] = valor

for chave, conjunto in anot.get("conjuntos", {}).items():
    if chave in base["conjuntos"]:
        erros.append(f"conjunto {chave} já vem do PDF: remova a anotação")
    else:
        base["conjuntos"][chave] = conjunto

por_codigo = {d["codigo"]: d for d in base["disciplinas"]}
for disciplina in anot.get("disciplinas", []):
    codigo = disciplina["codigo"]
    if codigo in por_codigo:
        erros.append(f"disciplina {codigo} já vem do PDF: remova a anotação")
        continue
    nova = {k: v for k, v in disciplina.items() if k != "apos"}
    apos = disciplina.get("apos")
    if apos is None:
        base["disciplinas"].append(nova)
        continue
    indices = [i for i, d in enumerate(base["disciplinas"]) if d["codigo"] == apos]
    if not indices:
        erros.append(f"disciplina {codigo}: âncora 'apos' = {apos} não existe na matriz")
        continue
    base["disciplinas"].insert(indices[0] + 1, nova)
    por_codigo[codigo] = nova

por_codigo = {d["codigo"]: d for d in base["disciplinas"]}
for codigo, extras in anot.get("equivalentes", {}).items():
    alvo = por_codigo.get(codigo)
    if alvo is None:
        erros.append(f"equivalência anotada para {codigo}, que não existe na matriz")
        continue
    ja = {e["codigo"] for e in alvo["equivalentes"]}
    for extra in extras:
        if extra["codigo"] in ja:
            erros.append(f"{codigo}: equivalente {extra['codigo']} já vem do PDF: remova a anotação")
        else:
            alvo["equivalentes"].append(extra)

if erros:
    print(f"ERROS: {len(erros)}")
    for e in erros:
        print("  !!", e)
    sys.exit(1)

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(base, f, ensure_ascii=False, indent=1)

n_disc = len(anot.get("disciplinas", []))
n_eq = sum(len(v) for v in anot.get("equivalentes", {}).values())
print(f"anotações aplicadas: +{n_disc} disciplinas, +{n_eq} equivalências, "
      f"+{len(anot.get('conjuntos', {}))} conjuntos")
print(f"total: {len(base['disciplinas'])} disciplinas | salvo em {os.path.abspath(OUT)}")
