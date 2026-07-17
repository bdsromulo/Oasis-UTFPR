import json, unicodedata

def norm(s):
    return unicodedata.normalize('NFD', s.strip().lower()).encode('ascii', 'ignore').decode('utf-8')

m = json.load(open('data/matriz-981.json', encoding='utf-8'))
t26 = json.load(open('data/turmas/2026-1.json', encoding='utf-8'))
t25 = json.load(open('data/turmas/2025-2.json', encoding='utf-8'))

m_map = {norm(d['nome']): d for d in m['disciplinas']}
all_t = {}
for t in t26['disciplinas'] + t25['disciplinas']:
    all_t.setdefault(norm(t['nome']), set()).add(t['codigo'])

print("=== EQUIVALÊNCIAS POR NOME EXATAMENTE IGUAL ===")
for n, d_matriz in sorted(m_map.items()):
    if n in all_t:
        cods_t = all_t[n] - {d_matriz['codigo']}
        if cods_t:
            print(f"Matriz [{d_matriz['codigo']}] '{d_matriz['nome']}' -> Turmas: {sorted(cods_t)}")
