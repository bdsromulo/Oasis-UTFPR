// O calendário da plataforma num lugar só.
//
// Até a virada de 2026.2 o semestre corrente era um literal repetido em quinze
// pontos entre `dadosCurso.ts`, `App.tsx`, `Grade.tsx` e o Simulador, e cada
// virada virava caça ao literal. Aqui ficam as duas datas que mudam por
// semestre e as funções que decidem o que cada semestre significa.
import type { OfertaSemestre } from "./tipos";

/**
 * Semestre em planejamento: ainda não tem PDF de Turmas Abertas publicado, e a
 * lista de matérias vem espelhada da oferta real de mesma paridade.
 */
export const SEMESTRE_PLANEJAMENTO = "2027-1";

/**
 * Semestre letivo em curso. A oferta dele é oficial e já consolidada — não é
 * mais provisória como durante a pré-matrícula, nem histórica como as
 * anteriores.
 */
export const SEMESTRE_CORRENTE = "2026-2";

/**
 * O que um semestre é para o aluno:
 *  - `planejamento`: o próximo, ainda sem oferta publicada;
 *  - `corrente`: o que está acontecendo agora;
 *  - `passado`: os já encerrados, que servem de consulta e de espelho.
 */
export type EstadoSemestre = "planejamento" | "corrente" | "passado";

export interface DescritorSemestre {
  /** chave normalizada, sempre "AAAA-S" */
  semestre: string;
  estado: EstadoSemestre;
  /** como o semestre aparece escrito na interface: "2027.1" */
  rotulo: string;
  /** "Planejamento" | "Corrente" | "Passado" */
  rotuloEstado: string;
  /** a oferta exibida não é a do próprio semestre */
  projetado: boolean;
  /** semestre real de onde as turmas vieram; null quando não é projetado */
  ofertaEspelhada: string | null;
  /** tom da cápsula e do banner: verde, laranja, cinza */
  tom: "ok" | "aviso" | "neutro";
}

/** "2026.2" e "2026-2" são o mesmo semestre; a fonte usa as duas grafias. */
export function chaveSemestre(semestre: string): string {
  return semestre.replace(".", "-");
}

export function ehSemestrePar(semestre: string): boolean {
  return /[-.]2$/.test(semestre);
}

/** "2026-1" -> "2026-2" -> "2027-1" */
export function proximoSemestre(semestre: string): string {
  const [anoStr, semStr] = chaveSemestre(semestre).split("-");
  const ano = parseInt(anoStr, 10) || 2026;
  const sem = parseInt(semStr, 10) || 1;
  return sem === 1 ? `${ano}-2` : `${ano + 1}-1`;
}

export function formatarSemestre(semestre: string): string {
  const [ano, sem] = chaveSemestre(semestre).split("-");
  return `${ano}.${sem}`;
}

export function formatarSemestreExtenso(semestre: string): string {
  const [ano, sem] = chaveSemestre(semestre).split("-");
  return `${sem === "2" ? "2º" : "1º"} semestre de ${ano}`;
}

/**
 * Oferta que serve de espelho para um semestre projetado.
 *
 * A grade que a projeção monta precisa ser concreta o bastante para não colidir
 * consigo mesma, e as únicas turmas que existem são as dos semestres conhecidos.
 * Então cada semestre futuro herda a oferta conhecida mais recente de **mesma
 * paridade**: 2026.2 usa a própria 2026.2, 2027.1 usa 2026.1, 2027.2 volta à
 * 2026.2, 2028.1 à 2026.1, e assim em diante.
 *
 * Sem esse espelho o simulador escolhia disciplinas sem olhar horário e a
 * importação para o Planejamento acusava choque na grade que o próprio
 * simulador havia montado.
 */
export function ofertaReferenciaDoSemestre(
  semestre: string,
  ofertas: OfertaSemestre[],
): OfertaSemestre | null {
  const alvo = chaveSemestre(semestre);
  const exata = ofertas.find((o) => chaveSemestre(o.semestre) === alvo);
  if (exata) return exata;
  const mesmaParidade = ofertas
    .filter((o) => ehSemestrePar(o.semestre) === ehSemestrePar(semestre))
    .sort((a, b) => chaveSemestre(b.semestre).localeCompare(chaveSemestre(a.semestre)));
  return mesmaParidade[0] ?? null;
}

/**
 * Comparação puramente cronológica, independente de qual semestre a plataforma
 * declara como corrente: qualquer coisa depois do corrente é planejamento,
 * qualquer coisa antes é passado.
 */
export function estadoDoSemestre(semestre: string): EstadoSemestre {
  const alvo = chaveSemestre(semestre);
  if (alvo === SEMESTRE_CORRENTE) return "corrente";
  return alvo > SEMESTRE_CORRENTE ? "planejamento" : "passado";
}

const ROTULO_ESTADO: Record<EstadoSemestre, string> = {
  planejamento: "Planejamento",
  corrente: "Corrente",
  passado: "Passado",
};

const TOM_ESTADO: Record<EstadoSemestre, DescritorSemestre["tom"]> = {
  planejamento: "ok",
  corrente: "aviso",
  passado: "neutro",
};

/**
 * Tudo o que a interface precisa saber sobre um semestre para rotulá-lo.
 *
 * `ofertasConhecidas` são só os semestres com PDF publicado — é a partir delas
 * que se descobre se o quadro exibido é o do próprio semestre ou um espelho, e
 * qual espelho. Sem isso a etiqueta "turmas prováveis, baseadas em 2026.1" não
 * teria em que se apoiar.
 */
export function descritorDoSemestre(
  semestre: string,
  ofertasConhecidas: string[],
): DescritorSemestre {
  const alvo = chaveSemestre(semestre);
  const conhecidas = ofertasConhecidas.map(chaveSemestre);
  const estado = estadoDoSemestre(alvo);
  const temOfertaPropria = conhecidas.includes(alvo);

  const espelho = temOfertaPropria
    ? null
    : (conhecidas
        .filter((s) => ehSemestrePar(s) === ehSemestrePar(alvo))
        .sort((a, b) => b.localeCompare(a))[0] ?? null);

  return {
    semestre: alvo,
    estado,
    rotulo: formatarSemestre(alvo),
    rotuloEstado: ROTULO_ESTADO[estado],
    projetado: !temOfertaPropria,
    ofertaEspelhada: espelho,
    tom: TOM_ESTADO[estado],
  };
}
