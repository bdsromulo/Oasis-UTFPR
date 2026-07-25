import { useMemo, useState } from "react";
import type { Matriz, OfertaSemestre } from "../../domain/tipos";
import { descricaoDoCurso, ehTrilha } from "../../domain/cursos";
import { IconBan, IconInfo } from "../icons";

/**
 * Seletor de exclusões (matéria, professor, trilha) — o mesmo vocabulário da
 * Sugestão de Grade, reaproveitado pelo Simulador de Formatura.
 *
 * A lista de docentes vem de `professores_raw` além de `professores`: a oferta
 * do Portal preenche só o primeiro campo, e sem ler os dois a busca por
 * professor viria vazia.
 */

export interface ValorExclusoes {
  disciplinas: { codigo: string; nome: string }[];
  professores: string[];
  trilhas: { conjunto: string; nome: string }[];
}

export const EXCLUSOES_VAZIAS: ValorExclusoes = {
  disciplinas: [],
  professores: [],
  trilhas: [],
};

export function totalExclusoes(v: ValorExclusoes): number {
  return v.disciplinas.length + v.professores.length + v.trilhas.length;
}

function Chip(props: { rotulo: React.ReactNode; titulo: string; onRemover: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-2.5 py-1 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
      {props.rotulo}
      <button
        type="button"
        onClick={props.onRemover}
        className="ml-0.5 cursor-pointer rounded-full p-0.5 text-red-600 hover:bg-red-200 dark:text-red-300 dark:hover:bg-red-900"
        title={`Remover ${props.titulo} da lista de exclusão`}
      >
        ×
      </button>
    </span>
  );
}

function BlocoExclusao<T>(props: {
  titulo: string;
  dica: string;
  rotuloBotao: string;
  placeholder: string;
  vazio: string;
  quantidade: number;
  chips: React.ReactNode;
  sugestoes: T[];
  chaveDe: (item: T) => string;
  renderSugestao: (item: T) => React.ReactNode;
  onAdicionar: (item: T) => void;
  busca: string;
  setBusca: (s: string) => void;
  primeiro?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div
      className={
        props.primeiro
          ? "space-y-2.5"
          : "space-y-2.5 border-t border-zinc-200/60 pt-4 dark:border-zinc-800"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <label
          title={props.dica}
          className="flex cursor-help items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300"
        >
          {props.titulo} {props.quantidade > 0 ? `(${props.quantidade})` : ""}
          <IconInfo className="h-4 w-4 shrink-0" />
        </label>
        {!aberto && (
          <button
            type="button"
            onClick={() => {
              setAberto(true);
              props.setBusca("");
            }}
            className="flex cursor-pointer items-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-2.5 py-1 text-xs font-bold text-zinc-600 transition-colors hover:border-utfpr-500 hover:bg-utfpr-500/10 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400 dark:hover:text-white"
          >
            <span>{props.rotuloBotao}</span>
          </button>
        )}
      </div>

      {props.quantidade > 0 && <div className="flex flex-wrap gap-1.5">{props.chips}</div>}

      {aberto && (
        <div className="animate-in fade-in space-y-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={props.busca}
              onChange={(e) => props.setBusca(e.target.value)}
              placeholder={props.placeholder}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-utfpr-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="shrink-0 cursor-pointer rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Concluir
            </button>
          </div>
          <div className="max-h-40 divide-y divide-zinc-200/60 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {props.sugestoes.length === 0 ? (
              <div className="p-2.5 text-center text-xs text-zinc-400">{props.vazio}</div>
            ) : (
              props.sugestoes.map((item) => (
                <button
                  key={props.chaveDe(item)}
                  type="button"
                  onClick={() => {
                    props.onAdicionar(item);
                    props.setBusca("");
                  }}
                  className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                >
                  {props.renderSugestao(item)}
                  <span className="shrink-0 rounded-lg bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                    + Excluir
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SeletorExclusoes(props: {
  ofertas: OfertaSemestre[];
  matriz: Matriz;
  valor: ValorExclusoes;
  onChange: (v: ValorExclusoes) => void;
}) {
  const { ofertas, matriz, valor, onChange } = props;
  const [buscaDisc, setBuscaDisc] = useState("");
  const [buscaProf, setBuscaProf] = useState("");
  const [buscaTrilha, setBuscaTrilha] = useState("");

  // As disciplinas vêm da matriz, e não só da oferta: o simulador projeta anos à
  // frente, então faz sentido poder excluir algo que não abre neste semestre.
  const discDisponiveis = useMemo(() => {
    const vistas = new Map<string, { codigo: string; nome: string }>();
    for (const d of matriz.disciplinas) {
      if (d.codigo.startsWith("ENADE")) continue;
      vistas.set(d.codigo, { codigo: d.codigo, nome: d.nome });
    }
    return [...vistas.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [matriz]);

  const profDisponiveis = useMemo(() => {
    const set = new Set<string>();
    const limpar = (p: string) => p.trim();
    const invalido = (p: string) =>
      !p || p.toLowerCase() === "a definir" || p.toLowerCase() === "professor a definir";
    for (const oferta of ofertas) {
      for (const d of oferta.disciplinas) {
        for (const t of d.turmas) {
          for (const p of t.professores ?? []) {
            const limpo = limpar(p ?? "");
            if (!invalido(limpo)) set.add(limpo);
          }
          for (const p of (t.professores_raw ?? "").split(/[,;/]+/)) {
            const limpo = limpar(p);
            if (!invalido(limpo)) set.add(limpo);
          }
        }
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [ofertas]);

  const trilhasDisponiveis = useMemo(() => {
    const curso = descricaoDoCurso(matriz);
    return Object.entries(matriz.conjuntos)
      .filter(([cod]) => ehTrilha(curso, cod))
      .map(([conjunto, c]) => ({ conjunto, nome: c.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [matriz]);

  const filtrar = <T,>(lista: T[], busca: string, texto: (t: T) => string, fora: (t: T) => boolean) => {
    const limpo = busca.trim().toLowerCase();
    return lista.filter((x) => !fora(x) && (!limpo || texto(x).toLowerCase().includes(limpo))).slice(0, 12);
  };

  return (
    <div className="space-y-5">
      <BlocoExclusao
        primeiro
        titulo="Excluir matérias"
        dica="A projeção evita estas disciplinas. Se alguma for indispensável para integralizar, ela volta ao plano e o simulador avisa."
        rotuloBotao="+ Excluir matéria"
        placeholder="Pesquisar matéria por nome ou código..."
        vazio={buscaDisc ? "Nenhuma matéria encontrada." : "Digite nome ou código para pesquisar."}
        quantidade={valor.disciplinas.length}
        busca={buscaDisc}
        setBusca={setBuscaDisc}
        chips={valor.disciplinas.map((item) => (
          <Chip
            key={item.codigo}
            titulo={item.codigo}
            rotulo={
              <>
                <span className="font-mono font-bold">{item.codigo}</span>
                <span className="max-w-[180px] truncate" title={item.nome}>
                  {item.nome}
                </span>
              </>
            }
            onRemover={() =>
              onChange({
                ...valor,
                disciplinas: valor.disciplinas.filter((d) => d.codigo !== item.codigo),
              })
            }
          />
        ))}
        sugestoes={filtrar(
          discDisponiveis,
          buscaDisc,
          (d) => `${d.codigo} ${d.nome}`,
          (d) => valor.disciplinas.some((x) => x.codigo === d.codigo),
        )}
        chaveDe={(d) => d.codigo}
        renderSugestao={(d) => (
          <div>
            <span className="mr-2 font-mono font-bold text-zinc-900 dark:text-zinc-100">{d.codigo}</span>
            <span className="text-zinc-600 dark:text-zinc-300">{d.nome}</span>
          </div>
        )}
        onAdicionar={(d) => onChange({ ...valor, disciplinas: [...valor.disciplinas, d] })}
      />

      <BlocoExclusao
        titulo="Excluir professores"
        dica="A projeção evita turmas destes docentes. Quando todas as turmas de uma disciplina necessária são deles, o simulador avisa e mantém a turma."
        rotuloBotao="+ Excluir professor"
        placeholder="Pesquisar professor pelo nome..."
        vazio={buscaProf ? "Nenhum professor encontrado." : "Digite o nome do professor para pesquisar."}
        quantidade={valor.professores.length}
        busca={buscaProf}
        setBusca={setBuscaProf}
        chips={valor.professores.map((p) => (
          <Chip
            key={p}
            titulo={p}
            rotulo={
              <span className="inline-flex items-center gap-1">
                <IconBan className="h-4 w-4 shrink-0" />
                {p}
              </span>
            }
            onRemover={() =>
              onChange({ ...valor, professores: valor.professores.filter((x) => x !== p) })
            }
          />
        ))}
        sugestoes={filtrar(
          profDisponiveis,
          buscaProf,
          (p) => p,
          (p) => valor.professores.includes(p),
        )}
        chaveDe={(p) => p}
        renderSugestao={(p) => <span className="text-zinc-700 dark:text-zinc-200">{p}</span>}
        onAdicionar={(p) => onChange({ ...valor, professores: [...valor.professores, p] })}
      />

      {trilhasDisponiveis.length > 0 && (
        <BlocoExclusao
          titulo="Excluir trilhas"
          dica="A projeção não usa estas trilhas para fechar o bloco optativo. Se sobrarem menos trilhas do que o curso exige, o simulador avisa e usa as excluídas mesmo assim."
          rotuloBotao="+ Excluir trilha"
          placeholder="Pesquisar trilha pelo nome..."
          vazio={buscaTrilha ? "Nenhuma trilha encontrada." : "Digite o nome da trilha para pesquisar."}
          quantidade={valor.trilhas.length}
          busca={buscaTrilha}
          setBusca={setBuscaTrilha}
          chips={valor.trilhas.map((t) => (
            <Chip
              key={t.conjunto}
              titulo={t.nome}
              rotulo={
                <span className="max-w-[220px] truncate" title={t.nome}>
                  {t.nome}
                </span>
              }
              onRemover={() =>
                onChange({ ...valor, trilhas: valor.trilhas.filter((x) => x.conjunto !== t.conjunto) })
              }
            />
          ))}
          sugestoes={filtrar(
            trilhasDisponiveis,
            buscaTrilha,
            (t) => `${t.nome} ${t.conjunto}`,
            (t) => valor.trilhas.some((x) => x.conjunto === t.conjunto),
          )}
          chaveDe={(t) => t.conjunto}
          renderSugestao={(t) => (
            <span className="text-zinc-700 dark:text-zinc-200">{t.nome}</span>
          )}
          onAdicionar={(t) => onChange({ ...valor, trilhas: [...valor.trilhas, t] })}
        />
      )}
    </div>
  );
}
