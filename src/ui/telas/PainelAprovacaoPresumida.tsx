import type { Matriz, PerfilAluno } from "../../domain/tipos";
import { matriculadasPresumiveis } from "../../domain/motor/presuncao";
import { disciplinaCanonicaDaOferta } from "../../domain/motor/identidade";
import {
  formatarSemestre,
  SEMESTRE_CORRENTE,
  SEMESTRE_PLANEJAMENTO,
} from "../../domain/semestres";
import { Badge, Card } from "../componentes";
import { IconCheck, IconWarning } from "../icons";

/**
 * As matérias em curso, com a escolha de contá-las ou não como aprovadas.
 *
 * O padrão é contar: quem abre o Oásis para montar a grade de 2027.1 espera
 * planejar a partir de onde vai estar, e não de onde o histórico o deixou. Mas
 * a escolha é por matéria, porque quem já sabe que vai reprovar numa delas
 * precisa ver a projeção honesta — e é justamente essa pessoa que mais precisa
 * do simulador.
 */

function ListaDeMaterias(props: {
  perfil: PerfilAluno;
  matriz: Matriz;
  candidatas: PerfilAluno["matriculadas"];
  presumidas: string[];
  onAlternar: (codigo: string) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {props.candidatas.map((m) => {
        const marcada = props.presumidas.includes(m.codigo);
        const dm = disciplinaCanonicaDaOferta(props.matriz, m.codigo, m.nome);
        const horas = dm?.horas?.total ?? null;
        return (
          <li key={m.codigo}>
            <label
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-xs transition-colors ${
                marcada
                  ? "border-emerald-400/60 bg-emerald-50/70 dark:border-emerald-800/70 dark:bg-emerald-950/40"
                  : "border-zinc-200/90 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60"
              }`}
            >
              <input
                type="checkbox"
                checked={marcada}
                onChange={() => props.onAlternar(m.codigo)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
              />
              <span className="font-mono text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                {m.codigo}
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-semibold ${
                  marcada
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 line-through dark:text-zinc-500"
                }`}
              >
                {dm?.nome ?? m.nome}
              </span>
              {horas !== null && (
                <span className="shrink-0 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                  {horas}h
                </span>
              )}
              <span className="shrink-0 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                {m.turma}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function PainelAprovacaoPresumida(props: {
  perfil: PerfilAluno;
  matriz: Matriz;
  presumidas: string[];
  onMudar: (presumidas: string[]) => void;
  /** versão enxuta, para o topo do Simulador; abre no clique */
  compacto?: boolean;
}) {
  const candidatas = matriculadasPresumiveis(props.perfil);
  if (candidatas.length === 0) return null;

  // O semestre vem do cabeçalho da tabela do PDF. Quando ele não é o corrente,
  // o histórico foi emitido em outro período e presumir sobre ele seria contar
  // como futuro algo que já tem nota lançada em algum lugar.
  const semestreDoPdf = candidatas.find((m) => m.semestre)?.semestre ?? null;
  const desatualizado = semestreDoPdf !== null && semestreDoPdf !== SEMESTRE_CORRENTE;
  const marcadas = candidatas.filter((m) => props.presumidas.includes(m.codigo));

  function alternar(codigo: string) {
    props.onMudar(
      props.presumidas.includes(codigo)
        ? props.presumidas.filter((c) => c !== codigo)
        : [...props.presumidas, codigo],
    );
  }

  const resumo = `${marcadas.length} de ${candidatas.length} ${
    candidatas.length === 1 ? "matéria conta" : "matérias contam"
  } como aprovadas`;

  const aviso = desatualizado && (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/80 p-3 text-xs font-medium text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200">
      <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Este histórico é de {formatarSemestre(semestreDoPdf!)}, e o semestre corrente é{" "}
        {formatarSemestre(SEMESTRE_CORRENTE)}. As matérias abaixo já devem ter nota lançada —
        reimporte o PDF do Portal para o planejamento partir do quadro real.
      </span>
    </div>
  );

  const rodape = (
    <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
      Esta é uma suposição sua, não um dado do Portal. O histórico guardado continua exatamente
      como o PDF o descreve — desmarcar tudo devolve a plataforma ao quadro real.
    </p>
  );

  // No Simulador a premissa aparece recolhida, mas a lista abre e é editável ali
  // mesmo: mandar a pessoa a outra tela para mexer na suposição que sustenta a
  // data de formatura que ela está olhando é perder o fio.
  if (props.compacto) {
    return (
      <details className="group rounded-2xl border border-emerald-400/60 bg-emerald-50/70 dark:border-emerald-800/70 dark:bg-emerald-950/40">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 p-3 text-xs">
          <IconCheck className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <span className="font-semibold text-emerald-900 dark:text-emerald-200">
            {resumo} nesta projeção
          </span>
          <span className="ml-auto shrink-0 text-[10px] font-black tracking-wider text-emerald-900/70 uppercase dark:text-emerald-200/70">
            <span className="group-open:hidden">ajustar</span>
            <span className="hidden group-open:inline">ocultar</span>
          </span>
        </summary>

        <div className="space-y-3 px-3 pb-3">
          <p className="text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
            Você está cursando estas matérias agora. Marcadas, a projeção assume que você passa
            nelas e parte de {formatarSemestre(SEMESTRE_PLANEJAMENTO)} já com elas cumpridas.
            Desmarque as que você acha que não vai passar.
          </p>
          {aviso}
          <ListaDeMaterias
            perfil={props.perfil}
            matriz={props.matriz}
            candidatas={candidatas}
            presumidas={props.presumidas}
            onAlternar={alternar}
          />
          {rodape}
        </div>
      </details>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-black tracking-tight text-zinc-900 dark:text-white">
            Matérias em curso
            {semestreDoPdf ? ` · ${formatarSemestre(semestreDoPdf)}` : ""}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Elas ainda não têm nota. Marcadas, entram no planejamento como aprovadas — liberam
            pré-requisitos, somam carga horária e saem da projeção de formatura. Desmarque as que
            você acha que não vai passar.
          </p>
        </div>
        <Badge tom={marcadas.length > 0 ? "ok" : "neutro"}>
          {marcadas.length}/{candidatas.length}
        </Badge>
      </div>

      {desatualizado && <div className="mt-3">{aviso}</div>}

      <div className="mt-3">
        <ListaDeMaterias
          perfil={props.perfil}
          matriz={props.matriz}
          candidatas={candidatas}
          presumidas={props.presumidas}
          onAlternar={alternar}
        />
      </div>

      <div className="mt-3">{rodape}</div>
    </Card>
  );
}
