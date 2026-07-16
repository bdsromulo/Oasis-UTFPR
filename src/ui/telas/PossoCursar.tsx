import { useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../../domain/tipos";
import { listarElegiveis } from "../../domain/motor/elegiveis";
import { horariosUnicos, rotuloSlot } from "../../domain/motor/grade";
import type { SelecaoTurma } from "../App";
import { Badge, Botao, Card } from "../componentes";

export function TelaPossoCursar(props: {
  perfil: PerfilAluno;
  matriz: Matriz;
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  setSelecao: (s: SelecaoTurma[]) => void;
}) {
  const { perfil, matriz, oferta, selecao, setSelecao } = props;
  const [soOfertadas, setSoOfertadas] = useState(true);
  const [soLiberadas, setSoLiberadas] = useState(true);
  const [categoria, setCategoria] = useState<string>("todas");

  const elegiveis = useMemo(
    () => listarElegiveis(perfil, matriz, oferta),
    [perfil, matriz, oferta],
  );
  const categorias = useMemo(
    () => ["todas", ...new Set(elegiveis.map((e) => e.categoria))],
    [elegiveis],
  );
  const filtrados = elegiveis.filter(
    (e) =>
      (!soOfertadas || e.oferta) &&
      (!soLiberadas || !e.motivoBloqueio) &&
      (categoria === "todas" || e.categoria === categoria),
  );

  function alternarTurma(codDisciplina: string, codTurma: string) {
    const existe = selecao.find(
      (s) => s.codDisciplina === codDisciplina && s.codTurma === codTurma,
    );
    if (existe) {
      setSelecao(selecao.filter((s) => s !== existe));
    } else {
      // uma turma por disciplina
      setSelecao([
        ...selecao.filter((s) => s.codDisciplina !== codDisciplina),
        { codDisciplina, codTurma },
      ]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={soOfertadas}
            onChange={(e) => setSoOfertadas(e.target.checked)}
            className="accent-utfpr-500"
          />
          só com turma em {oferta.semestre}
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={soLiberadas}
            onChange={(e) => setSoLiberadas(e.target.checked)}
            className="accent-utfpr-500"
          />
          só liberadas (pré-requisitos ok)
        </label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c === "todas" ? "todas as categorias" : c}
            </option>
          ))}
        </select>
        <span className="text-zinc-500">{filtrados.length} disciplinas</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtrados.map((e) => (
          <Card key={e.disciplina.codigo}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">
                  <span className="font-mono text-xs text-zinc-400">{e.disciplina.codigo}</span>{" "}
                  {e.disciplina.nome}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tom={e.categoria === "obrigatória" ? "acento" : "neutro"}>
                    {e.categoria}
                  </Badge>
                  <Badge>{e.disciplina.periodo}º período</Badge>
                  <Badge>{e.disciplina.horas.total}h</Badge>
                  {e.disciplina.horas.chext > 0 && (
                    <Badge tom="ok">{e.disciplina.horas.chext}h ext</Badge>
                  )}
                  {e.jaMatriculada && <Badge tom="acento">matriculada</Badge>}
                </div>
              </div>
            </div>

            {e.motivoBloqueio ? (
              <p className="mt-2 text-sm text-red-500">{e.motivoBloqueio}</p>
            ) : e.oferta ? (
              <ul className="mt-3 space-y-1.5">
                {e.oferta.turmas.map((t) => {
                  const marcada = selecao.some(
                    (s) => s.codDisciplina === e.disciplina.codigo && s.codTurma === t.codigo,
                  );
                  return (
                    <li
                      key={t.codigo}
                      className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 text-sm dark:bg-zinc-800/60"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold">{t.codigo}</span>{" "}
                        <span className="text-zinc-500">
                          {horariosUnicos(t).map(rotuloSlot).join(" · ") || "sem horário"}
                        </span>
                        {t.professores_raw && (
                          <div className="truncate text-xs text-zinc-400">{t.professores_raw}</div>
                        )}
                      </div>
                      <Botao
                        variante={marcada ? "perigo" : "primario"}
                        onClick={() => alternarTurma(e.disciplina.codigo, t.codigo)}
                      >
                        {marcada ? "remover" : "+ grade"}
                      </Botao>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">sem turma aberta neste semestre</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
