// Layout "roots" inspirado no Grade na Hora: lista única e densa de TODAS as
// disciplinas com turmas abertas no semestre, marcação direta e preview na
// minigrade lateral — com as melhorias que o nosso motor permite (filtro de
// pendentes do MEU curso, liberadas por pré-requisito, busca).
import { useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../../domain/tipos";
import { cumpre, listarElegiveis } from "../../domain/motor/elegiveis";
import { horariosUnicos } from "../../domain/motor/grade";
import { faixaDoSlot } from "../../domain/horarios";
import type { SelecaoTurma } from "../App";
import type { PreviewTurma } from "../MiniGrade";
import { Badge } from "../componentes";

export function TelaLayoutGNH(props: {
  perfil: PerfilAluno;
  matriz: Matriz;
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  setSelecao: (s: SelecaoTurma[]) => void;
  onPreview: (p: PreviewTurma | null) => void;
}) {
  const { perfil, matriz, oferta, selecao, setSelecao, onPreview } = props;
  const [busca, setBusca] = useState("");
  const [soPendentes, setSoPendentes] = useState(false);
  const [soLiberadas, setSoLiberadas] = useState(false);

  // estado de cada disciplina ofertada em relação ao MEU histórico
  const estadoPorCodigo = useMemo(() => {
    const bloqueios = new Map(
      listarElegiveis(perfil, matriz, oferta).map((e) => [
        e.disciplina.codigo,
        e.motivoBloqueio,
      ]),
    );
    const m = new Map<string, { pendente: boolean; bloqueio: string | null; naMatriz: boolean }>();
    for (const d of oferta.disciplinas) {
      const naMatriz = matriz.disciplinas.some((x) => x.codigo === d.codigo);
      const cumprida = naMatriz && cumpre(d.codigo, perfil, matriz);
      m.set(d.codigo, {
        naMatriz,
        pendente: naMatriz && !cumprida,
        bloqueio: bloqueios.get(d.codigo) ?? null,
      });
    }
    return m;
  }, [perfil, matriz, oferta]);

  const disciplinas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return [...oferta.disciplinas]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .filter((d) => {
        const est = estadoPorCodigo.get(d.codigo)!;
        if (soPendentes && !est.pendente) return false;
        if (soLiberadas && (!est.pendente || est.bloqueio)) return false;
        if (q && !d.nome.toLowerCase().includes(q) && !d.codigo.toLowerCase().includes(q))
          return false;
        return true;
      });
  }, [oferta, busca, soPendentes, soLiberadas, estadoPorCodigo]);

  function marcada(codDisciplina: string, codTurma: string) {
    return selecao.some((s) => s.codDisciplina === codDisciplina && s.codTurma === codTurma);
  }
  function alternar(codDisciplina: string, codTurma: string) {
    if (marcada(codDisciplina, codTurma)) {
      setSelecao(
        selecao.filter((s) => !(s.codDisciplina === codDisciplina && s.codTurma === codTurma)),
      );
    } else {
      setSelecao([
        ...selecao.filter((s) => s.codDisciplina !== codDisciplina),
        { codDisciplina, codTurma },
      ]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-3.5 text-sm shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código…"
          className="w-56 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm focus:border-utfpr-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800"
        />
        <label className="flex cursor-pointer items-center gap-2 font-medium text-zinc-700 select-none dark:text-zinc-300">
          <input
            type="checkbox"
            checked={soPendentes}
            onChange={(e) => setSoPendentes(e.target.checked)}
            className="h-4 w-4 accent-utfpr-500"
          />
          só pendentes pra mim
        </label>
        <label className="flex cursor-pointer items-center gap-2 font-medium text-zinc-700 select-none dark:text-zinc-300">
          <input
            type="checkbox"
            checked={soLiberadas}
            onChange={(e) => setSoLiberadas(e.target.checked)}
            className="h-4 w-4 accent-utfpr-500"
          />
          só liberadas
        </label>
        <span className="ml-auto font-mono text-xs font-bold text-zinc-500">
          {disciplinas.length} disciplinas
        </span>
      </div>

      <div className="space-y-4">
        {disciplinas.map((d) => {
          const est = estadoPorCodigo.get(d.codigo)!;
          return (
            <div key={d.codigo}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-sm font-bold text-utfpr-700 dark:text-utfpr-500">
                  [{d.codigo}]
                </span>
                <span className="font-display font-bold">{d.nome}</span>
                <span className="text-xs text-zinc-400">
                  ({d.aulas_semanais_presenciais ?? "?"} aulas/sem)
                </span>
                {est.pendente && !est.bloqueio && <Badge tom="ok">liberada</Badge>}
                {est.pendente && est.bloqueio && (
                  <span title={est.bloqueio}>
                    <Badge tom="alerta">bloqueada</Badge>
                  </span>
                )}
                {est.naMatriz && !est.pendente && <Badge tom="neutro">já cumprida</Badge>}
                {!est.naMatriz && <Badge tom="neutro">fora da matriz 981</Badge>}
              </div>
              <ul className="mt-1 space-y-0.5">
                {d.turmas.map((t) => {
                  const sel = marcada(d.codigo, t.codigo);
                  return (
                    <li
                      key={t.codigo}
                      onMouseEnter={() => onPreview({ disciplina: d, turma: t })}
                      onMouseLeave={() => onPreview(null)}
                    >
                      <label
                        className={`flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-2 py-1 text-sm transition-colors select-none ${
                          sel
                            ? "bg-utfpr-500/15 dark:bg-utfpr-500/10"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => alternar(d.codigo, t.codigo)}
                          className="h-3.5 w-3.5 accent-utfpr-500"
                        />
                        <span className="font-mono font-bold">{t.codigo}</span>
                        <span className="text-zinc-500">—</span>
                        <span className="truncate text-zinc-700 dark:text-zinc-300">
                          {t.professores_raw || "professor a definir"}
                        </span>
                        <span
                          className="font-mono text-xs text-zinc-500"
                          title={horariosUnicos(t)
                            .map((h) => {
                              const f = faixaDoSlot(h.turno, h.aula);
                              return `${h.dia}${h.turno}${h.aula}${f ? ` ${f.inicio}–${f.fim}` : ""}`;
                            })
                            .join("  ")}
                        >
                          [{" "}
                          {horariosUnicos(t)
                            .map(
                              (h) =>
                                `${h.dia}${h.turno}${h.aula}(${h.sede === "Ecoville" ? "*" : h.sede === "Neoville" ? "**" : ""}${h.sala ?? "?"})`,
                            )
                            .join(" - ") || "sem horário"}{" "}
                          ]
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
