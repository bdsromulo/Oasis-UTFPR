# Oásis UTFPR

Plataforma para o aluno de **Sistemas de Informação (UTFPR Curitiba, matriz 981)**
acompanhar sua situação no curso: o que já cursou, o que pode cursar, montagem da
grade do semestre, contadores de carga horária (trilhas, humanidades, eletivas,
extensão) e previsão de formatura.

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
3. **UI** (`src/ui/`): React + Tailwind. Três telas: **Minha situação** (progresso em
   obrigatórias, 2º estrato, humanidades, 12 trilhas, eletivas e extensão),
   **Posso cursar** (elegíveis × oferta do semestre, com filtros) e **Grade**
   (montagem visual, conflitos de horário e de sede, relatório para a matrícula).

## Estado atual

Camada de dados (M1) pronta:

| Arquivo | Conteúdo | Fonte |
|---|---|---|
| `data/matriz-981.json` | 150 disciplinas com período, conjunto (2º estrato / 12 trilhas / humanidades), cargas horárias, pré-requisitos e equivalências | Consulta Curso e Matriz Curricular (Portal do Aluno) |
| `data/turmas/2026-1.json` | 77 disciplinas, 177 turmas, 584 horários | PDF oficial de Turmas Abertas |
| `data/turmas/2025-2.json` | 85 disciplinas, 185 turmas | Backup do Grade na Hora (leitor secundário) |

## Pipeline de dados (1× por semestre)

```
# 1. Salve a página "Turmas Abertas" do Portal do Aluno como PDF
# 2. Gere o JSON canônico
python tools/parse_turmas_pdf.py "Turmas Abertas.pdf" 2026-2

# 3. Valide — a importação só vale com 0 erros
python tools/validate_turmas.py "Turmas Abertas.pdf" data/turmas/2026-2.json

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

- **M2** — App React (Vite + TypeScript + Tailwind + shadcn/ui): upload do histórico
  (parsing local com pdf.js), painel de situação e contadores.
- **M3** — Montador de grade: filtros de preferência, planos A/B/C, detecção de
  conflitos (incluindo sedes Centro/Ecoville/Neoville), export imagem + texto de matrícula.
- **M4** — Mapa do curso (grafo de pré-requisitos) e previsão de formatura.
- **Fase 2** — Camada de comunidade: avaliações, dicas e materiais por disciplina.

## Aviso

Projeto independente, feito por aluno. Não é um sistema oficial da UTFPR.
Confira sempre os dados no Portal do Aluno antes de efetivar a matrícula.
