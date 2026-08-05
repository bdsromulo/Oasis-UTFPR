import { useEffect, useMemo, useState } from "react";
import { useCamadaHistorico } from "./hooks/useCamadaHistorico";
import type { OfertaSemestre, PerfilAluno } from "../domain/tipos";
import { parseHistorico } from "../domain/historico/parser";
import {
  dadosDoCurso,
  dadosDoCursoPorMatriz,
  carregarOfertasHistoricasMecatronica,
  semestresDoCurso,
} from "../domain/dadosCurso";
import { TelaSituacao } from "./telas/Situacao";
import { TelaPossoCursar } from "./telas/PossoCursar";
import { TelaGrade } from "./telas/Grade";
import { TelaLayoutGNH } from "./telas/LayoutGNH";
import { TelaCatalogo, type CategoriaCatalogo } from "./telas/Catalogo";
import { TelaCheckin, type DadosCheckin } from "./telas/Checkin";
import { TelaConfiguracoes, type Preferencias } from "./telas/Configuracoes";
import { MiniGrade, type PreviewTurma } from "./MiniGrade";
import { ModalGradeMagica } from "./telas/ModalGradeMagica";
import { Botao, Badge, BotaoIconeComDica } from "./componentes";
import { SidebarNavegacao, type AbaPrincipal } from "./SidebarNavegacao";
import { TelaSimuladorFormatura } from "./telas/TelaSimuladorFormatura";
import { TelaAmigosMatch } from "./telas/TelaAmigosMatch";
import { TelaGestaoInformacao } from "./telas/TelaGestaoInformacao";
import { TelaFluxograma } from "./telas/TelaFluxograma";
import { TelaSobre } from "./telas/TelaSobre";
import { TelaComoUsar } from "./telas/TelaComoUsar";
import { PilulaFaleConosco } from "./telas/Contato";
import { PainelMenuMobile } from "./MenuMobile";
import { EXCLUSOES_VAZIAS, type ValorExclusoes } from "./telas/SeletorExclusoes";
import {
  IconBookOpen,
  IconCalendar,
  IconClipboard,
  IconEye,
  IconHelp,
  IconInfo,
  IconMenu,
  IconMoon,
  IconSettings,
  IconSparkles,
  IconStar,
  IconSun,
  IconUser,
  IconWarning,
  LogoUTFPR,
} from "./icons";
import { ModalMinhasAvaliacoes } from "./telas/ModalMinhasAvaliacoes";
import { ModalNovidades } from "./telas/ModalNovidades";
import { AvisoBeta } from "./telas/AvisoBeta";
import { reviewsHabilitadasPara } from "../domain/reviews/config";
import { coletaHabilitada } from "../domain/reviews/forms";
import {
  criarSavefile,
  desserializarPerfil,
  lerSavefile,
  type SavefileOasis,
} from "../domain/savefile";

declare const __OASIS_BETA__: boolean;

export interface SelecaoTurma {
  codDisciplina: string;
  codTurma: string;
}

type AbaSituacao = "painel" | "catalogo" | "trilhas";
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
// ponteiro (semestre + letra da grade) para a grade do Planejamento que alimenta
// o Simulador de Formatura; a seleção em si continua vindo da cesta, para o
// simulador acompanhar as edições feitas na grade
const CHAVE_GRADE_SIMULADOR = "oasis.grade_simulador.v1";
// Marca que o aviso de novidades já foi lido. Versionada no nome: a próxima
// novidade troca o sufixo e o destaque volta a aparecer para todo mundo, sem
// precisar de lógica de comparação de datas.
// Beta e release vivem no mesmo domínio do GitHub Pages durante a homologação,
// portanto compartilham localStorage. O sufixo impede que fechar o aviso no
// sandbox silencie o lançamento oficial depois.
const CHAVE_NOVIDADES = `oasis.novidades_lidas.controle_978_v1.${
  __OASIS_BETA__ ? "beta" : "release"
}`;

// A previsão foi validada contra históricos reais da matriz 981 e passou a
// respeitar o mínimo por categoria, os pré-requisitos e a sazonalidade observada
// na oferta — está liberada na navegação lateral.
const SIMULADOR_LIBERADO: boolean = true;

// Modo privado: quando ativo, o histórico é guardado apenas em sessionStorage
// (some ao fechar a aba/navegador) em vez de localStorage — útil em máquina
// compartilhada. As preferências (não sensíveis) seguem em localStorage.
function salvarPerfil(p: PerfilAluno, privado?: boolean) {
  const serial = JSON.stringify({ ...p, aprovadas: [...p.aprovadas] });
  if (privado) {
    sessionStorage.setItem(CHAVE_PERFIL, serial);
    localStorage.removeItem(CHAVE_PERFIL);
  } else {
    localStorage.setItem(CHAVE_PERFIL, serial);
    sessionStorage.removeItem(CHAVE_PERFIL);
  }
}
function lerPerfil(): PerfilAluno | null {
  const bruto = sessionStorage.getItem(CHAVE_PERFIL) ?? localStorage.getItem(CHAVE_PERFIL);
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
  const [abaSituacao, setAbaSituacao] = useState<AbaSituacao>("painel");
  const [abaPlanejamento, setAbaPlanejamento] = useState<AbaPlanejamento>("cursar");
  const [categoriaCatalogo, setCategoriaCatalogo] = useState<CategoriaCatalogo>("todas");
  const [layout, setLayout] = useState<Layout>(
    () => (localStorage.getItem(CHAVE_LAYOUT) as Layout) ?? "oasis",
  );
  const [preferencias, setPreferencias] = useState<Preferencias>(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_PREFS) ?? "null");
      return salvo || { tema: "sistema", layout: (localStorage.getItem(CHAVE_LAYOUT) as Layout) ?? "oasis", semestreAtivo: "2026-2" };
    } catch {
      return { tema: "sistema", layout: "oasis", semestreAtivo: "2026-2" };
    }
  });
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [modalAvaliacoesAberto, setModalAvaliacoesAberto] = useState(false);
  const [modalNovidadesAberto, setModalNovidadesAberto] = useState(false);
  // O realce vale uma vez. Depois de aberto o botão continua lá, porém calado:
  // um destaque permanente vira mobília e deixa de ser notado.
  const [novidadesLidas, setNovidadesLidas] = useState(
    () => localStorage.getItem(CHAVE_NOVIDADES) === "true",
  );

  const abrirNovidades = () => setModalNovidadesAberto(true);
  const fecharNovidades = () => {
    setModalNovidadesAberto(false);
    if (!novidadesLidas) {
      localStorage.setItem(CHAVE_NOVIDADES, "true");
      setNovidadesLidas(true);
    }
  };
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [giAberta, setGiAberta] = useState(false);
  const [sobreAberta, setSobreAberta] = useState(false);
  const [comoUsarAberta, setComoUsarAberta] = useState(false);
  // Com histórico carregado, a matriz detectada no próprio PDF é a fonte de
  // verdade do curso. Isso também corrige sessões antigas salvas como BSI por
  // padrão apesar de conterem um histórico da matriz 844.
  const cursoDoPerfil = dadosDoCursoPorMatriz(perfil?.matriz);
  const cursoAtivo = cursoDoPerfil?.id ?? preferencias.curso ?? "bsi-981";
  const [versaoOfertasMecatronica, setVersaoOfertasMecatronica] = useState(0);
  useEffect(() => {
    let ativo = true;
    void carregarOfertasHistoricasMecatronica()
      .then(() => {
        if (ativo) setVersaoOfertasMecatronica((versao) => versao + 1);
      })
      .catch(() => {
        // Uma falha de rede no chunk histórico não derruba a oferta vigente.
        // O navegador pode tentar novamente no próximo carregamento da página.
      });
    return () => {
      ativo = false;
    };
  }, []);
  const dadosCurso = useMemo(() => dadosDoCurso(cursoAtivo), [cursoAtivo]);
  const matriz = dadosCurso.matriz;
  const todasOfertas = dadosCurso.ofertas;
  const semestresDisponiveis = useMemo(
    () => semestresDoCurso(dadosCurso),
    [dadosCurso, versaoOfertasMecatronica],
  );

  // o semestre guardado pode ser de outro curso: cai no padrão se não existir
  const semestreAtivo =
    preferencias.semestreAtivo && todasOfertas[preferencias.semestreAtivo]
      ? preferencias.semestreAtivo
      : dadosCurso.semestrePadrao;

  const oferta = useMemo<OfertaSemestre>(
    () => todasOfertas[semestreAtivo] ?? todasOfertas[dadosCurso.semestrePadrao],
    [semestreAtivo, todasOfertas, dadosCurso],
  );
  const ehPreMatricula = dadosCurso.semestresPreMatricula.includes(semestreAtivo);

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
      return { "2026-2": { A: gradeAtual } };
    } catch {
      return { "2026-2": { A: [] } };
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
    return { "2026-2": {} };
  });

  // Grade do Planejamento escolhida como ponto de partida do Simulador de
  // Formatura. Guardamos só o ponteiro: a seleção é lida da cesta a cada render,
  // então mexer na grade replaneja a projeção sem precisar reimportar.
  const [gradeParaSimulador, setGradeParaSimulador] = useState<{
    semestre: string;
    grade: string;
  } | null>(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_GRADE_SIMULADOR) ?? "null");
      return salvo && salvo.semestre && salvo.grade ? salvo : null;
    } catch {
      return null;
    }
  });

  const cestaGrades = useMemo(() => {
    return todasCestasPorSemestre[semestreAtivo] ?? { A: [] };
  }, [todasCestasPorSemestre, semestreAtivo]);

  const gradeDoPlanejamentoParaSimulador = useMemo(() => {
    if (!gradeParaSimulador) return null;
    const sel = todasCestasPorSemestre[gradeParaSimulador.semestre]?.[gradeParaSimulador.grade];
    if (!sel || sel.length === 0) return null;
    return { ...gradeParaSimulador, selecao: sel };
  }, [gradeParaSimulador, todasCestasPorSemestre]);

  // Ritmo e exclusões do Simulador de Formatura vivem aqui, e não como useState
  // dentro da tela: importar uma grade troca de aba de propósito (o aluno vê o
  // resultado na Grade), o que desmonta o simulador — um estado local voltaria
  // ao padrão a cada remontagem e o próximo import silenciosamente ignoraria o
  // ritmo que o aluno tinha acabado de escolher.
  const [ritmoSimulador, setRitmoSimulador] = useState(5);
  const [exclusoesSimulador, setExclusoesSimulador] = useState<ValorExclusoes>(EXCLUSOES_VAZIAS);

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

  // Migra o histórico entre localStorage e sessionStorage ao alternar o modo privado.
  useEffect(() => {
    if (perfil) salvarPerfil(perfil, preferencias.privado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencias.privado]);

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

  // Histórico para navegação com o botão voltar nativo do Android:
  useCamadaHistorico(modalConfigAberto, () => setModalConfigAberto(false), "modalConfigAberto");
  useCamadaHistorico(menuMobileAberto, () => setMenuMobileAberto(false), "menuMobileAberto");
  useCamadaHistorico(giAberta, () => setGiAberta(false), "giAberta");
  useCamadaHistorico(sobreAberta, () => setSobreAberta(false), "sobreAberta");
  useCamadaHistorico(comoUsarAberta, () => setComoUsarAberta(false), "comoUsarAberta");
  useCamadaHistorico(mobileGradeDrawerAberto, () => setMobileGradeDrawerAberto(false), "mobileGradeDrawerAberto");
  useCamadaHistorico(modalGradeMagica, () => setModalGradeMagica(false), "modalGradeMagica");

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

  // A cada lançamento a chave é versionada. Assim, o aviso abre uma vez para
  // quem já usa o site e também logo após concluir o primeiro cadastro; fechar
  // é o gesto que confirma a leitura neste navegador.
  useEffect(() => {
    if (checkinConcluido && !novidadesLidas) setModalNovidadesAberto(true);
  }, [checkinConcluido, novidadesLidas]);

  async function processarArquivo(arq: File, dados?: DadosCheckin) {
    setCarregando(true);
    setErro(null);
    try {
      const p = await analisarPDFParaPreview(arq);
      // o curso escolhido no check-in precisa ser guardado também neste caminho,
      // senão quem importa o PDF cai sempre na navegação da BSI
      if (dados) {
        setPreferencias((prefs) => ({
          ...prefs,
          campus: dados.campus,
          curso: dados.curso,
          matriz: dados.matriz,
        }));
      }
      confirmarNovoPerfil(p);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  async function analisarPDFParaPreview(arq: File): Promise<PerfilAluno> {
    // O pdf.js é o maior módulo da aplicação e só é necessário quando o aluno
    // realmente escolhe um PDF. Mantê-lo fora do carregamento inicial reduz o
    // custo de abrir o Oásis, sobretudo em redes móveis.
    const { extrairLinhas } = await import("../domain/historico/extrair-pdf-browser");
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
    const cursoDetectado = dadosDoCursoPorMatriz(p.matriz);
    if (cursoDetectado) {
      setPreferencias((prefs) => ({
        ...prefs,
        curso: cursoDetectado.id,
        matriz: String(cursoDetectado.matriz.matriz),
        semestreAtivo: cursoDetectado.ofertas[prefs.semestreAtivo ?? ""]
          ? prefs.semestreAtivo
          : cursoDetectado.semestrePadrao,
      }));
    }
    salvarPerfil(p, preferencias.privado);
    setPerfil(p);
    setCheckinConcluido(true);
    localStorage.setItem(CHAVE_CHECKIN, "true");
    setAba("situacao");
    setAbaSituacao("painel");
  }

  function exportarSavefile() {
    const savefile = criarSavefile({
      perfil,
      preferencias: {
        campus: preferencias.campus,
        curso: preferencias.curso,
        matriz: preferencias.matriz,
        semestreAtivo: preferencias.semestreAtivo,
      },
      cestasPorSemestre: todasCestasPorSemestre,
      exclusoesPorSemestre: todasExclusoesPorSemestre,
      gradeAtiva,
      gradeParaSimulador,
      ritmoSimulador,
      exclusoesSimulador,
    });
    const blob = new Blob([JSON.stringify(savefile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oasis-utfpr-${new Date().toISOString().slice(0, 10)}.oasis.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function analisarSavefile(arquivo: File): Promise<SavefileOasis> {
    return lerSavefile(await arquivo.text());
  }

  function confirmarSavefile(savefile: SavefileOasis) {
    const dados = savefile.dados;
    const perfilImportado = desserializarPerfil(dados.perfil);
    const semestreImportado = dados.preferencias.semestreAtivo ?? "2026-2";
    const cestasImportadas = dados.cestasPorSemestre;
    const cestasDoSemestre = cestasImportadas[semestreImportado] ?? { A: [] };
    const gradeImportada = cestasDoSemestre[dados.gradeAtiva]
      ? dados.gradeAtiva
      : Object.keys(cestasDoSemestre)[0] ?? "A";

    setPreferencias((atuais) => ({
      ...atuais,
      ...dados.preferencias,
      semestreAtivo: semestreImportado,
    }));
    setPerfil(perfilImportado);
    if (perfilImportado) salvarPerfil(perfilImportado, preferencias.privado);
    else {
      localStorage.removeItem(CHAVE_PERFIL);
      sessionStorage.removeItem(CHAVE_PERFIL);
    }
    setCheckinConcluido(true);
    localStorage.setItem(CHAVE_CHECKIN, "true");
    setTodasCestasPorSemestre(cestasImportadas);
    localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(cestasImportadas));
    setTodasExclusoesPorSemestre(dados.exclusoesPorSemestre);
    localStorage.setItem(CHAVE_EXCLUSOES_POR_SEMESTRE, JSON.stringify(dados.exclusoesPorSemestre));
    setGradeAtiva(gradeImportada);
    localStorage.setItem(CHAVE_GRADE_ATIVA, gradeImportada);
    setSelecao(cestasDoSemestre[gradeImportada] ?? []);
    setGradeParaSimulador(dados.gradeParaSimulador);
    if (dados.gradeParaSimulador) {
      localStorage.setItem(CHAVE_GRADE_SIMULADOR, JSON.stringify(dados.gradeParaSimulador));
    } else {
      localStorage.removeItem(CHAVE_GRADE_SIMULADOR);
    }
    setRitmoSimulador(dados.ritmoSimulador);
    setExclusoesSimulador(dados.exclusoesSimulador as ValorExclusoes);
    setAba(perfilImportado ? "situacao" : "planejamento");
    setAbaSituacao("painel");
    setAbaPlanejamento("cursar");
  }

  // O semestre é um contexto de PLANEJAMENTO, não um modo global do site: ele troca
  // as turmas ofertadas e a cesta de grades em montagem, mas não mexe no histórico,
  // no progresso nem no coeficiente — esses vêm do PDF e são sempre o presente real.
  function mudarSemestre(novoSem: string) {
    setPreferencias({ ...preferencias, semestreAtivo: novoSem });
    const novaCesta = todasCestasPorSemestre[novoSem] || { A: [] };
    const chaves = Object.keys(novaCesta);
    const abaDestino = chaves.includes(gradeAtiva) ? gradeAtiva : chaves[0] || "A";
    setGradeAtiva(abaDestino);
    localStorage.setItem(CHAVE_GRADE_ATIVA, abaDestino);
    setSelecao(novaCesta[abaDestino] || []);
  }

  function handleImportarGradeDoSimulador(semestreDestino: string, gradeDestino: string, novaSelecao: SelecaoTurma[]) {
    setPreferencias((p) => ({ ...p, semestreAtivo: semestreDestino }));
    setTodasCestasPorSemestre((prev) => {
      const cestaAtual = prev[semestreDestino] || { A: [] };
      const novaCesta = { ...cestaAtual, [gradeDestino]: novaSelecao };
      const novoTodas = { ...prev, [semestreDestino]: novaCesta };
      localStorage.setItem(CHAVE_CESTAS_POR_SEMESTRE, JSON.stringify(novoTodas));
      if (semestreDestino === "2026-1") {
        localStorage.setItem(CHAVE_CESTA, JSON.stringify(novaCesta));
      }
      return novoTodas;
    });
    setTodasExclusoesPorSemestre((prevTodas) => {
      const atual = prevTodas[semestreDestino] || {};
      const novo = { ...atual, [gradeDestino]: { disciplinas: [], professores: [] } };
      const novoTodas = { ...prevTodas, [semestreDestino]: novo };
      localStorage.setItem(CHAVE_EXCLUSOES_POR_SEMESTRE, JSON.stringify(novoTodas));
      if (semestreDestino === "2026-1") {
        localStorage.setItem(CHAVE_CESTA_EXCLUSOES, JSON.stringify(novo));
      }
      return novoTodas;
    });
    setGradeAtiva(gradeDestino);
    localStorage.setItem(CHAVE_GRADE_ATIVA, gradeDestino);
    setSelecao(novaSelecao);
    setAba("planejamento");
    setAbaPlanejamento("grade");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Caminho de volta da importação: a grade montada no Planejamento vira o
   * primeiro semestre do Simulador de Formatura, e os demais semestres passam a
   * ser calculados a partir dela.
   */
  function handleEnviarGradeParaSimulador(semestreOrigem: string, gradeOrigem: string) {
    const ponteiro = { semestre: semestreOrigem, grade: gradeOrigem };
    setGradeParaSimulador(ponteiro);
    localStorage.setItem(CHAVE_GRADE_SIMULADOR, JSON.stringify(ponteiro));
    setAba("simulador");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDescartarGradeDoSimulador() {
    setGradeParaSimulador(null);
    localStorage.removeItem(CHAVE_GRADE_SIMULADOR);
  }

  function handleContinuarSemRegistro(dados: DadosCheckin) {
    setCheckinConcluido(true);
    localStorage.setItem(CHAVE_CHECKIN, "true");
    // O check-in escolhe curso e matriz separadamente ("eng-comp" + "962"), mas
    // cada matriz é um curso próprio aqui dentro: sem resolver pela matriz, a
    // 962 cairia nos dados da 844.
    const cursoDaMatriz = dadosDoCursoPorMatriz(Number(dados.matriz))?.id ?? dados.curso;
    setPreferencias((p) => ({
      ...p,
      campus: dados.campus,
      curso: cursoDaMatriz,
      matriz: dados.matriz,
    }));
    setAba("planejamento");
    setAbaPlanejamento("cursar");
    // Modo Livre entra direto no Planejamento: a página precisa começar no topo,
    // e não na posição de rolagem herdada do check-in.
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function handleLimparDados() {
    localStorage.clear();
    sessionStorage.removeItem(CHAVE_PERFIL);
    setPerfil(null);
    setCheckinConcluido(false);
    setTodasCestasPorSemestre({ [semestreAtivo]: { A: [] } });
    setTodasExclusoesPorSemestre({ [semestreAtivo]: { A: { disciplinas: [], professores: [] } } });
    setGradeAtiva("A");
    setSelecao([]);
    setPreferencias({ tema: "sistema", layout: "oasis", semestreAtivo: "2026-2" });
    setLayout("oasis");
    setAba("planejamento");
    setAbaPlanejamento("cursar");
    setRitmoSimulador(5);
    setExclusoesSimulador(EXCLUSOES_VAZIAS);
    setGradeParaSimulador(null);
    localStorage.removeItem(CHAVE_GRADE_SIMULADOR);
  }

  function handleTrocarUsuario() {
    localStorage.removeItem(CHAVE_PERFIL);
    sessionStorage.removeItem(CHAVE_PERFIL);
    localStorage.removeItem(CHAVE_CHECKIN);
    setPerfil(null);
    setCheckinConcluido(false);
    setTodasCestasPorSemestre({ [semestreAtivo]: { A: [] } });
    setTodasExclusoesPorSemestre({ [semestreAtivo]: { A: { disciplinas: [], professores: [] } } });
    setGradeAtiva("A");
    setSelecao([]);
    setAba("planejamento");
    setAbaPlanejamento("cursar");
    setRitmoSimulador(5);
    setExclusoesSimulador(EXCLUSOES_VAZIAS);
    setGradeParaSimulador(null);
    localStorage.removeItem(CHAVE_GRADE_SIMULADOR);
  }

  const barraGradeMobileVisivel =
    aba === "planejamento" &&
    abaPlanejamento === "cursar" &&
    !sobreAberta &&
    !giAberta &&
    !comoUsarAberta;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <LogoUTFPR className="h-9 w-9 shrink-0" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-black tracking-tight leading-none">
                <span className="text-utfpr-600 dark:text-utfpr-500">Oásis</span> UTFPR
              </h1>
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {dadosCurso.rotulo} · Câmpus Curitiba · Matriz {matriz.matriz}
            </p>
          </div>
        </div>

        {/* No celular estas ações viram um único botão de menu: eram cinco
            ícones de 32px em duas linhas, abaixo do mínimo de toque, e dois
            deles só mostravam o rótulo no hover. O chip de perfil continua
            visível, porque é contexto e não ação. */}
        <div className="flex items-center gap-2 sm:hidden">
          {perfil ? (
            <span className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-zinc-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:text-zinc-300">
              <IconUser className="h-4 w-4 shrink-0 text-utfpr-600 dark:text-utfpr-500" />
              <span className="truncate">
                {perfil.nome.split(" ")[0]}
                <span className="font-normal text-zinc-400"> · {perfil.periodo}º</span>
              </span>
            </span>
          ) : (
            checkinConcluido && <Badge tom="neutro">Modo Livre</Badge>
          )}
          {/* No celular só o ícone cabe ao lado do chip de perfil e do Menu; o
              rótulo iria empurrar o Menu para uma segunda linha. */}
          {reviewsHabilitadasPara(matriz.matriz) && (
            <button
              type="button"
              onClick={abrirNovidades}
              aria-label="Novidades"
              title="Conheça as avaliações da comunidade"
              className="relative flex h-11 min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-utfpr-500/60 bg-utfpr-500/15 px-3 text-utfpr-800 shadow-2xs active:scale-95 dark:border-utfpr-500/50 dark:text-utfpr-300"
            >
              <IconSparkles className="h-5 w-5 shrink-0" />
              {!novidadesLidas && (
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-utfpr-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-utfpr-600 dark:bg-utfpr-400" />
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuMobileAberto(true)}
            aria-label="Abrir menu"
            className="flex h-11 min-w-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/90 px-3.5 font-display text-sm font-bold text-zinc-700 shadow-2xs active:scale-95 dark:border-zinc-800/80 dark:bg-zinc-900/90 dark:text-zinc-200"
          >
            <IconMenu className="h-5 w-5 shrink-0" />
            <span>Menu</span>
          </button>
        </div>

        <div className="hidden flex-wrap items-center gap-3 sm:flex">
          {/* Controles do Cabeçalho visíveis quando já iniciou a plataforma */}
          {(perfil || checkinConcluido) && (
            <>
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
                    type="button"
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

            {/* Imediatamente à esquerda da estrela, e não no fim da fileira: o
                modal ensina a usar aquele botão, então os dois precisam ser lidos
                juntos. Fica dentro deste bloco por consequência — antes do
                check-in a fileira inteira não existe, e ali a pessoa ainda não
                entrou na plataforma. */}
            {reviewsHabilitadasPara(matriz.matriz) && (
              <button
                type="button"
                onClick={abrirNovidades}
                title="Conheça as avaliações da comunidade"
                className="relative flex h-9 cursor-pointer items-center gap-1.5 rounded-2xl border border-utfpr-500/60 bg-utfpr-500/15 px-3.5 font-display text-sm font-bold text-utfpr-800 shadow-2xs transition-all hover:bg-utfpr-500 hover:text-zinc-950 dark:border-utfpr-500/50 dark:text-utfpr-300 dark:hover:bg-utfpr-400 dark:hover:text-zinc-950"
              >
                <IconSparkles className="h-4 w-4 shrink-0" />
                <span>Novidades</span>
                {!novidadesLidas && (
                  <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-utfpr-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-utfpr-600 dark:bg-utfpr-400" />
                  </span>
                )}
              </button>
            )}

            {/* Avaliar não vive só na tela de progresso: quem quer opinar sobre
                uma matéria antiga precisa de um caminho direto (RF15). */}
            {perfil && reviewsHabilitadasPara(matriz.matriz) && coletaHabilitada() && (
              <BotaoIconeComDica
                dica="Avaliar uma disciplina"
                classe="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                onClick={() => setModalAvaliacoesAberto(true)}
              >
                <IconStar className="h-4 w-4" />
              </BotaoIconeComDica>
            )}
            </>
          )}

          {/* Ajuda e "Sobre" acompanham a engrenagem, mas valem para qualquer
              ambiente: são material do projeto, então aparecem também antes do
              check-in. O "?" revela o rótulo no hover para não pesar o topo. */}
          <BotaoIconeComDica
            dica="Como Usar o Site"
            classe="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            onClick={() => {
              setGiAberta(false);
              setSobreAberta(false);
              setComoUsarAberta(true);
            }}
          >
            <IconHelp className="h-4 w-4" />
          </BotaoIconeComDica>

          <BotaoIconeComDica
            dica="Sobre o Projeto"
            classe="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            onClick={() => {
              setGiAberta(false);
              setComoUsarAberta(false);
              setSobreAberta(true);
            }}
          >
            <IconInfo className="h-4 w-4" />
          </BotaoIconeComDica>
        </div>
      </header>

      {/* Antes de qualquer outro aviso e em qualquer tela, inclusive as de
          material do projeto: o beta é o mesmo código do site, e quem chega por
          um link não teria como saber que está numa cópia de teste. */}
      <AvisoBeta />

      {/* Banner: 2026.2 em Pré-Matrícula (oferta oficial, porém provisória).
          Fica fora do "Sobre", que é material do projeto e não do semestre. */}
      {ehPreMatricula && !sobreAberta && !comoUsarAberta && (
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-500/70 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 p-4.5 text-xs text-zinc-900 shadow-lg dark:border-emerald-500/80 dark:from-emerald-950/90 dark:via-teal-950/80 dark:to-emerald-950/90 dark:text-emerald-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3.5">
              <IconClipboard className="h-4 w-4 shrink-0" />
              <div>
                <div className="font-display text-sm font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-wide flex items-center gap-2">
                  <span>Período de Pré-Matrícula: {semestreAtivo.replace("-", ".")}</span>
                  <span className="inline-flex items-center rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white shadow-2xs">OFERTA OFICIAL PROVISÓRIA</span>
                </div>
                <p className="mt-1 leading-relaxed text-zinc-800 dark:text-zinc-200 text-xs font-semibold">
                  As turmas de <strong className="text-emerald-700 dark:text-emerald-300 underline">{semestreAtivo.replace("-", ".")}</strong> vêm do PDF oficial de <em>Turmas Abertas</em> do Portal do Aluno — são <strong className="text-emerald-700 dark:text-emerald-300 font-black">dados genuínos</strong>, não uma simulação. Como o período ainda não começou, vagas, horários e a lista de turmas <strong className="uppercase">ainda podem mudar</strong> até a matrícula.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Como Usar, Sobre e Gestão da Informação são material do projeto, não do
          aluno: abrem em qualquer ambiente, sem exigir histórico nem sessão. */}
      {comoUsarAberta ? (
        <div className="space-y-5">
          <Botao variante="sutil" onClick={() => setComoUsarAberta(false)}>
            <span>←</span>
            <span>Voltar</span>
          </Botao>
          <TelaComoUsar />
        </div>
      ) : sobreAberta ? (
        <div className="space-y-5">
          <Botao variante="sutil" onClick={() => setSobreAberta(false)}>
            <span>←</span>
            <span>Voltar</span>
          </Botao>
          <TelaSobre
            onAbrirGestaoInformacao={() => {
              setSobreAberta(false);
              setGiAberta(true);
            }}
          />
        </div>
      ) : giAberta ? (
        <div className="space-y-5">
          <Botao variante="sutil" onClick={() => setGiAberta(false)}>
            <span>←</span>
            <span>Voltar ao início</span>
          </Botao>
          <TelaGestaoInformacao />
        </div>
      ) : !perfil && !checkinConcluido ? (
        /* Se não tem perfil nem fez checkin (ou trocou de usuário), mostra Checkin */
        <TelaCheckin
          onProcessarArquivo={processarArquivo}
          onAnalisarSavefile={analisarSavefile}
          onConfirmarSavefile={confirmarSavefile}
          onContinuarSemRegistro={handleContinuarSemRegistro}
          onAbrirGestaoInformacao={() => setGiAberta(true)}
          carregando={carregando}
          erro={erro}
        />
      ) : (
        // Empilha no celular e vira duas colunas no desktop. `SidebarNavegacao`
        // devolve DOIS elementos: o aside do desktop e a barra de abas do
        // mobile. Numa linha flex, essa barra virava uma coluna ao lado do
        // conteúdo e espremia a coluna principal a zero pixel — a página
        // inteira passava a rolar de lado no celular.
        <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
          {/* Menu Lateral (Sidebar Desktop / Mobile Drawer) */}
          <SidebarNavegacao
            abaAtiva={aba}
            onSelecionarAba={(novaAba) => {
              if (novaAba === "situacao" && !perfil) setAbaSituacao("catalogo");
              setAba(novaAba);
            }}
            temPerfil={!!perfil}
            qtdTurmasSelecao={selecao.length}

          />

          {/* coluna principal */}
          <div className="min-w-0 flex-1 w-full">
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
              <div className="space-y-6">
                {/* Sub-navegação em Minha Situação: Resumo, Catálogo e Trilhas */}
                <div className="w-full rounded-3xl border-2 border-zinc-200/90 bg-white/95 p-2 shadow-md backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/95 transition-all">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "painel" as const, rotulo: "Painel Geral", icone: <IconUser className="h-4 w-4" /> },
                      { id: "catalogo" as const, rotulo: "Catálogo", icone: <IconCalendar className="h-4 w-4" /> },
                      { id: "trilhas" as const, rotulo: "Árvore & Trilhas", icone: <span>⚡</span> },
                    ].map((op) => {
                      const ativo = abaSituacao === op.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setAbaSituacao(op.id)}
                          className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 font-display text-xs sm:text-sm font-black transition-all cursor-pointer ${
                            ativo
                              ? "bg-zinc-900 text-utfpr-400 shadow-md ring-2 ring-utfpr-500/40 dark:bg-zinc-800 dark:text-utfpr-400"
                              : "bg-zinc-50/90 text-zinc-700 hover:bg-utfpr-50 dark:bg-zinc-800/60 dark:text-zinc-300"
                          }`}
                        >
                          {op.icone}
                          <span className="truncate">{op.rotulo}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {abaSituacao === "painel" && (
                  <TelaSituacao
                    perfil={perfil}
                    matriz={matriz}
                    onAbrirConfiguracoes={() => setModalConfigAberto(true)}
                    onAbrirCatalogo={(cat) => {
                      setCategoriaCatalogo(cat);
                      setAbaSituacao("catalogo");
                    }}
                  />
                )}

                {abaSituacao === "catalogo" && (
                  <TelaCatalogo
                    perfil={perfil}
                    matriz={matriz}
                    oferta={oferta}
                    categoriaInicial={categoriaCatalogo}
                    onVoltar={() => setAbaSituacao("painel")}
                  />
                )}

                {abaSituacao === "trilhas" && (
                  <TelaFluxograma
                    matriz={matriz}
                    perfil={perfil}
                    ofertas={semestresDisponiveis.map((sem) => todasOfertas[sem]).filter(Boolean)}
                  />
                )}
              </div>
            )}

            {aba === "planejamento" && (
              <div className="space-y-6">
                {/* Contexto de matrícula: o período escolhido vale para as turmas
                    listadas e para a grade em montagem — e só para isso. */}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-3xl border-2 border-zinc-200/90 bg-white/95 px-4 py-3 shadow-md backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/95">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-utfpr-500/20 text-lg">
                      <IconCalendar className="h-5 w-5 text-utfpr-600 dark:text-utfpr-400" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Montando grade para
                      </div>
                      <label
                        className={`relative mt-0.5 inline-flex items-center gap-1.5 rounded-lg border pl-2.5 pr-5 py-0.5 font-mono text-sm font-bold transition-colors cursor-pointer shadow-2xs select-none ${
                          ehPreMatricula
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                            : "border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300 hover:bg-orange-500/25"
                        }`}
                        title="Período letivo usado para listar turmas e montar a grade"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 animate-pulse ${
                            ehPreMatricula ? "bg-emerald-500" : "bg-orange-500"
                          }`}
                        />
                        <select
                          value={semestreAtivo}
                          onChange={(e) => mudarSemestre(e.target.value)}
                          className="cursor-pointer appearance-none bg-transparent font-mono text-sm font-bold text-current focus:outline-none max-sm:min-h-11"
                        >
                          {semestresDisponiveis.map((sem) => {
                            const preMatricula = dadosCurso.semestresPreMatricula.includes(sem);
                            return (
                              <option
                                key={sem}
                                value={sem}
                                className={`bg-white font-bold dark:bg-zinc-900 ${
                                  preMatricula
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-orange-600 dark:text-orange-400"
                                }`}
                              >
                                {sem.replace("-", ".")} ({preMatricula ? "Pré-Matrícula" : "Passado"})
                              </option>
                            );
                          })}
                        </select>
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] opacity-70">▾</span>
                      </label>
                    </div>
                  </div>
                  <p className="max-w-xs text-xs font-medium leading-snug text-zinc-500 dark:text-zinc-400">
                    Vale para as turmas e para a grade desta aba. Seu histórico, progresso e
                    coeficiente continuam no período atual.
                  </p>
                </div>

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
                    onEnviarParaSimulador={
                      SIMULADOR_LIBERADO && perfil
                        ? () => handleEnviarGradeParaSimulador(semestreAtivo, gradeAtiva)
                        : undefined
                    }
                    gradeNoSimulador={
                      gradeParaSimulador?.semestre === semestreAtivo &&
                      gradeParaSimulador?.grade === gradeAtiva
                    }
                  />
                )}
              </div>
            )}

            {aba === "simulador" && SIMULADOR_LIBERADO && perfil && (
              <TelaSimuladorFormatura
                perfil={perfil}
                matriz={matriz}
                ofertas={semestresDisponiveis.map((sem) => todasOfertas[sem]).filter(Boolean)}
                semestreAtivo={semestreAtivo}
                todasCestasPorSemestre={todasCestasPorSemestre}
                onImportarGrade={handleImportarGradeDoSimulador}
                gradeDoPlanejamento={gradeDoPlanejamentoParaSimulador}
                onUsarGradeDoPlanejamento={handleEnviarGradeParaSimulador}
                onDescartarGradeDoPlanejamento={handleDescartarGradeDoSimulador}
                ritmo={ritmoSimulador}
                onMudarRitmo={setRitmoSimulador}
                exclusoes={exclusoesSimulador}
                onMudarExclusoes={setExclusoesSimulador}
              />
            )}

            {aba === "match" && (
              <TelaAmigosMatch
                perfil={perfil}
                selecao={selecao}
                oferta={oferta}
                matriz={matriz}
                onAdicionarOuTrocarTurma={(codDisciplina, codTurma) => {
                  setSelecao((prev) => {
                    const semEssa = prev.filter((i) => i.codDisciplina !== codDisciplina);
                    return [...semEssa, { codDisciplina, codTurma }];
                  });
                }}
              />
            )}
          </div>

          {/* sidebar de feedback contínuo: visível na aba de Planejamento/Posso Cursar */}
          {aba === "planejamento" && abaPlanejamento === "cursar" && (
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

      {/* Apresentação do sistema de avaliações. "Ver avaliações" leva ao
          Planejamento porque é lá que o botão por turma aparece; "Avaliar" só
          existe com histórico, que é o que prova ter cursado a matéria. */}
      <ModalNovidades
        aberto={modalNovidadesAberto}
        onFechar={fecharNovidades}
        onVerAvaliacoes={() => {
          setAba("planejamento");
          setAbaPlanejamento("cursar");
        }}
        onAvaliar={
          perfil && coletaHabilitada() ? () => setModalAvaliacoesAberto(true) : undefined
        }
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
        onExportarSavefile={exportarSavefile}
        onAnalisarSavefile={analisarSavefile}
        onConfirmarSavefile={confirmarSavefile}
        onTrocarUsuario={handleTrocarUsuario}
        onLimparDados={handleLimparDados}
        carregandoPDF={carregando}
      />

      <ModalMinhasAvaliacoes
        aberto={modalAvaliacoesAberto}
        perfil={perfil}
        matriz={matriz}
        onFechar={() => setModalAvaliacoesAberto(false)}
      />

      {/* Barra flutuante inferior para mobile e Bottom Sheet (Gaveta).
          Sobre e Gestão da Informação substituem o conteúdo principal: a barra
          de grade não pode ficar flutuando por cima delas. */}
      {barraGradeMobileVisivel && (
        <>
          <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 lg:hidden">
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
                    {<IconEye className="inline h-4 w-4 shrink-0 align-[-0.2em]" />} Espiando {preview.turma.codigo} ({preview.disciplina.codigo})
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
                className="ml-3 min-h-11 shrink-0 cursor-pointer rounded-xl bg-utfpr-500 px-4 py-2 font-display text-xs font-black text-zinc-950 shadow-md transition-all hover:bg-utfpr-400 active:scale-95"
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
              <div className="relative z-10 flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-3xl border-t border-zinc-200/80 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
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
                    aria-label="Fechar mini-grade"
                    onClick={() => {
                      setMobileGradeDrawerAberto(false);
                      if (preview) setPreview(null);
                    }}
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
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
        Projeto acadêmico independente desenvolvido por e para estudantes da UTFPR — não oficial. Sempre verifique e confirme seus dados no Portal do Aluno da UTFPR.
      </footer>

      {/* contato sempre à mão, em qualquer tela da plataforma */}
      <PilulaFaleConosco barraGradeMobileAtiva={barraGradeMobileVisivel} />

      <PainelMenuMobile
        aberto={menuMobileAberto}
        onFechar={() => setMenuMobileAberto(false)}
        temaAtivo={preferencias.tema}
        onMudarTema={(t) => setPreferencias({ ...preferencias, tema: t })}
        mostrarConfiguracoes={!!perfil || checkinConcluido}
        mostrarAvaliar={
          !!perfil && reviewsHabilitadasPara(matriz.matriz) && coletaHabilitada()
        }
        onAvaliar={() => setModalAvaliacoesAberto(true)}
        onAbrirConfiguracoes={() => setModalConfigAberto(true)}
        onAbrirComoUsar={() => {
          setGiAberta(false);
          setSobreAberta(false);
          setComoUsarAberta(true);
        }}
        onAbrirSobre={() => {
          setGiAberta(false);
          setComoUsarAberta(false);
          setSobreAberta(true);
        }}
      />
    </div>
  );
}
