import { useState } from "react";
import { Card, Botao, Badge } from "../componentes";
import {
  LogoUTFPR,
  IconUpload,
  IconFileText,
  IconBuilding,
  IconGraduationCap,
  IconSearch,
  IconWarning,
  IconBookOpen,
} from "../icons";

export interface DadosCheckin {
  campus: string;
  curso: string;
  matriz: string;
}

export function TelaCheckin(props: {
  onProcessarArquivo: (file: File) => void;
  onContinuarSemRegistro: (dados: DadosCheckin) => void;
  carregando: boolean;
  erro: string | null;
}) {
  const [campus, setCampus] = useState("curitiba");
  const [curso, setCurso] = useState("bsi-981");
  const matriz = "981";
  const [buscaCampus, setBuscaCampus] = useState("");
  const [buscaCurso, setBuscaCurso] = useState("");
  const [openCampus, setOpenCampus] = useState(false);
  const [openCurso, setOpenCurso] = useState(false);
  const [openMatriz, setOpenMatriz] = useState(false);

  const listaCampus = [
    { id: "curitiba", nome: "Câmpus Curitiba", disponivel: true },
    { id: "ponta-grossa", nome: "Câmpus Ponta Grossa", disponivel: false },
    { id: "cornelio", nome: "Câmpus Cornélio Procópio", disponivel: false },
    { id: "patto-branco", nome: "Câmpus Pato Branco", disponivel: false },
  ].filter((c) => c.nome.toLowerCase().includes(buscaCampus.toLowerCase()));

  const listaCursos = [
    { id: "bsi-981", nome: "Bacharelado em Sistemas de Informação (BSI)", nomeCurto: "BSI", disponivel: true },
    { id: "bcc", nome: "Bacharelado em Ciência da Computação (BCC)", nomeCurto: "BCC", disponivel: false },
    { id: "eng-comp", nome: "Engenharia de Computação", nomeCurto: "Eng. Computação", disponivel: false },
    { id: "eng-soft", nome: "Engenharia de Software", nomeCurto: "Eng. Software", disponivel: false },
  ].filter((c) => c.nome.toLowerCase().includes(buscaCurso.toLowerCase()));

  return (
    <div className="mx-auto max-w-4xl space-y-8 pt-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-utfpr-500/15 text-utfpr-600 dark:bg-utfpr-500/10 dark:text-utfpr-400 mb-1">
          <LogoUTFPR className="w-12 h-12" />
        </div>
        <h1 className="font-display text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          Bem-vindo ao <span className="text-utfpr-600 dark:text-utfpr-500">Oásis</span> UTFPR
        </h1>
        <p className="max-w-xl mx-auto text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          A plataforma independente de planejamento curricular, sugestão e montagem de grade horária
          feita de estudantes para estudantes da UTFPR.
        </p>
      </div>

      {/* Seção 1: Check-in Institucional */}
      <Card titulo="1. Check-in e Seleção Institucional" classe="p-6 sm:p-8">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
          Confirme seu câmpus, curso e matriz curricular. No momento, a plataforma opera com dados
          canônicos do curso de <strong className="text-zinc-800 dark:text-zinc-200">Sistemas de Informação (Matriz 981) do Câmpus Curitiba</strong>. Os menus abaixo preparam a estrutura para expansão e pesquisa em futuros cursos.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Seletor de Câmpus (Dropdown) */}
          <div className="space-y-2 relative">
            <label className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                <IconBuilding className="w-3.5 h-3.5 text-utfpr-600 dark:text-utfpr-500" />
                <span>Câmpus</span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => setOpenCampus(!openCampus)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="truncate font-display font-bold text-sm">
                {listaCampus.find((c) => c.id === campus)?.nome ?? "Câmpus Curitiba"}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tom="acento">Ativo</Badge>
                <span className="text-zinc-400 text-[10px]">{openCampus ? "▲" : "▼"}</span>
              </div>
            </button>

            {openCampus && (
              <div className="absolute left-0 right-0 z-20 mt-1.5 rounded-xl border border-zinc-200/90 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs mb-1.5 dark:border-zinc-800 dark:bg-zinc-800">
                  <IconSearch className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Pesquisar câmpus..."
                    value={buscaCampus}
                    onChange={(e) => setBuscaCampus(e.target.value)}
                    className="w-full bg-transparent text-zinc-800 placeholder-zinc-400 focus:outline-none dark:text-zinc-200"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {listaCampus.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (c.disponivel) {
                          setCampus(c.id);
                          setOpenCampus(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                        campus === c.id
                          ? "bg-utfpr-500/15 font-bold text-utfpr-700 dark:text-utfpr-400"
                          : c.disponivel
                          ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          : "text-zinc-400 opacity-60 cursor-not-allowed dark:text-zinc-600"
                      }`}
                    >
                      <span className="truncate">{c.nome}</span>
                      {campus === c.id ? (
                        <Badge tom="acento">Ativo</Badge>
                      ) : !c.disponivel ? (
                        <span className="text-[10px] text-zinc-400">Em breve</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seletor de Curso (Dropdown exibindo curto "BSI" por padrão) */}
          <div className="space-y-2 relative">
            <label className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                <IconGraduationCap className="w-3.5 h-3.5 text-utfpr-600 dark:text-utfpr-500" />
                <span>Curso</span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => setOpenCurso(!openCurso)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="truncate font-display font-bold text-sm" title={listaCursos.find((c) => c.id === curso)?.nome}>
                {listaCursos.find((c) => c.id === curso)?.nomeCurto ?? "BSI"}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tom="acento">Ativo</Badge>
                <span className="text-zinc-400 text-[10px]">{openCurso ? "▲" : "▼"}</span>
              </div>
            </button>

            {openCurso && (
              <div className="absolute left-0 right-0 z-20 mt-1.5 rounded-xl border border-zinc-200/90 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs mb-1.5 dark:border-zinc-800 dark:bg-zinc-800">
                  <IconSearch className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Pesquisar curso (ex: BSI)..."
                    value={buscaCurso}
                    onChange={(e) => setBuscaCurso(e.target.value)}
                    className="w-full bg-transparent text-zinc-800 placeholder-zinc-400 focus:outline-none dark:text-zinc-200"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {listaCursos.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (c.disponivel) {
                          setCurso(c.id);
                          setOpenCurso(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                        curso === c.id
                          ? "bg-utfpr-500/15 font-bold text-utfpr-700 dark:text-utfpr-400"
                          : c.disponivel
                          ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          : "text-zinc-400 opacity-60 cursor-not-allowed dark:text-zinc-600"
                      }`}
                    >
                      <span className="truncate">{c.nome}</span>
                      {curso === c.id ? (
                        <Badge tom="acento">Ativo</Badge>
                      ) : !c.disponivel ? (
                        <span className="text-[10px] text-zinc-400">Em breve</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seletor de Matriz (Dropdown) */}
          <div className="space-y-2 relative">
            <label className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                <IconBookOpen className="w-3.5 h-3.5 text-utfpr-600 dark:text-utfpr-500" />
                <span>Matriz Curricular</span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => setOpenMatriz(!openMatriz)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="truncate font-display font-bold text-sm">
                Matriz 981 (Nova)
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tom="ok">Vigente</Badge>
                <span className="text-zinc-400 text-[10px]">{openMatriz ? "▲" : "▼"}</span>
              </div>
            </button>

            {openMatriz && (
              <div className="absolute left-0 right-0 z-20 mt-1.5 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Matriz 981 (Nova)
                  </span>
                  <Badge tom="ok">Vigente</Badge>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Vigente para ingressantes a partir de 2023. Carga total de 3.240h com divisão por estratos.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Seção 2: Opções de Acesso */}
      <Card titulo="2. Como você deseja acessar a plataforma?" classe="p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Opção A: Com PDF (Recomendada) */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-utfpr-500/60 bg-utfpr-500/5 p-6 transition-all hover:border-utfpr-500 dark:bg-utfpr-500/5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Com meu Histórico (Completo)
                </span>
                <Badge tom="acento">Recomendado</Badge>
              </div>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                Importe seu PDF emitido pelo Portal do Aluno. A plataforma calcula suas horas cumpridas
                por estrato, valida pré-requisitos automaticamente em <strong>Matérias Abertas</strong> e
                alerta sobre pendências na sua grade.
              </p>
              <div className="rounded-xl bg-white/80 p-3 text-[11px] text-zinc-500 border border-zinc-200/60 dark:bg-zinc-900/80 dark:border-zinc-800">
                🛡️ Processamento <strong>100% no seu navegador</strong>. Seus dados nunca saem da sua máquina.
              </div>
            </div>

            <label className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-utfpr-500 py-3 font-display text-sm font-bold text-zinc-950 shadow-xs transition-all hover:bg-utfpr-400 active:scale-[0.98]">
              <IconUpload className="w-4 h-4 shrink-0" />
              <span>{props.carregando ? "Processando..." : "Selecionar arquivo PDF"}</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && props.onProcessarArquivo(e.target.files[0])}
              />
            </label>
          </div>

          {/* Opção B: Sem registros (Modo Livre / Grade na Hora) */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-zinc-50/60 p-6 transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Continuar sem meus registros
                </span>
                <Badge tom="neutro">Modo Livre</Badge>
              </div>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                Acesse imediatamente o portal sem importar um PDF. Ideal para testar combinações de grade
                horária com todas as disciplinas liberadas (estilo <strong>Grade na Hora</strong>) ou consultar
                turmas abertas no semestre.
              </p>
              <div className="rounded-xl bg-zinc-100/80 p-3 text-[11px] text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                ⚡ Você poderá importar seu histórico a qualquer momento depois através das Configurações.
              </div>
            </div>

            <Botao
              variante="sutil"
              onClick={() => props.onContinuarSemRegistro({ campus, curso, matriz })}
            >
              <IconFileText className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>Entrar sem histórico (Grade na Hora)</span>
            </Botao>
          </div>
        </div>

        {props.erro && (
          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200">
            <IconWarning className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{props.erro}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
