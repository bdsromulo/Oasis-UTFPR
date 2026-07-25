import type { ReactNode } from "react";
import { Badge, Botao, Card } from "../componentes";
import {
  IconBookOpen,
  IconGithub,
  IconInstagram,
  IconLinkedin,
  IconShieldLock,
  IconUser,
} from "../icons";

/**
 * Página "Sobre" — material institucional do projeto, não do aluno.
 *
 * Abre a partir de qualquer ambiente (check-in ou sessão), pelo botão vizinho
 * ao da engrenagem no cabeçalho, e por isso não pode depender de `perfil`.
 *
 * Os nomes creditados aqui vêm de pessoas que cederam o próprio histórico para
 * o projeto. É conteúdo público: ao acrescentar alguém, confirme antes se a
 * pessoa quer ser citada nominalmente.
 */

const REPO_URL = "https://github.com/bdsromulo/Oasis-UTFPR";

interface Pessoa {
  nome: string;
  curso: string;
  /** rótulo exibido no selo de revisão; ausente = apoiador sem revisão */
  revisor?: "Revisor" | "Revisora";
}

/** Quem cedeu o histórico que serviu de base para calibrar cada curso. */
const APOIADORES: Pessoa[] = [
  { nome: "Yago Augusto Constantino Ribeiro", curso: "Sistemas de Informação", revisor: "Revisor" },
  { nome: "Namie Miquitera Yamada", curso: "Sistemas de Informação", revisor: "Revisora" },
  { nome: "Victor Damasceno Oliveira", curso: "Engenharia de Computação", revisor: "Revisor" },
  { nome: "Maria Luiza Cenci Stedile", curso: "Engenharia de Computação" },
  { nome: "Victor Hugo Garrett", curso: "Engenharia de Computação" },
  { nome: "Felipe Sledz Ferreira", curso: "Engenharia de Computação" },
  { nome: "Deborah Feijo Pinto", curso: "Engenharia de Computação" },
  { nome: "Carlos Eduardo Correa Zanon", curso: "Engenharia Eletrônica" },
];

interface Marco {
  data: string;
  titulo: string;
  descricao: string;
  estado: "concluido" | "aberto";
}

const ROADMAP: Marco[] = [
  {
    data: "16 jul 2026",
    titulo: "Criação e primeiro protótipo",
    descricao:
      "Primeiro commit do projeto. Entram a camada de dados da matriz 981 (BSI), o pipeline de importação com validação e o protótipo em camadas: parser de histórico no navegador, motor de regras e app React.",
    estado: "concluido",
  },
  {
    data: "22 jul 2026",
    titulo: "Protótipo de Eng. Computação na matriz antiga (844)",
    descricao:
      "O protótipo da matriz 844 fica pronto. Leitura do histórico de Eng. Comp., trilhas optativas, categorias por curso e integração da oferta com a progressão.",
    estado: "concluido",
  },
  {
    data: "24 jul 2026",
    titulo: "Oásis da grade nova de Eng. Comp. (962) e turmas de 2026/2",
    descricao:
      "O Oásis da matriz 962 fica pronto. As Turmas Abertas de 2026/2 entram direto do Portal para todos os cursos, no estado de Pré-Matrícula.",
    estado: "concluido",
  },
  {
    data: "Em aberto",
    titulo: "Oásis da grade antiga de BSI e da grade nova de Eletrônica",
    descricao:
      "Estender a cobertura para a matriz antiga de Sistemas de Informação (806) e para a matriz nova de Engenharia Eletrônica (968).",
    estado: "aberto",
  },
  {
    data: "Em aberto",
    titulo: "Oásis de mais cursos da UTFPR e Sistema de Comunidade",
    descricao:
      "Levar a plataforma aos demais cursos do câmpus e abrir um sistema de comunidade, para que planejar o curso deixe de ser tarefa solitária.",
    estado: "aberto",
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

function LinkSocial(props: { href: string; rotulo: string; children: ReactNode }) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      title={props.rotulo}
      aria-label={props.rotulo}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-2xs transition-all hover:border-utfpr-500/60 hover:bg-utfpr-50/60 hover:text-zinc-950 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-utfpr-500/50 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      {props.children}
    </a>
  );
}

export function TelaSobre(props: { onAbrirGestaoInformacao: () => void }) {
  return (
    <div className="space-y-10">
      {/* Capa */}
      <header className="rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-utfpr-500/15 via-white to-white p-7 shadow-xs dark:border-zinc-800 dark:from-utfpr-500/10 dark:via-zinc-900 dark:to-zinc-900">
        <Badge tom="acento">Sobre o projeto</Badge>
        <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          <span className="text-utfpr-600 dark:text-utfpr-500">Oásis</span> UTFPR
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          O Oásis mostra onde você está no curso, o que pode cursar e como montar o
          próximo semestre. Sem planilha, sem print de grade, sem conversa de corredor.
        </p>
      </header>

      {/* 01 — Proposta */}
      <Secao
        numero="01"
        titulo="A proposta do site"
        descricao="O problema que o Oásis resolve."
      >
        <Card>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            O Oásis é um{" "}
            <strong className="font-bold text-zinc-900 dark:text-white">
              Grade na Hora 2
            </strong>
            . Ele junta o <strong>seu histórico escolar</strong> com a{" "}
            <strong>vivência do dia a dia</strong> para você planejar o seu curso na
            UTFPR. A universidade não facilita o acesso a essas informações.
          </p>
          <p className="mt-3.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            A plataforma lê o seu histórico do Portal e cruza com a matriz curricular e
            as turmas abertas no semestre. Daí saem as respostas que o sistema oficial não
            dá: o que você já cumpriu, o que pode cursar agora, o que ainda falta e como
            tudo isso cabe numa grade sem choque de horário.
          </p>
        </Card>
      </Secao>

      {/* 02 — Dados locais */}
      <Secao
        numero="02"
        titulo="Política de dados locais"
        descricao="O seu histórico não sai do seu computador."
      >
        <Card>
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <IconShieldLock className="h-5.5 w-5.5" />
            </span>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p>
                O Oásis é um site <strong>estático, sem servidor e sem banco de dados</strong>.
                O seu navegador lê e interpreta o PDF{" "}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  por conta própria
                </strong>
                . O arquivo nunca é enviado para lugar nenhum, porque não existe para onde
                enviar.
              </p>
              <ul className="space-y-2">
                {[
                  ["Nada é transmitido", "nenhum upload, nenhuma API, nenhum rastreamento."],
                  ["Fica na sua máquina", "o navegador guarda a sua grade no armazenamento local."],
                  ["Você apaga quando quiser", "as Configurações limpam todos os dados salvos de uma vez."],
                  ["Nada pessoal no repositório", "o código é público e guarda apenas matrizes e turmas."],
                ].map(([titulo, texto]) => (
                  <li key={titulo} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>
                      <strong className="font-bold text-zinc-900 dark:text-white">{titulo}</strong>{" "}
                      . {texto}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Nada é sincronizado. Limpar os dados do navegador ou trocar de aparelho
                também apaga a grade que você montou.
              </p>
            </div>
          </div>
        </Card>
      </Secao>

      {/* 03 — Código aberto */}
      <Secao
        numero="03"
        titulo="Projeto de código aberto"
        descricao="Você pode conferir o código linha a linha."
      >
        <Card>
          <div className="space-y-3.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <p>
              O Oásis é <strong>open source</strong>. O código, os dados de matriz e de
              turmas e as ferramentas de importação estão num repositório público. Qualquer
              pessoa pode ver como o histórico é lido, de onde vem cada informação e
              confirmar que ela não sai do navegador.
            </p>
            <p>
              Essa foi uma escolha de projeto. Quem pede o seu histórico escolar precisa
              aceitar ser conferido. Contribuições, correções e relatos de erro são
              bem-vindos pelo repositório.
            </p>
            <div className="pt-1">
              <LinkSocial href={REPO_URL} rotulo="Repositório do Oásis UTFPR no GitHub">
                <IconGithub className="h-4.5 w-4.5" />
                <span>Ver o código no GitHub</span>
              </LinkSocial>
            </div>
          </div>
        </Card>
      </Secao>

      {/* 04 — Gestão da Informação */}
      <Secao
        numero="04"
        titulo="Gestão da Informação do projeto"
        descricao="Como a informação é tratada, do dado bruto até a tela."
      >
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-utfpr-500/20 text-utfpr-700 dark:text-utfpr-400">
                <IconBookOpen className="h-5.5 w-5.5" />
              </span>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                O Oásis também é um exercício de <strong>Gestão da Informação</strong>. Uma
                página à parte reúne o planejamento do projeto, o ciclo de vida da
                informação e os critérios de qualidade que os dados cumprem antes de virar
                recomendação na tela.
              </p>
            </div>
            <div className="shrink-0">
              <Botao variante="primario" onClick={props.onAbrirGestaoInformacao}>
                <IconBookOpen className="h-4 w-4" />
                <span>Abrir Gestão da Informação</span>
              </Botao>
            </div>
          </div>
        </Card>
      </Secao>

      {/* 05 — Créditos */}
      <Secao
        numero="05"
        titulo="Créditos"
        descricao="Quem construiu e quem ajudou a calibrar a plataforma."
      >
        <div className="space-y-4">
          {/* Criador */}
          <Card>
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <img
                src="creditos/romulo.jpeg"
                alt="Rômulo Barbosa da Silva"
                className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-xs ring-2 ring-utfpr-500/40"
              />
              <div className="min-w-0 flex-1">
                <Badge tom="acento">Criador e desenvolvedor</Badge>
                <h4 className="mt-2 font-display text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                  Rômulo Barbosa da Silva
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Concepção, desenvolvimento e curadoria dos dados do Oásis UTFPR.
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <LinkSocial
                    href="https://www.linkedin.com/in/romulo-silva02/"
                    rotulo="LinkedIn de Rômulo Barbosa da Silva"
                  >
                    <IconLinkedin className="h-4.5 w-4.5" />
                    <span>LinkedIn</span>
                  </LinkSocial>
                  <LinkSocial
                    href="https://github.com/bdsromulo"
                    rotulo="GitHub de Rômulo Barbosa da Silva"
                  >
                    <IconGithub className="h-4.5 w-4.5" />
                    <span>GitHub</span>
                  </LinkSocial>
                  <LinkSocial
                    href="https://www.instagram.com/romulo_bds/"
                    rotulo="Instagram de Rômulo Barbosa da Silva"
                  >
                    <IconInstagram className="h-4.5 w-4.5" />
                    <span>@romulo_bds</span>
                  </LinkSocial>
                </div>
              </div>
            </div>
          </Card>

          {/* Apoiadores */}
          <Card>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h4 className="font-display text-base font-black tracking-tight text-zinc-900 dark:text-white">
                Apoiadores
              </h4>
              <Badge tom="neutro">{APOIADORES.length} pessoas</Badge>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Cada histórico cedido revelou um caso que a plataforma ainda não sabia
              tratar. Equivalências, trilhas, matrizes diferentes. Sem essas pessoas o
              Oásis serviria a um aluno só. Quem aparece como{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">revisor</strong>{" "}
              também conferiu o resultado e apontou os erros.
            </p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {APOIADORES.map((p) => (
                <li
                  key={p.nome}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-utfpr-500/20 text-utfpr-700 dark:text-utfpr-400">
                    <IconUser className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                        {p.nome}
                      </span>
                      {p.revisor && <Badge tom="ok">{p.revisor}</Badge>}
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{p.curso}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Inspiração */}
          <Card>
            <h4 className="font-display text-base font-black tracking-tight text-zinc-900 dark:text-white">
              Inspiração e embasamento
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              O{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                MatrizEngEletronicaUTFPR
              </strong>
              , repositório de apoio de Engenharia Eletrônica mantido por{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Kcaiooooo</strong>,
              inspirou o Oásis de Eletrônica. Ele serviu de base tanto para organizar o
              material de apoio quanto para entender as exigências do curso.
            </p>
            <div className="mt-3">
              <LinkSocial
                href="https://github.com/Kcaiooooo/MatrizEngEletronicaUTFPR"
                rotulo="Repositório MatrizEngEletronicaUTFPR no GitHub"
              >
                <IconGithub className="h-4.5 w-4.5" />
                <span>Kcaiooooo/MatrizEngEletronicaUTFPR</span>
              </LinkSocial>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              O <strong className="text-zinc-800 dark:text-zinc-200">Grade na Hora</strong>{" "}
              é a origem declarada do projeto. O Oásis continua a ideia dele, agora
              ancorada no histórico de cada aluno.
            </p>
          </Card>
        </div>
      </Secao>

      {/* 06 — Roadmap */}
      <Secao
        numero="06"
        titulo="Roadmap"
        descricao="De onde o projeto veio e para onde vai."
      >
        <Card>
          <ol className="relative space-y-6 pl-7">
            {/* trilho vertical */}
            <span
              aria-hidden
              className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-utfpr-500/60 via-zinc-300 to-zinc-200 dark:from-utfpr-500/50 dark:via-zinc-700 dark:to-zinc-800"
            />
            {ROADMAP.map((m) => {
              const concluido = m.estado === "concluido";
              return (
                <li key={m.titulo} className="relative">
                  <span
                    className={`absolute -left-7 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${
                      concluido
                        ? "border-utfpr-500 bg-utfpr-500"
                        : "border-dashed border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                    }`}
                  >
                    {concluido && (
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-zinc-900" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-mono text-xs font-black ${
                        concluido
                          ? "text-utfpr-700 dark:text-utfpr-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {m.data}
                    </span>
                    {!concluido && <Badge tom="neutro">Planejado</Badge>}
                  </div>
                  <h4 className="mt-0.5 font-display text-sm font-black tracking-tight text-zinc-900 dark:text-white">
                    {m.titulo}
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {m.descricao}
                  </p>
                </li>
              );
            })}
          </ol>
        </Card>
      </Secao>

      <p className="pb-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
        Oásis UTFPR. Projeto independente, sem vínculo institucional com a UTFPR.
      </p>
    </div>
  );
}
