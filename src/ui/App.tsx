import { useEffect, useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno } from "../domain/tipos";
import { extrairLinhas } from "../domain/historico/extrair-linhas";
import { parseHistorico } from "../domain/historico/parser";
import matrizJson from "../../data/matriz-981.json";
import turmasJson from "../../data/turmas/2026-1.json";
import { TelaSituacao } from "./telas/Situacao";
import { TelaPossoCursar } from "./telas/PossoCursar";
import { TelaGrade } from "./telas/Grade";
import { Botao, Card } from "./componentes";

const matriz = matrizJson as unknown as Matriz;
const oferta = turmasJson as unknown as OfertaSemestre;

export interface SelecaoTurma {
  codDisciplina: string;
  codTurma: string;
}

type Aba = "situacao" | "cursar" | "grade";

const CHAVE_PERFIL = "oasis.perfil.v1";
const CHAVE_GRADE = "oasis.grade.v1";

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
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-utfpr-600 dark:text-utfpr-500">Oásis</span> UTFPR
          </h1>
          <span className="text-sm text-zinc-500">BSI · Curitiba · matriz 981 · {oferta.semestre}</span>
        </div>
        {perfil && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>
              {perfil.nome.split(" ")[0]} · {perfil.periodo}º período
            </span>
            <Botao
              onClick={() => {
                localStorage.removeItem(CHAVE_PERFIL);
                setPerfil(null);
                setSelecao([]);
              }}
            >
              Trocar histórico
            </Botao>
          </div>
        )}
      </header>

      {!perfil ? (
        <div className="mx-auto mt-16 max-w-lg">
          <Card>
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="text-5xl">🎓</div>
              <h2 className="text-lg font-bold">Comece pelo seu Histórico Escolar</h2>
              <p className="text-sm text-zinc-500">
                Baixe o PDF do histórico no Portal do Aluno e solte aqui. Todo o
                processamento acontece <strong>no seu navegador</strong> — o arquivo não é
                enviado a lugar nenhum.
              </p>
              <label className="cursor-pointer rounded-xl border-2 border-dashed border-utfpr-500/60 px-10 py-8 text-sm font-medium hover:bg-utfpr-500/10">
                {carregando ? "Lendo o PDF…" : "Clique para escolher o PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && processarArquivo(e.target.files[0])}
                />
              </label>
              {erro && <p className="text-sm text-red-500">{erro}</p>}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <nav className="mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {abas.map(([id, rotulo]) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  aba === id
                    ? "bg-white shadow-sm dark:bg-zinc-800"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </nav>
          {perfil.avisos.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              O parser encontrou pontos não reconhecidos no seu histórico — os números
              abaixo podem estar incompletos: {perfil.avisos.join("; ")}
            </div>
          )}
          {aba === "situacao" && <TelaSituacao perfil={perfil} matriz={matriz} />}
          {aba === "cursar" && (
            <TelaPossoCursar
              perfil={perfil}
              matriz={matriz}
              oferta={oferta}
              selecao={selecao}
              setSelecao={setSelecao}
            />
          )}
          {aba === "grade" && (
            <TelaGrade oferta={oferta} selecao={selecao} setSelecao={setSelecao} />
          )}
        </>
      )}

      <footer className="mt-16 border-t border-zinc-200 pt-4 text-xs text-zinc-400 dark:border-zinc-800">
        Projeto independente de alunos — não é um sistema oficial da UTFPR. Confira sempre os
        dados no Portal do Aluno antes de efetivar a matrícula.
      </footer>
    </div>
  );
}
