import pdfplumber, sys
import os

pdf_path = r'materiais-referencia\Eng-Comp-962\Matriz Curricular Eng Comp 962.pdf'

def group_rows(words, tol=3.5):
    rows = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if rows and abs(rows[-1][0] - w["top"]) <= tol:
            rows[-1][1].append(w)
        else:
            rows.append([w["top"], [w]])
    return [sorted(ws, key=lambda w: w["x0"]) for _, ws in rows]

with pdfplumber.open(pdf_path) as pdf:
    # take page 1 (which has contents)
    page = pdf.pages[0]
    rows = group_rows(page.extract_words())
    # find first row with a subject code like 'ELEX10'
    for row in rows:
        text = " ".join(w["text"] for w in row)
        if "ELEX10" in text:
            print(f"Row: {text}")
            for w in row:
                print(f"  {w['text']}: x0={w['x0']:.2f}")
            break
