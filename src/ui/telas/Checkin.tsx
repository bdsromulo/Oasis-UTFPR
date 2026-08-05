import { useState } from "react";
import type { SavefileOasis } from "../../domain/savefile";
import { Card, Botao, Badge } from "../componentes";
import { ModalComoGerarHistorico } from "./ModalComoGerarHistorico";
import {
  IconBookOpen,
  IconBuilding,
  IconFileText,
  IconFolders,
  IconGraduationCap,
  IconSearch,
  IconShieldLock,
  IconUpload,
  IconWarning,
  LogoUTFPR,
} from "../icons";

export interface DadosCheckin {
  campus: string;
  curso: string;
  matriz: string;
}

interface OpcaoMatriz {
  numero: string;
  rotulo: string;
  nota: string;
  disponivel: boolean;
}

/** Matrizes conhecidas, inclusive as já anunciadas mas ainda não implementadas. */
const MATRIZES_DO_CURSO: Record<string, OpcaoMatriz[]> = {
  "bsi-981": [
    {
      numero: "981",
      rotulo: "981 (Nova)",
      nota: "Vigente para ingressantes a partir de 2023. Carga total de 3.240h com divisão por estratos.",
      disponivel: true,
    },
  ],
  "eng-comp": [
    {
      numero: "844",
      rotulo: "844 (Antiga)",
      nota: "Implementada: 270h optativas, com 2 trilhas completas, mais 90h de eletivas.",
      disponivel: true,
    },
    {
      numero: "962",
      rotulo: "962 (Nova)",
      nota: "Implementada: matriz vigente de Engenharia de Computação, com trilhas e optativas próprias.",
      disponivel: true,
    },
  ],
  "eng-eletronica-968": [
    {
      numero: "968",
      rotulo: "968 (Vigente)",
      nota: "Implementada: 1.710h de obrigatórias e 2.385h de optativas, distribuídas em 25 grupos de escolha, no Ciclo de Humanidades e nas Trilhas de Aprofundamento.",
      disponivel: true,
    },
  ],
  "eng-controle": [
    {
      numero: "978",
      rotulo: "978 (Vigente)",
      nota: "Implementada: 3.525h obrigatórias, 675h em cinco trilhas de formação, 420h de extensão e estágio curricular de 360h.",
      disponivel: true,
    },
  ],
  "eng-mecatronica": [
    {
      numero: "973",
      rotulo: "973 (Vigente)",
      nota: "Implementada: matriz nova com Ciclo de Humanidades, trilhas formativas de Eletrônica e Mecânica e ofertas próprias de 2025.2 a 2026.2.",
      disponivel: true,
    },
    {
      numero: "823",
      rotulo: "823 (Antiga)",
      nota: "Implementada: 4.066h obrigatórias, 90h em Ciências Humanas, 240h eletivas e estágio curricular de 400h.",
      disponivel: true,
    },
  ],
};

/** Relação pública exibida junto da importação, inclusive matrizes detectadas só pelo PDF. */
const CURSOS_DISPONIVEIS = [
  { nome: "Sistemas de Informação", matrizes: ["806", "981"] },
  { nome: "Engenharia de Computação", matrizes: ["844", "962"] },
  { nome: "Engenharia Eletrônica", matrizes: ["968"] },
  { nome: "Engenharia de Controle e Automação", matrizes: ["978"] },
  { nome: "Engenharia Mecatrônica", matrizes: ["823", "973"] },
];

interface Props {
  carregando: boolean;
  erro: string | null;
  onProcessarArquivo: (arquivo: File, dados?: DadosCheckin) => void;
  onAnalisarSavefile: (arquivo: File) => Promise<SavefileOasis>;
  onConfirmarSavefile: (savefile: SavefileOasis) => void;
  onContinuarSemRegistro: (dados: DadosCheckin) => void;
  onAbrirGestaoInformacao: () => void;
}

export function TelaCheckin(props: Props) {
  const [campus, setCampus] = useState("curitiba");
  const [curso, setCurso] = useState("bsi-981");
  const [matriz, setMatriz] = useState("981");
  const matrizesDoCurso =
    MATRIZES_DO_CURSO[curso] ?? MATRIZES_DO_CURSO["bsi-981"];
  const infoMatriz =
    matrizesDoCurso.find((opcao) => opcao.numero === matriz) ??
    matrizesDoCurso.find((opcao) => opcao.disponivel) ??
    matrizesDoCurso[0];
  const [buscaCampus, setBuscaCampus] = useState("");
  const [buscaCurso, setBuscaCurso] = useState("");
  const [openCampus, setOpenCampus] = useState(false);
  const [openCurso, setOpenCurso] = useState(false);
  const [openMatriz, setOpenMatriz] = useState(false);
  const [comoGerarAberto, setComoGerarAberto] = useState(false);
  const [savefilePreview, setSavefilePreview] = useState<SavefileOasis | null>(null);
  const [erroSavefile, setErroSavefile] = useState<string | null>(null);
  const [processandoSavefile, setProcessandoSavefile] = useState(false);

  const listaCampus = [
    { id: "curitiba", nome: "Câmpus Curitiba", disponivel: true },
    { id: "ponta-grossa", nome: "Câmpus Ponta Grossa", disponivel: false },
    { id: "cornelio", nome: "Câmpus Cornélio Procópio", disponivel: false },
    { id: "patto-branco", nome: "Câmpus Pato Branco", disponivel: false },
  ].filter((c) => c.nome.toLowerCase().includes(buscaCampus.toLowerCase()));

  const listaCursos = [
    { id: "bsi-981", nome: "Bacharelado em Sistemas de Informação (BSI)", nomeCurto: "BSI", disponivel: true },
    { id: "bcc", nome: "Bacharelado em Ciência da Computação (BCC)", nomeCurto: "BCC", disponivel: false },
    { id: "eng-comp", nome: "Eng. Comp.", nomeCurto: "Eng. Comp.", disponivel: true },
    { id: "eng-eletronica-968", nome: "Engenharia Eletrônica", nomeCurto: "Eng. Eletrônica", disponivel: true },
    { id: "eng-controle", nome: "Engenharia de Controle e Automação", nomeCurto: "Eng. Controle", disponivel: true },
    { id: "eng-mecatronica", nome: "Engenharia Mecatrônica", nomeCurto: "Eng. Mecatrônica", disponivel: true },
    { id: "design", nome: "Design", nomeCurto: "Design", disponivel: false },
    { id: "eng-soft", nome: "Engenharia de Software", nomeCurto: "Eng. Software", disponivel: false },
  ].filter((c) => c.nome.toLowerCase().includes(buscaCurso.toLowerCase()));

  const selecionarCurso = (id: string) => {
    const matrizDisponivel = MATRIZES_DO_CURSO[id]?.find(
      (opcao) => opcao.disponivel,
    );
    setCurso(id);
    if (matrizDisponivel) setMatriz(matrizDisponivel.numero);
    setOpenCurso(false);
    setOpenMatriz(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pt-4">
      {/* A modelagem de GI é sobre o projeto, não sobre o aluno: fica acessível
          aqui, antes de escolher entre importar o histórico ou entrar sem ele. */}
      <div className="flex justify-end">
        <Botao variante="sutil" onClick={props.onAbrirGestaoInformacao} classe="!text-xs">
          <IconFolders className="h-4 w-4 shrink-0" />
          <span>Gestão da Informação</span>
        </Botao>
      </div>

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

      {/* Seção 1: Com Histórico (Recomendado) */}
      <Card titulo="1. Com meu Histórico (Recomendado)" classe="p-6 sm:p-8">
        <div className="flex flex-col justify-between rounded-2xl border-2 border-utfpr-500/60 bg-utfpr-500/5 p-6 transition-all hover:border-utfpr-500 dark:bg-utfpr-500/5">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              Importe seu PDF emitido pelo Portal do Aluno. A plataforma identifica <strong>automaticamente seu curso e matriz</strong>, calcula as horas cumpridas, valida pré-requisitos e alerta sobre pendências.
            </p>
            <div className="rounded-xl bg-white/80 p-3 text-[11px] text-zinc-500 border border-zinc-200/60 dark:bg-zinc-900/80 dark:border-zinc-800">
              {<IconShieldLock className="inline h-4 w-4 shrink-0 align-[-0.2em]" />} Processamento <strong>100% no seu navegador</strong>. Seus dados nunca saem da sua máquina.
            </div>
          </div>

          <label className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-utfpr-500 py-3 font-display text-sm font-bold text-zinc-950 shadow-xs transition-all hover:bg-utfpr-400 active:scale-[0.98]">
            <IconUpload className="w-5 h-5 shrink-0" />
            <span>{props.carregando ? "Processando..." : "Selecionar arquivo PDF"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] &&
                props.onProcessarArquivo(e.target.files[0])
              }
            />
          </label>

          <button
            type="button"
            onClick={() => setComoGerarAberto(true)}
            className="mt-3 min-h-11 w-full cursor-pointer text-center text-xs font-semibold text-zinc-500 underline decoration-dotted underline-offset-2 transition-colors hover:text-utfpr-600 dark:text-zinc-400 dark:hover:text-utfpr-400"
          >
            Não sei gerar meu histórico
          </button>

          <div className="my-4 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">ou</span>
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <p className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Já tenho um savefile
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Restaure aqui o perfil, as grades montadas e as preferências levadas de outro navegador.
            </p>
            <label className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-utfpr-500/70 px-3.5 py-2 text-xs font-bold text-utfpr-700 transition-colors hover:bg-utfpr-500/10 dark:text-utfpr-400">
              <IconUpload className="h-4 w-4 shrink-0" />
              <span>{processandoSavefile ? "Verificando arquivo..." : "Importar savefile"}</span>
              <input
                type="file"
                accept="application/json,.json,.oasis"
                className="hidden"
                onChange={async (e) => {
                  const arquivo = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (!arquivo) return;
                  setErroSavefile(null);
                  setProcessandoSavefile(true);
                  try {
                    setSavefilePreview(await props.onAnalisarSavefile(arquivo));
                  } catch (erro) {
                    setErroSavefile(
                      erro instanceof Error
                        ? erro.message
                        : "Não foi possível ler o savefile.",
                    );
                  } finally {
                    setProcessandoSavefile(false);
                  }
                }}
              />
            </label>

            {erroSavefile && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                <IconWarning className="mr-1 inline h-4 w-4 align-[-0.2em]" /> {erroSavefile}
              </div>
            )}

            {savefilePreview && (
              <div className="mt-3 rounded-xl border-2 border-utfpr-500 bg-utfpr-500/10 p-3 text-xs text-zinc-700 dark:text-zinc-200">
                <p className="font-display font-bold text-zinc-900 dark:text-white">
                  Confirmar importação
                </p>
                <p className="mt-1 leading-relaxed">
                  {savefilePreview.dados.perfil
                    ? `Perfil de ${savefilePreview.dados.perfil.nome} e `
                    : "Sem perfil de histórico e "}
                  {Object.values(savefilePreview.dados.cestasPorSemestre).reduce(
                    (total, cestas) => total + Object.keys(cestas).length,
                    0,
                  )} grade(s) serão carregados neste navegador.
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Botao variante="sutil" onClick={() => setSavefilePreview(null)}>
                    Cancelar
                  </Botao>
                  <Botao
                    variante="primario"
                    onClick={() => {
                      props.onConfirmarSavefile(savefilePreview);
                      setSavefilePreview(null);
                    }}
                  >
                    Importar dados
                  </Botao>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-200/90 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-start gap-2.5">
            <IconGraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-utfpr-600 dark:text-utfpr-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Cursos e matrizes disponíveis
              </h3>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Ao importar o histórico, o Oásis identifica automaticamente uma destas matrizes.
              </p>
            </div>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {CURSOS_DISPONIVEIS.map((item) => (
              <li
                key={item.nome}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/60"
              >
                <span className="min-w-0 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {item.nome}
                </span>
                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                  {item.matrizes.map((numero) => (
                    <Badge key={numero} tom="ok">{numero}</Badge>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <ModalComoGerarHistorico aberto={comoGerarAberto} onFechar={() => setComoGerarAberto(false)} />

      {/* Seção 2: Entrar sem Histórico (Modo Livre) */}
      <Card titulo="2. Entrar sem Histórico (Modo Livre)" classe="p-6 sm:p-8">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
          Acesse imediatamente a plataforma para explorar turmas abertas e simular grades. É necessário <strong>selecionar o curso desejado</strong>.
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
                          selecionarCurso(c.id);
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
                {infoMatriz.rotulo}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tom="ok">Disponível</Badge>
                <span className="text-zinc-400 text-[10px]">{openMatriz ? "▲" : "▼"}</span>
              </div>
            </button>

            {openMatriz && (
              <div className="absolute left-0 right-0 z-20 mt-1.5 space-y-1 rounded-xl border border-zinc-200/90 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                {matrizesDoCurso.map((opcao) => {
                  const selecionada = opcao.numero === matriz;
                  return (
                    <button
                      key={opcao.numero}
                      type="button"
                      disabled={!opcao.disponivel}
                      onClick={() => {
                        if (!opcao.disponivel) return;
                        setMatriz(opcao.numero);
                        setOpenMatriz(false);
                      }}
                      className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                        selecionada
                          ? "bg-utfpr-500/15 text-utfpr-700 dark:text-utfpr-400"
                          : opcao.disponivel
                            ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            : "cursor-not-allowed text-zinc-400 opacity-65 dark:text-zinc-500"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-bold">
                          {opcao.rotulo}
                        </span>
                        {selecionada ? (
                          <Badge tom="ok">Disponível</Badge>
                        ) : !opcao.disponivel ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide">
                            Próxima
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed">
                        {opcao.nota}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Botao
          variante="sutil"
          classe="w-full justify-center"
          onClick={() => props.onContinuarSemRegistro({ campus, curso, matriz })}
        >
          <IconFileText className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>Entrar sem histórico (Grade na Hora)</span>
        </Botao>

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
