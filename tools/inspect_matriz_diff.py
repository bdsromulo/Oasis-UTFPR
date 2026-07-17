import pdfplumber, json, re, os

pdf_path = "Matriz do Sistema.pdf"
if not os.path.exists(pdf_path):
    print("PDF não encontrado")
    exit(1)

with pdfplumber.open(pdf_path) as pdf:
    text = "\n".join(p.extract_text() for p in pdf.pages)

lines = text.split("\n")
pdf_d = {}
for l in lines:
    m = re.match(r"^(?:[0-9]|PER)\s+(?:\[([0-9]+)\]\s+)?([A-Z0-9]{4,7})\s+([A-Z0-9\sÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ-]+?)\s+(?:FORMA|ENADE|TRABALHO|ESTÁGIO|TRABALHO DE)", l)
    if m:
        pdf_d[m.group(2)] = m.group(3).strip()

m_json = json.load(open("data/matriz-981.json", encoding="utf-8"))
m_d = {d["codigo"]: d for d in m_json["disciplinas"]}

t_2026 = json.load(open("data/turmas/2026-1.json", encoding="utf-8"))
t_2025 = json.load(open("data/turmas/2025-2.json", encoding="utf-8"))
t_cods = {d["codigo"]: d["nome"] for d in t_2026["disciplinas"]}
t_cods.update({d["codigo"]: d["nome"] for d in t_2025["disciplinas"]})

print("=== 1. DISCIPLINAS NO PDF DE MATRIZ QUE NÃO ESTÃO EM matriz-981.json ===")
for cod, nome in pdf_d.items():
    if cod not in m_d:
        print(f"  [{cod}] {nome} (No PDF)")

print("\n=== 2. DISCIPLINAS EM matriz-981.json QUE NÃO ESTÃO NO PDF DE MATRIZ ===")
for cod, d in m_d.items():
    if cod not in pdf_d:
        print(f"  [{cod}] {d['nome']} (Em matriz-981.json)")

print("\n=== 3. DIFERENÇAS DE NOME (PDF vs matriz-981.json) ===")
for cod, nome in pdf_d.items():
    if cod in m_d and nome.upper() != m_d[cod]["nome"].upper():
        print(f"  [{cod}] PDF: '{nome}' | JSON: '{m_d[cod]['nome']}'")

print("\n=== 4. DISCIPLINAS NAS TURMAS ABERTAS (2026.1 / 2025.2) QUE NÃO ESTÃO NA MATRIZ (PDF nem JSON) ===")
for cod, nome in t_cods.items():
    if cod not in pdf_d and cod not in m_d:
        print(f"  [{cod}] {nome} (Turma Aberta)")
