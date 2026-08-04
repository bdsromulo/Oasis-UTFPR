// Peças de exibição compartilhadas pelos painéis de avaliação.
//
// Moram aqui, e não dentro de um dos painéis, porque a mesma avaliação é lida por
// dois caminhos — pelo professor, no planejamento, e pela disciplina, no catálogo.
// Duplicar a apresentação faria as duas leituras divergirem em silêncio, e é
// exatamente a régua compartilhada que dá sentido ao número exibido.
import { LIMIAR_ESTATISTICA } from "../../domain/reviews/acervo";
import type { AgregadoReviews, Review } from "../../domain/reviews/tipos";

/**
 * Rótulo de cada ponto da escala.
 *
 * Espelha a régua do formulário: quem responde e quem lê precisam decodificar o
 * mesmo número do mesmo jeito, ou a média vira ruído com aparência de dado.
 */
export const REGUA: Record<string, string[]> = {
  Geral: [
    "Não recomendo",
    "Deixou a desejar",
    "Cumpriu o esperado",
    "Boa experiência",
    "Das melhores que cursei",
  ],
  Didática: [
    "Não dava para acompanhar",
    "Explicação confusa",
    "Exigia estudo por fora",
    "Explicava com clareza",
    "A aula bastava por si só",
  ],
  Dificuldade: [
    "Passei sem esforço concentrado",
    "Passar foi tranquilo",
    "Precisei estudar de verdade",
    "Exigente",
    "Das mais exigentes do curso",
  ],
  Carga: [
    "Quase nada fora da aula",
    "Leve (~2h por semana)",
    "Moderada (~4h por semana)",
    "Pesada (~6–8h por semana)",
    "Ditou minha rotina no semestre",
  ],
};

export function Nota(props: { rotulo: string; valor: number | null; escala: string }) {
  const regua = REGUA[props.rotulo];
  // a dica traz a régua inteira: sem ela, "3,4 de carga" não significa nada
  const dica = regua ? regua.map((r, i) => `${i + 1} — ${r}`).join("\n") : undefined;
  return (
    <div
      title={dica}
      className={`rounded-xl border border-zinc-200/70 px-3 py-2 dark:border-zinc-800/70 ${
        dica ? "cursor-help" : ""
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {props.rotulo}
      </div>
      <div className="font-display text-lg font-black text-zinc-900 dark:text-zinc-100">
        {props.valor === null ? "—" : props.valor.toFixed(1).replace(".", ",")}
        <span className="ml-1 font-sans text-[10px] font-normal text-zinc-400">/ 5</span>
      </div>
      <div className="text-[10px] text-zinc-400">{props.escala}</div>
    </div>
  );
}

export function ListaReviews(props: { reviews: Review[]; mostrarCodigo?: boolean }) {
  if (!props.reviews.length) return null;
  return (
    <div className="space-y-2">
      {props.reviews.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl border border-zinc-200/70 bg-white p-3 dark:border-zinc-800/70 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {r.autor}
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              {props.mostrarCodigo !== false && `${r.codigo} · `}
              {r.semestre}
              {r.situacao === "reprovado" && " · reprovou"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span>Geral {r.geral}/5</span>
            <span>· Didática {r.didatica}/5</span>
            <span>· Dificuldade {r.dificuldade}/5</span>
            <span>· Carga {r.cargaTrabalho}/5</span>
          </div>
          {r.comentario && (
            <p className="mt-2 text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
              {r.comentario}
            </p>
          )}
        </div>
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
          <Nota rotulo="Geral" valor={ag.geral} escala="1 ruim · 5 ótima" />
          <Nota rotulo="Didática" valor={ag.didatica} escala="1 ruim · 5 ótima" />
          <Nota rotulo="Dificuldade" valor={ag.dificuldade} escala="1 fácil · 5 difícil" />
          <Nota rotulo="Carga" valor={ag.cargaTrabalho} escala="1 leve · 5 pesada" />
        </div>
      ) : (
        // com n baixo a média mente: 1 de 1 vira "5,0" e soa como consenso
        <p className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-2.5 text-[11px] leading-relaxed text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-950/50 dark:text-zinc-300">
          Ainda são poucas avaliações para uma média confiável — são precisas ao menos{" "}
          {LIMIAR_ESTATISTICA}. Os relatos abaixo continuam valendo como leitura individual.
        </p>
      )}
    </div>
  );
}
