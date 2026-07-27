# Oásis UTFPR — instruções do projeto

> Guia completo e agnóstico de fornecedor para agentes: **`REPOSITORIO.md`**.
> Leia-o antes da primeira alteração. Este arquivo é o resumo.

## Regras invioláveis

1. **Autoria**: commits deste repositório são autorados exclusivamente pelo dono do
   projeto. NUNCA adicione trailers `Co-Authored-By`, créditos de IA em mensagens de
   commit, PRs ou qualquer metadado que registre assistente como contribuidor.
2. **Dados pessoais**: históricos escolares (PDFs de alunos) JAMAIS entram no
   repositório — ele é público. O processamento de histórico é 100% client-side.
3. **Sem backend**: tudo precisa funcionar como site estático (GitHub Pages).
   Features que exijam servidor ficam fora do escopo até decisão explícita do dono.

## Contexto

Plataforma de acompanhamento acadêmico para BSI/UTFPR Curitiba (matriz 981).
Documentos-fonte (PDFs do Portal do Aluno) ficam fora do repo, na pasta local do
dono do projeto. `data/` contém apenas dados públicos derivados.

## Pipeline de dados

- `tools/parse_matriz.py` + `tools/validate_matriz.py` → `data/matriz-981.json`
- `tools/parse_turmas_pdf.py` + `tools/validate_turmas.py` → `data/turmas/{sem}.json`
  (fonte primária: PDF oficial de Turmas Abertas)
- `tools/parse_gnh.py` → leitor secundário (backup do Grade na Hora)

Toda importação exige suíte de validação com 0 erros. Os parsers leem por posição
de palavras (coordenadas x fixas por coluna); as anomalias conhecidas da fonte estão
documentadas nos docstrings dos validadores (regras R1–R8 e M1–M7). Ao encontrar
anomalia nova: auditar no texto cru do PDF antes de mexer no parser, e registrar a
regra aprendida no validador correspondente.

## Convenções

- Código e comentários em português.
- Identidade visual: amarelo UTFPR como cor de acento sobre base neutra; temas claro
  e escuro. Não derivar cores do nome "Oásis".
- Dados oficiais podem divergir da prática (ex.: pré-requisito de TC1); correções da
  vivência entram em camada de anotações separada, nunca sobrescrevendo a fonte.
