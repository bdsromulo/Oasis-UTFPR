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

Plataforma de acompanhamento acadêmico para UTFPR Curitiba. Cobre **Sistemas de
Informação (matrizes 981 e 806)**, **Engenharia de Computação (844 e 962)**,
**Engenharia Eletrônica (968)**, **Engenharia de Controle e Automação (978)** e
**Engenharia Mecatrônica (823 e 973)**. Documentos-fonte (PDFs do Portal do Aluno)
ficam fora do repo, na pasta local do dono do projeto. `data/` contém apenas dados
públicos derivados.

## Pipeline de dados

- `tools/parse_matriz.py` + `tools/validate_matriz*.py` → `data/matriz-<n>.json` por
  curso (a 981 tem camada curada em `data/anotacoes-981.json` via
  `tools/aplicar_anotacoes.py`; as demais matrizes saem só do parse). Validador
  específico por matriz: `validate_matriz_806/823/968/973/978.py`.
- `tools/parse_turmas_pdf.py` + `tools/validate_turmas.py` → `data/<curso>/turmas/{sem}.json`
  (fonte primária: PDF oficial de Turmas Abertas); `validate_turmas_estrutura.py` valida
  qualquer fonte de oferta, inclusive backup.
- `tools/parse_gnh.py` / `tools/parse_gnh_html.py` → leitor secundário (backup do
  Grade na Hora).
- `scripts/ingerir-reviews.ts` → `data/reviews.json`, avaliações da comunidade
  (Estrategia.md §6). Roda semanal via `.github/workflows/ingerir-reviews.yml`, só
  no repositório de produção — nunca editar `data/reviews.json` à mão.

Toda importação exige suíte de validação com 0 erros. Os parsers leem por posição
de palavras (coordenadas x fixas por coluna); as anomalias conhecidas da fonte estão
documentadas nos docstrings dos validadores (regras R1–R8 e M1–M7, com variantes por
curso). Ao encontrar anomalia nova: auditar no texto cru do PDF antes de mexer no
parser, e registrar a regra aprendida no validador correspondente.

## Convenções

- Código e comentários em português.
- Identidade visual: amarelo UTFPR como cor de acento sobre base neutra; temas claro
  e escuro. Não derivar cores do nome "Oásis".
- Dados oficiais podem divergir da prática (ex.: pré-requisito de TC1); correções da
  vivência entram em camada de anotações separada, nunca sobrescrevendo a fonte.
