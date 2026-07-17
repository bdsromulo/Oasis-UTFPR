// Layout "roots" inspirado no Grade na Hora: lista única e densa de TODAS as
// disciplinas com turmas abertas no semestre, marcação direta e preview na
// minigrade lateral — com as melhorias que o nosso motor permite (filtro de
// pendentes do MEU curso, liberadas por pré-requisito, busca).
import { useMemo, useState } from "react";
import type { DisciplinaOfertada, Matriz, OfertaSemestre, PerfilAluno } from "../../domain/tipos";
import { cumpre, listarElegiveis } from "../../domain/motor/elegiveis";
import {
  horariosUnicos,
  haveriaConflito,
  type ItemGrade,
} from "../../domain/motor/grade";
import { faixaDoSlot } from "../../domain/horarios";
import type { SelecaoTurma } from "../App";
import { itensDaSelecao, type PreviewTurma } from "../MiniGrade";
import { Badge } from "../componentes";

export function normalizarTextoBusca(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;/(-)]/g, " ")
    .toLowerCase()
    .trim();
}

function DisciplinaGNHItem({
  d,
  est,
  selecao,
  alternar,
  onPreview,
  filtrarConflitos,
  itensSelecao,
}: {
  d: DisciplinaOfertada;
  est: { pendente: boolean; bloqueio: string | null; naMatriz: boolean };
  selecao: SelecaoTurma[];
  alternar: (codDisciplina: string, codTurma: string) => void;
  onPreview: (p: PreviewTurma | null) => void;
  filtrarConflitos: boolean;
  itensSelecao: ItemGrade[];
}) {
  const turmasExibidas = useMemo(() => {
    if (!filtrarConflitos) return d.turmas;
    return d.turmas.filter((t) => {
      const marcada = selecao.some(
        (s) => s.codDisciplina === d.codigo && s.codTurma === t.codigo,
      );
      if (marcada) return true;
      return !haveriaConflito(itensSelecao, d, t);
    });
  }, [d, filtrarConflitos, selecao, itensSelecao]);

  function marcada(codDisciplina: string, codTurma: string) {
    return selecao.some((s) => s.codDisciplina === codDisciplina && s.codTurma === codTurma);
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/60 overflow-hidden">
      <div className="p-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-mono text-sm font-bold text-utfpr-700 dark:text-utfpr-500">
            [{d.codigo}]
          </span>
          <span className="font-display font-bold text-zinc-900 dark:text-zinc-100">{d.nome}</span>
          <span className="text-xs text-zinc-400">
            ({d.aulas_semanais_presenciais ?? "?"} aulas/sem)
          </span>
          {(d.horas_semestrais_extensionistas ?? 0) > 0 && <Badge tom="neutro">extensionista</Badge>}
          {est.pendente && !est.bloqueio && <Badge tom="ok">liberada</Badge>}
          {est.pendente && est.bloqueio && (
            <span title={est.bloqueio} className="cursor-help">
              <Badge tom="alerta">bloqueada</Badge>
            </span>
          )}
          {est.naMatriz && !est.pendente && <Badge tom="neutro">já cumprida</Badge>}
          {!est.naMatriz && <Badge tom="neutro">fora da matriz 981</Badge>}
        </div>
      </div>

      {turmasExibidas.length > 0 ? (
        <ul className="p-3 space-y-1">
          {turmasExibidas.map((t) => {
            const sel = marcada(d.codigo, t.codigo);
            return (
              <li
                key={t.codigo}
                onMouseEnter={() => onPreview({ disciplina: d, turma: t })}
                onMouseLeave={() => onPreview(null)}
              >
                <label
                  className={`flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors select-none ${
                    sel
                      ? "bg-utfpr-500/15 dark:bg-utfpr-500/10 font-medium"
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
                  <div className="ml-auto flex flex-wrap items-center gap-1.5 justify-end">
                    {Array.from(new Set(horariosUnicos(t).map((h) => h.sede)))
                      .filter(Boolean)
                      .map((s) => (
                        <span
                          key={s}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            s === "Ecoville" || s === "Neoville"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          📍 {s}
                        </span>
                      ))}
                    <span
                      className="font-mono text-xs text-zinc-500 dark:text-zinc-400"
                      title={horariosUnicos(t)
                        .map((h) => {
                          const f = faixaDoSlot(h.turno, h.aula);
                          return `${h.dia}${h.turno}${h.aula} (${h.sede})${f ? ` ${f.inicio}–${f.fim}` : ""}`;
                        })
                        .join("  ")}
                    >
                      [{" "}
                      {horariosUnicos(t)
                        .map((h) => `${h.dia}${h.turno}${h.aula} ${h.sala ?? ""}`)
                        .join(" - ") || "sem horário"}{" "}
                      ]
                    </span>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="p-3 text-xs text-zinc-400 italic">Nenhuma turma compatível exibida.</p>
      )}
    </div>
  );
}

export function TelaLayoutGNH(props: {
  perfil: PerfilAluno | null;
  matriz: Matriz;
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  setSelecao: (s: SelecaoTurma[]) => void;
  onPreview: (p: PreviewTurma | null) => void;
  filtrarConflitos?: boolean;
}) {
  const { perfil, matriz, oferta, selecao, setSelecao, onPreview, filtrarConflitos = false } = props;
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<string>("az");
  const [soPendentes, setSoPendentes] = useState(false);
  const [soLiberadas, setSoLiberadas] = useState(false);

  const itensSelecao = useMemo(() => itensDaSelecao(oferta, selecao), [oferta, selecao]);

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
    const q = normalizarTextoBusca(busca);
    const termos = q.split(/\s+/).filter(Boolean);
    return [...oferta.disciplinas]
      .filter((d) => {
        const est = estadoPorCodigo.get(d.codigo)!;
        if (soPendentes && !est.pendente) return false;
        if (soLiberadas && (!est.pendente || est.bloqueio)) return false;
        if (termos.length > 0) {
          const normNome = normalizarTextoBusca(d.nome);
          const normCod = normalizarTextoBusca(d.codigo);
          const normProf = normalizarTextoBusca(
            d.turmas.map((t) => `${t.codigo} ${t.professores_raw || ""}`).join(" ")
          );
          const almeja = termos.every(
            (t) => normNome.includes(t) || normCod.includes(t) || normProf.includes(t)
          );
          if (!almeja) return false;
        }

        // Se filtrarConflitos está ativo, verificar se há ao menos uma compatível ou já selecionada
        if (filtrarConflitos && d.turmas.length > 0) {
          const temMarcada = selecao.some((s) => s.codDisciplina === d.codigo);
          if (temMarcada) return true;
          const temCompativel = d.turmas.some((t) => !haveriaConflito(itensSelecao, d, t));
          if (!temCompativel) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dmA = matriz.disciplinas.find((x) => x.codigo === a.codigo);
        const dmB = matriz.disciplinas.find((x) => x.codigo === b.codigo);
        const nomeA = a.nome;
        const nomeB = b.nome;
        const chA = dmA ? dmA.horas.total : (a.turmas[0]?.horarios.length || 2) * 15;
        const chB = dmB ? dmB.horas.total : (b.turmas[0]?.horarios.length || 2) * 15;
        const perA = dmA?.periodo || 99;
        const perB = dmB?.periodo || 99;

        if (ordenacao === "az") return nomeA.localeCompare(nomeB, "pt-BR");
        if (ordenacao === "za") return nomeB.localeCompare(nomeA, "pt-BR");
        if (ordenacao === "ch_desc") return chB - chA || nomeA.localeCompare(nomeB, "pt-BR");
        if (ordenacao === "ch_asc") return chA - chB || nomeA.localeCompare(nomeB, "pt-BR");
        if (ordenacao === "per_asc") return perA - perB || nomeA.localeCompare(nomeB, "pt-BR");
        if (ordenacao === "per_desc") return perB - perA || nomeA.localeCompare(nomeB, "pt-BR");
        return 0;
      });
  }, [oferta, busca, soPendentes, soLiberadas, estadoPorCodigo, filtrarConflitos, selecao, itensSelecao, ordenacao, matriz]);

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
          placeholder="Buscar matéria, código ou professor…"
          className="w-64 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm focus:border-utfpr-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800"
        />
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          <span>Ordenação:</span>
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 py-1.5 px-3 text-xs font-bold text-zinc-900 outline-none transition-all focus:border-utfpr-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="az">Ordem Alfabética (A-Z)</option>
            <option value="za">Ordem Alfabética (Z-A)</option>
            <option value="ch_desc">Mais Horas (90h, 75h, 60h...)</option>
            <option value="ch_asc">Menos Horas (30h, 45h, 60h...)</option>
            <option value="per_asc">Período (Mais Anterior 1º→8º)</option>
            <option value="per_desc">Período (Mais Posterior 8º→1º)</option>
          </select>
        </div>
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
            <DisciplinaGNHItem
              key={d.codigo}
              d={d}
              est={est}
              selecao={selecao}
              alternar={alternar}
              onPreview={onPreview}
              filtrarConflitos={filtrarConflitos}
              itensSelecao={itensSelecao}
            />
          );
        })}
      </div>
    </div>
  );
}
