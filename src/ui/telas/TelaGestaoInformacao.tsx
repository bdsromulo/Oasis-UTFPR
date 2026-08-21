import type { ReactNode } from "react";
import { IconFolders } from "../icons";

/**
 * Vitrine visual do planejamento de Gestão da Informação do projeto.
 *
 * A estrutura segue o roteiro canônico da disciplina, em quatro blocos.
 * 1 PEN, 2 PETI, 3 Processo de GI e 4 Qualidade da Informação.
 *
 * O conteúdo espelha `Estrategia.md` §2, que continua sendo a fonte canônica.
 * Ao alterar as tabelas de lá, replique aqui.
 */

interface Coluna {
  chave: string;
  rotulo: string;
  /** destaca a coluna como cabeçalho de linha */
  principal?: boolean;
}

function Tabela(props: { colunas: Coluna[]; linhas: Record<string, ReactNode>[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-500 sm:hidden dark:text-zinc-400">
        Deslize horizontalmente para consultar todas as colunas.
      </p>
      <div
        className="overflow-x-auto rounded-2xl border border-zinc-200/90 dark:border-zinc-800"
        role="region"
        aria-label="Tabela com rolagem horizontal"
        tabIndex={0}
      >
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900/80">
              {props.colunas.map((c) => (
                <th
                  key={c.chave}
                  scope="col"
                  className="border-b border-zinc-200/90 px-4 py-3 font-display text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
                >
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.linhas.map((linha, i) => (
              <tr
                key={i}
                className="border-b border-zinc-100 last:border-0 transition-colors hover:bg-utfpr-50/60 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
              >
                {props.colunas.map((c) => (
                  <td
                    key={c.chave}
                    className={`px-4 py-3.5 align-top leading-relaxed ${
                      c.principal
                        ? "font-display font-bold text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {linha[c.chave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Bloco de primeiro nível do planejamento (1, 2, 3 e 4). */
function Bloco(props: { numero: string; titulo: string; descricao: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="border-b-2 border-utfpr-500/40 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl font-black leading-none text-utfpr-500">
            {props.numero}
          </span>
          <h3 className="font-display text-xl font-black tracking-tight text-zinc-900 dark:text-white">
            {props.titulo}
          </h3>
        </div>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {props.descricao}
        </p>
      </div>
      <div className="space-y-8">{props.children}</div>
    </section>
  );
}

function Secao(props: { numero: string; titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="space-y-3.5">
      <div>
        <div className="flex items-baseline gap-2.5">
          <span className="rounded-lg bg-utfpr-500/20 px-2 py-0.5 font-mono text-xs font-black text-utfpr-700 dark:text-utfpr-400">
            {props.numero}
          </span>
          <h4 className="font-display text-lg font-black tracking-tight text-zinc-900 dark:text-white">
            {props.titulo}
          </h4>
        </div>
        {props.descricao && (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {props.descricao}
          </p>
        )}
      </div>
      {props.children}
    </section>
  );
}

/** Parágrafo corrido dentro de um cartão, para as seções sem tabela. */
function Texto(props: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 text-sm leading-relaxed text-zinc-600 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
      {props.children}
    </div>
  );
}

/** Marcador de dimensão, atributo ou identificador curto. */
function Marca(props: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-utfpr-400 dark:bg-zinc-800">
      {props.children}
    </span>
  );
}

function Nivel(props: { tom: "alto" | "baixo"; children: ReactNode }) {
  const cor =
    props.tom === "alto"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-red-700 dark:text-red-400";
  return (
    <li className="leading-relaxed">
      <strong className={`font-display ${cor}`}>{props.tom === "alto" ? "Alto" : "Baixo"}</strong>{" "}
      {props.children}
    </li>
  );
}

/** Código de arquivo ou caminho citado no meio do texto. */
function Cod(props: { children: ReactNode }) {
  return (
    <code className="font-mono text-xs text-utfpr-700 dark:text-utfpr-400">{props.children}</code>
  );
}

/* ------------------------------------------------------------------ */
/* 1 — PEN                                                             */
/* ------------------------------------------------------------------ */

const SWOT = [
  {
    sigla: "S",
    titulo: "Forças",
    tom: "bom" as const,
    itens: [
      "Histórico escolar processado inteiro no navegador, sem trânsito de dado pessoal.",
      "Oito matrizes de cinco cursos cobertas pelo mesmo motor de pré-requisitos e equivalências.",
      "Pipeline de dados versionado, com validadores que reprovam a importação diante de qualquer erro.",
      "Avaliações da comunidade já publicadas, com moderação humana antes de irem ao ar.",
      "Custo de operação nulo, por rodar como site estático.",
    ],
  },
  {
    sigla: "W",
    titulo: "Fraquezas",
    tom: "ruim" as const,
    itens: [
      "Leitura posicional dos PDFs oficiais, que quebra quando a instituição muda o layout.",
      "Ausência de backend impede autenticação forte e moderação em tempo real.",
      "O aluno precisa gerar e carregar o histórico de novo a cada semestre.",
      "Nada é medido em produção, então falha de leitura e adoção ficam invisíveis.",
      "Manutenção concentrada em uma pessoa.",
    ],
  },
  {
    sigla: "O",
    titulo: "Oportunidades",
    tom: "bom" as const,
    itens: [
      "Demanda sazonal garantida a cada rematrícula, duas vezes por ano.",
      "Comunidade disposta a contribuir com avaliação de turma e de professor.",
      "Novos cursos do câmpus publicam documentos no mesmo formato, o que barateia a expansão.",
      "Reconhecimento como material de apoio pelas coordenações e centros acadêmicos.",
    ],
  },
  {
    sigla: "T",
    titulo: "Ameaças",
    tom: "ruim" as const,
    itens: [
      "Troca de matriz vigente invalida dados já publicados.",
      "Mudança de formato do PDF de Turmas Abertas interrompe a atualização semestral.",
      "Conteúdo difamatório nas avaliações, com risco de exposição de professores.",
      "Leitura do projeto como concorrente do Portal do Aluno.",
      "Evasão de contribuidores deixa as avaliações envelhecerem.",
    ],
  },
];

const OBJETIVOS = [
  {
    rotulo: "Encurtar a decisão de matrícula",
    texto:
      "Levar o aluno da dúvida ao conjunto de turmas viáveis em poucos minutos, sem precisar abrir o PDF da matriz nem cruzar tabelas à mão.",
  },
  {
    rotulo: "Tornar a integralização legível",
    texto:
      "Mostrar quanto falta em cada categoria da matriz do aluno, contando estágio, extensão curricular, trilhas e eletivas.",
  },
  {
    rotulo: "Evitar o erro que custa um semestre",
    texto:
      "Apontar choque de horário, pré-requisito não cumprido e deslocamento inviável entre sedes ainda durante a montagem da grade.",
  },
  {
    rotulo: "Dar transparência à experiência de turma",
    texto:
      "Publicar avaliação moderada de disciplina e de professor, para que a escolha de turma deixe de depender de conversa de corredor.",
  },
  {
    rotulo: "Manter o dado pessoal fora do projeto",
    texto:
      "Garantir que o histórico escolar seja lido apenas na máquina do aluno, sem envio, sem armazenamento remoto e sem registro.",
  },
];

/* ------------------------------------------------------------------ */
/* 2 — PETI                                                            */
/* ------------------------------------------------------------------ */

const ESTRATEGIA_TI = [
  "Computação no cliente. O navegador do aluno faz a leitura do histórico e roda o motor de inferência, o que dispensa servidor e mantém o documento em memória local.",
  "Dado público versionado. Matriz e oferta viram JSON no repositório, com validador dedicado por matriz que reprova a importação diante de qualquer erro.",
  "Entrega contínua no GitHub Pages, com build tipado e verificação de bundle a cada publicação.",
  "Terceiros apenas na fronteira de coleta. O formulário recebe a avaliação, e a publicação só acontece depois de moderação humana.",
];

const ELEMENTOS_TI = [
  {
    rotulo: "Plano de Software",
    texto:
      "React 19, TypeScript, Vite e Tailwind CSS v4 na interface. A biblioteca pdfjs-dist lê o histórico em tempo de execução. Python 3 com pypdf e pdfplumber alimenta os parsers de matriz e de turmas, que rodam fora do site.",
  },
  {
    rotulo: "Plano de Hardware e Infraestrutura",
    texto:
      "Nenhum servidor próprio. Hospedagem estática no GitHub Pages, GitHub Actions para a ingestão semanal das avaliações, e o navegador do usuário como unidade de processamento. Interface responsiva do celular ao desktop.",
  },
  {
    rotulo: "Plano de Informação",
    texto:
      "Importação validada por matriz, camada de anotações curadas separada da fonte oficial, e o ciclo de GI descrito no bloco 3 como contrato de manutenção semestral.",
  },
  {
    rotulo: "Plano de RH",
    texto:
      "Manutenção pelo dono do projeto, com moderação semanal das avaliações e revisão semestral da oferta. A comunidade contribui pela submissão de avaliação, sem acesso de escrita ao repositório.",
  },
];

/** Marca o quanto um indicador é de fato medido hoje. */
function Afericao(props: { tom: "auto" | "manual" | "ausente"; children: ReactNode }) {
  const cor = {
    auto: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    manual: "bg-utfpr-500/20 text-utfpr-700 dark:text-utfpr-400",
    ausente: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  }[props.tom];
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${cor}`}>
      {props.children}
    </span>
  );
}

const INDICADORES = [
  {
    objetivo: "Encurtar a decisão de matrícula",
    indicador: "Tempo entre carregar o histórico e obter a lista de turmas viáveis",
    meta: "Abaixo de 2 minutos",
    afericao: <Afericao tom="ausente">Sem instrumentação</Afericao>,
  },
  {
    objetivo: "Encurtar a decisão de matrícula",
    indicador: "Tempo de leitura do histórico em PDF dentro do navegador",
    meta: "Abaixo de 1000 ms",
    afericao: <Afericao tom="ausente">Sem instrumentação</Afericao>,
  },
  {
    objetivo: "Tornar a integralização legível",
    indicador: "Divergência entre o progresso calculado e o histórico oficial",
    meta: "Zero divergência nas matrizes cobertas",
    afericao: <Afericao tom="auto">Suíte de testes por curso</Afericao>,
  },
  {
    objetivo: "Tornar a integralização legível",
    indicador: "Erros nos validadores de matriz e de turmas",
    meta: "Zero erro em toda importação",
    afericao: (
      <Afericao tom="auto">
        <Cod>tools/validate_*.py</Cod>
      </Afericao>
    ),
  },
  {
    objetivo: "Evitar o erro que custa um semestre",
    indicador: "Choque de horário não apontado na montagem da grade",
    meta: "Zero falso negativo",
    afericao: <Afericao tom="auto">Testes do motor de grade</Afericao>,
  },
  {
    objetivo: "Dar transparência à experiência de turma",
    indicador: "Avaliações moderadas e publicadas por ciclo de ingestão",
    meta: "Crescimento a cada semestre letivo",
    afericao: <Afericao tom="manual">Moderação semanal e commit da Action</Afericao>,
  },
  {
    objetivo: "Manter o dado pessoal fora do projeto",
    indicador: "Bytes do histórico escolar que alcançam a rede",
    meta: "Zero",
    afericao: <Afericao tom="manual">Revisão de código e verificação de bundle</Afericao>,
  },
];

/* ------------------------------------------------------------------ */
/* 3 — Processo de GI                                                  */
/* ------------------------------------------------------------------ */

const EXIGENCIAS = [
  {
    quem: "Aluno dos cursos atendidos",
    info: "Quanto falta para integralizar cada categoria da minha matriz, contando estágio, extensão curricular, trilhas e eletivas? Qual meu coeficiente de rendimento absoluto e normalizado?",
    quando: "Contínuo, com pico ao fim do semestre",
  },
  {
    quem: "Aluno dos cursos atendidos",
    info: "Quais disciplinas estou liberado a cursar, cruzando os pré-requisitos já cumpridos com a oferta do semestre?",
    quando: "Matrícula e rematrícula",
  },
  {
    quem: "Aluno dos cursos atendidos",
    info: "Há choque de horário ou deslocamento inviável entre Centro, Ecoville e Neoville na grade que estou montando? Quanto ela me aproxima da formatura?",
    quando: "Período de matrícula",
  },
  {
    quem: "Aluno dos cursos atendidos",
    info: "Em quantos semestres eu me formo mantendo este ritmo, e qual sequência de disciplinas sustenta essa projeção?",
    quando: "Planejamento de médio prazo",
  },
  {
    quem: "Aluno dos cursos atendidos",
    info: "Como foi a experiência de quem já cursou esta disciplina com este professor, em didática, dificuldade e carga de trabalho?",
    quando: "Antes de escolher turmas",
  },
  {
    quem: "Aluno contribuidor",
    info: "Quais das minhas disciplinas concluídas posso avaliar, e o que exatamente ficará público quando eu enviar?",
    quando: "Após concluir a disciplina",
  },
  {
    quem: "Moderador",
    info: "Quais respostas novas chegaram desde a última rodada, e quais trazem ataque pessoal ou dado pessoal de terceiros?",
    quando: "Semanal",
  },
  {
    quem: "Mantenedor",
    info: "A matriz vigente mudou? Quais turmas abriram no semestre? Os validadores fecham sem nenhum erro?",
    quando: "Semestral",
  },
];

const FONTES = [
  {
    fonte: "Matriz curricular por curso",
    formato: "PDF do Portal do Aluno, na Consulta Curso e Matriz Curricular",
    quem: "Mantenedor",
    quando: "A cada alteração de matriz",
  },
  {
    fonte: "Turmas abertas do semestre",
    formato: "PDF oficial de Turmas Abertas",
    quem: "Mantenedor",
    quando: "Semestral, antes da rematrícula",
  },
  {
    fonte: "Grade na Hora",
    formato: "Página exportada em HTML",
    quem: "Mantenedor",
    quando: "Conferência secundária da oferta, quando o PDF oficial atrasa",
  },
  {
    fonte: "Projeto Pedagógico de Curso",
    formato: "PDF público do curso",
    quem: "Mantenedor",
    quando: "Referência das regras de estágio, extensão e trilhas",
  },
  {
    fonte: "Histórico escolar",
    formato: "PDF gerado pelo próprio aluno no Portal",
    quem: "O aluno, dentro do navegador dele",
    quando: "A cada semestre, ou quando quiser reconferir",
  },
  {
    fonte: "Avaliação de turma",
    formato: "Formulário com login institucional obrigatório",
    quem: "Aluno contribuidor",
    quando: "Contínuo, com publicação semanal",
  },
];

const AQUISICAO = [
  {
    info: "Matrizes atendidas (981, 806, 844, 962, 968, 978, 823 e 973)",
    dado: "Disciplinas, período, conjunto e categoria, cargas horárias, pré-requisitos e equivalências",
    fonte: (
      <>
        Consulta Curso e Matriz Curricular no Portal do Aluno, convertida por{" "}
        <Cod>tools/parse_matriz.py</Cod> em <Cod>data/matriz-&lt;n&gt;.json</Cod>
      </>
    ),
  },
  {
    info: "Regras de integralização de cada curso",
    dado: "Exigência de estágio, de extensão curricular, número de trilhas e carga de eletivas",
    fonte: (
      <>
        Rodapé da matriz e Projeto Pedagógico do Curso, refletidos em{" "}
        <Cod>src/domain/cursos.ts</Cod>
      </>
    ),
  },
  {
    info: "Oferta de turmas do semestre",
    dado: "Códigos de turma, horários por turno e slot, sede e sala, professores e prioridade de curso",
    fonte: (
      <>
        PDF oficial de Turmas Abertas, convertido por <Cod>tools/parse_turmas_pdf.py</Cod> em{" "}
        <Cod>data/&lt;curso&gt;/turmas/&lt;sem&gt;.json</Cod>
      </>
    ),
  },
  {
    info: "Conferência da oferta publicada",
    dado: "Turmas e horários divulgados fora do PDF oficial",
    fonte: (
      <>
        Exportação do Grade na Hora, lida por <Cod>tools/parse_gnh_html.py</Cod> como leitura
        secundária de backup
      </>
    ),
  },
  {
    info: "Correções vindas da vivência do curso",
    dado: "Divergências entre a matriz publicada e a prática, como o pré-requisito de TC1",
    fonte: (
      <>
        Camada curada em <Cod>data/anotacoes-981.json</Cod>, aplicada por{" "}
        <Cod>tools/aplicar_anotacoes.py</Cod> sem sobrescrever a fonte oficial
      </>
    ),
  },
  {
    info: "Progresso individual do aluno",
    dado: "RA, disciplinas cursadas, notas, frequência, situação e créditos",
    fonte: (
      <>
        Histórico Escolar em PDF,{" "}
        <strong>processado apenas no navegador, sem trânsito em rede</strong>
      </>
    ),
  },
  {
    info: "Avaliação de disciplina e de professor",
    dado: "Didática, personalidade, dificuldade, carga de trabalho, recomendação e comentário em texto",
    fonte: (
      <>
        Formulário com login institucional, moderado na planilha privada e publicado em{" "}
        <Cod>data/reviews.json</Cod> pela ingestão semanal
      </>
    ),
  },
];

const DISTRIBUICAO = [
  {
    quem: "Aluno dos cursos atendidos",
    como: "Minha Situação, com progresso por categoria e coeficiente de rendimento. Posso Cursar, com o cruzamento entre pré-requisito cumprido e oferta do semestre. Catálogo de Matérias, com busca e filtro por categoria.",
  },
  {
    quem: "Aluno montando a grade",
    como: "Grade visual com detecção de choque de horário e alerta de deslocamento entre sedes. Grade Mágica, que sugere combinações automáticas. Relatório copiável pronto para colar no Portal do Aluno.",
  },
  {
    quem: "Aluno planejando o curso inteiro",
    como: "Fluxograma da matriz, que mostra o caminho de pré-requisitos até cada disciplina. Simulador de Formatura, com projeção dos semestres restantes a partir do ritmo atual.",
  },
  {
    quem: "Aluno escolhendo entre turmas",
    como: "Painel de professor e painel de disciplina, abertos direto da turma na grade, com médias, distribuição das notas dadas pela comunidade e comentários já moderados.",
  },
  {
    quem: "Aluno contribuidor",
    como: "Botão Avaliar nas disciplinas concluídas, seletor de professor montado a partir da oferta, aviso do que ficará público antes do envio, e a lista das próprias avaliações enviadas.",
  },
  {
    quem: "Aluno planejando com colegas",
    como: "Amigos e Match, com compartilhamento de grade por link e comparação de horários entre pessoas do mesmo curso.",
  },
  {
    quem: "Moderador",
    como: "Planilha privada com as respostas brutas, coluna de aprovação preenchida à mão, e nada publicado por omissão.",
  },
  {
    quem: "Mantenedor",
    como: "Repositório versionado, validadores que reprovam a importação em qualquer erro, e Action semanal que regenera as avaliações publicadas.",
  },
];

const FEEDBACK = [
  "Alertas visuais imediatos de observações do parser e inconsistências (perfil.avisos, painel.inconsistencias).",
  "Badges dinâmicas de status da grade em tempo real (contagem de aulas/semana, Sem conflitos vs Choque de horário) e simulação de impulso no progresso curricular.",
  "Copiador de relatório de matrícula pronto para colagem no portal oficial.",
  "Futuro: fila de moderação de avaliações da comunidade e sinal de dificuldade média retroalimentando a decisão de escolha de turmas de outros alunos.",
];

/* ------------------------------------------------------------------ */
/* 4 — Qualidade da Informação                                         */
/* ------------------------------------------------------------------ */

const QUALIDADE = [
  {
    info: "Disciplinas abertas no semestre vigente",
    dado: (
      <>
        Matérias ofertadas no semestre (<Cod>data/&lt;curso&gt;/turmas/&lt;sem&gt;.json</Cod>)
      </>
    ),
    dimensao: (
      <>
        <Marca>d1</Marca> Atualidade
      </>
    ),
    atributos: (
      <>
        <Marca>a1</Marca> intervalo de tempo
        <ul className="mt-2 space-y-1.5 text-xs">
          <Nivel tom="alto">
            se a oferta publicada é datada com intervalo máximo de até 2 meses antes do início do
            semestre letivo vigente.
          </Nivel>
          <Nivel tom="baixo">
            se a oferta publicada é datada com intervalo superior a 2 meses antes do início do
            semestre letivo vigente.
          </Nivel>
        </ul>
      </>
    ),
  },
  {
    info: "Progresso no curso e integralização",
    dado: "Histórico Escolar em PDF do aluno",
    dimensao: (
      <>
        <Marca>d2</Marca> Confiabilidade e Precisão
      </>
    ),
    atributos: (
      <>
        <Marca>a2</Marca> fidelidade posicional
        <ul className="mt-2 space-y-1.5 text-xs">
          <Nivel tom="alto">
            se toda linha de disciplina traz código, nome e carga horária alinhados, validados contra
            as invariantes do curso, sem nenhum erro.
          </Nivel>
          <Nivel tom="baixo">
            se há falha de leitura ou divergência de carga horária em dependências e equivalências.
          </Nivel>
        </ul>
      </>
    ),
  },
  {
    info: "Horários e sedes das aulas",
    dado: (
      <>
        Conflito de turno e de sala (<Cod>motor/grade.ts</Cod>)
      </>
    ),
    dimensao: (
      <>
        <Marca>d3</Marca> Integridade
      </>
    ),
    atributos: (
      <>
        <Marca>a3</Marca> completeza relacional
        <ul className="mt-2 space-y-1.5 text-xs">
          <Nivel tom="alto">
            se cada slot da grade identifica sem ambiguidade dia, turno, aula, disciplina, turma e
            sala com sede.
          </Nivel>
          <Nivel tom="baixo">
            se há slot órfão ou turma sem indicação de sede, o que inviabiliza o cálculo de
            deslocamento.
          </Nivel>
        </ul>
      </>
    ),
  },
  {
    info: "Avaliações da comunidade",
    dado: "Didática, dificuldade, carga de trabalho e comentário por turma",
    dimensao: (
      <>
        <Marca>d4</Marca> Credibilidade
      </>
    ),
    atributos: (
      <>
        <Marca>a4</Marca> origem institucional e curadoria
        <ul className="mt-2 space-y-1.5 text-xs">
          <Nivel tom="alto">
            se a resposta vem de conta institucional da UTFPR, passa por revisão humana e chega ao
            site pela ingestão validada.
          </Nivel>
          <Nivel tom="baixo">
            se o texto é publicado sem moderação, ou sem âncora de vínculo, o que abre espaço para
            spam e ataque pessoal.
          </Nivel>
        </ul>
      </>
    ),
  },
  {
    info: "Dado pessoal do aluno",
    dado: "Conteúdo do histórico escolar carregado na plataforma",
    dimensao: (
      <>
        <Marca>d5</Marca> Confidencialidade e Privacidade
      </>
    ),
    atributos: (
      <>
        <Marca>a5</Marca> superfície de exposição
        <ul className="mt-2 space-y-1.5 text-xs">
          <Nivel tom="alto">
            se o documento é lido apenas em memória, no navegador do aluno, e nenhum byte dele
            alcança a rede ou o repositório.
          </Nivel>
          <Nivel tom="baixo">
            se qualquer trecho do documento é enviado, registrado em log ou versionado.
          </Nivel>
        </ul>
      </>
    ),
  },
];

const REFERENCIA_DIMENSOES: { dimensao: string; aspecto: string; onde: ReactNode }[] = [
  {
    dimensao: "Abrangência e escopo",
    aspecto: "A informação de que o público precisa está completa e sem excesso desnecessário?",
    onde: "Não avaliada nesta versão",
  },
  {
    dimensao: "Integridade",
    aspecto: "A informação está íntegra, sem corrupção nem adulteração?",
    onde: <Marca>d3</Marca>,
  },
  {
    dimensao: "Acurácia e veracidade",
    aspecto: "A informação pode ser considerada fiel aos fatos que representa?",
    onde: <Marca>d2</Marca>,
  },
  {
    dimensao: "Confidencialidade e privacidade",
    aspecto: "A informação é acessada somente por quem tem direito a ela?",
    onde: <Marca>d5</Marca>,
  },
  {
    dimensao: "Disponibilidade",
    aspecto: "A informação é acessada com facilidade por quem tem direito a ela?",
    onde: "Não avaliada nesta versão",
  },
  {
    dimensao: "Atualidade",
    aspecto: "A informação é gerada e atualizada nos intervalos que o público considera adequados?",
    onde: <Marca>d1</Marca>,
  },
  {
    dimensao: "Ineditismo e raridade",
    aspecto: "Trata-se de informação difícil de obter, rara ou escassa?",
    onde: "Não avaliada nesta versão",
  },
  {
    dimensao: "Contextualização",
    aspecto: "A informação é atraente para o público a que se destina?",
    onde: "Não avaliada nesta versão",
  },
  {
    dimensao: "Precisão",
    aspecto: "A informação está detalhada o bastante para uso imediato?",
    onde: <Marca>d2</Marca>,
  },
  {
    dimensao: "Confiabilidade",
    aspecto: "A fonte e o conteúdo têm credibilidade perante o público?",
    onde: (
      <>
        <Marca>d2</Marca> <Marca>d4</Marca>
      </>
    ),
  },
  {
    dimensao: "Existência",
    aspecto: "Em quantas mentes, locais físicos e locais virtuais a informação está disponível?",
    onde: "Não avaliada nesta versão",
  },
];

/* ------------------------------------------------------------------ */

function ListaTopicos(props: { itens: { rotulo: string; texto: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {props.itens.map((it) => (
        <div
          key={it.rotulo}
          className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="font-display text-xs font-black uppercase tracking-wider text-utfpr-700 dark:text-utfpr-400">
            {it.rotulo}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{it.texto}</p>
        </div>
      ))}
    </div>
  );
}

function QuadranteSwot() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SWOT.map((q) => (
        <div
          key={q.sigla}
          className={`rounded-2xl border bg-white p-4 shadow-xs dark:bg-zinc-900 ${
            q.tom === "bom"
              ? "border-emerald-500/40 dark:border-emerald-500/30"
              : "border-red-500/40 dark:border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md font-display text-xs font-black text-white ${
                q.tom === "bom" ? "bg-emerald-600" : "bg-red-600"
              }`}
            >
              {q.sigla}
            </span>
            <span className="font-display text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              {q.titulo}
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {q.itens.map((it) => (
              <li
                key={it}
                className="flex gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    q.tom === "bom" ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ListaSimples(props: { itens: string[] }) {
  return (
    <ul className="space-y-2.5 rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {props.itens.map((f) => (
        <li key={f} className="flex gap-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function TelaGestaoInformacao() {
  return (
    <div className="space-y-12">
      <header className="rounded-3xl border-2 border-zinc-200/90 bg-white/95 p-6 shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/95">
        <div className="flex items-start gap-4">
          <IconFolders className="h-4 w-4 shrink-0" />
          <div>
            <h2 className="font-display text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              Gestão da Informação
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              O planejamento informacional do Oásis UTFPR segue quatro blocos. O PEN define onde o
              projeto está, para onde quer ir e como pretende chegar. O PETI traduz isso em
              tecnologia, pessoas e indicadores. O Processo de GI descreve o ciclo de vida da
              informação acadêmica que a plataforma trata. A Qualidade da Informação fecha com as
              dimensões usadas para julgar cada dado publicado. Esta página é a leitura visual das
              tabelas mantidas em <Cod>Estrategia.md</Cod>.
            </p>
          </div>
        </div>
      </header>

      <Bloco
        numero="1"
        titulo="PEN — Planejamento Estratégico de Negócios"
        descricao="Onde estamos, para onde queremos ir e qual estratégia adotamos."
      >
        <Secao numero="1.1" titulo="Análise do cenário atendido" descricao="Onde estamos hoje.">
          <Texto>
            <p>
              O planejamento acadêmico na UTFPR Curitiba depende de documentos que vivem separados.
              A matriz curricular chega em um PDF, a oferta do semestre em outro, e o histórico
              escolar em um terceiro. Cada um usa numeração e vocabulário próprios, e nenhum deles
              responde sozinho à pergunta que o aluno faz no período de matrícula, que é o que dá
              para cursar agora sem choque de horário e sem atrasar a formatura.
            </p>
            <p className="mt-3">
              Ferramentas de apoio como o Grade na Hora cobrem a montagem de horários, porém não
              conhecem pré-requisito, categoria de matriz nem progresso individual. O resultado é uma
              decisão de alto impacto tomada em poucos dias, com planilha improvisada e conversa de
              corredor.
            </p>
          </Texto>
          <QuadranteSwot />
        </Secao>

        <Secao numero="1.2" titulo="Definição de objetivos" descricao="Para onde queremos ir.">
          <ListaTopicos itens={OBJETIVOS} />
        </Secao>

        <Secao numero="1.3" titulo="Definição da estratégia" descricao="Como pretendemos chegar lá.">
          <Texto>
            <p>
              A estratégia adotada é a de camada de leitura sobre os documentos oficiais. O Oásis não
              registra nota, não efetiva matrícula e não substitui o Portal do Aluno. Ele consome o
              que a instituição já publica, converte em dado estruturado e versionado, e devolve ao
              aluno uma resposta acionável.
            </p>
            <p className="mt-3">
              A operação segue como site estático, decisão que mantém custo nulo, elimina superfície
              de servidor e permite auditar cada dado publicado pelo histórico do Git. O dado pessoal
              fica fora dessa equação por desenho, já que o histórico escolar nunca sai da máquina de
              quem o carrega.
            </p>
          </Texto>
        </Secao>
      </Bloco>

      <Bloco
        numero="2"
        titulo="PETI — Planejamento Estratégico de TI"
        descricao="Como a estratégia de negócio vira infraestrutura, tecnologia, pessoas e métrica."
      >
        <Secao numero="2.1" titulo="Estratégia de TI">
          <ListaSimples itens={ESTRATEGIA_TI} />
        </Secao>

        <Secao numero="2.2" titulo="Elementos de TI sugeridos">
          <ListaTopicos itens={ELEMENTOS_TI} />
        </Secao>

        <Secao
          numero="2.3"
          titulo="Indicadores"
          descricao="Cada indicador nasce amarrado a um objetivo do PEN. A última coluna registra, sem maquiagem, o que já é medido e o que ainda depende de instrumentação."
        >
          <Tabela
            colunas={[
              { chave: "objetivo", rotulo: "Objetivo relacionado (PEN)", principal: true },
              { chave: "indicador", rotulo: "Indicador" },
              { chave: "meta", rotulo: "Meta" },
              { chave: "afericao", rotulo: "Aferição hoje" },
            ]}
            linhas={INDICADORES}
          />
        </Secao>
      </Bloco>

      <Bloco
        numero="3"
        titulo="Processo de GI"
        descricao="O ciclo de vida da informação acadêmica percorre quatro etapas e atende quatro perfis, que são o aluno dos cursos atendidos, o aluno contribuidor, o moderador e o mantenedor."
      >
        <Secao
          numero="3.1"
          titulo="Determinação das exigências"
          descricao="Quem precisa de qual informação, e quando."
        >
          <Tabela
            colunas={[
              { chave: "quem", rotulo: "Quem?", principal: true },
              { chave: "info", rotulo: "Informação exigida" },
              { chave: "quando", rotulo: "Quando?" },
            ]}
            linhas={EXIGENCIAS}
          />
        </Secao>

        <Secao
          numero="3.2"
          titulo="Obtenção da informação"
          descricao="De onde a informação vem, quem a busca e com que periodicidade."
        >
          <div className="space-y-6">
            <div className="space-y-2.5">
              <div className="font-display text-sm font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                3.2.1 Fontes e responsáveis
              </div>
              <Tabela
                colunas={[
                  { chave: "fonte", rotulo: "Fonte", principal: true },
                  { chave: "formato", rotulo: "Formato" },
                  { chave: "quem", rotulo: "Quem obtém" },
                  { chave: "quando", rotulo: "Periodicidade" },
                ]}
                linhas={FONTES}
              />
            </div>
            <div className="space-y-2.5">
              <div className="font-display text-sm font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                3.2.2 Plano de aquisição de dados
              </div>
              <Tabela
                colunas={[
                  { chave: "info", rotulo: "Informação exigida", principal: true },
                  { chave: "dado", rotulo: "Dado a ser obtido" },
                  { chave: "fonte", rotulo: "Fonte do dado a ser obtido" },
                ]}
                linhas={AQUISICAO}
              />
            </div>
          </div>
        </Secao>

        <Secao
          numero="3.3"
          titulo="Distribuição da informação"
          descricao="Quem recebe a informação, e por qual canal."
        >
          <Tabela
            colunas={[
              { chave: "quem", rotulo: "Quem?", principal: true },
              { chave: "como", rotulo: "Como?" },
            ]}
            linhas={DISTRIBUICAO}
          />
        </Secao>

        <Secao
          numero="3.4"
          titulo="Feedback da utilização"
          descricao="Como o uso da informação retroalimenta o ciclo."
        >
          <ListaSimples itens={FEEDBACK} />
        </Secao>
      </Bloco>

      <Bloco
        numero="4"
        titulo="Qualidade da Informação"
        descricao="Cada informação tratada pela plataforma é julgada por dimensões e atributos, com faixas explícitas de nível alto e baixo."
      >
        <Secao
          numero="4.1"
          titulo="Definição das dimensões e atributos"
          descricao="As cinco dimensões que o projeto avalia hoje, cada uma com o atributo que a torna verificável."
        >
          <Tabela
            colunas={[
              { chave: "info", rotulo: "Informação", principal: true },
              { chave: "dado", rotulo: "Dado coletado avaliado" },
              { chave: "dimensao", rotulo: "Dimensão avaliada" },
              { chave: "atributos", rotulo: "Atributos avaliados" },
            ]}
            linhas={QUALIDADE}
          />
        </Secao>

        <Secao
          numero="4.2"
          titulo="Referência das dimensões"
          descricao="O quadro completo de dimensões de qualidade da informação, com a marca de onde cada uma entra no Oásis. As não avaliadas ficam declaradas, e não escondidas."
        >
          <Tabela
            colunas={[
              { chave: "dimensao", rotulo: "Dimensão", principal: true },
              { chave: "aspecto", rotulo: "Aspecto a ser analisado" },
              { chave: "onde", rotulo: "No Oásis" },
            ]}
            linhas={REFERENCIA_DIMENSOES}
          />
        </Secao>
      </Bloco>

      <p className="pb-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
        Fonte canônica: <code className="font-mono">Estrategia.md</code> §2, Modelagem de Gestão da
        Informação.
      </p>
    </div>
  );
}
