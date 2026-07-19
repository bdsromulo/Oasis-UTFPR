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
const CHAVE_CESTA_EXCLUSOES = "oasis.cesta_exclusoes.v1";
const CHAVE_CESTAS_POR_SEMESTRE = "oasis.cestas_por_semestre.v2";
const CHAVE_EXCLUSOES_POR_SEMESTRE = "oasis.exclusoes_por_semestre.v2";

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
  const semestreAtivo = preferencias.semestreAtivo || "2026-1";

  const todasOfertas: Record<string, OfertaSemestre> = useMemo(() => {
    const o20261 = turmas20261Json as unknown as OfertaSemestre;
    const o20252 = turmas20252Json as unknown as OfertaSemestre;
    const o20262: OfertaSemestre = {
      ...o20252,
      semestre: "2026-2",
      fonte: "Simulação Prévia (baseada nas ofertas de 2025.2)",
      disciplinas: o20252.disciplinas.filter(
        (d) =>
          d.codigo !== "ICSH41" &&
          !d.nome.toLowerCase().includes("avaliação em interação humano-computador")
      ),
    };
    return {
      "2026-1": o20261,
      "2025-2": o20252,
      "2026-2": o20262,
    };
  }, []);

  const oferta = useMemo<OfertaSemestre>(() => {
    return todasOfertas[semestreAtivo] || todasOfertas["2026-1"];
  }, [semestreAtivo, todasOfertas]);

  const [preview, setPreview] = useState<PreviewTurma | null>(null);
  const [mobileGradeDrawerAberto, setMobileGradeDrawerAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gradeAtiva, setGradeAtiva] = useState<string>(() => {
    return localStorage.getItem(CHAVE_GRADE_ATIVA) ?? "A";
  });

  const [todasCestasPorSemestre, setTodasCestasPorSemestre] = useState<
    Record<string, Record<string, SelecaoTurma[]>>
  >(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_CESTAS_POR_SEMESTRE) ?? "null");
      if (salvo && typeof salvo === "object" && Object.keys(salvo).length > 0) return salvo;
    } catch {}
    try {
      const salvoV1 = JSON.parse(localStorage.getItem(CHAVE_CESTA) ?? "null");
      if (salvoV1 && typeof salvoV1 === "object") {
        return { "2026-1": salvoV1 };
      }
    } catch {}
    try {
      const gradeAtual = JSON.parse(localStorage.getItem(CHAVE_GRADE) ?? "[]");
      return { "2026-1": { A: gradeAtual } };
    } catch {
      return { "2026-1": { A: [] } };
    }
  });

  const [todasExclusoesPorSemestre, setTodasExclusoesPorSemestre] = useState<
    Record<string, Record<string, any>>
  >(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_EXCLUSOES_POR_SEMESTRE) ?? "null");
      if (salvo && typeof salvo === "object") return salvo;
    } catch {}
    try {
      const salvoV1 = JSON.parse(localStorage.getItem(CHAVE_CESTA_EXCLUSOES) ?? "null");
      if (salvoV1 && typeof salvoV1 === "object") {
        return { "2026-1": salvoV1 };
      }
    } catch {}
    return { "2026-1": {} };
  });

  const cestaGrades = useMemo(() => {
    return todasCestasPorSemestre[semestreAtivo] ?? { A: [] };
  }, [todasCestasPorSemestre, semestreAtivo]);

  const cestaExclusoes = useMemo(() => {
    return todasExclusoesPorSemestre[semestreAtivo] ?? {};
  }, [todasExclusoesPorSemestre, semestreAtivo]);

  const exclusoesAtivas = useMemo(() => {
    return cestaExclusoes[gradeAtiva] ?? null;
  }, [cestaExclusoes, gradeAtiva]);

  const [selecao, setSelecao] = useState<SelecaoTurma[]>(() => {
    return (todasCestasPorSemestre[semestreAtivo] ?? { A: [] })[gradeAtiva] ?? [];
  });

  function setCestaExclusoes(acao: any) {
    setTodasExclusoesPorSemestre((prevTodas) => {
      const atual = prevTodas[semestreAtivo] || {};
      const novo = typeof acao === "function" ? acao(atual) : acao;
      const novoTodas = { ...prevTodas, [semestreAtivo]: novo };
      localStorage.setItem(CHAVE_EXCLUSOES_POR_SEMESTRE, JSON.stringify(novoTodas));
      if (semestreAtivo === "2026-1") {
        localStorage.setItem(CHAVE_CESTA_EXCLUSOES, JSON.stringify(novo));
      }
      return novoTodas;
    });
  }

  useEffect(() => {
    localStorage.setItem(CHAVE_GRADE, JSON.stringify(selecao));
    setTodasCestasPorSemestre((prev) => {
      const cestaAtual = prev[semestreAtivo] || { A: [] };
      if (cestaAtual[gradeAtiva] === selecao) return prev;
      const novaCesta = { ...cestaAtual, [gradeAtiva]: selecao };
      const novoTodas = { ...prev, [semestreAtivo]: novaCesta };
      localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(novoTodas));
      if (semestreAtivo === "2026-1") {
        localStorage.setItem(CHAVE_CESTA, JSON.stringify(novaCesta));
      }
      return novoTodas;
    });
  }, [selecao, gradeAtiva, semestreAtivo]);

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
    setTodasCestasPorSemestre((prev) => {
      const n = { ...prev, [semestreAtivo]: novaCesta };
      localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(n));
      return n;
    });
    setCestaExclusoes((prev: any) => ({ ...prev, [nova]: { disciplinas: [], professores: [] } }));
    setGradeAtiva(nova);
    localStorage.setItem(CHAVE_GRADE_ATIVA, nova);
    setSelecao([]);
  }

  function handleRemoverGrade(g: string) {
    if (g === "A") return;
    const novaCesta = { ...cestaGrades };
    delete novaCesta[g];
    setTodasCestasPorSemestre((prev) => {
      const n = { ...prev, [semestreAtivo]: novaCesta };
      localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(n));
      return n;
    });
    setCestaExclusoes((prev: any) => {
      const n = { ...prev };
      delete n[g];
      return n;
    });
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
    setTodasCestasPorSemestre({ [semestreAtivo]: { A: [] } });
    setTodasExclusoesPorSemestre({ [semestreAtivo]: { A: { disciplinas: [], professores: [] } } });
    setGradeAtiva("A");
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
    setTodasCestasPorSemestre({ [semestreAtivo]: { A: [] } });
    setTodasExclusoesPorSemestre({ [semestreAtivo]: { A: { disciplinas: [], professores: [] } } });
    setGradeAtiva("A");
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
                  onChange={(e) => {
                    const novoSem = e.target.value;
                    setPreferencias({ ...preferencias, semestreAtivo: novoSem });
                    const novaCesta = todasCestasPorSemestre[novoSem] || { A: [] };
                    const chaves = Object.keys(novaCesta);
                    const abaDestino = chaves.includes(gradeAtiva) ? gradeAtiva : (chaves[0] || "A");
                    setGradeAtiva(abaDestino);
                    localStorage.setItem(CHAVE_GRADE_ATIVA, abaDestino);
                    setSelecao(novaCesta[abaDestino] || []);
                  }}
                  className="bg-transparent font-mono text-xs font-bold focus:outline-none cursor-pointer appearance-none text-current"
                >
                  <option value="2026-2" className="bg-white text-emerald-700 font-bold dark:bg-zinc-900 dark:text-emerald-400">
                    2026.2 (Prévia)
                  </option>
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

      {/* Banner de Aviso: 2026.2 Dados Simulados */}
      {(oferta.semestre === "2026-2" || oferta.semestre === "2026.2" || preferencias.semestreAtivo === "2026-2") && (
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-500/70 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 p-4.5 text-xs text-zinc-900 shadow-lg dark:border-emerald-500/80 dark:from-emerald-950/90 dark:via-teal-950/80 dark:to-emerald-950/90 dark:text-emerald-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/25 text-2xl font-bold text-emerald-600 dark:text-emerald-300 shadow-xs">
                ⚠️
              </span>
              <div>
                <div className="font-display text-sm font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-wide flex items-center gap-2">
                  <span>Módulo de Prévia: 2026.2 (Simulação Futura)</span>
                  <span className="inline-flex items-center rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white shadow-2xs">DADOS SIMULADOS DE 2025.2</span>
                </div>
                <p className="mt-1 leading-relaxed text-zinc-800 dark:text-zinc-200 text-xs font-semibold">
                  Este módulo de <strong className="text-emerald-700 dark:text-emerald-300 underline">2026.2</strong> está operando com dados simulados herdados de 2025.2 (com remoção de matérias como <em>Avaliação em IHC</em> para simular disciplinas não ofertadas) e <strong className="text-red-600 dark:text-red-400 font-black uppercase">não representa dados genuínos</strong> oficiais de 2026.2.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-zinc-200/90 bg-white/90 p-2 shadow-md backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/90">
              <div className="flex flex-1 gap-2 min-w-[280px]">
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
                      className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-5 py-3 font-display text-sm sm:text-base font-black transition-all duration-200 ${
                        bloqueado
                          ? "opacity-50 cursor-not-allowed bg-transparent text-zinc-400 dark:text-zinc-600"
                          : ativo
                            ? "bg-zinc-900 text-utfpr-400 shadow-lg ring-2 ring-utfpr-500/40 dark:bg-zinc-800 dark:text-utfpr-400"
                            : "bg-zinc-100/80 text-zinc-700 hover:bg-utfpr-50 hover:text-zinc-950 hover:border-utfpr-300 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white border border-transparent"
                      }`}
                    >
                      {id === "situacao" && (
                        bloqueado ? <span title="Desbloqueie carregando o histórico">🔒</span> : <IconUser className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                      {id === "planejamento" && <IconBookOpen className="h-4 w-4 sm:h-5 sm:w-5" />}
                      {id === "catalogo" && <IconCalendar className="h-4 w-4 sm:h-5 sm:w-5" />}
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
                {/* Sub-navegação totalizando o cabeçalho, com ícones e texto maiores e coloridos */}
                <div className="w-full rounded-3xl border-2 border-zinc-200/90 bg-white/95 p-2.5 shadow-lg backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/95 transition-all">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAbaPlanejamento("cursar")}
                      className={`flex items-center justify-center gap-3 rounded-2xl py-4 px-5 font-display text-base sm:text-lg font-black transition-all duration-200 cursor-pointer ${
                        abaPlanejamento === "cursar"
                          ? "bg-gradient-to-r from-utfpr-500 via-amber-400 to-utfpr-500 text-zinc-950 shadow-md ring-2 ring-utfpr-500/50 scale-[1.01]"
                          : "bg-zinc-50/90 text-zinc-700 hover:bg-utfpr-50 hover:text-zinc-950 hover:border-utfpr-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white border border-zinc-200/80 dark:border-zinc-700/80"
                      }`}
                    >
                      <span className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl transition-transform ${
                        abaPlanejamento === "cursar"
                          ? "bg-zinc-950/20 text-zinc-950 scale-110"
                          : "bg-utfpr-500/20 text-utfpr-600 dark:bg-utfpr-500/20 dark:text-utfpr-400 group-hover:scale-110"
                      }`}>
                        <IconBookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                      </span>
                      <span className="truncate">Matérias Abertas</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs sm:text-sm font-black shadow-2xs ${
                        abaPlanejamento === "cursar"
                          ? "bg-zinc-950 text-utfpr-400"
                          : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                      }`}>
                        {oferta.disciplinas.reduce((acc, d) => acc + d.turmas.length, 0)} turmas
                      </span>
                    </button>

                    <button
                      onClick={() => setAbaPlanejamento("grade")}
                      className={`flex items-center justify-center gap-3 rounded-2xl py-4 px-5 font-display text-base sm:text-lg font-black transition-all duration-200 cursor-pointer ${
                        abaPlanejamento === "grade"
                          ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-zinc-950 shadow-md ring-2 ring-emerald-500/50 scale-[1.01]"
                          : "bg-zinc-50/90 text-zinc-700 hover:bg-emerald-50 hover:text-zinc-950 hover:border-emerald-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white border border-zinc-200/80 dark:border-zinc-700/80"
                      }`}
                    >
                      <span className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl transition-transform ${
                        abaPlanejamento === "grade"
                          ? "bg-zinc-950/20 text-zinc-950 scale-110"
                          : "bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 group-hover:scale-110"
                      }`}>
                        <IconCalendar className="h-5 w-5 sm:h-6 sm:w-6" />
                      </span>
                      <span className="truncate">Minha Grade</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs sm:text-sm font-black shadow-2xs ${
                        abaPlanejamento === "grade"
                          ? "bg-zinc-950 text-emerald-400"
                          : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                      }`}>
                        {selecao.length} {selecao.length === 1 ? "turma" : "turmas"}
                      </span>
                    </button>
                  </div>
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
                      onAbrirMobilePreview={(p) => {
                        setPreview(p);
                        setMobileGradeDrawerAberto(true);
                      }}
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
                      onAbrirMobilePreview={(p) => {
                        setPreview(p);
                        setMobileGradeDrawerAberto(true);
                      }}
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
                    exclusoesSugestao={exclusoesAtivas}
                    onLimparExclusoes={() => {
                      setCestaExclusoes((prev: any) => {
                        const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                        return n;
                      });
                    }}
                    todasCestasPorSemestre={todasCestasPorSemestre}
                    semestreAtivo={semestreAtivo}
                    todasOfertas={todasOfertas}
                  />
                )}
              </div>
            )}
          </div>

          {/* sidebar de feedback contínuo: visível nas abas Situação e em Planejamento/Posso Cursar */}
          {(aba === "situacao" || (aba === "planejamento" && abaPlanejamento === "cursar")) && (
            <aside className="sticky top-4 self-start hidden w-60 shrink-0 lg:block">
              <MiniGrade
                oferta={oferta}
                selecao={selecao}
                preview={preview}
                perfil={perfil}
                matriz={matriz}
                onLimpar={() => {
                  setSelecao([]);
                  setCestaExclusoes((prev: any) => {
                    const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                    return n;
                  });
                }}
                cestaGrades={cestaGrades}
                gradeAtiva={gradeAtiva}
                onMudarGradeAtiva={handleMudarGradeAtiva}
                onNovaGrade={handleNovaGrade}
                onRemoverGrade={handleRemoverGrade}
                onRemoverTurma={(codigo) =>
                  setSelecao((s) => s.filter((item) => item.codDisciplina !== codigo))
                }
                exclusoesSugestao={exclusoesAtivas}
                onLimparExclusoes={() => {
                  setCestaExclusoes((prev: any) => {
                    const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                    return n;
                  });
                }}
              />
            </aside>
          )}
        </div>
      )}

      {/* Modal Sugestão de Grade unificado para todo o Planejamento */}
      <ModalGradeMagica
        aberto={modalGradeMagica}
        onFechar={() => setModalGradeMagica(false)}
        perfil={perfil}
        matriz={matriz}
        oferta={oferta}
        selecaoAtual={selecao}
        onGerarGrade={(s, meta) => {
          setSelecao(s);
          if (meta) {
            setCestaExclusoes((prev: any) => {
              const n = { ...prev, [gradeAtiva]: meta };
              return n;
            });
          }
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

      {/* Barra flutuante inferior para mobile e Bottom Sheet (Gaveta) */}
      {(aba === "situacao" || (aba === "planejamento" && abaPlanejamento === "cursar")) && (
        <>
          <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
            <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-900/90 p-3.5 px-5 shadow-2xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-950/90 text-white">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-black">Grade {gradeAtiva}</span>
                  <span className="rounded-full bg-utfpr-500/20 px-2 py-0.5 font-mono text-xs font-bold text-utfpr-400">
                    {selecao.length} {selecao.length === 1 ? "turma" : "turmas"}
                  </span>
                </div>
                {preview ? (
                  <span className="truncate text-xs font-semibold text-amber-400">
                    👁️ Espiando {preview.turma.codigo} ({preview.disciplina.codigo})
                  </span>
                ) : (
                  <span className="truncate text-xs text-zinc-400">
                    Toque para inspecionar grade
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileGradeDrawerAberto(true)}
                className="shrink-0 ml-3 rounded-xl bg-utfpr-500 px-4 py-2 font-display text-xs font-black text-zinc-950 shadow-md transition-all hover:bg-utfpr-400 active:scale-95 cursor-pointer"
              >
                {preview ? "Ver Preview" : "Abrir Grade"}
              </button>
            </div>
          </div>

          {mobileGradeDrawerAberto && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={() => {
                  setMobileGradeDrawerAberto(false);
                  if (preview) setPreview(null);
                }}
              />
              <div className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-zinc-200/80 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 flex flex-col">
                <div className="flex items-center justify-between border-b border-zinc-200/80 pb-4 mb-4 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-black text-zinc-900 dark:text-white">
                      Mini-Grade no Celular
                    </h3>
                    {preview && (
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-500">
                        Espiando
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileGradeDrawerAberto(false);
                      if (preview) setPreview(null);
                    }}
                    className="rounded-full bg-zinc-100 p-2 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pb-6">
                  <MiniGrade
                    oferta={oferta}
                    selecao={selecao}
                    preview={preview}
                    perfil={perfil}
                    matriz={matriz}
                    onLimpar={() => {
                      setSelecao([]);
                      setCestaExclusoes((prev: any) => {
                        const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                        return n;
                      });
                    }}
                    cestaGrades={cestaGrades}
                    gradeAtiva={gradeAtiva}
                    onMudarGradeAtiva={handleMudarGradeAtiva}
                    onNovaGrade={handleNovaGrade}
                    onRemoverGrade={handleRemoverGrade}
                    onRemoverTurma={(codigo) =>
                      setSelecao((s) => s.filter((item) => item.codDisciplina !== codigo))
                    }
                    exclusoesSugestao={exclusoesAtivas}
                    onLimparExclusoes={() => {
                      setCestaExclusoes((prev: any) => {
                        const n = { ...prev, [gradeAtiva]: { disciplinas: [], professores: [] } };
                        return n;
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <footer className="mt-20 border-t border-zinc-200/80 pt-6 pb-24 text-center text-xs text-zinc-400 dark:border-zinc-800/80 dark:text-zinc-500">
        Projeto acadêmico independente desenvolvido por e para estudantes de BSI — não oficial. Sempre verifique e confirme seus dados no Portal do Aluno da UTFPR.
      </footer>
    </div>
  );
}
