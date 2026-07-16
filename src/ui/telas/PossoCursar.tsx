import { useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../../domain/tipos";
import { listarElegiveis, type Elegivel } from "../../domain/motor/elegiveis";
import { horariosUnicos, rotuloSlot } from "../../domain/motor/grade";
import { faixaDoSlot } from "../../domain/horarios";
import type { SelecaoTurma } from "../App";
import type { PreviewTurma } from "../MiniGrade";
import { Badge, Botao, Card } from "../componentes";
import { IconPlus, IconTrash, IconCheck, IconWarning } from "../icons";

type Grupo = "todas" | "obrigatorias" | "estrato2" | "trilhas" | "humanidades";

const GRUPOS: [Grupo, string][] = [
  ["todas", "Todas"],
  ["obrigatorias", "Obrigatórias"],
  ["estrato2", "2º Estrato"],
  ["trilhas", "Trilhas"],
  ["humanidades", "Humanidades"],
];

function grupoDe(e: Elegivel): Grupo {
  const c = e.disciplina.conjunto;
  if (c === null) return "obrigatorias";
  if (c === 1159) return "estrato2";
  if (c === 1161) return "humanidades";
  return "trilhas";
}

export function TelaPossoCursar(props: {
  perfil: PerfilAluno;
  matriz: Matriz;
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  setSelecao: (s: SelecaoTurma[]) => void;
  onPreview: (p: PreviewTurma | null) => void;
}) {
  const { perfil, matriz, oferta, selecao, setSelecao, onPreview } = props;
  const [soOfertadas, setSoOfertadas] = useState(true);
  const [soLiberadas, setSoLiberadas] = useState(true);
  const [grupo, setGrupo] = useState<Grupo>("todas");
  const [trilha, setTrilha] = useState<string>("todas");

  const elegiveis = useMemo(
    () => listarElegiveis(perfil, matriz, oferta),
    [perfil, matriz, oferta],
  );

  // progresso de horas por trilha (do próprio histórico) para o sub-filtro
  const horasTrilha = useMemo(() => {
    const m = new Map<string, { cursada: number; exigida: number }>();
    for (const r of perfil.resumoConjuntos) {
      if (!["1159", "1160", "1161"].includes(r.conjunto)) {
        m.set(r.conjunto, { cursada: r.chCursadaAprovada, exigida: r.chObrigatoria });
      }
    }
    return m;
  }, [perfil]);

  const trilhasDisponiveis = useMemo(() => {
    const vistos = new Map<string, string>(); // conjunto -> nome
    for (const e of elegiveis) {
      if (grupoDe(e) === "trilhas") {
        vistos.set(String(e.disciplina.conjunto), e.categoria);
      }
    }
    return [...vistos.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [elegiveis]);

  const filtrados = elegiveis.filter(
    (e) =>
      (!soOfertadas || e.oferta) &&
      (!soLiberadas || !e.motivoBloqueio) &&
      (grupo === "todas" || grupoDe(e) === grupo) &&
      (grupo !== "trilhas" || trilha === "todas" || String(e.disciplina.conjunto) === trilha),
  );

  function alternarTurma(codDisciplina: string, codTurma: string) {
    const existe = selecao.find(
      (s) => s.codDisciplina === codDisciplina && s.codTurma === codTurma,
    );
    if (existe) {
      setSelecao(selecao.filter((s) => s !== existe));
    } else {
      setSelecao([
        ...selecao.filter((s) => s.codDisciplina !== codDisciplina),
        { codDisciplina, codTurma },
      ]);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
        {/* grupos de categoria */}
        <div className="flex flex-wrap items-center gap-1.5">
          {GRUPOS.map(([id, rotulo]) => (
            <button
              key={id}
              onClick={() => {
                setGrupo(id);
                if (id !== "trilhas") setTrilha("todas");
              }}
              className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                grupo === id
                  ? "bg-utfpr-500 text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {rotulo}
            </button>
          ))}
          <div className="ml-auto rounded-lg bg-zinc-100 px-3 py-1 font-mono text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {filtrados.length} {filtrados.length === 1 ? "disciplina" : "disciplinas"}
          </div>
        </div>

        {/* sub-filtro: só aparece com Trilhas selecionado */}
        {grupo === "trilhas" && (
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Trilha:
            </span>
            <select
              value={trilha}
              onChange={(e) => setTrilha(e.target.value)}
              className="cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-semibold text-zinc-800 transition-colors focus:border-utfpr-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="todas">Todas as 12 trilhas</option>
              {trilhasDisponiveis.map(([conjunto, nome]) => {
                const h = horasTrilha.get(conjunto);
                return (
                  <option key={conjunto} value={conjunto}>
                    {nome}
                    {h ? ` — ${Math.min(h.cursada, h.exigida)}/${h.exigida}h` : ""}
                  </option>
                );
              })}
            </select>
            {trilha !== "todas" && horasTrilha.get(trilha) && (
              <Badge tom={horasTrilha.get(trilha)!.cursada >= horasTrilha.get(trilha)!.exigida ? "ok" : "acento"}>
                {Math.min(horasTrilha.get(trilha)!.cursada, horasTrilha.get(trilha)!.exigida)}/
                {horasTrilha.get(trilha)!.exigida}h cumpridas nesta trilha
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-5 border-t border-zinc-100 pt-3 text-sm font-medium dark:border-zinc-800">
          <label className="flex cursor-pointer items-center gap-2 text-zinc-700 select-none dark:text-zinc-300">
            <input
              type="checkbox"
              checked={soOfertadas}
              onChange={(e) => setSoOfertadas(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-utfpr-500 transition-all dark:border-zinc-700"
            />
            <span>Com turma aberta em {oferta.semestre}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-zinc-700 select-none dark:text-zinc-300">
            <input
              type="checkbox"
              checked={soLiberadas}
              onChange={(e) => setSoLiberadas(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-utfpr-500 transition-all dark:border-zinc-700"
            />
            <span>Liberadas (pré-requisitos cumpridos)</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filtrados.map((e) => (
          <Card key={e.disciplina.codigo} classe="flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
                  <span className="font-mono text-xs font-semibold text-zinc-400 mr-1.5">
                    {e.disciplina.codigo}
                  </span>
                  {e.disciplina.nome}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge tom={e.categoria === "obrigatória" ? "acento" : "neutro"}>
                  {e.categoria}
                </Badge>
                <Badge>{e.disciplina.periodo}º período</Badge>
                <Badge>{e.disciplina.horas.total}h</Badge>
                {e.disciplina.horas.chext > 0 && (
                  <Badge tom="ok">{e.disciplina.horas.chext}h ext</Badge>
                )}
                {e.jaMatriculada && (
                  <Badge tom="acento" icon={<IconCheck className="h-3 w-3" />}>
                    matriculada
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              {e.motivoBloqueio ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
                  <IconWarning className="h-4 w-4 shrink-0" />
                  <span>{e.motivoBloqueio}</span>
                </div>
              ) : e.oferta ? (
                <ul className="space-y-2">
                  {e.oferta.turmas.map((t) => {
                    const marcada = selecao.some(
                      (s) => s.codDisciplina === e.disciplina.codigo && s.codTurma === t.codigo,
                    );
                    return (
                      <li
                        key={t.codigo}
                        onMouseEnter={() => onPreview({ disciplina: e.oferta!, turma: t })}
                        onMouseLeave={() => onPreview(null)}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-colors ${
                          marcada
                            ? "border-utfpr-500/50 bg-utfpr-500/10 dark:border-utfpr-500/30 dark:bg-utfpr-500/5"
                            : "border-zinc-200/60 bg-zinc-50/60 hover:border-utfpr-500/40 dark:border-zinc-800/60 dark:bg-zinc-800/40 dark:hover:border-utfpr-500/30"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-zinc-800 shadow-2xs dark:bg-zinc-700 dark:text-zinc-200">
                              {t.codigo}
                            </span>
                            <span
                              className="truncate text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                              title={horariosUnicos(t)
                                .map((h) => {
                                  const f = faixaDoSlot(h.turno, h.aula);
                                  return `${rotuloSlot(h)}${f ? ` (${f.inicio}–${f.fim})` : ""}${h.sala ? ` ${h.sala}` : ""}`;
                                })
                                .join(" · ")}
                            >
                              {horariosUnicos(t).map(rotuloSlot).join(" · ") ||
                                "Sem horário definido"}
                            </span>
                          </div>
                          {t.professores_raw && (
                            <div className="mt-1 truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              {t.professores_raw}
                            </div>
                          )}
                        </div>
                        <Botao
                          variante={marcada ? "perigo" : "primario"}
                          onClick={() => alternarTurma(e.disciplina.codigo, t.codigo)}
                        >
                          {marcada ? (
                            <>
                              <IconTrash className="h-3.5 w-3.5" />
                              <span>remover</span>
                            </>
                          ) : (
                            <>
                              <IconPlus className="h-3.5 w-3.5" />
                              <span>adicionar</span>
                            </>
                          )}
                        </Botao>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  Sem turma ofertada no semestre ativo
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
