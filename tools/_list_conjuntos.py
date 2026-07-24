import json
with open(r'data\eng-comp\matriz-962.json', encoding='utf-8') as f:
    d = json.load(f)
print("Conjuntos da 962:")
for k, v in sorted(d["conjuntos"].items(), key=lambda x: int(x[0])):
    print(f"[{k}] {v['nome']} - {v['ch']}h")
