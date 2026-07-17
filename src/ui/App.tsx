import { useEffect, useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../domain/tipos";
import { extrairLinhas } from "../domain/historico/extrair-linhas";
import { parseHistorico } from "../domain/historico/parser";
import matrizJson from "../../data/matriz-981.json";
import turmas20261Json from "../../data/turmas/2026-1.json";
import turmas20252Json from "../../data/turmas/2025-2.json";
import { TelaSituacao } from "./telas/Situacao";
import { TelaPossoCursar } from "./telas/PossoCursar";
import { TelaGrade } from "./telas/Grade";
import { TelaLayoutGNH } from "./telas/LayoutGNH";
import { TelaCatalogo, type CategoriaCatalogo } from "./telas/Catalogo";
import { TelaCheckin, type DadosCheckin } from "./telas/Checkin";
import { TelaConfiguracoes, type Preferencias } from "./telas/Configuracoes";
import { MiniGrade, type PreviewTurma } from "./MiniGrade";
import { ModalGradeMagica } from "./telas/ModalGradeMagica";
import { Botao, Badge } from "./componentes";
import {
  LogoUTFPR,
  IconUser,
  IconCalendar,
  IconBookOpen,
  IconWarning,
  IconSettings,
  IconSun,
  IconMoon,
} from "./icons";

const matriz = matrizJson as unknown as Matriz;

export interface SelecaoTurma {
  codDisciplina: string;
  codTurma: string;
}

type AbaPrincipal = "situacao" | "planejamento" | "catalogo";
type AbaPlanejamento = "cursar" | "grade";
type Layout = "oasis" | "gnh";

const CHAVE_PERFIL = "oasis.perfil.v1";
const CHAVE_GRADE = "oasis.grade.v1";
const CHAVE_CESTA = "oasis.cesta_grades.v1";
const CHAVE_GRADE_ATIVA = "oasis.grade_ativa.v1";
const CHAVE_LAYOUT = "oasis.layout.v1";
const CHAVE_PREFS = "oasis.preferencias.v1";
const CHAVE_CHECKIN = "oasis.checkin.v1";

function salvarPerfil(p: PerfilAluno) {
  localStorage.setItem(CHAVE_PERFIL, JSON.stringify({ ...p, aprovadas: [...p.aprovadas] }));
}
function lerPerfil(): PerfilAluno | null {
  const bruto = localStorage.getItem(CHAVE_PERFIL);
  if (!bruto) return null;
  try {
    const obj = JSON.parse(bruto);
    return { ...obj, aprovadas: new Set(obj.aprovadas) };
  } catch {
    return null;
  }
}

export function App() {
  const [perfil, setPerfil] = useState<PerfilAluno | null>(lerPerfil);
  const [checkinConcluido, setCheckinConcluido] = useState<boolean>(
    () => localStorage.getItem(CHAVE_CHECKIN) === "true",
  );
  const [aba, setAba] = useState<AbaPrincipal>(() => (lerPerfil() ? "situacao" : "planejamento"));
  const [abaPlanejamento, setAbaPlanejamento] = useState<AbaPlanejamento>("cursar");
  const [categoriaCatalogo, setCategoriaCatalogo] = useState<CategoriaCatalogo>("todas");
  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(CHAVE_LAYOUT) as Layout) ?? "oasis",
  );
  const [preferencias, setPreferencias] = useState<Preferencias>(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_PREFS) ?? "null");
      return salvo || { tema: "sistema", layout: (localStorage.getItem(CHAVE_LAYOUT) as Layout) ?? "oasis" };
    } catch {
      return { tema: "sistema", layout: "oasis" };
    }
  });
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const oferta = useMemo<OfertaSemestre>(() => {
    if (preferencias.semestreAtivo === "2025-2") {
      return turmas20252Json as unknown as OfertaSemestre;
    }
    return turmas20261Json as unknown as OfertaSemestre;
  }, [preferencias.semestreAtivo]);
  const [preview, setPreview] = useState<PreviewTurma | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gradeAtiva, setGradeAtiva] = useState<string>(() => {
    return localStorage.getItem(CHAVE_GRADE_ATIVA) ?? "A";
  });

  const [cestaGrades, setCestaGrades] = useState<Record<string, SelecaoTurma[]>>(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_CESTA) ?? "null");
      if (salvo && typeof salvo === "object" && Object.keys(salvo).length > 0) return salvo;
    } catch {}
    try {
      const gradeAtual = JSON.parse(localStorage.getItem(CHAVE_GRADE) ?? "[]");
      return { A: gradeAtual };
    } catch {
      return { A: [] };
    }
  });

  const [selecao, setSelecao] = useState<SelecaoTurma[]>(() => {
    return cestaGrades[gradeAtiva] ?? [];
  });

  // Salvar grade e cesta no localStorage e manter sincronizados
  useEffect(() => {
    localStorage.setItem(CHAVE_GRADE, JSON.stringify(selecao));
    setCestaGrades((prev) => {
      const novaCesta = { ...prev, [gradeAtiva]: selecao };
      localStorage.setItem(CHAVE_CESTA, JSON.stringify(novaCesta));
      return novaCesta;
    });
  }, [selecao, gradeAtiva]);

  function handleMudarGradeAtiva(g: string) {
    setGradeAtiva(g);
    localStorage.setItem(CHAVE_GRADE_ATIVA, g);
    setSelecao(cestaGrades[g] ?? []);
  }

  function handleNovaGrade() {
    const chaves = Object.keys(cestaGrades);
    const abasPossiveis = ["A", "B", "C"];
    const nova = abasPossiveis.find((l) => !chaves.includes(l));
    if (!nova) return;
    const novaCesta = { ...cestaGrades, [nova]: [] };
    setCestaGrades(novaCesta);
    localStorage.setItem(CHAVE_CESTA, JSON.stringify(novaCesta));
    setGradeAtiva(nova);
    localStorage.setItem(CHAVE_GRADE_ATIVA, nova);
    setSelecao([]);
  }

  function handleRemoverGrade(g: string) {
    if (g === "A") return;
    const novaCesta = { ...cestaGrades };
    delete novaCesta[g];
    setCestaGrades(novaCesta);
    localStorage.setItem(CHAVE_CESTA, JSON.stringify(novaCesta));
    if (gradeAtiva === g) {
      setGradeAtiva("A");
      localStorage.setItem(CHAVE_GRADE_ATIVA, "A");
      setSelecao(novaCesta["A"] ?? []);
    }
  }
  const [modalGradeMagica, setModalGradeMagica] = useState(false);

  // Sincronizar tema no DOM
  useEffect(() => {
    const root = document.documentElement;
    function aplicarTema(t: "sistema" | "claro" | "escuro") {
      if (t === "claro") {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      } else if (t === "escuro") {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        const prefereEscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefereEscuro) {
          root.classList.add("dark");
          root.style.colorScheme = "dark";
        } else {
          root.classList.remove("dark");
          root.style.colorScheme = "light";
        }
      }
    }
    aplicarTema(preferencias.tema);

    if (preferencias.tema === "sistema") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => aplicarTema("sistema");
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [preferencias.tema]);

  // Sincronizar layout na preferência
  useEffect(() => {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify(preferencias));
    setLayout(preferencias.layout);
    localStorage.setItem(CHAVE_LAYOUT, preferencias.layout);
  }, [preferencias]);

  async function processarArquivo(arq: File) {
    setCarregando(true);
    setErro(null);
    try {
      const p = await analisarPDFParaPreview(arq);
      confirmarNovoPerfil(p);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  async function analisarPDFParaPreview(arq: File): Promise<PerfilAluno> {
    const linhas = await extrairLinhas(await arq.arrayBuffer());
    const p = parseHistorico(linhas.map((l) => l.texto));
    if (!p.nome || p.cursadas.length === 0) {
      throw new Error(
        "Não reconheci este PDF como um Histórico Escolar válido do Portal do Aluno" +
          (p.avisos.length ? ` (${p.avisos[0]})` : ""),
      );
    }
    return p;
  }

  function confirmarNovoPerfil(p: PerfilAluno) {
    salvarPerfil(p);
    setPerfil(p);
    setCheckinConcluido(true);
    localStorage.setItem(CHAVE_CHECKIN, "true");
    setAba("situacao");
  }

  function handleContinuarSemRegistro(dados: DadosCheckin) {
    setCheckinConcluido(true);
    localStorage.setItem(CHAVE_CHECKIN, "true");
    setPreferencias((p) => ({ ...p, campus: dados.campus, curso: dados.curso, matriz: dados.matriz }));
    setAba("planejamento");
    setAbaPlanejamento("cursar");
  }

  function handleLimparDados() {
    localStorage.clear();
    setPerfil(null);
    setCheckinConcluido(false);
    setSelecao([]);
    setPreferencias({ tema: "sistema", layout: "oasis" });
    setLayout("oasis");
    setAba("planejamento");
    setAbaPlanejamento("cursar");
  }

  function handleTrocarUsuario() {
    localStorage.removeItem(CHAVE_PERFIL);
    localStorage.removeItem(CHAVE_CHECKIN);
    setPerfil(null);
    setCheckinConcluido(false);
    setSelecao([]);
    setAba("planejamento");
    setAbaPlanejamento("cursar");
  }

  const abasPrincipal = useMemo(
    () =>
      [
        ["situacao", "Minha Situação"],
        ["planejamento", "Planejamento de Matrícula"],
        ["catalogo", "Catálogo de Matérias"],
      ] as [AbaPrincipal, string][],
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <LogoUTFPR className="h-9 w-9 shrink-0" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-black tracking-tight leading-none">
                <span className="text-utfpr-600 dark:text-utfpr-500">Oásis</span> UTFPR
              </h1>
              <label
                className={`relative inline-flex items-center gap-1.5 rounded-md border pl-2.5 pr-4 py-0.5 font-mono text-xs font-bold transition-colors cursor-pointer shadow-2xs select-none ${
                  preferencias.modoPlanejamento === "previa" || (preferencias.modoPlanejamento !== "corrido" && (preferencias.semestreAtivo === "2026-2" || oferta.semestre === "2026-2"))
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                    : "border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300 hover:bg-orange-500/25"
                }`}
                title="Selecione o período letivo para simulação e consulta de turmas"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 animate-pulse ${
                    preferencias.modoPlanejamento === "previa" || (preferencias.modoPlanejamento !== "corrido" && (preferencias.semestreAtivo === "2026-2" || oferta.semestre === "2026-2"))
                      ? "bg-emerald-500"
                      : "bg-orange-500"
                  }`}
                />
                <select
                  value={preferencias.semestreAtivo || "2026-1"}
                  onChange={(e) => setPreferencias({ ...preferencias, semestreAtivo: e.target.value })}
                  className="bg-transparent font-mono text-xs font-bold focus:outline-none cursor-pointer appearance-none text-current"
                >
                  <option value="2026-1" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                    2026.1
                  </option>
                  <option value="2025-2" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                    2025.2
                  </option>
                </select>
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] opacity-70">▾</span>
              </label>
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Sistemas de Informação · Câmpus Curitiba · Matriz 981
            </p>
          </div>
        </div>

        {/* Controles do Cabeçalho visíveis quando já iniciou a plataforma */}
        {(perfil || checkinConcluido) && (
          <div className="flex flex-wrap items-center gap-3">
            {/* comutador de tema visível no topo da página (apenas ícones claro/escuro) */}
            <div className="flex rounded-xl border border-zinc-200/80 bg-zinc-100/70 p-0.5 text-xs font-bold dark:border-zinc-800/80 dark:bg-zinc-900/70">
              {[
                { id: "claro" as const, rotulo: "Modo Claro", icon: IconSun },
                { id: "escuro" as const, rotulo: "Modo Escuro", icon: IconMoon },
              ].map((op) => {
                const ativo = preferencias.tema === op.id || (preferencias.tema === "sistema" && op.id === "escuro" && window.matchMedia("(prefers-color-scheme: dark)").matches) || (preferencias.tema === "sistema" && op.id === "claro" && !window.matchMedia("(prefers-color-scheme: dark)").matches);
                const Icone = op.icon;
                return (
                  <button
                    key={op.id}
                    onClick={() => setPreferencias({ ...preferencias, tema: op.id })}
                    title={op.rotulo}
                    className={`flex items-center justify-center rounded-[10px] p-2 transition-colors ${
                      ativo
                        ? "bg-utfpr-500 text-zinc-900 shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    <Icone className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            {/* Informação do Perfil ou Modo Livre */}
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 py-1.5 pl-3.5 pr-2 shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
              {perfil ? (
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  <IconUser className="h-4 w-4 text-utfpr-600 dark:text-utfpr-500" />
                  <span>
                    {perfil.nome.split(" ")[0]} ·{" "}
                    <span className="text-zinc-400 font-normal">{perfil.periodo}º período</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  <Badge tom="neutro">Modo Livre</Badge>
                  <span className="hidden sm:inline">Sem histórico</span>
                </div>
              )}
              <Botao
                onClick={() => setModalConfigAberto(true)}
                variante="sutil"
                classe="!p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                title="Configurações"
              >
                <IconSettings className="h-4 w-4" />
              </Botao>
            </div>
          </div>
        )}
      </header>

      {/* Se não tem perfil nem fez checkin (ou trocou de usuário), mostra Checkin */}
      {!perfil && !checkinConcluido ? (
        <TelaCheckin
          onProcessarArquivo={processarArquivo}
          onContinuarSemRegistro={handleContinuarSemRegistro}
          carregando={carregando}
          erro={erro}
        />
      ) : (
        <div className="flex items-start gap-6">
          {/* coluna principal */}
          <div className="min-w-0 flex-1">
            <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-100/70 p-1.5 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/70">
              <div className="flex flex-1 gap-1.5 min-w-[280px]">
                {abasPrincipal.map(([id, rotulo]) => {
                  const ativo = aba === id;
                  const bloqueado = id === "situacao" && !perfil;
                  return (
                    <button
                      key={id}
                      disabled={bloqueado}
                      title={
                        bloqueado
                          ? "Abra as configurações e carregue seu histórico escolar (PDF) para desbloquear a análise da sua situação curricular."
                          : undefined
                      }
                      onClick={() => {
                        if (!bloqueado) setAba(id);
                      }}
                      className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-bold transition-all duration-150 ${
                        bloqueado
                          ? "opacity-50 cursor-not-allowed bg-transparent text-zinc-400 dark:text-zinc-600"
                          : ativo
                            ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {id === "situacao" && (
                        bloqueado ? <span title="Desbloqueie carregando o histórico">🔒</span> : <IconUser className="h-4 w-4" />
                      )}
                      {id === "planejamento" && <IconBookOpen className="h-4 w-4" />}
                      {id === "catalogo" && <IconCalendar className="h-4 w-4" />}
                      <span>{rotulo}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {perfil && perfil.avisos.length > 0 && (
              <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/80 p-3.5 text-sm text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
                <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">Observações na leitura do documento:</span>{" "}
                  {perfil.avisos.join("; ")}
                </div>
              </div>
            )}

            {aba === "situacao" && (
              <TelaSituacao
                perfil={perfil}
                matriz={matriz}
                onAbrirConfiguracoes={() => setModalConfigAberto(true)}
                onAbrirCatalogo={(cat) => {
                  setCategoriaCatalogo(cat);
                  setAba("catalogo");
                }}
              />
            )}

            {aba === "catalogo" && (
              <TelaCatalogo
                perfil={perfil}
                matriz={matriz}
                oferta={oferta}
                categoriaInicial={categoriaCatalogo}
                onVoltar={() => setAba("situacao")}
              />
            )}

            {aba === "planejamento" && (
              <div className="space-y-6">
                {/* Sub-navegação de Planejamento e Toggle de Layout unificados */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-2 pl-3 shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                      <button
                        onClick={() => setAbaPlanejamento("cursar")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-display text-xs font-bold transition-all cursor-pointer ${
                          abaPlanejamento === "cursar"
                            ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-700 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        <IconBookOpen className="h-3.5 w-3.5" />
                        <span>Matérias Abertas ({oferta.disciplinas.reduce((acc, d) => acc + d.turmas.length, 0)} turmas)</span>
                      </button>
                      <button
                        onClick={() => setAbaPlanejamento("grade")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-display text-xs font-bold transition-all cursor-pointer ${
                          abaPlanejamento === "grade"
                            ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-700 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        <IconCalendar className="h-3.5 w-3.5" />
                        <span>Minha Grade ({selecao.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Toggle de Layout no cabeçalho de planejamento (Item 1 e 4) */}
                  {abaPlanejamento === "cursar" && (
                    <div className="flex items-center gap-2 pr-1">
                      <span className="hidden sm:inline font-display text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        Visualização:
                      </span>
                      <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                        <button
                          onClick={() => {
                            setLayout("oasis");
                            setPreferencias({ ...preferencias, layout: "oasis" });
                            localStorage.setItem(CHAVE_LAYOUT, "oasis");
                          }}
                          title="Layout Oásis (cards interativos com tags)"
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            (preferencias.layout ?? layout) === "oasis"
                              ? "bg-utfpr-500 text-zinc-950 font-black shadow-2xs"
                              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                          }`}
                        >
                          Layout Oásis
                        </button>
                        <button
                          onClick={() => {
                            setLayout("gnh");
                            setPreferencias({ ...preferencias, layout: "gnh" });
                            localStorage.setItem(CHAVE_LAYOUT, "gnh");
                          }}
                          title="Layout GNH (lista bruta e densa igual ao portal original)"
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            (preferencias.layout ?? layout) === "gnh"
                              ? "bg-utfpr-500 text-zinc-950 font-black shadow-2xs"
                              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                          }`}
                        >
                          Layout GNH
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {abaPlanejamento === "cursar" ? (
                  (preferencias.layout ?? layout) === "gnh" ? (
                    <TelaLayoutGNH
                      perfil={perfil}
                      matriz={matriz}
                      oferta={oferta}
                      selecao={selecao}
                      setSelecao={setSelecao}
                      onPreview={setPreview}
                      filtrarConflitos={preferencias.filtrarConflitos}
                      onAbrirGradeMagica={() => setModalGradeMagica(true)}
                    />
                  ) : (
                    <TelaPossoCursar
                      perfil={perfil}
                      matriz={matriz}
                      oferta={oferta}
                      selecao={selecao}
                      setSelecao={setSelecao}
                      onPreview={setPreview}
                      filtrarConflitos={preferencias.filtrarConflitos}
                      onAbrirGradeMagica={() => setModalGradeMagica(true)}
                    />
                  )
                ) : (
                  <TelaGrade
                    oferta={oferta}
                    selecao={selecao}
                    setSelecao={setSelecao}
                    cestaGrades={cestaGrades}
                    gradeAtiva={gradeAtiva}
                    onMudarGradeAtiva={handleMudarGradeAtiva}
                    onNovaGrade={handleNovaGrade}
                    onRemoverGrade={handleRemoverGrade}
                    perfil={perfil}
                    matriz={matriz}
                    onAbrirGradeMagica={() => setModalGradeMagica(true)}
                  />
                )}
              </div>
            )}
          </div>

          {/* sidebar de feedback contínuo: visível nas abas Situação e em Planejamento/Posso Cursar */}
          {(aba === "situacao" || (aba === "planejamento" && abaPlanejamento === "cursar")) && (
            <aside className="sticky top-4 hidden w-60 shrink-0 lg:block">
              <MiniGrade
                oferta={oferta}
                selecao={selecao}
                preview={preview}
                onLimpar={() => setSelecao([])}
                cestaGrades={cestaGrades}
                gradeAtiva={gradeAtiva}
                onMudarGradeAtiva={handleMudarGradeAtiva}
                onNovaGrade={handleNovaGrade}
                onRemoverGrade={handleRemoverGrade}
                onRemoverTurma={(codigo) =>
                  setSelecao((s) => s.filter((item) => item.codDisciplina !== codigo))
                }
              />
            </aside>
          )}
        </div>
      )}

      {/* Modal Grade Mágica unificado para todo o Planejamento */}
      <ModalGradeMagica
        aberto={modalGradeMagica}
        onFechar={() => setModalGradeMagica(false)}
        perfil={perfil}
        matriz={matriz}
        oferta={oferta}
        onGerarGrade={(s) => {
          setSelecao(s);
          setModalGradeMagica(false);
          setAbaPlanejamento("grade");
        }}
      />

      {/* Modal de Configurações Centralizadas (TASK-01) */}
      <TelaConfiguracoes
        aberto={modalConfigAberto}
        onFechar={() => setModalConfigAberto(false)}
        preferencias={preferencias}
        onSalvarPreferencias={setPreferencias}
        perfil={perfil}
        onAtualizarPDF={processarArquivo}
        onAnalisarPDF={analisarPDFParaPreview}
        onConfirmarPDF={confirmarNovoPerfil}
        onTrocarUsuario={handleTrocarUsuario}
        onLimparDados={handleLimparDados}
        carregandoPDF={carregando}
      />

      <footer className="mt-20 border-t border-zinc-200/80 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-800/80 dark:text-zinc-500">
        Projeto acadêmico independente desenvolvido por e para estudantes de BSI — não oficial. Sempre verifique e confirme seus dados no Portal do Aluno da UTFPR.
      </footer>
    </div>
  );
}
