import pdfplumber, re, json

pdf_path = r'materiais-referencia\Eng-Comp-962\Matriz Curricular Eng Comp 962.pdf'
RE_COD = re.compile(r"^[A-Z0-9]{4,7}$")

def group_rows(words, tol=3.5):
    rows = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if rows and abs(rows[-1][0] - w["top"]) <= tol:
            rows[-1][1].append(w)
        else:
            rows.append([w["top"], [w]])
    return [sorted(ws, key=lambda w: w["x0"]) for _, ws in rows]

def check_nums():
    with pdfplumber.open(pdf_path) as pdf:
        all_good = True
        for page in pdf.pages:
            for ws in group_rows(page.extract_words()):
                if not ws: continue
                # if row starts with a valid code
                if RE_COD.match(ws[0]["text"]):
                    # extract numbers in region [300, 645]
                    num_tokens = [w for w in ws if 310 <= w["x0"] <= 645 and re.match(r"^\d+$", w["text"])]
                    if len(num_tokens) != 9:
                        text = " ".join(w["text"] for w in ws)
                        print(f"Row has {len(num_tokens)} numbers: {text}")
                        all_good = False
        if all_good:
            print("All subject rows have exactly 9 numbers in region!")

check_nums()
