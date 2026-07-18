import { useState, useMemo } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../../domain/tipos";
import { montarPainel } from "../../domain/motor/situacao";
import { Badge, Barra, Card, MenuOrdenacao } from "../componentes";
import { IconCheck, IconSearch } from "../icons";
import { renderizarTextoComCodigos } from "./Situacao";

function normNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export type CategoriaCatalogo = "todas" | "obrigatorias" | "segundoEstrato" | "humanidades" | "trilhas" | "eletivas" | "extensao";

export function TelaCatalogo(props: {
  perfil: PerfilAluno | null;
  matriz: Matriz;
  oferta: OfertaSemestre;
  categoriaInicial?: CategoriaCatalogo;
  onVoltar?: () => void;
}) {
  const { perfil, matriz, oferta } = props;
  const [categoria, setCategoria] = useState<CategoriaCatalogo>(props.categoriaInicial ?? "todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "abertas" | "semoferta" | "concluidas">("todas");
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<string>("az");

  const painel = useMemo(() => (perfil ? montarPainel(perfil, matriz) : null), [perfil, matriz]);

  const infoProgresso = useMemo(() => {
    if (!painel) return null;
    if (categoria === "obrigatorias" && painel.obrigatorias) {
      return { titulo: "Obrigatórias (1º estrato)", cumprido: painel.obrigatorias.aprovada, exigido: painel.obrigatorias.total };
    }
    if (categoria === "segundoEstrato" && painel.segundoEstrato) {
      return { titulo: "2º Estrato", cumprido: painel.segundoEstrato.cumprido, exigido: painel.segundoEstrato.exigido };
    }
    if (categoria === "humanidades" && painel.humanidades) {
      return { titulo: "Ciclo de Humanidades", cumprido: painel.humanidades.cumprido, exigido: painel.humanidades.exigido };
    }
    if (categoria === "trilhas") {
      const soma = painel.trilhas.reduce((acc, t) => acc + t.cumprido, 0);
      return { titulo: "Trilhas em Computação (3º Estrato)", cumprido: soma, exigido: 345 };
    }
    if (categoria === "eletivas" && painel.eletivas) {
      return { titulo: "Eletivas", cumprido: painel.eletivas.cumprido, exigido: painel.eletivas.exigido };
    }
    if (categoria === "extensao" && painel.extensao) {
      return { titulo: "Extensão Universitária", cumprido: painel.extensao.cumprido, exigido: painel.extensao.exigido };
    }
    if (categoria === "todas") {
      let soma = 0;
      for (const c of props.perfil?.cursadas ?? []) {
        if (c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado") soma += c.cht || 0;
      }
      return {
        titulo: "Progresso Geral do Curso",
        cumprido: Math.min(soma, matriz.cargas.ch_total_ppc || 3200),
        exigido: matriz.cargas.ch_total_ppc || 3200,
      };
    }
    return null;
  }, [categoria, painel, props.perfil, matriz]);

  // Mapeamento das disciplinas com status no histórico do aluno
  const itensDisciplinas = useMemo(() => {
    const mapaCursadas = new Map<string, { situacao: string; media: number | null; freq: number | null; cht: number; origem: string }>();
    if (perfil) {
      for (const c of perfil.cursadas) {
        mapaCursadas.set(c.codigo, {
          situacao: c.situacao,
          media: c.media,
          freq: c.frequencia,
          cht: c.cht || 0,
          origem: c.origem,
        });
      }
    }

    const codigosOfertados = new Set(oferta.disciplinas.map((d) => d.codigo));

    return matriz.disciplinas.map((dm) => {
      const nomeNorm = normNome(dm.nome);

      let cursada = mapaCursadas.get(dm.codigo);
      if (!cursada) {
        for (const eq of dm.equivalentes) {
          const cEq = mapaCursadas.get(eq.codigo);
          if (cEq) {
            cursada = cEq;
            break;
          }
        }
      }
      if (!cursada && perfil) {
        for (const c of perfil.cursadas) {
          if (c.nome && normNome(c.nome) === nomeNorm) {
            cursada = {
              situacao: c.situacao,
              media: c.media,
              freq: c.frequencia,
              cht: c.cht || 0,
              origem: c.origem,
            };
            break;
          }
        }
      }

      const concluida = cursada?.situacao === "aprovado" || cursada?.situacao === "consignado" || cursada?.situacao === "dispensado";
      const matriculada = cursada?.situacao === "matriculado";
      const dependencia = cursada?.situacao === "reprovado";

      const temOferta = codigosOfertados.has(dm.codigo) ||
        dm.equivalentes.some((eq) => codigosOfertados.has(eq.codigo)) ||
        oferta.disciplinas.some((o) => normNome(o.nome) === nomeNorm);

      let cat: CategoriaCatalogo = "eletivas";
      if (dm.conjunto === null) {
        cat = "obrigatorias";
      } else if (dm.conjunto === 1159) {
        cat = "segundoEstrato";
      } else if (dm.conjunto === 1161) {
        cat = "humanidades";
      } else if (dm.conjunto >= 1162 && dm.conjunto <= 1173) {
        cat = "trilhas";
      } else if (dm.horas.chext > 0) {
        cat = "extensao";
      }

      return {
        disciplina: dm,
        concluida,
        matriculada,
        dependencia,
        cursada,
        temOferta,
        categoria: cat,
      };
    });
  }, [matriz, perfil, oferta]);

  // Filtragem da busca e status
  const itensFiltrados = useMemo(() => {
    const termo = busca
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    return itensDisciplinas.filter((item) => {
      if (categoria !== "todas") {
        if (categoria === "extensao") {
          if (item.disciplina.horas.chext === 0 && item.categoria !== "extensao") return false;
        } else if (item.categoria !== categoria) {
          return false;
        }
      }

      if (filtroPeriodo !== "todos") {
        if (filtroPeriodo === "optativas") {
          if (item.disciplina.periodo !== null && item.disciplina.periodo !== 0) return false;
        } else {
          if (String(item.disciplina.periodo) !== filtroPeriodo) return false;
        }
      }

      if (filtroStatus === "concluidas" && !item.concluida) return false;
      if (filtroStatus === "abertas" && (item.concluida || !item.temOferta)) return false;
      if (filtroStatus === "semoferta" && (item.concluida || item.temOferta)) return false;

      if (termo) {
        const codNorm = item.disciplina.codigo.toLowerCase();
        const nomeNorm = item.disciplina.nome
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (!codNorm.includes(termo) && !nomeNorm.includes(termo)) return false;
      }

      return true;
    });
  }, [itensDisciplinas, categoria, filtroStatus, busca]);

  const itensOrdenados = useMemo(() => {
    return [...itensFiltrados].sort((a, b) => {
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
  }, [itensFiltrados, ordenacao]);

  const contagens = useMemo(() => {
    let total = 0;
    let concluidas = 0;
    let abertas = 0;
    let semoferta = 0;

    for (const item of itensDisciplinas) {
      if (categoria !== "todas") {
        if (categoria === "extensao") {
          if (item.disciplina.horas.chext === 0 && item.categoria !== "extensao") continue;
        } else if (item.categoria !== categoria) continue;
      }
      total++;
      if (item.concluida) concluidas++;
      else if (item.temOferta) abertas++;
      else semoferta++;
    }
    return { total, concluidas, abertas, semoferta };
  }, [itensDisciplinas, categoria]);

  const categoriasOpcoes: [CategoriaCatalogo, string][] = [
    ["todas", "Todas as Disciplinas"],
    ["obrigatorias", "1º Estrato (Obrigatórias)"],
    ["segundoEstrato", "2º Estrato"],
    ["humanidades", "Ciclo de Humanidades"],
    ["trilhas", "Trilhas em Computação (3º Estrato)"],
    ["eletivas", "Eletivas"],
    ["extensao", "Extensão"],
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página de Catálogo */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Catálogo e Lista de Matérias do Curso
          </h2>
        </div>
      </div>

      {/* Filtros de Categoria (Dropdown) e Período (exclusivo para Catálogo) */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-100/70 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/70">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <label htmlFor="categoria-catalogo" className="font-display text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Categoria:
          </label>
          <select
            id="categoria-catalogo"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaCatalogo)}
            className="flex-1 cursor-pointer rounded-xl border border-zinc-300 bg-white px-3.5 py-2 font-display text-xs font-bold text-zinc-900 shadow-2xs transition-all focus:border-utfpr-500 focus:outline-none focus:ring-2 focus:ring-utfpr-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-utfpr-400"
          >
            {categoriasOpcoes.map(([id, rotulo]) => (
              <option key={id} value={id}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <label htmlFor="periodo-catalogo" className="font-display text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Período:
          </label>
          <select
            id="periodo-catalogo"
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="flex-1 cursor-pointer rounded-xl border border-zinc-300 bg-white px-3.5 py-2 font-display text-xs font-bold text-zinc-900 shadow-2xs transition-all focus:border-utfpr-500 focus:outline-none focus:ring-2 focus:ring-utfpr-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-utfpr-400"
          >
            <option value="todos">Todos os Períodos</option>
            <option value="1">1º Período</option>
            <option value="2">2º Período</option>
            <option value="3">3º Período</option>
            <option value="4">4º Período</option>
            <option value="5">5º Período</option>
            <option value="6">6º Período</option>
            <option value="7">7º Período</option>
            <option value="8">8º Período</option>
            <option value="optativas">Optativas / Sem Período Fixo</option>
          </select>
        </div>
      </div>

      {/* CARD PROGRESSO DA CATEGORIA SELECIONADA (ITEM 7) */}
      {infoProgresso && (
        <Card classe="p-5 bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div>
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Progresso: {infoProgresso.titulo}
              </span>
              <div className="font-display text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                {infoProgresso.cumprido} <span className="text-zinc-400 font-normal text-sm">/ {infoProgresso.exigido}h</span>
              </div>
            </div>
            {infoProgresso.cumprido >= infoProgresso.exigido && infoProgresso.exigido > 0 && (
              <Badge tom="ok" icon={<IconCheck className="h-3.5 w-3.5" />}>
                concluído
              </Badge>
            )}
          </div>
          <Barra valor={infoProgresso.cumprido} max={infoProgresso.exigido} />
        </Card>
      )}

      {/* VISÃO EXPANDIDA DE TRILHAS (Quando categoria == "trilhas") */}
      {categoria === "trilhas" && painel && (
        <section className="space-y-6 rounded-2xl border border-utfpr-500/30 bg-utfpr-500/5 p-6 dark:border-utfpr-500/20 dark:bg-utfpr-500/10">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-zinc-200/60 pb-4 dark:border-zinc-800/60">
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Visão Geral das Trilhas de Aprofundamento (3º Estrato)
              </h3>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Para completar o 3º estrato, o estudante precisa validar pelo menos <strong>3 trilhas distintas</strong> (cada uma somando a carga horária exigida do conjunto).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tom={painel.trilhasValidadas >= 3 ? "ok" : "acento"} classe="text-sm px-3 py-1 font-bold">
                {painel.trilhasValidadas} de 3 trilhas concluídas
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {painel.trilhas.map((trilha) => {
              const disciplinasTrilha = itensDisciplinas.filter(
                (item) => item.disciplina.conjunto === Number(trilha.conjunto),
              );

              return (
                <Card key={trilha.conjunto} classe="flex flex-col justify-between p-4.5 bg-white dark:bg-zinc-900">
                  <div>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                        {trilha.nome}
                      </h4>
                      {trilha.validado ? (
                        <Badge tom="ok" icon={<IconCheck className="h-3 w-3" />} classe="shrink-0">
                          validada
                        </Badge>
                      ) : (
                        <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
                          {trilha.cumprido}/{trilha.exigido}h
                        </span>
                      )}
                    </div>
                    <Barra valor={trilha.cumprido} max={trilha.exigido} destaque={trilha.cumprido > 0} />
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800 space-y-2">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Disciplinas da Trilha ({disciplinasTrilha.length}):
                    </span>
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {[...disciplinasTrilha]
                        .sort((a, b) => {
                          const pesoA = a.concluida ? 1 : a.temOferta ? 2 : 3;
                          const pesoB = b.concluida ? 1 : b.temOferta ? 2 : 3;
                          if (pesoA !== pesoB) return pesoA - pesoB;
                          return a.disciplina.codigo.localeCompare(b.disciplina.codigo);
                        })
                        .map((dt) => (
                          <li
                            key={dt.disciplina.codigo}
                            className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 text-xs dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50"
                          >
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span
                                title={`${dt.disciplina.codigo} — ${dt.disciplina.nome}`}
                                className="font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0 text-[11px] cursor-help underline decoration-dotted decoration-zinc-400"
                              >
                                {dt.disciplina.codigo}
                              </span>
                              <span className="truncate text-zinc-700 dark:text-zinc-300 text-[11px]" title={dt.disciplina.nome}>
                                {dt.disciplina.nome}
                              </span>
                            </div>
                            {dt.concluida ? (
                              <Badge tom="ok" classe="!text-[10px] !px-1.5 !py-0.5">
                                OK
                              </Badge>
                            ) : dt.temOferta ? (
                              <Badge tom="acento" classe="!text-[10px] !px-1.5 !py-0.5">
                                Aberta
                              </Badge>
                            ) : (
                              <Badge tom="neutro" classe="!text-[10px] !px-1.5 !py-0.5">
                                Sem Oferta
                              </Badge>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Barra de Busca, Filtro de Status e Ordenação */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-72">
            <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar matéria por nome ou código..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-10 pr-4 text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-utfpr-500 focus:bg-white focus:ring-2 focus:ring-utfpr-500/20 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              onClick={() => setFiltroStatus("todas")}
              className={`rounded-lg px-3 py-1.5 font-display text-xs font-bold transition-all cursor-pointer ${
                filtroStatus === "todas"
                  ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Todas ({contagens.total})
            </button>
            <button
              onClick={() => setFiltroStatus("abertas")}
              className={`rounded-lg px-3 py-1.5 font-display text-xs font-bold transition-all cursor-pointer ${
                filtroStatus === "abertas"
                  ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Abertas ({contagens.abertas})
            </button>
            <button
              onClick={() => setFiltroStatus("semoferta")}
              className={`rounded-lg px-3 py-1.5 font-display text-xs font-bold transition-all cursor-pointer ${
                filtroStatus === "semoferta"
                  ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Sem Oferta ({contagens.semoferta})
            </button>
            <button
              onClick={() => setFiltroStatus("concluidas")}
              className={`rounded-lg px-3 py-1.5 font-display text-xs font-bold transition-all cursor-pointer ${
                filtroStatus === "concluidas"
                  ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Concluídas ({contagens.concluidas})
            </button>
          </div>

          <MenuOrdenacao valor={ordenacao} onMudar={setOrdenacao} />
        </div>

        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Exibindo <strong className="text-zinc-800 dark:text-zinc-200">{itensOrdenados.length}</strong> de{" "}
          {contagens.total} disciplinas
        </div>
      </div>

      {/* Lista Principal das Disciplinas */}
      {itensOrdenados.length === 0 ? (
        <Card classe="p-12 text-center">
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Nenhuma disciplina encontrada com os filtros selecionados.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {itensOrdenados.map((item) => {
            const { disciplina: d, concluida, cursada, temOferta } = item;

            return (
              <div
                key={d.codigo}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                  concluida
                    ? "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    : "border-zinc-200/90 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        title={`${d.codigo} — ${d.nome}`}
                        className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100 cursor-help underline decoration-dotted decoration-zinc-400"
                      >
                        {d.codigo}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {d.periodo ? `${d.periodo}º Período` : "Optativa"}
                      </span>
                    </div>
                    {concluida ? (
                      <Badge tom="ok" icon={<IconCheck className="h-3 w-3" />}>
                        {cursada?.situacao === "aprovado" ? "Aprovado" : "Concluída"}
                      </Badge>
                    ) : temOferta ? (
                      <Badge tom="acento">Aberta</Badge>
                    ) : (
                      <Badge tom="neutro">Sem Oferta</Badge>
                    )}
                  </div>

                  <h3 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {d.nome}
                  </h3>

                  {/* Detalhes do cumprimento ou pré-requisitos */}
                  <div className="mt-2.5 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {concluida ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                        {cursada?.media !== null && cursada?.media !== undefined && (
                          <span>Média: <strong>{cursada.media.toFixed(1)}</strong></span>
                        )}
                        {cursada?.freq !== null && cursada?.freq !== undefined && (
                          <span>Freq: <strong>{cursada.freq}%</strong></span>
                        )}
                        <span>CH: <strong>{cursada?.cht || d.horas.total}h</strong></span>
                      </div>
                    ) : (
                      <div>
                        {d.prerequisitos && d.prerequisitos.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-semibold text-zinc-500">Pré-requisito:</span>
                            <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                              {renderizarTextoComCodigos(d.prerequisitos.join(", "), matriz)}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-zinc-400">Sem pré-requisito formal</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span>Total: <strong>{d.horas.total}h</strong></span>
                    {d.horas.chext > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        Extensão: <strong>{d.horas.chext}h</strong>
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {item.categoria === "obrigatorias" && "1º Estrato"}
                    {item.categoria === "segundoEstrato" && "2º Estrato"}
                    {item.categoria === "humanidades" && "Humanidades"}
                    {item.categoria === "trilhas" && "3º Estrato"}
                    {item.categoria === "eletivas" && "Eletiva"}
                    {item.categoria === "extensao" && "Extensão"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
