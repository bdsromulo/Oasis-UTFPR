import { useMemo, useState, useRef } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../../domain/tipos";
import { listarElegiveis, type Elegivel } from "../../domain/motor/elegiveis";
import {
  horariosUnicos,
  rotuloSlot,
  haveriaConflito,
  type ItemGrade,
} from "../../domain/motor/grade";
import { faixaDoSlot } from "../../domain/horarios";
import type { SelecaoTurma } from "../App";
import { itensDaSelecao, type PreviewTurma } from "../MiniGrade";
import { Badge, Botao, Card, MenuOrdenacao, BalaoProgressoHover, useIsMobile } from "../componentes";
import { obterCargaHoraria } from "../../domain/motor/progressoGrade";
import { IconPlus, IconTrash, IconCheck, IconWarning, IconFilter } from "../icons";
import { renderizarTextoComCodigos } from "./Situacao";
import { descricaoDoCurso, ehTrilha, categoriaSimples } from "../../domain/cursos";

type Grupo = "todas" | "obrigatorias" | "estrato2" | "trilhas" | "humanidades";

function grupoDe(e: Elegivel, matriz: Matriz): Grupo {
  const c = e.disciplina.conjunto;
  if (c === null) return "obrigatorias";
  const curso = descricaoDoCurso(matriz);
  const cat = categoriaSimples(curso, c);
  if (cat?.id === "segundoEstrato") return "estrato2";
  if (cat?.id === "humanidades") return "humanidades";
  return "trilhas";
}

function CardDisciplinaPossoCursar({
  e,
  selecao,
  alternarTurma,
  onPreview,
  onAbrirMobilePreview,
  filtrarConflitos = false,
  itensSelecao = [],
  matriz,
  perfil,
}: {
  e: Elegivel;
  selecao: SelecaoTurma[];
  alternarTurma: (codDisciplina: string, codTurma: string) => void;
  onPreview: (p: PreviewTurma | null) => void;
  onAbrirMobilePreview?: (p: PreviewTurma) => void;
  filtrarConflitos?: boolean;
  itensSelecao?: ItemGrade[];
  matriz?: Matriz;
  perfil?: PerfilAluno | null;
}) {
  const isMobile = useIsMobile();
  const temHistorico = Boolean(perfil && perfil.cursadas && perfil.cursadas.length > 0);
  const [statusHoverTurma, setStatusHoverTurma] = useState<string | null>(null);
  const [progressoCarregadoTurma, setProgressoCarregadoTurma] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const iniciarHoverStatus = (chave: string) => {
    if (!temHistorico) return;
    setStatusHoverTurma(chave);
    setProgressoCarregadoTurma(null);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setProgressoCarregadoTurma(chave);
    }, 1000);
  };

  const cancelarHoverStatus = () => {
    setStatusHoverTurma(null);
    setProgressoCarregadoTurma(null);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const [expandido, setExpandido] = useState(false);

  const { turmasBSI } = useMemo(() => {
    if (!e.oferta || e.oferta.turmas.length === 0) {
      return { turmasBSI: [] };
    }
    const todas = e.oferta.turmas.filter((t) => {
      if (!filtrarConflitos) return true;
      const marcada = selecao.some(
        (s) => s.codDisciplina === e.disciplina.codigo && s.codTurma === t.codigo,
      );
      if (marcada) return true;
      return !haveriaConflito(itensSelecao, e.oferta!, t);
    });

    return { turmasBSI: todas };
  }, [e.oferta, filtrarConflitos, selecao, itensSelecao, e.disciplina.codigo]);

  return (
    <Card classe="flex flex-col justify-start !p-0 overflow-hidden">
      <div
        onClick={() => setExpandido(!expandido)}
        className="cursor-pointer select-none p-4 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-utfpr-600 dark:group-hover:text-utfpr-400 transition-colors">
            <span
              title={`${e.disciplina.codigo} — ${e.disciplina.nome}`}
              className="font-mono text-xs font-semibold text-zinc-400 mr-1.5 cursor-help underline decoration-dotted decoration-zinc-400"
            >
              {e.disciplina.codigo}
            </span>
            {e.disciplina.nome}
          </div>
          {e.oferta && e.oferta.turmas.length > 0 && (
            <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-xl bg-zinc-100 text-xs font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 group-hover:bg-utfpr-500 group-hover:text-zinc-950 transition-all shadow-2xs">
              {expandido ? "▲" : "▼"}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tom={e.categoria === "obrigatória" ? "acento" : "neutro"}>
            {e.categoria}
          </Badge>
          <Badge>{e.disciplina.periodo}º período</Badge>
          <Badge>{e.disciplina.horas.total}h</Badge>
          {e.disciplina.horas.chext > 0 && (
            <Badge>extensionista</Badge>
          )}
          {e.jaMatriculada && (
            <Badge tom="acento" icon={<IconCheck className="h-3 w-3" />}>
              matriculada
            </Badge>
          )}
          {e.motivoBloqueio && (
            <span title={e.motivoBloqueio} className="cursor-help">
              <Badge tom="alerta" icon={<IconWarning className="h-3 w-3" />}>bloqueada</Badge>
            </span>
          )}
        </div>
      </div>

      {expandido && (
        <div className="p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2 mt-1">
          {e.motivoBloqueio ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
              <IconWarning className="h-4 w-4 shrink-0" />
              <span>{matriz ? renderizarTextoComCodigos(e.motivoBloqueio, matriz) : e.motivoBloqueio}</span>
            </div>
          ) : e.oferta ? (
            <>
              {turmasBSI.length > 0 ? (
                <ul className="space-y-2">
                  {turmasBSI.map((t) => {
                    const marcada = selecao.some(
                      (s) => s.codDisciplina === e.disciplina.codigo && s.codTurma === t.codigo,
                    );
                    return (
                      <li
                        key={t.codigo}
                        onMouseEnter={() => onPreview({ disciplina: e.oferta!, turma: t })}
                        onMouseLeave={() => onPreview(null)}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                          marcada
                            ? "border-utfpr-500/60 bg-utfpr-500/15 dark:bg-utfpr-500/10 shadow-2xs"
                            : "border-zinc-200/80 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 select-none"
                          onClick={() => alternarTurma(e.disciplina.codigo, t.codigo)}
                        >
                          <input
                            type="checkbox"
                            checked={marcada}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-zinc-300 accent-utfpr-500 dark:border-zinc-700 pointer-events-none"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {t.codigo}
                              </span>
                              <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {t.professores_raw || "Professor a definir"}
                              </span>
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
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                              {horariosUnicos(t).map((h, idx) => {
                                const f = faixaDoSlot(h.turno, h.aula);
                                return (
                                  <span
                                    key={idx}
                                    title={f ? `${f.inicio}–${f.fim}` : undefined}
                                    className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800"
                                  >
                                    {rotuloSlot(h)}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {isMobile && (
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                const p = { disciplina: e.oferta!, turma: t };
                                onPreview(p);
                                if (onAbrirMobilePreview) onAbrirMobilePreview(p);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-utfpr-500 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-utfpr-400 dark:hover:text-zinc-950 transition-all cursor-pointer shadow-2xs"
                              title="Espiar nesta turma na grade (ideal no celular ou para teste rápido)"
                            >
                              <span>👁️</span>
                              <span>Espiar</span>
                            </button>
                          )}
                          {temHistorico && (
                            <div
                              className="relative inline-block"
                              onMouseEnter={() => iniciarHoverStatus(t.codigo)}
                              onMouseLeave={cancelarHoverStatus}
                            >
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  if (statusHoverTurma === t.codigo) {
                                    cancelarHoverStatus();
                                  } else {
                                    setStatusHoverTurma(t.codigo);
                                    setProgressoCarregadoTurma(t.codigo);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-utfpr-500 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-utfpr-400 dark:hover:text-zinc-950 transition-all cursor-pointer shadow-2xs"
                                title="Status de progresso desta matéria no currículo"
                              >
                                <span>📊</span>
                                <span>Status</span>
                              </button>
                              {statusHoverTurma === t.codigo && (
                                <BalaoProgressoHover
                                  codigoDisciplina={e.disciplina.codigo}
                                  nomeDisciplina={e.disciplina.nome}
                                  cargaHoraria={obterCargaHoraria(e.disciplina, matriz)}
                                  perfil={perfil}
                                  matriz={matriz}
                                  posicao="superior"
                                  carregando={progressoCarregadoTurma !== t.codigo}
                                />
                              )}
                            </div>
                          )}
                          <Botao
                            variante={marcada ? "sutil" : "neutro"}
                            onClick={(evt) => {
                              evt.stopPropagation();
                              alternarTurma(e.disciplina.codigo, t.codigo);
                            }}
                            classe={`!px-2.5 !py-1 text-xs ${marcada ? "!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-950/40" : ""}`}
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
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-zinc-400 italic">Nenhuma turma exibida para seus filtros.</p>
              )}
            </>
          ) : (
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
              Sem turma ofertada no semestre ativo
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export function TelaPossoCursar(props: {
  perfil: PerfilAluno | null;
  matriz: Matriz;
  oferta: OfertaSemestre;
  selecao: SelecaoTurma[];
  setSelecao: (s: SelecaoTurma[]) => void;
  onPreview: (p: PreviewTurma | null) => void;
  onAbrirMobilePreview?: (p: PreviewTurma) => void;
  filtrarConflitos?: boolean;
  onAbrirGradeMagica?: () => void;
}) {
  const { perfil, matriz, oferta, selecao, setSelecao, onPreview, onAbrirMobilePreview, filtrarConflitos = false, onAbrirGradeMagica } = props;
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<string>("az");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [soOfertadas, setSoOfertadas] = useState(true);
  const [soLiberadas, setSoLiberadas] = useState(true);
  const [grupo, setGrupo] = useState<Grupo>("todas");
  const [trilha, setTrilha] = useState<string>("todas");
  const curso = descricaoDoCurso(matriz);
  const grupos = useMemo<[Grupo, string][]>(() => [
    ["todas", "Todas"],
    ["obrigatorias", "Obrigatórias"],
    ...curso.categorias.filter((c) => c.id === "segundoEstrato").map(() => ["estrato2", "2º Estrato"] as [Grupo, string]),
    ["trilhas", "Trilhas"],
    ...curso.categorias.filter((c) => c.id === "humanidades").map(() => ["humanidades", "Humanidades"] as [Grupo, string]),
  ], [curso]);

  const elegiveis = useMemo(
    () => listarElegiveis(perfil, matriz, oferta),
    [perfil, matriz, oferta],
  );

  const itensSelecao = useMemo(() => itensDaSelecao(oferta, selecao), [oferta, selecao]);

  // progresso de horas por trilha (do próprio histórico) para o sub-filtro
  const horasTrilha = useMemo(() => {
    const m = new Map<string, { cursada: number; exigida: number }>();
    if (!perfil) return m;
    for (const r of perfil.resumoConjuntos) {
      if (ehTrilha(descricaoDoCurso(matriz), r.conjunto)) {
        m.set(r.conjunto, { cursada: r.chCursadaAprovada, exigida: r.chObrigatoria });
      }
    }
    return m;
  }, [perfil]);

  const trilhasDisponiveis = useMemo(() => {
    const vistos = new Map<string, string>(); // conjunto -> nome
    for (const e of elegiveis) {
      if (grupoDe(e, matriz) === "trilhas") {
        vistos.set(String(e.disciplina.conjunto), e.categoria);
      }
    }
    return [...vistos.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [elegiveis]);

  const filtrados = useMemo(() => {
    const buscaLimpa = busca
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    const lista = elegiveis.filter((e) => {
      // 1. Ofertadas
      if (soOfertadas && (!e.oferta || e.oferta.turmas.length === 0)) {
        return false;
      }
      // 2. Liberadas por pré-requisito
      if (soLiberadas && e.motivoBloqueio !== null) {
        return false;
      }
      // 3. Grupo curricular
      if (grupo !== "todas" && grupoDe(e, matriz) !== grupo) {
        return false;
      }
      if (grupo === "trilhas" && trilha !== "todas" && String(e.disciplina.conjunto) !== trilha) {
        return false;
      }
      // 4. Busca por texto (código, nome ou professor)
      if (buscaLimpa) {
        const porCodigo = e.disciplina.codigo.toLowerCase().includes(buscaLimpa);
        const porNome = e.disciplina.nome
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(buscaLimpa);
        const porProf =
          e.oferta?.turmas.some((t) =>
            (t.professores_raw || "")
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .includes(buscaLimpa),
          ) || false;

        if (!porCodigo && !porNome && !porProf) return false;
      }
      // 5. Filtro de conflitos de horário (se ativo e a matéria tem turmas)
      if (filtrarConflitos && e.oferta && e.oferta.turmas.length > 0) {
        const temMarcada = selecao.some((s) => s.codDisciplina === e.disciplina.codigo);
        if (temMarcada) return true;
        const temCompativel = e.oferta.turmas.some((t) => !haveriaConflito(itensSelecao, e.oferta!, t));
        if (!temCompativel) return false;
      }
      return true;
    });

    // Ordenação (Item 14)
    return lista.sort((a, b) => {
      const nomeA = a.disciplina.nome;
      const nomeB = b.disciplina.nome;
      const chA = a.disciplina.horas.total;
      const chB = b.disciplina.horas.total;
      const perA = a.disciplina.periodo || 99;
      const perB = b.disciplina.periodo || 99;

      if (ordenacao === "az") return nomeA.localeCompare(nomeB, "pt-BR");
      if (ordenacao === "za") return nomeB.localeCompare(nomeA, "pt-BR");
      if (ordenacao === "ch_desc") return chB - chA || nomeA.localeCompare(nomeB, "pt-BR");
      if (ordenacao === "ch_asc") return chA - chB || nomeA.localeCompare(nomeB, "pt-BR");
      if (ordenacao === "per_asc") return perA - perB || nomeA.localeCompare(nomeB, "pt-BR");
      if (ordenacao === "per_desc") return perB - perA || nomeA.localeCompare(nomeB, "pt-BR");
      return 0;
    });
  }, [elegiveis, soOfertadas, soLiberadas, grupo, trilha, busca, filtrarConflitos, selecao, itensSelecao, ordenacao]);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-3.5 text-sm shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar matéria, código ou professor…"
            className="flex-1 min-w-[240px] sm:min-w-[320px] rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-sm font-medium focus:border-utfpr-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-amber-400 dark:focus:bg-zinc-900"
          />
          <button
            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-display text-sm font-bold transition-all cursor-pointer ${
              filtrosAbertos || grupo !== "todas" || !soOfertadas || !soLiberadas
                ? "bg-utfpr-500 text-zinc-950 shadow-xs border-2 border-zinc-900 dark:border-amber-400"
                : "border border-zinc-300 bg-zinc-100 text-zinc-800 hover:border-zinc-900 hover:bg-zinc-200 dark:border-amber-400/70 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-amber-400 dark:hover:bg-zinc-700"
            }`}
          >
            <IconFilter className="h-4 w-4" />
            <span>Filtros</span>
          </button>
          <MenuOrdenacao valor={ordenacao} onMudar={setOrdenacao} />
          {onAbrirGradeMagica && (
            <button
              onClick={onAbrirGradeMagica}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-utfpr-500 px-3.5 py-2 font-display text-sm font-bold text-zinc-950 shadow-md transition-all hover:brightness-105 cursor-pointer"
              title="Preenchimento com Sugestão de Grade"
            >
              <span>✨</span>
              <span className="hidden sm:inline">Sugestão de Grade</span>
              <span className="sm:hidden">Sugestão</span>
            </button>
          )}
        </div>

        <div className="font-mono text-xs font-bold text-zinc-500">
          {filtrados.length} {filtrados.length === 1 ? "disciplina" : "disciplinas"}
        </div>
      </div>

      {filtrosAbertos && (
        <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80 transition-all">
          {/* grupos de categoria (Dropdown) */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="grupo-possocursar" className="font-display text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Categoria:
            </label>
            <select
              id="grupo-possocursar"
              value={grupo}
              onChange={(e) => {
                const id = e.target.value as Grupo;
                setGrupo(id);
                if (id !== "trilhas") setTrilha("todas");
              }}
              className="cursor-pointer rounded-xl border border-zinc-300 bg-white px-3.5 py-2 font-display text-xs font-bold text-zinc-900 shadow-2xs transition-all focus:border-utfpr-500 focus:outline-none focus:ring-2 focus:ring-utfpr-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-utfpr-400 min-w-[200px]"
            >
              {grupos.map(([id, rotulo]) => (
                <option key={id} value={id}>
                  {rotulo === "todas" ? "Todas as Categorias" : rotulo}
                </option>
              ))}
            </select>
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
      )}

      <div className="space-y-4">
        {filtrados.map((e) => (
          <CardDisciplinaPossoCursar
            key={e.disciplina.codigo}
            e={e}
            selecao={selecao}
            alternarTurma={alternarTurma}
            onPreview={onPreview}
            onAbrirMobilePreview={onAbrirMobilePreview}
            filtrarConflitos={filtrarConflitos}
            itensSelecao={itensSelecao}
            matriz={matriz}
            perfil={perfil}
          />
        ))}
      </div>
    </div>
  );
}
