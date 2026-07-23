# Oásis UTFPR

Plataforma para estudantes da UTFPR Câmpus Curitiba acompanharem sua situação
curricular, o que podem cursar e a grade do semestre. Hoje cobre **Sistemas de
Informação (matriz 981)** e **Engenharia de Computação (matriz 844)**, preservando
as exigências próprias de cada matriz.

Princípios:

- **Local-first**: o histórico escolar do aluno é processado no navegador e nunca
  sai da máquina dele. Nenhum dado pessoal entra neste repositório.
- **Estático**: o site roda inteiro no GitHub Pages, sem backend. Os únicos dados
  servidos são os arquivos públicos de `data/`.
- **Erro alto > erro silencioso**: toda importação de dados passa por suítes de
  validação que recusam o arquivo se qualquer linha não for explicada.

> **Contribuindo com ajuda de IA?** Leia [`REPOSITORIO.md`](REPOSITORIO.md) — guia para
> agentes, incluindo o protocolo de que nenhuma LLM se credita em commits.

## Como rodar

```
npm install
npm run dev    # desenvolvimento (http://localhost:5173/Oasis-UTFPR/)
npm test       # testes (inclui parser de histórico com fixture sintética)
npm run build  # produção
```

O app é publicado automaticamente no GitHub Pages a cada push na main.

## Arquitetura em camadas

1. **Dados** (`data/` + `tools/`): JSONs públicos gerados dos documentos oficiais,
   com suítes de validação que recusam importação com qualquer linha não explicada.
2. **Domínio** (`src/domain/`): TypeScript puro e testável — extração posicional de
   texto (pdf.js), parser do Histórico Escolar → `PerfilAluno`, e o motor de regras
   (contadores por conjunto, pré-requisitos/equivalências, conflitos de grade).
3. **UI** (`src/ui/`): React + Tailwind. Telas de **Minha situação** (progresso em
   categorias derivadas da matriz),
   **Posso cursar** (elegíveis × oferta do semestre, com filtros) e **Grade**
   (montagem visual, conflitos de horário e de sede, relatório para a matrícula).

## Estado atual

Camada de dados (M1) pronta:

| Arquivo | Conteúdo | Fonte |
|---|---|---|
| `data/matriz-981.json` | Matriz de BSI, com estratos, humanidades, trilhas e extensão | Consulta Curso e Matriz Curricular (Portal do Aluno) |
| `data/turmas/2026-1.json` | 77 disciplinas, 177 turmas, 584 horários | PDF oficial de Turmas Abertas |
| `data/turmas/2025-2.json` | 85 disciplinas, 185 turmas | Backup do Grade na Hora (leitor secundário) |
| `data/eng-comp/matriz-844.json` | Matriz de Eng. Comp., com 270h de optativas, duas trilhas e sem extensão curricular | Consulta Curso e Matriz Curricular (Portal do Aluno) |
| `data/eng-comp/turmas/*.json` | Ofertas de Eng. Comp. de 2025.2 e 2026.1 | Backup do Grade na Hora e PDF oficial |

## Pipeline de dados (1× por semestre)

```
# 1. Salve a página "Turmas Abertas" do Portal do Aluno como PDF
# 2. Gere o JSON canônico
python tools/parse_turmas_pdf.py "Turmas Abertas.pdf" 2026-2

# 3. Valide — a importação só vale com 0 erros
python tools/validate_turmas.py "Turmas Abertas.pdf" data/turmas/2026-2.json
# Valida a estrutura inclusive quando a oferta veio de backup HTML/JSON
python tools/validate_turmas_estrutura.py data/eng-comp/turmas/2025-2.json

# (matriz muda raramente; quando mudar:)
python tools/parse_matriz.py "Lista de Matérias Matriz Curricular.pdf"
python tools/validate_matriz.py
```

Leitor secundário (contingência): `tools/parse_gnh.py` converte o backup do
[Grade na Hora](https://gradenahora.com.br/) para o mesmo schema.

As regras de validação (R1–R7 para turmas, M1–M7 para a matriz) estão documentadas
nos próprios scripts, incluindo as anomalias conhecidas da fonte — p. ex., o portal
imprime os horários N vezes quando a turma tem N professores, e turmas "Sem Reserva"
podem vir com lista de prioridades apesar da definição oficial dizer o contrário.

Requisitos das ferramentas: Python 3 + `pdfplumber`.

## Roadmap

- **Consolidação multicurso** — ampliar testes de interface e manter auditada a
  ligação entre ofertas externas, equivalências e categorias das matrizes.
- **Atualização semestral** — importar e homologar as ofertas oficiais de cada curso.
- **Fase 2** — Camada de comunidade: avaliações, dicas e materiais por disciplina.

## Aviso

Projeto independente, feito por aluno. Não é um sistema oficial da UTFPR.
Confira sempre os dados no Portal do Aluno antes de efetivar a matrícula.
