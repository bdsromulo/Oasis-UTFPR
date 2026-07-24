# -*- coding: utf-8 -*-
import os; os.environ.setdefault("PYTHONIOENCODING", "utf-8")
"""Diagnóstico de PDFs de Matrizes Curriculares.

Extrai texto de cada página, identifica páginas em branco, conta disciplinas
detectáveis, conjuntos e cargas do rodapé. Não gera JSON de produção — apenas
reporta o estado de cada PDF para avaliação humana.

Uso: python tools/diagnostico_matrizes.py
"""
import pdfplumber, re, sys, os, glob

# PDFs a analisar (procura na pasta materiais-referencia)
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
MATERIAIS = os.path.join(BASE, "materiais-referencia")

# Regex para detectar códigos de disciplina (4-7 chars alfanuméricos maiúsculos)
RE_COD = re.compile(r'\b[A-Z]{2,4}\d{2,3}\b')
# Regex para detectar conjuntos [NNN] ou [NNNN]
RE_CONJ = re.compile(r'\[(\d{3,4})\]')
# Regex para cargas no rodapé
RE_CARGA = re.compile(r'(CHTOBRIGATORIASMATRIZ|CHTOPTATIVASMATRIZ|CHEXTENSAO|CHELETIVA|SOMACH|CHTOTALPPC):?\s*(\d+)')


def analisar_pdf(caminho):
    """Analisa um PDF e retorna um relatório de diagnóstico."""
    nome = os.path.basename(caminho)
    print(f"\n{'='*80}")
    print(f"  ARQUIVO: {nome}")
    print(f"  Caminho: {caminho}")
    print(f"{'='*80}")

    with pdfplumber.open(caminho) as pdf:
        total_paginas = len(pdf.pages)
        paginas_brancas = []
        paginas_com_conteudo = []
        todos_codigos = set()
        todos_conjuntos = set()
        cargas_encontradas = {}
        texto_rodape = []
        in_footer = False
        primeira_disciplina_pagina = None
        ultima_disciplina_pagina = None

        for i, page in enumerate(pdf.pages):
            num_pag = i + 1
            texto = page.extract_text() or ""
            palavras = page.extract_words()

            if not texto.strip() or len(palavras) < 3:
                paginas_brancas.append(num_pag)
                continue

            paginas_com_conteudo.append(num_pag)

            # Detectar códigos de disciplinas nesta página
            codigos_pagina = set(RE_COD.findall(texto))
            # Filtrar falsos positivos comuns
            falsos = {'UTFPR', 'APCC', 'CHEAD', 'PDF', 'CHEXT', 'HTTP', 'HTTPS',
                      'CHTOBRIGATORIASMATRIZ', 'CHTOPTATIVASMATRIZ', 'CHEXTENSAO',
                      'CHELETIVA', 'SOMACH', 'SOMACHSEMEXT', 'CHTOTALPPC'}
            codigos_pagina -= falsos

            if codigos_pagina:
                if primeira_disciplina_pagina is None:
                    primeira_disciplina_pagina = num_pag
                ultima_disciplina_pagina = num_pag
                todos_codigos.update(codigos_pagina)

            # Detectar conjuntos
            conjuntos_pagina = set(RE_CONJ.findall(texto))
            todos_conjuntos.update(conjuntos_pagina)

            # Detectar cargas no rodapé
            for m in RE_CARGA.finditer(texto):
                cargas_encontradas[m.group(1)] = int(m.group(2))

            # Verificar se estamos no rodapé (CÂMPUS:)
            if 'CÂMPUS:' in texto or 'Câmpus:' in texto or 'CAMPUS:' in texto:
                in_footer = True

            if in_footer:
                texto_rodape.append(texto)

        # Relatório
        print(f"\n  Total de páginas: {total_paginas}")
        print(f"  Páginas com conteúdo: {len(paginas_com_conteudo)}")
        print(f"  Páginas em branco: {len(paginas_brancas)}", end="")
        if paginas_brancas:
            print(f" -> {paginas_brancas}")
        else:
            print()

        print(f"\n  Disciplinas detectadas (códigos únicos): {len(todos_codigos)}")
        if primeira_disciplina_pagina:
            print(f"  Primeira disciplina na página: {primeira_disciplina_pagina}")
            print(f"  Última disciplina na página: {ultima_disciplina_pagina}")

        # Verificar continuidade após páginas em branco
        if paginas_brancas:
            ultima_branca = max(paginas_brancas)
            if ultima_disciplina_pagina and ultima_disciplina_pagina > ultima_branca:
                print(f"  ✅ Há disciplinas DEPOIS da última página branca (pág {ultima_branca})")
            elif ultima_disciplina_pagina and ultima_disciplina_pagina <= ultima_branca:
                print(f"  ⚠️ NENHUMA disciplina encontrada depois da última página branca (pág {ultima_branca})")

        print(f"\n  Conjuntos detectados: {len(todos_conjuntos)}")
        if todos_conjuntos:
            for c in sorted(todos_conjuntos, key=int):
                print(f"    [{c}]")

        print(f"\n  Cargas do rodapé:")
        if cargas_encontradas:
            for k, v in sorted(cargas_encontradas.items()):
                print(f"    {k}: {v}")
        else:
            print(f"    (nenhuma encontrada)")

        # Listar alguns códigos para referência
        if todos_codigos:
            amostra = sorted(todos_codigos)
            print(f"\n  Amostra de códigos (primeiros 20): {', '.join(amostra[:20])}")
            if len(amostra) > 20:
                print(f"  ... e mais {len(amostra) - 20} códigos")

        # Tentar detectar a matriz e curso no cabeçalho
        texto_primeira = pdf.pages[0].extract_text() or ""
        m_matriz = re.search(r'Matriz:\s*(\d+)', texto_primeira)
        m_curso = re.search(r'Curso\(s\):\s*(.+)', texto_primeira)
        if m_matriz:
            print(f"\n  Matriz identificada: {m_matriz.group(1)}")
        if m_curso:
            print(f"  Curso identificado: {m_curso.group(1).strip()}")

        # Análise do texto do rodapé
        rodape_completo = "\n".join(texto_rodape)
        
        # Procurar eletivas
        m_elet = re.search(r'Eletiva\s*-\s*Carga horária total:\s*(\d+)', rodape_completo)
        if m_elet:
            print(f"\n  Eletiva encontrada: {m_elet.group(1)}h")

        return {
            'nome': nome,
            'total_paginas': total_paginas,
            'paginas_brancas': paginas_brancas,
            'codigos': len(todos_codigos),
            'conjuntos': todos_conjuntos,
            'cargas': cargas_encontradas,
        }


def main():
    # Encontrar todos os PDFs de matrizes
    padroes = [
        os.path.join(MATERIAIS, "**", "*[Mm]atriz*.*"),
        os.path.join(MATERIAIS, "**", "*matrizeng*.*"),
    ]
    
    pdfs = set()
    for padrao in padroes:
        pdfs.update(glob.glob(padrao, recursive=True))
    
    # Filtrar apenas PDFs
    pdfs = sorted(f for f in pdfs if f.lower().endswith('.pdf'))
    
    if not pdfs:
        print("Nenhum PDF de matriz encontrado em materiais-referencia/")
        print("Tentando buscar diretamente...")
        # Listar o que tem
        for root, dirs, files in os.walk(MATERIAIS):
            for f in files:
                if f.lower().endswith('.pdf'):
                    print(f"  PDF encontrado: {os.path.join(root, f)}")
        return

    print(f"Encontrados {len(pdfs)} PDFs de matrizes para análise:")
    for p in pdfs:
        print(f"  - {os.path.relpath(p, BASE)}")

    resultados = []
    for pdf_path in pdfs:
        try:
            r = analisar_pdf(pdf_path)
            resultados.append(r)
        except Exception as e:
            print(f"\n  ❌ ERRO ao analisar {pdf_path}: {e}")

    # Resumo comparativo
    print(f"\n\n{'='*80}")
    print("  RESUMO COMPARATIVO")
    print(f"{'='*80}")
    print(f"  {'Arquivo':<50} {'Pág':>4} {'Brancas':>8} {'Disc':>5} {'Conj':>5}")
    print(f"  {'-'*50} {'-'*4} {'-'*8} {'-'*5} {'-'*5}")
    for r in resultados:
        print(f"  {r['nome'][:50]:<50} {r['total_paginas']:>4} {len(r['paginas_brancas']):>8} {r['codigos']:>5} {len(r['conjuntos']):>5}")


if __name__ == "__main__":
    main()
