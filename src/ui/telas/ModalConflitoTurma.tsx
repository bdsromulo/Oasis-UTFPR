import { useEffect } from "react";
import type { DisciplinaOfertada, OfertaSemestre, SelecaoTurma, Turma } from "../../domain/tipos";
import {
  conflitosDaAdicao,
  horariosUnicos,
  itensDaSelecao,
  rotuloSlot,
  type Conflito,
} from "../../domain/motor/grade";
import { IconWarning } from "../icons";

/**
 * Bloqueio de adição por choque de horário, no espírito do Grade na Hora: o
 * clique não entra na grade e um aviso explica com quem bateu.
 *
 * Só choque de horário barra. Divergência de sede entre turnos vizinhos segue
 * como alerta na grade montada, porque é heurística de deslocamento — apertado,
 * mas possível —, e não uma sobreposição real de aula.
 */

export interface ConflitoBloqueado {
  nome: string;
  codigo: string;
  codTurma: string;
  /** referência da turma nova, para saber qual lado do conflito é o outro */
  turma: Turma;
  disciplina: DisciplinaOfertada;
  conflitos: Conflito[];
}

/**
 * Diz se a turma pode entrar. `selecaoSemADisciplina` já deve vir sem as turmas
 * da mesma matéria: trocar de turma substitui a anterior, não soma.
 */
export function verificarChoqueAoAdicionar(
  oferta: OfertaSemestre,
  selecaoSemADisciplina: SelecaoTurma[],
  codDisciplina: string,
  codTurma: string,
): ConflitoBloqueado | null {
  // a mesma resolução da grade, para valer também nas turmas que chegam
  // agrupadas por equivalência ("S71 (IF69D)")
  const alvo = itensDaSelecao(oferta, [{ codDisciplina, codTurma }])[0];
  if (!alvo) return null;

  const itensAtuais = itensDaSelecao(oferta, selecaoSemADisciplina);
  const conflitos = conflitosDaAdicao(itensAtuais, alvo.disciplina, alvo.turma).filter(
    (c) => c.tipo === "choque",
  );
  if (conflitos.length === 0) return null;

  return {
    nome: alvo.disciplina.nome,
    codigo: alvo.disciplina.codigo,
    codTurma: alvo.turma.codigo,
    turma: alvo.turma,
    disciplina: alvo.disciplina,
    conflitos,
  };
}

export function ModalConflitoTurma(props: {
  bloqueio: ConflitoBloqueado | null;
  onFechar: () => void;
}) {
  const { bloqueio, onFechar } = props;

  useEffect(() => {
    if (!bloqueio) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [bloqueio, onFechar]);

  if (!bloqueio) return null;
  const varios = bloqueio.conflitos.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 fade-in backdrop-blur-xs duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-conflito-turma"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md animate-in rounded-3xl border border-zinc-200/80 bg-white p-6 text-left shadow-2xl zoom-in-95 duration-150 dark:border-zinc-800/80 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
            <IconWarning className="h-5 w-5" />
          </span>
          <h3
            id="titulo-conflito-turma"
            className="font-display text-lg font-black tracking-tight text-zinc-900 dark:text-white"
          >
            Conflito de horário
          </h3>
        </div>

        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Não dá para adicionar{" "}
          <strong className="text-zinc-900 dark:text-white">{bloqueio.nome}</strong>{" "}
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            ({bloqueio.codigo} · turma {bloqueio.codTurma})
          </span>
          : o horário dela se sobrepõe ao de {varios ? "matérias que já estão" : "uma matéria que já está"} na sua
          grade.
        </p>

        <ul className="mt-4 space-y-2">
          {bloqueio.conflitos.map((c, i) => {
            const outro = c.a.turma === bloqueio.turma ? c.b : c.a;
            const slots = horariosUnicos(outro.turma).map(rotuloSlot);
            return (
              <li
                key={i}
                className="rounded-xl border border-red-300/70 bg-red-50/70 p-3 text-xs dark:border-red-900/60 dark:bg-red-950/40"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-bold text-red-800 dark:text-red-300">
                    {outro.disciplina.codigo}
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {outro.disciplina.nome}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    turma {outro.turma.codigo}
                  </span>
                </div>
                <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                  Choque em <strong className="font-mono">{c.detalhe}</strong>
                </p>
                {slots.length > 0 && (
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    Horário dela: {slots.join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Para trocar, remova da grade a matéria conflitante e adicione esta depois — ou escolha
          outra turma desta mesma matéria.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onFechar}
            autoFocus
            className="cursor-pointer rounded-xl bg-utfpr-500 px-5 py-2.5 font-display text-sm font-black text-zinc-950 shadow-sm transition-all hover:bg-utfpr-400 active:scale-95"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
