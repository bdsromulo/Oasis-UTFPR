import { useState } from "react";
import { IconX } from "../icons";
import { useCamadaHistorico } from "../hooks/useCamadaHistorico";
import { Card } from "../componentes";

export function ModalExplicacaoCalculos(props: { aberto: boolean; onFechar: () => void; id: string }) {
  const [cursoSimulado, setCursoSimulado] = useState<"bsi" | "comp" | "eletro">("bsi");

  useCamadaHistorico(props.aberto, props.onFechar, props.id);

  if (!props.aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 sm:p-8 animate-in zoom-in-95 duration-200">
        <button
          onClick={props.onFechar}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 sm:h-8 sm:w-8 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
          title="Fechar"
        >
          <IconX className="h-5 w-5" />
        </button>

        <h3 className="font-display text-2xl font-black text-zinc-900 dark:text-white mb-6 pr-8 tracking-tight">
          Como o Oásis calcula
        </h3>

        <ConteudoExplicacaoCalculos cursoSimulado={cursoSimulado} onMudarCurso={setCursoSimulado} />
      </div>
    </div>
  );
}

export function ConteudoExplicacaoCalculos(props: {
  cursoSimulado: "bsi" | "comp" | "eletro";
  onMudarCurso: (c: "bsi" | "comp" | "eletro") => void;
}) {
  return (
    <>
      <div className="mb-4">
        <label htmlFor="curso-simulado" className="block text-sm font-bold text-zinc-900 dark:text-white mb-2">
          Escolha o seu curso para ver as regras exatas:
        </label>
        <select
          id="curso-simulado"
          value={props.cursoSimulado}
          onChange={(e) => props.onMudarCurso(e.target.value as any)}
          className="w-full max-w-sm rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-utfpr-500 focus:outline-none focus:ring-2 focus:ring-utfpr-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        >
          <option value="bsi">Sistemas de Informação (BSI)</option>
          <option value="comp">Engenharia de Computação</option>
          <option value="eletro">Engenharia Eletrônica</option>
        </select>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-2 text-utfpr-600 dark:text-utfpr-500 mb-3">
            <h4 className="font-display text-base font-black tracking-tight text-zinc-900 dark:text-white">
              A Grade Inteligente
            </h4>
          </div>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 mb-2">
            A Sugestão de Grade usa um algoritmo para montar a grade ideal, maximizando o seu avanço. Ela avalia milhares de combinações possíveis por segundo e prioriza disciplinas usando um sistema de pontuação.
          </p>
          <ul className="mt-2 space-y-1">
            <li className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
              <span>
                <strong>Prioridade Máxima:</strong> Matérias obrigatórias {props.cursoSimulado === "bsi" && "ou de 2º Estrato "}ganham muitos pontos e são alocadas primeiro.
              </span>
            </li>
            <li className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
              <span>
                <strong>Bônus de Atraso:</strong> Matérias atrasadas ganham a fórmula <code>(10 - período) × 12</code> de pontuação. Um choque entre uma matéria do 4º e outra do 6º período é sempre vencido pela do 4º período, para destravar a sua progressão. Esse bônus só se aplica a disciplinas obrigatórias{props.cursoSimulado === "bsi" ? " e de 2º Estrato." : "."}
              </span>
            </li>
            <li className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
              <span>
                <strong>Estratégia Balanceada vs Adiantar Máximo:</strong> Em "Balanceado", o sistema bonifica grades que mantêm pelo menos um dia útil livre (para descanso ou estágio) e que distribuem as aulas homogeneamente pela semana. Em "Adiantar Máximo", a meta é puramente encaixar mais matérias.
              </span>
            </li>
            {props.cursoSimulado === "bsi" && (
              <li className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
                <span>
                  <strong>Inteligência de Trilhas:</strong> Se você já validou parte de uma trilha optativa, o algoritmo dará preferência absoluta a outras matérias daquela mesma trilha, com o objetivo de bater as 90h exigidas antes de espalhar a sua carga em trilhas novas.
                </span>
              </li>
            )}
            {props.cursoSimulado === "eletro" && (
              <li className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
                <span>
                  <strong>Grupos de Opção:</strong> A Engenharia Eletrônica exige fechamentos de carga dentro de blocos específicos. O sistema penaliza disciplinas de grupos de opção nos quais você já cumpriu a carga inteira, preferindo sempre fechar primeiro os grupos que faltam poucas horas.
                </span>
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-utfpr-600 dark:text-utfpr-500 mb-3">
            <h4 className="font-display text-base font-black tracking-tight text-zinc-900 dark:text-white">
              O Simulador de Formatura
            </h4>
          </div>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 mb-2">
            O simulador projeta a sua linha do tempo até o último período com base na matriz curricular. Ele atua puxando disciplinas futuras e encaixando-as em semestres fictícios.
          </p>
          <ul className="mt-2 space-y-1">
            <li className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
              <span>
                <strong>Ritmo Constante:</strong> Você escolhe o número máximo de matérias por semestre. O simulador preenche esse "balde" semestre a semestre até zerar as suas pendências.
              </span>
            </li>
            <li className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
              <span>
                <strong>Cadeias de Pré-requisitos:</strong> O algoritmo nunca simula no mesmo semestre duas matérias que dependem uma da outra. Ele "empurra" a matéria-filha para o semestre seguinte e avança no tempo dinamicamente até destravar todo o fluxograma.
              </span>
            </li>
            {props.cursoSimulado === "bsi" && (
              <li className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
                <span>
                  <strong>Fechamento de Categorias:</strong> O simulador "inventa" posições de optativas até que você bata as 405h totais (Trilhas + Blocos Genéricos), 120h de Eletivas e 120h de Humanidades.
                </span>
              </li>
            )}
            {props.cursoSimulado !== "bsi" && (
              <li className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-utfpr-500" />
                <span>
                  <strong>Cargas Livres e Opções:</strong> Além de projetar obrigatórias, o sistema aloca horas genéricas nos seus grupos optativos e eletivos abertos até atingir a carga mínima exigida pelo curso para o diploma.
                </span>
              </li>
            )}
          </ul>
        </Card>
      </div>
    </>
  );
}
