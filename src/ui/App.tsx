import { useEffect, useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../domain/tipos";
import { extrairLinhas } from "../domain/historico/extrair-linhas";
import { parseHistorico } from "../domain/historico/parser";
import matrizJson from "../../data/matriz-981.json";
import turmasJson from "../../data/turmas/2026-1.json";
import { TelaSituacao } from "./telas/Situacao";
import { TelaPossoCursar } from "./telas/PossoCursar";
import { TelaGrade } from "./telas/Grade";
import { TelaLayoutGNH } from "./telas/LayoutGNH";
import { MiniGrade, type PreviewTurma } from "./MiniGrade";
import { Botao, Card } from "./componentes";
import {
  LogoUTFPR,
  IconUpload,
  IconFileText,
  IconUser,
  IconCalendar,
  IconBookOpen,
  IconWarning,
} from "./icons";

const matriz = matrizJson as unknown as Matriz;
const oferta = turmasJson as unknown as OfertaSemestre;

export interface SelecaoTurma {
  codDisciplina: string;
  codTurma: string;
}

type Aba = "situacao" | "cursar" | "grade";
type Layout = "oasis" | "gnh";

const CHAVE_PERFIL = "oasis.perfil.v1";
const CHAVE_GRADE = "oasis.grade.v1";
const CHAVE_LAYOUT = "oasis.layout.v1";

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
  const [aba, setAba] = useState<Aba>("situacao");
  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(CHAVE_LAYOUT) as Layout) ?? "oasis",
  );
  const [preview, setPreview] = useState<PreviewTurma | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecao, setSelecao] = useState<SelecaoTurma[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_GRADE) ?? "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CHAVE_GRADE, JSON.stringify(selecao));
  }, [selecao]);

  async function processarArquivo(arq: File) {
    setCarregando(true);
    setErro(null);
    try {
      const linhas = await extrairLinhas(await arq.arrayBuffer());
      const p = parseHistorico(linhas.map((l) => l.texto));
      if (!p.nome || p.cursadas.length === 0) {
        throw new Error(
          "não reconheci este PDF como um Histórico Escolar do Portal do Aluno" +
            (p.avisos.length ? ` (${p.avisos[0]})` : ""),
        );
      }
      salvarPerfil(p);
      setPerfil(p);
      setAba("situacao");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  const abas = useMemo(
    () =>
      [
        ["situacao", "Minha situação"],
        ["cursar", "Posso cursar"],
        ["grade", `Grade (${selecao.length})`],
      ] as [Aba, string][],
    [selecao.length],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <LogoUTFPR className="h-9 w-9 shrink-0" />
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="font-display text-2xl font-black tracking-tight">
                <span className="text-utfpr-600 dark:text-utfpr-500">Oásis</span> UTFPR
              </h1>
              <span className="rounded-md border border-zinc-200/80 bg-zinc-100/80 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                {oferta.semestre}
              </span>
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Sistemas de Informação · Câmpus Curitiba · Matriz 981
            </p>
          </div>
        </div>
        {perfil && (
          <div className="flex flex-wrap items-center gap-3">
            {/* comutador de layout: Oásis (abas + inovações) | GNH (lista única, roots) */}
            <div className="flex rounded-xl border border-zinc-200/80 bg-zinc-100/70 p-0.5 text-xs font-bold dark:border-zinc-800/80 dark:bg-zinc-900/70">
              {(
                [
                  ["oasis", "Layout Oásis"],
                  ["gnh", "Layout GNH"],
                ] as [Layout, string][]
              ).map(([id, rotulo]) => (
                <button
                  key={id}
                  onClick={() => {
                    setLayout(id);
                    localStorage.setItem(CHAVE_LAYOUT, id);
                  }}
                  className={`rounded-[10px] px-3 py-1.5 transition-colors ${
                    layout === id
                      ? "bg-utfpr-500 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 py-1.5 pl-3.5 pr-2 shadow-2xs backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <IconUser className="h-4 w-4 text-utfpr-600 dark:text-utfpr-500" />
                <span>
                  {perfil.nome.split(" ")[0]} ·{" "}
                  <span className="text-zinc-400 font-normal">{perfil.periodo}º período</span>
                </span>
              </div>
              <Botao
                onClick={() => {
                  localStorage.removeItem(CHAVE_PERFIL);
                  setPerfil(null);
                  setSelecao([]);
                }}
                variante="sutil"
              >
                Trocar histórico
              </Botao>
            </div>
          </div>
        )}
      </header>

      {!perfil ? (
        <div className="mx-auto mt-12 max-w-xl">
          <Card classe="p-8 sm:p-10">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-utfpr-500/15 text-utfpr-600 dark:bg-utfpr-500/10 dark:text-utfpr-400">
                <IconFileText className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Importe seu Histórico Escolar
                </h2>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Baixe o arquivo PDF do seu histórico diretamente no Portal do Aluno da UTFPR e
                  selecione abaixo. Todo o processamento ocorre{" "}
                  <strong className="text-zinc-700 dark:text-zinc-200">
                    100% no seu navegador
                  </strong>{" "}
                  — seus dados nunca saem da sua máquina.
                </p>
              </div>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const arq = e.dataTransfer.files?.[0];
                  if (arq?.type === "application/pdf") processarArquivo(arq);
                  else setErro("solte um arquivo PDF do Histórico Escolar");
                }}
                className="group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300/80 bg-zinc-50/50 py-9 transition-all hover:border-utfpr-500 hover:bg-utfpr-500/5 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-utfpr-500/60 dark:hover:bg-utfpr-500/5"
              >
                <div className="flex items-center gap-2 font-semibold text-zinc-700 transition-colors group-hover:text-utfpr-600 dark:text-zinc-300 dark:group-hover:text-utfpr-400">
                  <IconUpload className="h-5 w-5" />
                  <span>{carregando ? "Analisando o PDF..." : "Selecionar arquivo PDF"}</span>
                </div>
                <span className="text-xs text-zinc-400">Ou arraste e solte o arquivo aqui</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && processarArquivo(e.target.files[0])}
                />
              </label>
              {erro && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-left text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
                  <IconWarning className="h-4 w-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex items-start gap-6">
          {/* coluna principal */}
          <div className="min-w-0 flex-1">
            {layout === "oasis" && (
              <nav className="mb-8 flex gap-1.5 rounded-2xl border border-zinc-200/80 bg-zinc-100/70 p-1.5 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/70">
                {abas.map(([id, rotulo]) => {
                  const ativo = aba === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setAba(id)}
                      className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-bold transition-all duration-150 ${
                        ativo
                          ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {id === "situacao" && <IconUser className="h-4 w-4" />}
                      {id === "cursar" && <IconBookOpen className="h-4 w-4" />}
                      {id === "grade" && <IconCalendar className="h-4 w-4" />}
                      <span>{rotulo}</span>
                    </button>
                  );
                })}
              </nav>
            )}
            {perfil.avisos.length > 0 && (
              <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/80 p-3.5 text-sm text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
                <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">Observações na leitura do documento:</span>{" "}
                  {perfil.avisos.join("; ")}
                </div>
              </div>
            )}
            {layout === "gnh" ? (
              <TelaLayoutGNH
                perfil={perfil}
                matriz={matriz}
                oferta={oferta}
                selecao={selecao}
                setSelecao={setSelecao}
                onPreview={setPreview}
              />
            ) : (
              <>
                {aba === "situacao" && <TelaSituacao perfil={perfil} matriz={matriz} />}
                {aba === "cursar" && (
                  <TelaPossoCursar
                    perfil={perfil}
                    matriz={matriz}
                    oferta={oferta}
                    selecao={selecao}
                    setSelecao={setSelecao}
                    onPreview={setPreview}
                  />
                )}
                {aba === "grade" && (
                  <TelaGrade oferta={oferta} selecao={selecao} setSelecao={setSelecao} />
                )}
              </>
            )}
          </div>

          {/* sidebar de feedback contínuo (estilo GNH): sempre visível em telas largas,
              exceto na aba Grade do layout Oásis (que já mostra a grade completa) */}
          {(layout === "gnh" || aba !== "grade") && (
            <aside className="sticky top-4 hidden w-60 shrink-0 lg:block">
              <MiniGrade
                oferta={oferta}
                selecao={selecao}
                preview={preview}
                onLimpar={() => setSelecao([])}
              />
            </aside>
          )}
        </div>
      )}

      <footer className="mt-20 border-t border-zinc-200/80 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-800/80 dark:text-zinc-500">
        Projeto acadêmico independente desenvolvido por e para estudantes de BSI — não oficial. Sempre verifique e confirme seus dados no Portal do Aluno da UTFPR.
      </footer>
    </div>
  );
}
