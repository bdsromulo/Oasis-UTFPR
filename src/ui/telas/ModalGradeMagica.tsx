import { useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno, SelecaoTurma } from "../../domain/tipos";
import { gerarSugestaoGrade, type OpcoesSugestaoGrade } from "../../domain/motor/grade-magica";
import { Botao } from "../componentes";
import { IconWarning } from "../icons";
import { descricaoDoCurso, ehTrilha, exigeExtensao } from "../../domain/cursos";

export interface ModalSugestaoGradeProps {
  aberto: boolean;
  onFechar: () => void;
  perfil: PerfilAluno | null;
  matriz: Matriz | null;
  oferta: OfertaSemestre;
  selecaoAtual?: SelecaoTurma[];
  onGerarGrade: (
    selecao: SelecaoTurma[],
    exclusoes?: {
      disciplinas: { codigo: string; nome: string }[];
      professores: string[];
      trilhas?: { conjunto: string; nome: string }[];
      outrosFiltros?: string[];
    },
  ) => void;
}

export type ModalGradeMagicaProps = ModalSugestaoGradeProps;

export function ModalSugestaoGrade({
  aberto,
  onFechar,
  perfil,
  matriz,
  oferta,
  selecaoAtual,
  onGerarGrade,
}: ModalSugestaoGradeProps) {
  const [estrategia, setEstrategia] = useState<OpcoesSugestaoGrade["estrategia"]>("adiantar_maximo");
  const [naoManha, setNaoManha] = useState(false);
  const [naoTarde, setNaoTarde] = useState(false);
  const [naoNoite, setNaoNoite] = useState(false);

  const [sedeCentro, setSedeCentro] = useState(true);
  const [sedeEcoville, setSedeEcoville] = useState(false);
  const [sedeNeoville, setSedeNeoville] = useState(false);

  // Definições Avançadas (Toggle)
  const [definicoesAvanadasAbertas, setDefinicoesAvanadasAbertas] = useState(false);

  // Exclusões de disciplinas e professores
  const [disciplinasExcluidas, setDisciplinasExcluidas] = useState<{ codigo: string; nome: string }[]>([]);
  const [professoresExcluidos, setProfessoresExcluidos] = useState<string[]>([]);
  const [trilhasExcluidas, setTrilhasExcluidas] = useState<{ conjunto: string; nome: string }[]>([]);

  const [buscaDisc, setBuscaDisc] = useState("");
  const [modoBuscaDisc, setModoBuscaDisc] = useState(false);
  const [buscaProf, setBuscaProf] = useState("");
  const [modoBuscaProf, setModoBuscaProf] = useState(false);
  const [buscaTrilha, setBuscaTrilha] = useState("");
  const [modoBuscaTrilha, setModoBuscaTrilha] = useState(false);

  // Checkboxes de restrição/prioridade
  const [semHumanidades, setSemHumanidades] = useState(false);
  const [semTrilhas, setSemTrilhas] = useState(false);
  const [semEletivas, setSemEletivas] = useState(false);
  const [priorizarExtensionistas, setPriorizarExtensionistas] = useState(false);

  const [confirmacaoExistentesAberta, setConfirmacaoExistentesAberta] = useState(false);
  const [mensagemSemAdicao, setMensagemSemAdicao] = useState<string | null>(null);

  const discSugestoes = useMemo(() => {
    if (!modoBuscaDisc) return [];
    const limpo = buscaDisc.trim().toLowerCase();
    return oferta.disciplinas
      .filter((d) => {
        const excluido = disciplinasExcluidas.some((ex) => ex.codigo === d.codigo);
        if (excluido) return false;
        if (!limpo) return true;
        return d.codigo.toLowerCase().includes(limpo) || d.nome.toLowerCase().includes(limpo);
      })
      .slice(0, 12);
  }, [oferta.disciplinas, modoBuscaDisc, buscaDisc, disciplinasExcluidas]);

  const listaProfessoresOferta = useMemo(() => {
    const set = new Set<string>();
    for (const d of oferta.disciplinas) {
      for (const t of d.turmas) {
        if (t.professores && t.professores.length > 0) {
          t.professores.forEach((p) => {
            const limpo = p?.trim();
            if (limpo && limpo.toLowerCase() !== "a definir" && limpo.toLowerCase() !== "professor a definir") {
              set.add(limpo);
            }
          });
        }
        if (t.professores_raw) {
          t.professores_raw.split(/[,;/]+/).forEach((p) => {
            const limpo = p.trim();
            if (limpo && limpo.toLowerCase() !== "a definir" && limpo.toLowerCase() !== "professor a definir") {
              set.add(limpo);
            }
          });
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [oferta]);

  const profSugestoes = useMemo(() => {
    if (!modoBuscaProf) return [];
    const limpo = buscaProf.trim().toLowerCase();
    return listaProfessoresOferta
      .filter((p) => {
        if (professoresExcluidos.includes(p)) return false;
        if (!limpo) return true;
        return p.toLowerCase().includes(limpo);
      })
      .slice(0, 12);
  }, [listaProfessoresOferta, modoBuscaProf, buscaProf, professoresExcluidos]);

  const listaTrilhasDisponiveis = useMemo(() => {
    const vistos = new Map<string, string>();
    const curso = descricaoDoCurso(matriz ?? 981);
    if (matriz && matriz.conjuntos) {
      for (const [cod, c] of Object.entries(matriz.conjuntos)) {
        if (ehTrilha(curso, cod)) {
          vistos.set(cod, c.nome);
        }
      }
    }
    if (matriz && matriz.disciplinas) {
      for (const d of matriz.disciplinas) {
        if (ehTrilha(curso, d.conjunto) && !vistos.has(String(d.conjunto))) {
          const nome = matriz.conjuntos[String(d.conjunto)]?.nome ?? `Trilha ${d.conjunto}`;
          vistos.set(String(d.conjunto), nome);
        }
      }
    }
    return Array.from(vistos.entries())
      .map(([conjunto, nome]) => ({ conjunto, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [matriz]);

  const trilhasSugestoes = useMemo(() => {
    if (!modoBuscaTrilha) return [];
    const limpo = buscaTrilha.trim().toLowerCase();
    return listaTrilhasDisponiveis
      .filter((t) => {
        if (trilhasExcluidas.some((ex) => ex.conjunto === t.conjunto)) return false;
        if (!limpo) return true;
        return t.nome.toLowerCase().includes(limpo) || t.conjunto.toLowerCase().includes(limpo);
      })
      .slice(0, 12);
  }, [listaTrilhasDisponiveis, modoBuscaTrilha, buscaTrilha, trilhasExcluidas]);

  if (!aberto) return null;

  const bloqueiaConfirmacaoTurno = naoManha && naoTarde && naoNoite;
  const bloqueiaConfirmacaoSede = !sedeCentro && !sedeEcoville && !sedeNeoville;
  const bloqueiaConfirmacao = bloqueiaConfirmacaoTurno || bloqueiaConfirmacaoSede || !matriz;
  const temExtensao = exigeExtensao(matriz);
  const temHumanidades = descricaoDoCurso(matriz ?? 981).categorias.some((c) => c.id === "humanidades");

  function handleGerar(sobrescrever: boolean = false) {
    if (bloqueiaConfirmacao || !matriz) return;
    if (!sobrescrever && selecaoAtual && selecaoAtual.length > 0 && !confirmacaoExistentesAberta) {
      setConfirmacaoExistentesAberta(true);
      return;
    }

    const s = gerarSugestaoGrade(
      perfil,
      matriz,
      oferta,
      {
        estrategia,
        naoManha,
        naoTarde,
        naoNoite,
        sedeCentro,
        sedeEcoville,
        sedeNeoville,
        disciplinasExcluidas,
        professoresExcluidos,
        trilhasExcluidas: trilhasExcluidas.map((t) => t.conjunto),
        semHumanidades: temHumanidades && semHumanidades,
        semTrilhas,
        semEletivas,
        priorizarExtensionistas: temExtensao && priorizarExtensionistas,
      },
      sobrescrever ? [] : (confirmacaoExistentesAberta ? selecaoAtual : undefined),
    );

    if (s.length === 0) {
      alert("Nenhuma disciplina compatível encontrada com os filtros, sedes, turnos e exclusões selecionados.");
      return;
    }

    if (confirmacaoExistentesAberta && !sobrescrever && selecaoAtual && s.length === selecaoAtual.length) {
      if (estrategia === "balanceado") {
        if (selecaoAtual.length === 5) {
          setMensagemSemAdicao("A Sugestão não adicionou nada pois o seu preenchimento já contempla o que foi pedido dentro da Grade Balanceada.");
        } else if (selecaoAtual.length > 5) {
          setMensagemSemAdicao("A Sugestão não adicionou nada pois a sua seleção atual já vai muito além do padrão balanceado!!");
        } else {
          setMensagemSemAdicao("A Sugestão não conseguiu adicionar novas disciplinas pois as opções restantes conflitam em horário ou pré-requisitos com a sua seleção atual.");
        }
      } else {
        const chAtual = selecaoAtual.reduce(
          (acc, item) => {
            const dm = matriz?.disciplinas.find((x) => x.codigo === item.codDisciplina);
            const dOf = oferta.disciplinas.find((x) => x.codigo === item.codDisciplina);
            return acc + (dm ? dm.horas.total : ((dOf?.aulas_semanais_presenciais || 4) * 15));
          },
          0,
        );
        if (chAtual >= 405 || chAtual >= 345) {
          setMensagemSemAdicao("A Sugestão não adicionou nada pois a sua seleção atual já atinge o limite máximo de carga horária permitida (405h)!");
        } else {
          setMensagemSemAdicao("A Sugestão não conseguiu adicionar novas disciplinas pois as opções restantes conflitam em horário ou pré-requisitos com a sua seleção atual.");
        }
      }
      return;
    }

    const outrosFiltros: string[] = [];
    if (temHumanidades && semHumanidades) outrosFiltros.push("Sem Optativas de Humanidades");
    if (semTrilhas) outrosFiltros.push("Sem Trilhas");
    if (semEletivas) outrosFiltros.push("Sem Eletivas");
    if (priorizarExtensionistas) outrosFiltros.push("Priorizando Extensionistas");

    setConfirmacaoExistentesAberta(false);
    setMensagemSemAdicao(null);
    onGerarGrade(s, {
      disciplinas: disciplinasExcluidas,
      professores: professoresExcluidos,
      trilhas: trilhasExcluidas,
      outrosFiltros,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>✨</span> Sugestão de Grade
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              O motor Oásis analisa seu progresso e sugere uma grade compatível, respeitando pré-requisitos, exclusões, turnos, sedes e conflitos de horário.
            </p>
          </div>
          <button
            onClick={onFechar}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer shrink-0"
            title="Fechar modal"
          >
            ✕
          </button>
        </div>

        {confirmacaoExistentesAberta ? (
          <div className="space-y-4 py-3 animate-in fade-in">
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-zinc-800 dark:text-zinc-200">
              <p className="font-bold text-base mb-1.5 text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <span>⚠️</span> Grade com matérias preenchidas
              </p>
              <p className="leading-relaxed">
                Já existem matérias preenchidas na sua grade, você gostaria de sobreescrevê-las ou você quer mantê-las e fazer a sugestão em cima delas?
              </p>
            </div>

            {mensagemSemAdicao && (
              <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4 text-xs font-semibold text-blue-700 dark:text-blue-300 animate-in fade-in leading-relaxed">
                {mensagemSemAdicao}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Botao
                variante="neutro"
                classe="flex-1 font-bold text-xs"
                onClick={() => {
                  setConfirmacaoExistentesAberta(false);
                  setMensagemSemAdicao(null);
                }}
              >
                Cancelar
              </Botao>
              <Botao
                variante="primario"
                classe="flex-1 font-bold text-xs !bg-amber-600 hover:!bg-amber-700 !border-amber-600"
                onClick={() => handleGerar(true)}
              >
                Sobreescrever Tudo
              </Botao>
              <Botao
                variante="primario"
                classe="flex-1 font-bold text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600"
                onClick={() => handleGerar(false)}
              >
                Manter e Complementar
              </Botao>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 text-sm">
              {/* Objetivo Principal */}
          <div className="space-y-2.5">
            <label className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Objetivo Principal
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label
                className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors ${
                  estrategia === "adiantar_maximo"
                    ? "border-utfpr-500/60 bg-utfpr-500/10 shadow-2xs"
                    : "border-zinc-200 bg-zinc-50/60 hover:bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80"
                }`}
              >
                <input
                  type="radio"
                  name="estrategia"
                  checked={estrategia === "adiantar_maximo"}
                  onChange={() => setEstrategia("adiantar_maximo")}
                  className="mt-0.5 h-4 w-4 accent-utfpr-500"
                />
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">Adiantar ao máximo</div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Prioriza matérias obrigatórias em atraso no fluxo, respeitando o teto de carga horária máxima do período (até ~405h), sem limite fixo de quantidade de disciplinas nem choques.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors ${
                  estrategia === "balanceado"
                    ? "border-utfpr-500/60 bg-utfpr-500/10 shadow-2xs"
                    : "border-zinc-200 bg-zinc-50/60 hover:bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80"
                }`}
              >
                <input
                  type="radio"
                  name="estrategia"
                  checked={estrategia === "balanceado"}
                  onChange={() => setEstrategia("balanceado")}
                  className="mt-0.5 h-4 w-4 accent-utfpr-500"
                />
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">Semestre balanceado</div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Foca em 4 a 6 matérias, distribuídas com poucas matérias por dia ou mantendo 1 dia útil livre.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Restrições de Turno */}
          <div className="space-y-2">
            <label className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Restrições de Turno
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  naoManha
                    ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={naoManha}
                  onChange={(e) => setNaoManha(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>Não quero Manhã</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  naoTarde
                    ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={naoTarde}
                  onChange={(e) => setNaoTarde(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>Não quero Tarde</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  naoNoite
                    ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={naoNoite}
                  onChange={(e) => setNaoNoite(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>Não quero Noite</span>
              </label>
            </div>
          </div>

          {/* Filtro de Sedes */}
          <div className="space-y-2">
            <label className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Sedes Permitidas
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  !sedeCentro
                    ? "border-zinc-200 bg-zinc-50/60 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500"
                    : "border-utfpr-500/60 bg-utfpr-500/10 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sedeCentro}
                  onChange={(e) => setSedeCentro(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>📍 Centro</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  !sedeEcoville
                    ? "border-zinc-200 bg-zinc-50/60 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500"
                    : "border-utfpr-500/60 bg-utfpr-500/10 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sedeEcoville}
                  onChange={(e) => setSedeEcoville(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>📍 Ecoville</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  !sedeNeoville
                    ? "border-zinc-200 bg-zinc-50/60 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500"
                    : "border-utfpr-500/60 bg-utfpr-500/10 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sedeNeoville}
                  onChange={(e) => setSedeNeoville(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>📍 Neoville</span>
              </label>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Dica: turmas no Centro vêm habilitadas por padrão. Marque Ecoville ou Neoville caso aceite se deslocar para essas sedes.
            </p>
          </div>

          {/* Toggle de Definições Avançadas */}
          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setDefinicoesAvanadasAbertas(!definicoesAvanadasAbertas)}
              className="flex w-full items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 text-left font-display text-xs font-bold uppercase tracking-wider text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>⚙️ Definições Avançadas</span>
                <span
                  title="Exclusões, Filtros e Prioridades"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200/80 text-[11px] font-normal text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 cursor-help"
                >
                  ⓘ
                </span>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-200/80 text-sm font-black text-zinc-700 transition-all dark:bg-zinc-700 dark:text-zinc-200">
                {definicoesAvanadasAbertas ? "▲" : "▼"}
              </span>
            </button>

            {definicoesAvanadasAbertas && (
              <div className="mt-4 space-y-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-800/20 animate-in fade-in">
                {/* Excluir Disciplinas */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    {temExtensao && <label
                      title="Evita que as disciplinas selecionadas sejam sugeridas na montagem automática da grade"
                      className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 cursor-help"
                    >
                      Excluir Disciplinas {disciplinasExcluidas.length > 0 ? `(${disciplinasExcluidas.length})` : ""} <span className="text-[10px] font-normal text-zinc-400">ⓘ</span>
                    </label>}
                    {!modoBuscaDisc && (
                      <button
                        type="button"
                        onClick={() => {
                          setModoBuscaDisc(true);
                          setBuscaDisc("");
                        }}
                        className="flex items-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-2.5 py-1 text-xs font-bold text-zinc-600 transition-colors hover:border-utfpr-500 hover:bg-utfpr-500/10 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                      >
                        <span>+ Excluir Disciplina</span>
                      </button>
                    )}
                  </div>

                  {disciplinasExcluidas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {disciplinasExcluidas.map((item) => (
                        <span
                          key={item.codigo}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-2.5 py-1 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                        >
                          <span className="font-mono font-bold">{item.codigo}</span>
                          <span className="truncate max-w-[180px]" title={item.nome}>{item.nome}</span>
                          <button
                            type="button"
                            onClick={() => setDisciplinasExcluidas((prev) => prev.filter((d) => d.codigo !== item.codigo))}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-900 text-red-600 dark:text-red-300 cursor-pointer"
                            title={`Remover ${item.codigo} da lista de exclusão`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {modoBuscaDisc && (
                    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={buscaDisc}
                          onChange={(e) => setBuscaDisc(e.target.value)}
                          placeholder="Pesquisar matéria por nome ou código para excluir..."
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-utfpr-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setModoBuscaDisc(false)}
                          className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 shrink-0 cursor-pointer"
                        >
                          Concluir
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-zinc-200/60 rounded-xl border border-zinc-200/80 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                        {discSugestoes.length === 0 ? (
                          <div className="p-2.5 text-center text-xs text-zinc-400">
                            {buscaDisc ? "Nenhuma matéria encontrada." : "Digite nome ou código para pesquisar."}
                          </div>
                        ) : (
                          discSugestoes.map((d) => (
                            <button
                              key={d.codigo}
                              type="button"
                              onClick={() => {
                                setDisciplinasExcluidas((prev) => [...prev, { codigo: d.codigo, nome: d.nome }]);
                                setBuscaDisc("");
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                            >
                              <div>
                                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mr-2">{d.codigo}</span>
                                <span className="text-zinc-600 dark:text-zinc-300">{d.nome}</span>
                              </div>
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

                {/* Excluir Professores */}
                <div className="space-y-2.5 border-t border-zinc-200/60 pt-4 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    {temHumanidades && <label
                      title="Evita que turmas ministradas ou co-ministradas por estes docentes sejam sugeridas na grade"
                      className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 cursor-help"
                    >
                      Excluir Professores {professoresExcluidos.length > 0 ? `(${professoresExcluidos.length})` : ""} <span className="text-[10px] font-normal text-zinc-400">ⓘ</span>
                    </label>}
                    {!modoBuscaProf && (
                      <button
                        type="button"
                        onClick={() => {
                          setModoBuscaProf(true);
                          setBuscaProf("");
                        }}
                        className="flex items-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-2.5 py-1 text-xs font-bold text-zinc-600 transition-colors hover:border-utfpr-500 hover:bg-utfpr-500/10 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                      >
                        <span>+ Excluir Professor</span>
                      </button>
                    )}
                  </div>

                  {professoresExcluidos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {professoresExcluidos.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-2.5 py-1 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                        >
                          <span>🚫 {p}</span>
                          <button
                            type="button"
                            onClick={() => setProfessoresExcluidos((prev) => prev.filter((prof) => prof !== p))}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-900 text-red-600 dark:text-red-300 cursor-pointer"
                            title={`Remover ${p} da lista de exclusão`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {modoBuscaProf && (
                    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={buscaProf}
                          onChange={(e) => setBuscaProf(e.target.value)}
                          placeholder="Pesquisar professor pelo nome (ex: Lugo)..."
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-utfpr-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setModoBuscaProf(false)}
                          className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 shrink-0 cursor-pointer"
                        >
                          Concluir
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-zinc-200/60 rounded-xl border border-zinc-200/80 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                        {profSugestoes.length === 0 ? (
                          <div className="p-2.5 text-center text-xs text-zinc-400">
                            {buscaProf ? "Nenhum professor encontrado." : "Digite o nome do professor para pesquisar."}
                          </div>
                        ) : (
                          profSugestoes.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setProfessoresExcluidos((prev) => [...prev, p]);
                                setBuscaProf("");
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                            >
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{p}</span>
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

                {/* Excluir Trilhas */}
                <div className="space-y-2.5 border-t border-zinc-200/60 pt-4 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label
                      title="Evita que matérias optativas pertencentes a essa trilha específica sejam sugeridas no cálculo da grade"
                      className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 cursor-help"
                    >
                      Excluir Trilhas {trilhasExcluidas.length > 0 ? `(${trilhasExcluidas.length})` : ""} <span className="text-[10px] font-normal text-zinc-400">ⓘ</span>
                    </label>
                    {!modoBuscaTrilha && (
                      <button
                        type="button"
                        onClick={() => {
                          setModoBuscaTrilha(true);
                          setBuscaTrilha("");
                        }}
                        className="flex items-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-2.5 py-1 text-xs font-bold text-zinc-600 transition-colors hover:border-utfpr-500 hover:bg-utfpr-500/10 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                      >
                        <span>+ Excluir Trilha</span>
                      </button>
                    )}
                  </div>

                  {trilhasExcluidas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {trilhasExcluidas.map((t) => (
                        <span
                          key={t.conjunto}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-2.5 py-1 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                        >
                          <span className="font-mono font-bold">{t.conjunto}</span>
                          <span className="truncate max-w-[180px]" title={t.nome}>{t.nome}</span>
                          <button
                            type="button"
                            onClick={() => setTrilhasExcluidas((prev) => prev.filter((item) => item.conjunto !== t.conjunto))}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-900 text-red-600 dark:text-red-300 cursor-pointer"
                            title={`Remover ${t.nome} da lista de exclusão`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {modoBuscaTrilha && (
                    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={buscaTrilha}
                          onChange={(e) => setBuscaTrilha(e.target.value)}
                          placeholder="Pesquisar trilha optativa por nome..."
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-utfpr-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setModoBuscaTrilha(false)}
                          className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 shrink-0 cursor-pointer"
                        >
                          Concluir
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-zinc-200/60 rounded-xl border border-zinc-200/80 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                        {trilhasSugestoes.length === 0 ? (
                          <div className="p-2.5 text-center text-xs text-zinc-400">
                            {buscaTrilha ? "Nenhuma trilha encontrada." : "Digite o nome da trilha para pesquisar."}
                          </div>
                        ) : (
                          trilhasSugestoes.map((t) => (
                            <button
                              key={t.conjunto}
                              type="button"
                              onClick={() => {
                                setTrilhasExcluidas((prev) => [...prev, t]);
                                setBuscaTrilha("");
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                            >
                              <div>
                                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mr-2">{t.conjunto}</span>
                                <span className="text-zinc-600 dark:text-zinc-300">{t.nome}</span>
                              </div>
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

                {/* Filtros e Prioridades Extras (Checkboxes) */}
                <div className="space-y-2.5 border-t border-zinc-200/60 pt-4 dark:border-zinc-800">
                  <label className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    Restrições e Prioridades de Grupo
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                    <label
                      title="Desconsidera todas as matérias optativas de Humanidades na geração da sugestão"
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                        semHumanidades
                          ? "border-red-500/60 bg-red-500/10 text-red-900 dark:text-red-200 shadow-2xs"
                          : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={semHumanidades}
                        onChange={(e) => setSemHumanidades(e.target.checked)}
                        className="accent-red-500 rounded"
                      />
                      <span className="flex items-center gap-1">
                        Não quero Humanidades <span className="text-[10px] text-zinc-400">ⓘ</span>
                      </span>
                    </label>

                    <label
                      title="Desconsidera qualquer matéria optativa pertencente a uma das 12 Trilhas da matriz"
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                        semTrilhas
                          ? "border-red-500/60 bg-red-500/10 text-red-900 dark:text-red-200 shadow-2xs"
                          : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={semTrilhas}
                        onChange={(e) => setSemTrilhas(e.target.checked)}
                        className="accent-red-500 rounded"
                      />
                      <span className="flex items-center gap-1">
                        Não quero Trilhas <span className="text-[10px] text-zinc-400">ⓘ</span>
                      </span>
                    </label>

                    <label
                      title="Desconsidera matérias eletivas ou disciplinas fora da grade na montagem da sugestão"
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                        semEletivas
                          ? "border-red-500/60 bg-red-500/10 text-red-900 dark:text-red-200 shadow-2xs"
                          : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={semEletivas}
                        onChange={(e) => setSemEletivas(e.target.checked)}
                        className="accent-red-500 rounded"
                      />
                      <span className="flex items-center gap-1">
                        Não quero Eletivas <span className="text-[10px] text-zinc-400">ⓘ</span>
                      </span>
                    </label>

                    <label
                      title="Aumenta substancialmente o peso e a prioridade de matérias extensionistas no cálculo"
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                        priorizarExtensionistas
                          ? "border-utfpr-500/60 bg-utfpr-500/15 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                          : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={priorizarExtensionistas}
                        onChange={(e) => setPriorizarExtensionistas(e.target.checked)}
                        className="accent-utfpr-500 rounded"
                      />
                      <span className="flex items-center gap-1">
                        ⭐ Priorizar Extensionistas <span className="text-[10px] text-zinc-400">ⓘ</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {bloqueiaConfirmacaoTurno && (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3.5 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2.5 leading-relaxed">
              <IconWarning className="h-5 w-5 shrink-0 text-red-500" />
              <span>
                Você não quer estudar mesmo né? Assim não dá pra te ajudar, escolha pelo menos um turno.
              </span>
            </div>
          )}

          {bloqueiaConfirmacaoSede && !bloqueiaConfirmacaoTurno && (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3.5 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2.5 leading-relaxed">
              <IconWarning className="h-5 w-5 shrink-0 text-red-500" />
              <span>
                Selecione pelo menos uma sede (ex: Centro) para podermos buscar turmas disponíveis.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Botao variante="neutro" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            desabilitado={bloqueiaConfirmacao}
            onClick={() => handleGerar(false)}
            classe="!px-5 !py-2.5 font-bold"
          >
            Gerar Sugestão de Grade
          </Botao>
        </div>
      </>
      )}
      </div>
    </div>
  );
}

export const ModalGradeMagica = ModalSugestaoGrade;
