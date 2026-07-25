import type { ReactNode } from "react";
import { Badge, Card } from "../componentes";
import {
  IconBookOpen,
  IconCalendar,
  IconFileText,
  IconShieldLock,
  IconUser,
} from "../icons";
import {
  IlustracaoFluxoHistorico,
  IlustracaoFontes,
  IlustracaoSemestres,
} from "./ilustracoes";

/**
 * Página "Como Usar o Site" — manual da plataforma (TASK-18).
 *
 * Abre em qualquer ambiente, pelo botão "?" vizinho ao "Sobre" e à engrenagem,
 * e por isso não pode depender de `perfil`.
 *
 * Espelha o comportamento real das telas: ao mudar o que uma tela mostra, o que
 * ela aceita como interação ou de onde ela tira o dado, atualize aqui também —
 * um manual desatualizado engana mais do que a ausência dele.
 */

interface Tela {
  nome: string;
  exige?: "historico";
  mostra: string;
  interacoes: string[];
  alimenta: string;
}

const TELAS: Tela[] = [
  {
    nome: "Minha Situação · Painel Geral",
    exige: "historico",
    mostra:
      "Onde você está no curso: progresso geral em rosca, carga horária cumprida e faltante por categoria (obrigatórias, estratos, trilhas, eletivas, extensão e estágio), coeficientes de rendimento e pendências do seu período.",
    interacoes: [
      "Abrir cada categoria para ver o que já conta e o que ainda falta",
      "Saltar direto para o Catálogo a partir de uma pendência",
    ],
    alimenta:
      "Os quadros-resumo do seu Histórico Escolar cruzados com as exigências da sua matriz curricular.",
  },
  {
    nome: "Minha Situação · Catálogo",
    exige: "historico",
    mostra:
      "A lista completa das disciplinas da sua matriz, período a período, marcando o que você já cumpriu, o que está cursando e o que continua pendente.",
    interacoes: [
      "Filtrar por categoria curricular e por período",
      "Buscar disciplina por nome ou código",
      "Expandir uma disciplina para ver carga, pré-requisitos e equivalências",
    ],
    alimenta:
      "A matriz curricular oficial do curso, sobreposta ao que o seu histórico registra como aprovado, matriculado ou pendente.",
  },
  {
    nome: "Minha Situação · Árvore & Trilhas",
    exige: "historico",
    mostra:
      "O fluxograma de progressão do curso: cada disciplina como um nó, ligada às que ela destrava, e o mapa das trilhas optativas com o quanto de cada uma você já validou.",
    interacoes: [
      "Navegar e dar zoom no board de progressão",
      "Clicar num nó para ver pré-requisitos e o que ele libera à frente",
      "Comparar trilhas para decidir qual fechar primeiro",
    ],
    alimenta:
      "A cadeia de pré-requisitos da matriz, o agrupamento por conjunto/trilha e o seu histórico para colorir o que já foi cumprido.",
  },
  {
    nome: "Planejamento · Matérias Abertas",
    mostra:
      "Tudo o que está efetivamente aberto no semestre escolhido, com turmas, horários, salas, sedes, vagas, reserva, prioridade de curso e professor. Sem histórico, funciona em Modo Livre e mostra a oferta inteira.",
    interacoes: [
      "Adicionar e remover turmas da grade em construção",
      "Espiar uma turma no preview antes de decidir",
      "Filtrar por categoria, buscar por nome/código e ordenar a lista",
      "Ocultar automaticamente turmas que conflitam com o que já está na grade",
      "Alternar entre o Layout Oásis e o Layout Grade na Hora",
      "Abrir a Grade Mágica para montar combinações automaticamente",
    ],
    alimenta:
      "A relação de Turmas Abertas do semestre. Com histórico, o motor de elegibilidade ainda cruza cada disciplina com os seus pré-requisitos já cumpridos.",
  },
  {
    nome: "Planejamento · Minha Grade",
    mostra:
      "A grade da semana montada com as turmas escolhidas, os choques de horário e os conflitos de deslocamento entre sedes no mesmo turno.",
    interacoes: [
      "Manter grades alternativas em paralelo (A, B e C) e alternar entre elas",
      "Copiar a lista de códigos no formato de digitação do Portal",
      "Exportar a grade como imagem",
      "Ver, a cada turma adicionada, o impulso que ela dá em cada categoria",
    ],
    alimenta:
      "As turmas que você selecionou, os horários da oferta e — quando há histórico — as regras de integralização da sua matriz.",
  },
  {
    nome: "Simulador de Formatura",
    exige: "historico",
    mostra:
      "Uma projeção de quando você se forma: quantos semestres faltam segundo o ritmo escolhido e o que precisa ser cumprido em cada categoria até lá.",
    interacoes: [
      "Ajustar o ritmo (disciplinas por semestre) e o semestre de partida",
      "Ver a linha do tempo até a formatura e os requisitos ainda em aberto",
    ],
    alimenta:
      "O que o seu histórico já cumpriu, as exigências da matriz e a sazonalidade real das ofertas — quais disciplinas costumam abrir em cada semestre.",
  },
  {
    nome: "Oásis Match",
    mostra:
      "A comparação da sua grade com a de colegas: aulas em comum, horários livres coincidentes e as disciplinas que vocês poderiam cursar juntos.",
    interacoes: [
      "Gerar o seu código de compartilhamento (Oásis Code)",
      "Colar o código de um amigo para comparar as grades",
    ],
    alimenta:
      "Um código gerado no seu navegador e trocado diretamente entre vocês. Não há servidor no meio: nada é publicado, nada fica hospedado.",
  },
  {
    nome: "Configurações",
    mostra:
      "O controle da sessão local: tema, layout, importação e troca de histórico, filtros de conflito e limpeza dos dados.",
    interacoes: [
      "Importar ou atualizar o PDF do Histórico Escolar",
      "Alternar tema (claro, escuro ou seguir o sistema) e layout",
      "Ativar o Modo Privado, que guarda a sessão só até a aba fechar",
      "Trocar de usuário ou apagar todos os dados salvos",
    ],
    alimenta:
      "Preferências guardadas no armazenamento local do próprio navegador.",
  },
];

interface Fonte {
  titulo: string;
  texto: string;
  etiqueta: string;
}

const FONTES: Fonte[] = [
  {
    titulo: "O seu Histórico Escolar",
    etiqueta: "Local",
    texto:
      "É o que personaliza a plataforma inteira. Lido no seu navegador, nunca enviado a lugar nenhum — nem para o Oásis, que não tem servidor para recebê-lo.",
  },
  {
    titulo: "Coleta coletiva de vivências",
    etiqueta: "Comunidade",
    texto:
      "O que os estudantes relatam da prática, e que o documento oficial não reflete: pré-requisito que na realidade não trava a matrícula, equivalência aceita no balcão, eletiva que vale para o curso. Cada caso observado vira uma correção registrada sobre o dado oficial.",
  },
  {
    titulo: "Projetos Pedagógicos de Curso (PPCs)",
    etiqueta: "Oficial",
    texto:
      "Definem as regras de integralização de cada curso: quantas trilhas fechar, quanto de optativa, de eletiva, de extensão e de estágio é exigido para formar.",
  },
  {
    titulo: "Matrizes curriculares",
    etiqueta: "Oficial",
    texto:
      "A lista canônica de disciplinas, com carga horária, período, conjunto, pré-requisitos e equivalências. É a régua contra a qual o seu histórico é comparado.",
  },
  {
    titulo: "Relação de Turmas Abertas",
    etiqueta: "Oficial",
    texto:
      "O PDF de Turmas Abertas do Portal do Aluno, importado a cada semestre. É de onde saem turmas, horários, salas, sedes, vagas, reservas e prioridade de curso.",
  },
];

function Secao(props: {
  numero: string;
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3.5">
      <div>
        <div className="flex items-baseline gap-2.5">
          <span className="rounded-lg bg-utfpr-500/20 px-2 py-0.5 font-mono text-xs font-black text-utfpr-700 dark:text-utfpr-400">
            {props.numero}
          </span>
          <h3 className="font-display text-lg font-black tracking-tight text-zinc-900 dark:text-white">
            {props.titulo}
          </h3>
        </div>
        {props.descricao && (
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {props.descricao}
          </p>
        )}
      </div>
      {props.children}
    </section>
  );
}

/** Etapa numerada do caminho do histórico até a tela. */
function Passo(props: { n: number; titulo: string; children: ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-utfpr-500 font-mono text-xs font-black text-zinc-950">
        {props.n}
      </span>
      <div className="min-w-0 pt-0.5">
        <h4 className="font-display text-sm font-black tracking-tight text-zinc-900 dark:text-white">
          {props.titulo}
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {props.children}
        </p>
      </div>
    </li>
  );
}

export function TelaComoUsar() {
  return (
    <div className="space-y-10">
      {/* Capa */}
      <header className="rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-utfpr-500/15 via-white to-white p-7 shadow-xs dark:border-zinc-800 dark:from-utfpr-500/10 dark:via-zinc-900 dark:to-zinc-900">
        <Badge tom="acento">Manual da plataforma</Badge>
        <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          Como usar o site
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          O que cada página mostra, o que dá para fazer nelas e de onde vem cada
          informação que você lê aqui dentro.
        </p>
      </header>

      {/* 01 — Começando */}
      <Secao
        numero="01"
        titulo="Por onde começar"
        descricao="Há dois jeitos de entrar, e eles mudam o que a plataforma consegue responder."
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Card>
            <div className="flex items-center gap-2">
              <IconFileText className="h-4.5 w-4.5 text-utfpr-600 dark:text-utfpr-500" />
              <h4 className="font-display text-sm font-black tracking-tight text-zinc-900 dark:text-white">
                Com o seu histórico
              </h4>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Você envia o PDF do Histórico Escolar do Portal do Aluno. A plataforma passa
              a saber o que você já cumpriu e libera tudo: situação, catálogo, trilhas,
              elegibilidade real e simulador de formatura.
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <IconCalendar className="h-4.5 w-4.5 text-utfpr-600 dark:text-utfpr-500" />
              <h4 className="font-display text-sm font-black tracking-tight text-zinc-900 dark:text-white">
                Modo Livre, sem histórico
              </h4>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Entra direto, sem enviar nada. Você vê a oferta completa do semestre e monta
              grade normalmente — só não há como dizer o que <em>você</em> já cumpriu ou
              pode cursar, porque a plataforma não conhece o seu percurso.
            </p>
          </Card>
        </div>
      </Secao>

      {/* 02 — O parser */}
      <Secao
        numero="02"
        titulo="Como o seu histórico é lido"
        descricao="O PDF não é enviado: ele é interpretado dentro do seu navegador, por um parser."
      >
        <Card>
          <figure className="mb-5">
            <IlustracaoFluxoHistorico />
            <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              O arquivo entra pela página e não volta a sair dela.
            </figcaption>
          </figure>
          <ol className="space-y-4">
            <Passo n={1} titulo="Você escolhe o PDF">
              O arquivo é aberto localmente pela página. Nenhum upload acontece — não
              existe servidor nem banco de dados para onde ele pudesse ir.
            </Passo>
            <Passo n={2} titulo="O parser extrai as linhas">
              Um leitor de PDF roda no próprio navegador e reconstrói o texto do documento
              linha a linha, incluindo as tabelas, que no PDF são só palavras posicionadas
              na página.
            </Passo>
            <Passo n={3} titulo="Cada linha vira dado estruturado">
              Disciplinas cursadas (com código, nome, carga, nota, frequência e situação —
              aprovado, equivalência, aproveitamento, matriculado ou dependência), as
              pendências por período e os quadros-resumo de obrigatórias, optativas,
              eletivas, extensão e estágio.
            </Passo>
            <Passo n={4} titulo="O motor cruza com a sua matriz">
              O que foi extraído é comparado com a matriz curricular e as regras do PPC do
              seu curso. É desse cruzamento que sai tudo o que as telas mostram.
            </Passo>
          </ol>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
            <IconShieldLock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              Se a leitura encontrar algo que não sabe explicar, a plataforma avisa em vez
              de adivinhar: aparece um aviso no topo dizendo o que ficou em aberto na
              interpretação do documento.
            </p>
          </div>
        </Card>
      </Secao>

      {/* 03 — Páginas */}
      <Secao
        numero="03"
        titulo="O que há em cada página"
        descricao="Para cada tela: o que ela mostra, o que dá para fazer e o que a alimenta."
      >
        <div className="space-y-3.5">
          {TELAS.map((t) => (
            <Card key={t.nome}>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-base font-black tracking-tight text-zinc-900 dark:text-white">
                  {t.nome}
                </h4>
                {t.exige === "historico" ? (
                  <Badge tom="aviso">Requer histórico</Badge>
                ) : (
                  <Badge tom="ok">Funciona em Modo Livre</Badge>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t.mostra}
              </p>
              <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <span className="font-display text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Interações
                  </span>
                  <ul className="mt-1.5 space-y-1">
                    {t.interacoes.map((i) => (
                      <li key={i} className="flex gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-utfpr-500" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <span className="font-display text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    O que alimenta
                  </span>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {t.alimenta}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Secao>

      {/* 04 — Fontes de dados */}
      <Secao
        numero="04"
        titulo="De onde vêm os dados"
        descricao="Cinco fontes alimentam a plataforma — e só a primeira é sua e privada."
      >
        <div className="space-y-3">
          <Card>
            <figure>
              <IlustracaoFontes />
              <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                As quatro fontes públicas vivem no repositório; o seu histórico entra por
                fora e fica na sua máquina.
              </figcaption>
            </figure>
          </Card>
          {FONTES.map((f, i) => (
            <Card key={f.titulo}>
              <div className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-utfpr-500/20 font-mono text-sm font-black text-utfpr-700 dark:text-utfpr-400">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-sm font-black tracking-tight text-zinc-900 dark:text-white">
                      {f.titulo}
                    </h4>
                    <Badge tom={f.etiqueta === "Local" ? "ok" : f.etiqueta === "Comunidade" ? "acento" : "neutro"}>
                      {f.etiqueta}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {f.texto}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Secao>

      {/* 05 — Semestres */}
      <Secao
        numero="05"
        titulo="Semestres: atual, futuro e passado"
        descricao="Nem todo semestre tem a mesma origem — e a plataforma sinaliza isso."
      >
        <Card classe="mb-3.5">
          <figure>
            <IlustracaoSemestres />
            <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Só o semestre em pré-matrícula ainda está sujeito a mudança.
            </figcaption>
          </figure>
        </Card>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Card>
            <Badge tom="ok">Pré-Matrícula</Badge>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              O semestre que ainda vai começar. A oferta é oficial, vinda do PDF de Turmas
              Abertas, mas provisória: vagas, horários e turmas ainda podem mudar até a
              matrícula. Aparece um aviso no topo quando esse é o semestre ativo.
            </p>
          </Card>
          <Card>
            <Badge tom="neutro">Semestre corrente</Badge>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Oferta oficial já consolidada, também importada do Portal do Aluno e
              validada linha a linha contra o PDF de origem.
            </p>
          </Card>
          <Card>
            <Badge tom="neutro">Semestres anteriores</Badge>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Os semestres passados são alimentados a partir dos dados do{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Grade na Hora</strong>,
              não do Portal — que não mantém a oferta antiga disponível. Servem de
              referência histórica e de base para estimar o que costuma abrir.
            </p>
          </Card>
        </div>
      </Secao>

      {/* 06 — Princípios */}
      <Secao
        numero="06"
        titulo="Princípios da plataforma"
        descricao="As regras que o projeto se impôs, e que explicam várias decisões de tela."
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          {[
            {
              icone: <IconShieldLock className="h-4.5 w-4.5" />,
              titulo: "Local-first",
              texto:
                "O seu histórico é processado no navegador e fica na sua máquina. Não há servidor, banco de dados nem conta de usuário.",
            },
            {
              icone: <IconFileText className="h-4.5 w-4.5" />,
              titulo: "Erro alto, nunca silencioso",
              texto:
                "Toda importação de dados passa por uma validação que recusa o arquivo se alguma linha não puder ser explicada. É preferível falhar visivelmente a exibir um dado errado com ar de certo.",
            },
            {
              icone: <IconCalendar className="h-4.5 w-4.5" />,
              titulo: "Leitura fiel à fonte",
              texto:
                "Quando o documento oficial contradiz a expectativa, a plataforma preserva o que o documento diz e sinaliza a anomalia, em vez de 'corrigir' o dado por conta própria.",
            },
            {
              icone: <IconUser className="h-4.5 w-4.5" />,
              titulo: "A prática também é dado",
              texto:
                "O que a burocracia registra nem sempre é o que acontece na matrícula. As vivências relatadas pelos estudantes entram como uma camada de correção sobre o dado oficial.",
            },
          ].map((p) => (
            <Card key={p.titulo}>
              <div className="flex items-center gap-2 text-utfpr-600 dark:text-utfpr-500">
                {p.icone}
                <h4 className="font-display text-sm font-black tracking-tight text-zinc-900 dark:text-white">
                  {p.titulo}
                </h4>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {p.texto}
              </p>
            </Card>
          ))}
        </div>
      </Secao>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-4 dark:border-amber-800/80 dark:bg-amber-950/50">
        <IconBookOpen className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
          O Oásis é uma ferramenta de apoio ao planejamento, não um sistema oficial da
          UTFPR. Antes de efetivar a matrícula, confirme sempre a oferta e a sua situação
          no Portal do Aluno.
        </p>
      </div>
    </div>
  );
}
