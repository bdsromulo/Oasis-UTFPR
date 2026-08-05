import { useState, type ReactNode } from "react";
import { Badge, Card } from "../componentes";
import { ConteudoExplicacaoCalculos } from "../componentes/ModalExplicacaoCalculos";
import { MenuSecoes, type ItemSecao } from "./NavegacaoSecoes";
import { BotaoFaleConosco } from "./Contato";
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
      "Onde você está no curso. Traz o progresso geral em rosca, a carga cumprida e a faltante por categoria, os coeficientes de rendimento e as pendências do seu período.",
    interacoes: [
      "Abrir cada categoria para ver o que já conta e o que ainda falta",
      "Saltar direto para o Catálogo a partir de uma pendência",
      "Avaliar matérias aprovadas ou concluídas por consignação, nunca reprovações",
    ],
    alimenta:
      "Os quadros-resumo do seu histórico, cruzados com as exigências da sua matriz.",
  },
  {
    nome: "Minha Situação · Catálogo",
    exige: "historico",
    mostra:
      "A lista completa das disciplinas da sua matriz, período a período. Marca o que você cumpriu, o que está cursando e o que continua pendente.",
    interacoes: [
      "Filtrar por categoria curricular e por período",
      "Buscar disciplina por nome ou código",
      "Expandir uma disciplina para ver carga, pré-requisitos e equivalências",
    ],
    alimenta:
      "A matriz oficial do curso somada ao que o seu histórico registra como aprovado, matriculado ou pendente.",
  },
  {
    nome: "Minha Situação · Árvore & Trilhas",
    exige: "historico",
    mostra:
      "O fluxograma do curso. Cada disciplina vira um nó ligado às que ela destrava. Mostra também quanto de cada trilha optativa você já validou.",
    interacoes: [
      "Navegar e dar zoom no board de progressão",
      "Clicar num nó para ver pré-requisitos e o que ele libera à frente",
      "Comparar trilhas para decidir qual fechar primeiro",
    ],
    alimenta:
      "A cadeia de pré-requisitos da matriz, o agrupamento por trilha e o seu histórico, que colore o que já foi cumprido.",
  },
  {
    nome: "Planejamento · Matérias Abertas",
    mostra:
      "Tudo o que está aberto no semestre escolhido, com turmas, horários, salas, sedes, vagas, reserva, prioridade de curso e professor. Sem histórico, o Modo Livre mostra a oferta inteira.",
    interacoes: [
      "Adicionar e remover turmas da grade em construção",
      "Espiar uma turma no preview antes de decidir",
      "Filtrar por categoria, buscar por nome/código e ordenar a lista",
      "Ocultar automaticamente turmas que conflitam com o que já está na grade",
      "Alternar entre o Layout Oásis e o Layout Grade na Hora",
      "Abrir a Grade Mágica para montar combinações automaticamente",
      "Abrir, pelo professor ou pelo botão com estrela, as avaliações da comunidade",
    ],
    alimenta:
      "A relação de Turmas Abertas do semestre. Com histórico, o motor também confere os seus pré-requisitos cumpridos.",
  },
  {
    nome: "Planejamento · Minha Grade",
    mostra:
      "A grade da semana com as turmas que você escolheu. Aponta choques de horário e deslocamentos impossíveis entre sedes no mesmo turno.",
    interacoes: [
      "Manter grades alternativas em paralelo (A, B e C) e alternar entre elas",
      "Copiar a lista de códigos no formato de digitação do Portal",
      "Exportar a grade como imagem",
      "Ver, a cada turma adicionada, o impulso que ela dá em cada categoria",
    ],
    alimenta:
      "As turmas que você marcou, os horários da oferta e, com histórico, as regras de integralização da sua matriz.",
  },
  {
    nome: "Simulador de Formatura",
    exige: "historico",
    mostra:
      "A projeção de quando você se forma. Diz quantos semestres faltam no ritmo escolhido e o que falta cumprir em cada categoria.",
    interacoes: [
      "Ajustar o ritmo (disciplinas por semestre) e o semestre de partida",
      "Ver a linha do tempo até a formatura e os requisitos ainda em aberto",
    ],
    alimenta:
      "O que o seu histórico já cumpriu, as exigências da matriz e quais disciplinas costumam abrir em cada semestre.",
  },
  {
    nome: "Oásis Match",
    mostra:
      "A comparação da sua grade com a de colegas. Mostra aulas em comum, horários livres iguais e disciplinas que vocês podem cursar juntos.",
    interacoes: [
      "Gerar o seu código de compartilhamento (Oásis Code)",
      "Colar o código de um amigo para comparar as grades",
    ],
    alimenta:
      "Um código gerado no seu navegador e trocado direto entre vocês. Não existe servidor no meio. Nada é publicado, nada fica hospedado.",
  },
  {
    nome: "Avaliações da Comunidade",
    mostra:
      "Relatos de estudantes sobre personalidade, didática, dificuldade e carga de trabalho. As notas ficam separadas para uma disciplina difícil não parecer automaticamente mal ministrada.",
    interacoes: [
      "Ler avaliações pelo professor ou pelo botão com estrela nas turmas do Planejamento",
      "Com histórico carregado, escolher uma disciplina concluída e abrir o formulário preenchido",
      "Nas consignações, conferir o código realmente cursado e o professor recuperado do PDF",
    ],
    alimenta:
      "O acervo comunitário moderado, as ofertas oficiais de professores e apenas as aprovações ou consignações do seu histórico. Reprovações, estágio, ENADE e atividades complementares ficam fora.",
  },
  {
    nome: "Configurações",
    mostra:
      "O controle da sessão local. Reúne tema, layout, importação e troca de histórico, savefile, filtros de conflito e limpeza dos dados.",
    interacoes: [
      "Importar ou atualizar o PDF do Histórico Escolar",
      "Baixar um savefile com o perfil já interpretado e as grades montadas",
      "Importar o savefile em outro navegador e confirmar antes de substituir a sessão local",
      "Alternar tema (claro, escuro ou seguir o sistema) e layout",
      "Ativar o Modo Privado, que guarda a sessão só até a aba fechar",
      "Trocar de usuário ou apagar todos os dados salvos",
    ],
    alimenta:
      "As preferências guardadas no armazenamento local do navegador.",
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
      "Personaliza a plataforma inteira. O seu navegador lê o arquivo e não envia para lugar nenhum. Nem para o Oásis, que não tem servidor para receber.",
  },
  {
    titulo: "Coleta coletiva de vivências",
    etiqueta: "Comunidade",
    texto:
      "O que os estudantes relatam da prática e o documento oficial não mostra: pré-requisito que não trava, equivalência aceita, eletiva validada e experiência com uma turma. Correções curriculares ficam numa camada separada da fonte; avaliações só entram no acervo depois de moderação.",
  },
  {
    titulo: "Projetos Pedagógicos de Curso (PPCs)",
    etiqueta: "Oficial",
    texto:
      "Definem as regras de integralização de cada curso. Quantas trilhas fechar e quanto de optativa, eletiva, extensão e estágio o curso exige para formar.",
  },
  {
    titulo: "Matrizes curriculares",
    etiqueta: "Oficial",
    texto:
      "A lista oficial de disciplinas, com carga, período, conjunto, pré-requisitos e equivalências. É a régua que compara o seu histórico.",
  },
  {
    titulo: "Relação de Turmas Abertas",
    etiqueta: "Oficial",
    texto:
      "O PDF de Turmas Abertas do Portal, importado a cada semestre. Dele saem turmas, horários, salas, sedes, vagas, reservas e prioridade de curso.",
  },
];

/** As seções são identificadas pelo próprio número que já aparece na tela. */
const idDaSecao = (numero: string) => `como-usar-${numero}`;

const SECOES: ItemSecao[] = [
  { numero: "01", titulo: "Por onde começar" },
  { numero: "02", titulo: "Como o histórico é lido" },
  { numero: "03", titulo: "O que há em cada página" },
  { numero: "04", titulo: "De onde vêm os dados" },
  { numero: "05", titulo: "Semestres" },
  { numero: "06", titulo: "Como o Oásis calcula" },
  { numero: "07", titulo: "Princípios" },
].map((s) => ({ ...s, id: idDaSecao(s.numero) }));

function Secao(props: {
  numero: string;
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section id={idDaSecao(props.numero)} className="scroll-mt-24 space-y-3.5">
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
  const [cursoSimulado, setCursoSimulado] = useState<"bsi" | "comp" | "eletro">("bsi");

  return (
    <div className="space-y-10">
      {/* Capa */}
      <header className="rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-utfpr-500/15 via-white to-white p-7 shadow-xs dark:border-zinc-800 dark:from-utfpr-500/10 dark:via-zinc-900 dark:to-zinc-900">
        <Badge tom="acento">Manual da plataforma</Badge>
        <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          Como usar o site
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          O que cada página mostra, o que dá para fazer nela e de onde vem cada
          informação que você lê aqui dentro.
        </p>
      </header>

      <MenuSecoes
        secoes={SECOES}
        rotulo="Seções do manual"
        acao={<BotaoFaleConosco compacto />}
      />

      {/* 01 — Começando */}
      <Secao
        numero="01"
        titulo="Por onde começar"
        descricao="Existem dois jeitos de entrar, e eles mudam o que a plataforma responde."
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
              Você envia o PDF do histórico do Portal. A plataforma passa a saber o que
              você cumpriu e libera tudo: situação, catálogo, trilhas, elegibilidade real
              e simulador de formatura.
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
              Você entra direto, sem enviar nada, vê a oferta completa do semestre e monta
              grade normalmente. A plataforma só não sabe o que <em>você</em> cumpriu ou
              pode cursar, porque não conhece o seu percurso.
            </p>
          </Card>
        </div>
      </Secao>

      {/* 02 — O parser */}
      <Secao
        numero="02"
        titulo="Como o seu histórico é lido"
        descricao="O seu navegador interpreta o PDF por um parser. O arquivo não é enviado."
      >
        <Card>
          <figure className="mb-5">
            <IlustracaoFluxoHistorico />
            <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              O arquivo entra pela página e não sai dela.
            </figcaption>
          </figure>
          <ol className="space-y-4">
            <Passo n={1} titulo="Você escolhe o PDF">
              A página abre o arquivo na sua máquina. Nenhum upload acontece, porque não
              existe servidor nem banco de dados para receber.
            </Passo>
            <Passo n={2} titulo="O parser extrai as linhas">
              Um leitor de PDF roda no navegador e reconstrói o texto linha a linha,
              inclusive as tabelas. No PDF elas são apenas palavras posicionadas na página.
            </Passo>
            <Passo n={3} titulo="Cada linha vira dado estruturado">
              Saem daí as disciplinas cursadas, com código, nome, carga, nota, frequência
              e situação. Saem também as pendências por período e os quadros-resumo de
              obrigatórias, optativas, eletivas, extensão e estágio. Quando há
              consignação, o parser preserva o código da matriz para o progresso e o
              código realmente cursado, com o professor impresso, para a avaliação.
            </Passo>
            <Passo n={4} titulo="O motor cruza com a sua matriz">
              O motor compara o que foi extraído com a matriz curricular e as regras do
              PPC do seu curso. Hoje o histórico identifica BSI 981 e 806, Engenharia de
              Computação 844 e 962, Engenharia Eletrônica 968, Engenharia de Controle e
              Automação 978 e Engenharia Mecatrônica 973, aplicando a regra da matriz correta.
              Na 978, as 675h optativas
              são cinco trilhas de formação de 135h que precisam ser cumpridas separadamente.
              Desse cruzamento sai tudo o que as telas mostram.
            </Passo>
          </ol>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
            <IconShieldLock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              Quando a leitura encontra algo que não sabe explicar, a plataforma avisa em
              vez de adivinhar. Um aviso no topo diz o que ficou em aberto.
            </p>
          </div>
        </Card>
      </Secao>

      {/* 03 — Páginas */}
      <Secao
        numero="03"
        titulo="O que há em cada página"
        descricao="O que cada tela mostra, o que dá para fazer nela e o que a alimenta."
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
        descricao="Cinco fontes alimentam a plataforma. Só a primeira é sua e privada."
      >
        <div className="space-y-3">
          <Card>
            <figure>
              <IlustracaoFontes />
              <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                As quatro fontes públicas ficam no repositório. O seu histórico entra por
                fora e permanece na sua máquina.
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
        descricao="Os semestres têm origens diferentes, e a plataforma sinaliza isso."
      >
        <Card classe="mb-3.5">
          <figure>
            <IlustracaoSemestres />
            <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Só o semestre em pré-matrícula ainda muda.
            </figcaption>
          </figure>
        </Card>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Card>
            <Badge tom="ok">Pré-Matrícula</Badge>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              O semestre que ainda vai começar. A oferta é oficial e vem do PDF de Turmas
              Abertas, mas segue provisória. Vagas, horários e turmas podem mudar até a
              matrícula. Um aviso no topo marca esse estado.
            </p>
          </Card>
          <Card>
            <Badge tom="neutro">Semestre corrente</Badge>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Oferta oficial já consolidada. Também vem do Portal e passa por validação
              linha a linha contra o PDF de origem.
            </p>
          </Card>
          <Card>
            <Badge tom="neutro">Semestres anteriores</Badge>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Os semestres passados vêm do{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Grade na Hora</strong>,
              e não do Portal, que não guarda a oferta antiga. Eles servem de referência
              e ajudam a estimar o que costuma abrir.
            </p>
          </Card>
        </div>
      </Secao>

      {/* 06 — Como o Oásis calcula */}
      <Secao
        numero="06"
        titulo="Como o Oásis calcula"
        descricao="Entenda as metodologias e fórmulas por trás das ferramentas inteligentes."
      >
        <ConteudoExplicacaoCalculos cursoSimulado={cursoSimulado} onMudarCurso={setCursoSimulado} />
      </Secao>

      {/* 07 — Princípios */}
      <Secao
        numero="07"
        titulo="Princípios da plataforma"
        descricao="As regras que o projeto segue e que explicam várias decisões de tela."
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          {[
            {
              icone: <IconShieldLock className="h-4.5 w-4.5" />,
              titulo: "Local-first",
              texto:
                "O navegador processa o seu histórico e ele fica na sua máquina. O savefile transporta apenas o perfil já interpretado e as grades, nunca o PDF original; não existe servidor, banco de dados nem conta de usuário.",
            },
            {
              icone: <IconFileText className="h-4.5 w-4.5" />,
              titulo: "Erro alto, nunca silencioso",
              texto:
                "Toda importação passa por uma validação que recusa o arquivo se alguma linha não for explicada. Falhar à vista é melhor do que mostrar dado errado com ar de certo.",
            },
            {
              icone: <IconCalendar className="h-4.5 w-4.5" />,
              titulo: "Leitura fiel à fonte",
              texto:
                "Quando o documento oficial contraria a expectativa, a plataforma mantém o que ele diz e sinaliza a anomalia. Ela não corrige o dado por conta própria.",
            },
            {
              icone: <IconUser className="h-4.5 w-4.5" />,
              titulo: "A prática também é dado",
              texto:
                "O que a burocracia registra nem sempre acontece na matrícula. As vivências dos estudantes entram como camada de correção sobre o dado oficial.",
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
          O Oásis apoia o seu planejamento, mas não é um sistema oficial da UTFPR.
          Confirme sempre a oferta e a sua situação no Portal antes de efetivar a
          matrícula.
        </p>
      </div>
    </div>
  );
}
