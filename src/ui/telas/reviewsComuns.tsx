// Peças de exibição compartilhadas pelos painéis de avaliação.
//
// Moram aqui, e não dentro de um dos painéis, porque a mesma avaliação é lida por
// três caminhos — pelo professor e pela turma, no planejamento, e pela disciplina,
// no catálogo. Duplicar a apresentação faria as leituras divergirem em silêncio, e
// é exatamente a régua compartilhada que dá sentido ao número exibido.
import { useMemo, useState, type ReactNode } from "react";
import { LIMIAR_ESTATISTICA } from "../../domain/reviews/acervo";
import { idDaUnidade } from "../../domain/reviews/professores";
import { reviewsHabilitadasPara } from "../../domain/reviews/config";
import { criarMapaIdentidade } from "../../domain/motor/identidade";
import type { Matriz } from "../../domain/tipos";
import type {
  AcervoReviews,
  AgregadoReviews,
  Review,
  SistemaAvaliativo,
} from "../../domain/reviews/tipos";
import acervoReviews from "../../../data/reviews.json";

/** As quatro verticais avaliadas, na ordem em que sempre aparecem. */
export type Vertical = "personalidade" | "didatica" | "dificuldade" | "cargaTrabalho";

export interface DescricaoVertical {
  chave: Vertical;
  rotulo: string;
  /** O que a vertical mede. Mesmo texto usado no formulário. */
  descricao: string;
  /** Pontas da escala, para leitura rápida. */
  escala: string;
  /** O que significa cada ponto, de 1 a 5. */
  regua: [string, string, string, string, string];
  /**
   * `true` quando 5 é elogio. Personalidade e didática têm polo bom; dificuldade
   * e carga não — 5 ali é informação, não defeito, e pintá-las com semântica de
   * alerta faria o painel afirmar que disciplina difícil é disciplina ruim.
   */
  temPoloBom: boolean;
}

export const VERTICAIS: DescricaoVertical[] = [
  {
    chave: "personalidade",
    rotulo: "Personalidade",
    descricao:
      "Como é o trato: se o professor se comunica bem, é acessível para tirar dúvida " +
      "dentro e fora da sala, trata a turma com respeito e é aberto a conversar sobre " +
      "prazos, notas e dificuldades.",
    escala: "1 difícil de lidar · 5 ótimo trato",
    regua: [
      "Trato difícil; evitava contato",
      "Pouco acessível ou pouco receptivo",
      "Cordial, sem muita abertura",
      "Acessível e aberto a conversar",
      "Excelente trato; procurava ajudar",
    ],
    temPoloBom: true,
  },
  {
    chave: "didatica",
    rotulo: "Didática",
    descricao:
      "O quanto o ensino funciona: se a explicação é clara e bem organizada, se o " +
      "material (slides, listas, exemplos) sustenta o estudo sozinho, e se a aula " +
      "consegue prender a atenção em vez de só cobrir o conteúdo.",
    escala: "1 ruim · 5 ótima",
    regua: [
      "Não dava para acompanhar; aprendi por fora",
      "Explicação confusa; material ajudava pouco",
      "Dava para acompanhar, mas exigia estudo por fora",
      "Explicava com clareza e o material sustentava",
      "A aula bastava por si só; eu saía entendendo",
    ],
    temPoloBom: true,
  },
  {
    chave: "dificuldade",
    rotulo: "Dificuldade",
    descricao:
      "O quanto a matéria é dura em si: bagagem e conhecimento prévio que ela cobra, " +
      "densidade dos conceitos e o quanto é preciso amadurecer o assunto para " +
      "entender. Não é o volume de tarefas — isso é carga de trabalho.",
    escala: "1 fácil · 5 difícil",
    regua: [
      "Passei sem precisar de esforço concentrado",
      "Passar foi tranquilo; nota alta exigia atenção",
      "Precisei estudar de verdade para ir bem",
      "Exigente: nota boa só com estudo constante",
      "Das mais exigentes do curso; reprovação era comum",
    ],
    temPoloBom: false,
  },
  {
    chave: "cargaTrabalho",
    rotulo: "Carga de trabalho",
    descricao:
      "Quanto tempo a matéria consome fora da aula: listas, trabalhos, projetos e " +
      "preparo para prova. Uma disciplina pode ser pesada e fácil — muito volume, " +
      "pouca dificuldade — ou o contrário.",
    escala: "1 leve · 5 pesada",
    regua: [
      "Muito leve: pouquíssimo tempo fora da aula",
      "Leve: pouco tempo fora da aula",
      "Moderada: tempo razoável fora da aula",
      "Pesada: bastante tempo fora da aula",
      "Muito pesada: muito tempo fora da aula",
    ],
    temPoloBom: false,
  },
];

export const VERTICAL_POR_CHAVE = new Map(VERTICAIS.map((v) => [v.chave, v]));

/** Texto da dica: o que a vertical mede, seguido da régua ponto a ponto. */
export function dicaDaVertical(v: DescricaoVertical): string {
  return `${v.descricao}\n\n${v.regua.map((r, i) => `${i + 1} — ${r}`).join("\n")}`;
}

export function Nota(props: { vertical: DescricaoVertical; valor: number | null }) {
  const { vertical, valor } = props;
  return (
    <div
      title={dicaDaVertical(vertical)}
      className="cursor-help rounded-xl border border-zinc-200/70 px-3 py-2 dark:border-zinc-800/70"
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {vertical.rotulo}
      </div>
      <div className="font-display text-lg font-black text-zinc-900 dark:text-zinc-100">
        {valor === null ? "—" : valor.toFixed(1).replace(".", ",")}
        <span className="ml-1 font-sans text-[10px] font-normal text-zinc-400">/ 5</span>
      </div>
      <div className="text-[10px] text-zinc-400">{vertical.escala}</div>
    </div>
  );
}

/**
 * Distribuição de notas de uma vertical, no formato de barras por estrela.
 *
 * Cada faixa é clicável e filtra a lista abaixo: a pergunta que leva alguém a
 * abrir isto costuma ser "quem achou difícil, e por quê?", e sem o filtro a
 * resposta exige ler tudo. A barra sozinha informa; clicável, ela navega.
 */
export function Distribuicao(props: {
  vertical: DescricaoVertical;
  reviews: Review[];
  selecionada: number | null;
  onSelecionar: (nota: number | null) => void;
}) {
  const { vertical, reviews, selecionada, onSelecionar } = props;
  const contagem = [0, 0, 0, 0, 0];
  for (const r of reviews) contagem[(r[vertical.chave] as number) - 1]++;
  const maximo = Math.max(...contagem, 1);
  const media = reviews.length
    ? reviews.reduce((s, r) => s + (r[vertical.chave] as number), 0) / reviews.length
    : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h5
          title={dicaDaVertical(vertical)}
          className="cursor-help text-xs font-bold text-zinc-800 dark:text-zinc-100"
        >
          {vertical.rotulo}
          <span className="ml-1 font-normal text-zinc-400">ⓘ</span>
        </h5>
        <span className="font-display text-sm font-black text-zinc-900 dark:text-zinc-100">
          {media.toFixed(1).replace(".", ",")}
          <span className="ml-0.5 font-sans text-[10px] font-normal text-zinc-400">/ 5</span>
        </span>
      </div>

      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((nota) => {
          const n = contagem[nota - 1];
          const ativa = selecionada === nota;
          return (
            <button
              key={nota}
              type="button"
              disabled={n === 0}
              onClick={() => onSelecionar(ativa ? null : nota)}
              title={`${nota} — ${vertical.regua[nota - 1]}`}
              className={`flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left transition ${
                n === 0
                  ? "cursor-default opacity-40"
                  : ativa
                    ? "bg-utfpr-500/20"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="w-2 shrink-0 font-mono text-[10px] text-zinc-500">{nota}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <span
                  className={`block h-full rounded-full ${
                    ativa ? "bg-utfpr-600 dark:bg-utfpr-400" : "bg-utfpr-500"
                  }`}
                  style={{ width: `${(n / maximo) * 100}%` }}
                />
              </span>
              <span className="w-4 shrink-0 text-right font-mono text-[10px] text-zinc-500">
                {n || ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Como a nota foi cobrada. "misto" vira texto, e não o rótulo do domínio.
 *
 * O valor `misto` é economia de tipo, não vocabulário de quem lê: ninguém diz que
 * a matéria "é mista". O formulário pergunta "provas, trabalhos ou os dois", e é
 * essa resposta que volta aqui.
 */
export const ROTULO_SISTEMA: Record<SistemaAvaliativo, string> = {
  provas: "Provas",
  trabalhos: "Trabalhos",
  misto: "Provas e trabalhos",
};

/**
 * Quantidades, quando informadas. Campo opcional: célula vazia é "não informado",
 * e não zero — por isso a ausência some em vez de virar "0 provas".
 */
function detalheDeQuantidades(r: Review): string | null {
  const partes: string[] = [];
  if (r.qtdProvas !== undefined) {
    partes.push(`${r.qtdProvas} prova${r.qtdProvas === 1 ? "" : "s"}`);
  }
  if (r.qtdTrabalhos !== undefined) {
    partes.push(`${r.qtdTrabalhos} trabalho${r.qtdTrabalhos === 1 ? "" : "s"}`);
  }
  return partes.length ? partes.join(" · ") : null;
}

/** Uma avaliação. As notas vêm DEPOIS do comentário, em destaque. */
export function CartaoReview(props: { review: Review; mostrarCodigo?: boolean }) {
  const { review: r } = props;
  const quantidades = detalheDeQuantidades(r);
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-3 dark:border-zinc-800/70 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{r.autor}</span>
        <span className="font-mono text-[10px] text-zinc-400">
          {props.mostrarCodigo !== false && `${r.codigo} · `}
          {r.semestre}
          {r.situacao === "reprovado" && " · reprovou"}
        </span>
      </div>

      {r.comentario && (
        <p className="mt-2 text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
          {r.comentario}
        </p>
      )}

      {/* Como a matéria cobra a nota. Fica junto do relato, e não com as notas,
          porque é fato do semestre — quem lê quer saber se cai prova antes de
          comparar médias. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-utfpr-500/15 px-1.5 py-0.5 text-[10px] font-bold text-utfpr-700 dark:text-utfpr-400">
          {ROTULO_SISTEMA[r.avaliacao]}
        </span>
        {quantidades && (
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{quantidades}</span>
        )}
      </div>

      {/* Depois do texto e destacadas: o comentário é o que se lê, as notas são o
          que se compara. Antes elas viravam um cabeçalho miúdo que ninguém batia
          o olho. */}
      <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
        {VERTICAIS.map((v) => (
          <div
            key={v.chave}
            title={dicaDaVertical(v)}
            className="flex cursor-help items-center justify-between gap-1 rounded-lg bg-zinc-50 px-2 py-1 dark:bg-zinc-950/60"
          >
            <span className="truncate text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
              {v.rotulo}
            </span>
            <span className="shrink-0 font-display text-xs font-black text-zinc-900 dark:text-zinc-100">
              {r[v.chave]}
              <span className="font-sans text-[9px] font-normal text-zinc-400">/5</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListaReviews(props: { reviews: Review[]; mostrarCodigo?: boolean }) {
  if (!props.reviews.length) return null;
  return (
    <div className="space-y-2">
      {props.reviews.map((r) => (
        <CartaoReview key={r.id} review={r} mostrarCodigo={props.mostrarCodigo} />
      ))}
    </div>
  );
}

export function Resumo(props: { titulo: string; ag: AgregadoReviews }) {
  const { ag } = props;
  if (ag.n === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="font-display text-sm font-bold text-zinc-800 dark:text-zinc-100">
          {props.titulo}
        </h4>
        <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
          {ag.n} avaliação{ag.n > 1 ? "ões" : ""}
        </span>
      </div>

      {ag.estatisticaExibivel ? (
        <div className="grid grid-cols-2 gap-2">
          {VERTICAIS.map((v) => (
            <Nota key={v.chave} vertical={v} valor={ag[v.chave]} />
          ))}
        </div>
      ) : (
        // com n baixo a média mente: 1 de 1 vira "5,0" e soa como consenso
        <p className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-2.5 text-[11px] leading-relaxed text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-950/50 dark:text-zinc-300">
          Ainda são poucas avaliações para uma média confiável — são precisas ao menos{" "}
          {LIMIAR_ESTATISTICA}. Os relatos abaixo continuam valendo como leitura individual.
        </p>
      )}

      {/* Sem piso de amostra, pela mesma razão do histograma: isto é contagem, não
          média. "1 relato diz provas" informa sem fingir consenso, e o formato de
          avaliação costuma ser a primeira pergunta de quem escolhe turma. */}
      {ag.avaliacao.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">Como cobra nota:</span>
          {ag.avaliacao.map(({ sistema, n }) => (
            <span key={sistema}>
              {ROTULO_SISTEMA[sistema]}
              <span className="ml-1 font-mono text-[10px] text-zinc-400">{n}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export interface FiltroNota {
  vertical: Vertical;
  nota: number;
}

/**
 * Bloco de distribuições das quatro verticais, com filtro.
 *
 * Diferente do `Resumo`, aqui as médias aparecem SEM piso de amostra: uma barra
 * com uma resposta mostra literalmente uma resposta, e não finge consenso como
 * um "5,0" isolado faria. O piso protege a média; o histograma se protege sozinho.
 */
export function PainelDistribuicoes(props: {
  reviews: Review[];
  filtro: FiltroNota | null;
  onFiltrar: (f: FiltroNota | null) => void;
}) {
  const { reviews, filtro, onFiltrar } = props;
  if (!reviews.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {VERTICAIS.map((v) => (
        <Distribuicao
          key={v.chave}
          vertical={v}
          reviews={reviews}
          selecionada={filtro?.vertical === v.chave ? filtro.nota : null}
          onSelecionar={(nota) => onFiltrar(nota === null ? null : { vertical: v.chave, nota })}
        />
      ))}
    </div>
  );
}

/** Aplica o filtro de distribuição a uma lista de avaliações. */
export function aplicarFiltro(reviews: Review[], filtro: FiltroNota | null): Review[] {
  if (!filtro) return reviews;
  return reviews.filter((r) => r[filtro.vertical] === filtro.nota);
}

/** Rótulo legível do filtro ativo, para a faixa que permite limpá-lo. */
export function rotuloDoFiltro(filtro: FiltroNota): string {
  const v = VERTICAL_POR_CHAVE.get(filtro.vertical)!;
  return `${v.rotulo} ${filtro.nota}/5 — ${v.regua[filtro.nota - 1]}`;
}

/**
 * Casca dos painéis: gaveta à direita no computador, folha inferior no celular.
 *
 * A gaveta ganha da janela flutuante porque a leitura aqui é de percorrer — abrir
 * distribuições, filtrar, ler vários relatos — e uma caixa centrada rouba a tela
 * inteira para fazer isso. No celular não há lateral que caiba, e a folha inferior
 * é o gesto que o sistema já ensina.
 */
export function CascaPainel(props: {
  aberto: boolean;
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  children: ReactNode;
}) {
  if (!props.aberto) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-xs sm:items-stretch sm:justify-end"
      role="dialog"
      aria-modal="true"
      onClick={props.onFechar}
    >
      <div
        className="flex max-h-[88vh] w-full flex-col rounded-t-2xl border-zinc-200 bg-zinc-50 shadow-2xl sm:max-h-none sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl sm:border-l dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {props.titulo}
            </h2>
            {props.subtitulo && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                {props.subtitulo}
              </p>
            )}
          </div>
          <button
            onClick={props.onFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-xl px-2 py-1 text-lg leading-none text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{props.children}</div>
      </div>
    </div>
  );
}

/** Faixa que mostra o filtro ativo e permite limpá-lo. */
export function FaixaFiltro(props: { filtro: FiltroNota; n: number; onLimpar: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-utfpr-500/40 bg-utfpr-500/10 px-3 py-2">
      <span className="min-w-0 text-[11px] leading-snug text-zinc-700 dark:text-zinc-200">
        Mostrando {props.n} avaliação{props.n > 1 ? "ões" : ""} com{" "}
        <strong>{rotuloDoFiltro(props.filtro)}</strong>
      </span>
      <button
        onClick={props.onLimpar}
        className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-utfpr-700 hover:bg-utfpr-500/20 dark:text-utfpr-400"
      >
        limpar
      </button>
    </div>
  );
}

/** Estado de filtro compartilhado pelos painéis. */
export function useFiltroNota() {
  return useState<FiltroNota | null>(null);
}

/**
 * Gatilho para abrir as avaliações.
 *
 * Duas variantes, um componente só. A apresentação mora aqui justamente para que
 * as três telas que leem avaliação não divirjam, e separar em dois componentes
 * devolveria o problema que este arquivo existe para evitar.
 *
 * `discreto` é estrela e contagem, para onde o gatilho divide espaço com dado que
 * a pessoa foi buscar ali — card de catálogo, linha de disciplina. Uma faixa larga
 * competiria com esse dado em centenas de itens.
 *
 * `acao` é um botão com rótulo, do mesmo tamanho e formato dos vizinhos "Status" e
 * "Espiar" da lista de turmas. Ali o gatilho não divide espaço com dado, e sim com
 * outras ações — na estrela sozinha ele desaparecia entre elas.
 *
 * Sem avaliação o gatilho permanece visível nas duas variantes, porém apagado e
 * inerte: esconder faria a ausência parecer defeito da interface, e a dica explica
 * o que houve.
 */
export function BotaoReviews(props: {
  n: number;
  onAbrir: () => void;
  rotuloAlvo?: string;
  variante?: "discreto" | "acao";
  classe?: string;
}) {
  const { n, onAbrir, rotuloAlvo = "desta disciplina", variante = "discreto" } = props;
  const vazio = n === 0;
  const titulo = vazio
    ? `Ainda não há avaliações ${rotuloAlvo}`
    : `Ver ${n} avaliação${n > 1 ? "ões" : ""} ${rotuloAlvo}`;

  // mesmo formato dos botões vizinhos da linha de turma; qualquer ajuste ali
  // precisa vir para cá, senão o grupo perde o alinhamento
  const estiloAcao = vazio
    ? "cursor-not-allowed border-zinc-200/80 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-700"
    : "border-utfpr-500/50 bg-utfpr-500/10 text-utfpr-700 hover:bg-utfpr-500 hover:text-zinc-950 dark:border-utfpr-500/40 dark:text-utfpr-300 dark:hover:bg-utfpr-400 dark:hover:text-zinc-950";

  return (
    <button
      type="button"
      disabled={vazio}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onAbrir();
      }}
      title={titulo}
      aria-label={vazio ? `Sem avaliações ${rotuloAlvo}` : `Ver ${n} avaliações ${rotuloAlvo}`}
      className={
        variante === "acao"
          ? `inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold shadow-2xs transition-all ${estiloAcao} ${props.classe ?? ""}`
          : `inline-flex shrink-0 items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[11px] font-bold transition ${
              vazio
                ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
                : "text-utfpr-600 hover:bg-utfpr-500/15 dark:text-utfpr-400"
            } ${props.classe ?? ""}`
      }
    >
      <span aria-hidden className={variante === "acao" ? "text-sm leading-none" : "text-xs leading-none"}>
        {vazio ? "☆" : "★"}
      </span>
      {variante === "acao" ? (
        // o número sozinho não diz do que é; ao lado de "Status" e "adicionar" o
        // rótulo precisa nomear a ação como os vizinhos nomeiam a delas
        <span>{vazio ? "Avaliações" : `${n} avaliaç${n > 1 ? "ões" : "ão"}`}</span>
      ) : (
        !vazio && <span>{n}</span>
      )}
    </button>
  );
}

/**
 * Contagem de avaliações por par (disciplina, docentes da turma).
 *
 * Hook porque três telas mostram turma — planejamento, posso cursar e a lista de
 * selecionadas — e cada uma precisa da mesma resposta. Reimplementar em cada uma
 * já havia produzido duas cópias que divergiriam na primeira mudança de regra.
 *
 * A chave é o par, e não só a disciplina: quem escolhe turma quer saber daquela
 * combinação. O código é reduzido à identidade do curso de quem lê, para que
 * avaliação escrita sob o código de outra matriz conte aqui quando é a mesma
 * exigência curricular.
 */
export function useContagemPorTurma(matriz: Matriz | null | undefined) {
  return useMemo(() => {
    const vazio = { habilitado: false, contar: () => 0, idDaTurma: () => "" };
    if (!matriz || !reviewsHabilitadasPara(matriz.matriz)) return vazio;

    const identidade = criarMapaIdentidade(matriz);
    const mapa = new Map<string, number>();
    for (const r of (acervoReviews as AcervoReviews).reviews) {
      if (!r.professorId) continue;
      const chave = `${identidade.resolver(r.codigo)}|${r.professorId}`;
      mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
    }

    // a fonte grava a dupla ora com vírgula, ora sem — `idDaUnidade` já normaliza
    // a ordem, e aqui só separamos o que a fonte separou
    const idDaTurma = (professoresRaw: string) =>
      idDaUnidade((professoresRaw ?? "").split(/\s*,\s*/).filter(Boolean));

    return {
      habilitado: true,
      idDaTurma,
      contar: (codigo: string, professoresRaw: string) => {
        const id = idDaTurma(professoresRaw);
        if (!id) return 0;
        return mapa.get(`${identidade.resolver(codigo)}|${id}`) ?? 0;
      },
    };
  }, [matriz]);
}
