// Conteúdo do modal de Novidades.
//
// Era JSX cravado dentro do componente, e a chave de leitura vivia em `App.tsx`,
// a mais de mil linhas de distância. Trocar uma sem a outra deixava a novidade
// nova invisível ou a antiga reaparecendo — por isso a versão mora aqui, ao lado
// do conteúdo que ela descreve.

export type IconeNovidade = "aviso" | "calendario" | "check" | "download" | "estrela" | "arquivo";

export interface ItemNovidade {
  /** slug estável: é a key da lista e a âncora dos testes */
  id: string;
  titulo: string;
  /** parágrafo de abertura */
  resumo: string;
  /** bullets; a lista some quando vazia */
  detalhes?: string[];
  icone: IconeNovidade;
  /** o item ganha o amarelo UTFPR em vez do cinza neutro */
  destaque?: boolean;
}

/**
 * Trocar isto re-dispara o modal para toda a base — `App.tsx` monta a chave do
 * `localStorage` a partir daqui, e uma chave nova nunca foi lida por ninguém.
 */
export const VERSAO_NOVIDADES = "planejamento_2027_1_avisos_2026_09_v1";

export const NOVIDADES: ItemNovidade[] = [
  {
    id: "planejamento-2027-1",
    titulo: "Planeje 2027.1 antes da oferta sair",
    icone: "calendario",
    destaque: true,
    resumo:
      "O seletor de período agora abre em 2027.1. A UTFPR só publica o PDF de Turmas Abertas perto da matrícula, então até lá a lista de matérias e horários é a oferta real do último semestre de mesma paridade — 2026.1. Dá para montar a grade, ver choques e mandar tudo ao simulador.",
    detalhes: [
      "O site já abre em 2027.1; um aviso no topo diz de onde vieram as turmas e lembra que elas vão mudar.",
      "2026.2 passou a semestre corrente, em laranja: a oferta dele é oficial, mas a matrícula já passou.",
      "Os semestres anteriores ficaram em cinza, como consulta.",
    ],
  },
  {
    id: "aprovacao-presumida",
    titulo: "As matérias que você está cursando contam no plano",
    icone: "check",
    resumo:
      "As disciplinas em curso aparecem com um marcador, no topo do Simulador de Formatura e em Minha Situação. Marcadas, o planejamento as trata como aprovadas: liberam pré-requisitos, somam carga horária e saem da projeção — que é como você realmente vai estar em 2027.1.",
    detalhes: [
      "Vêm todas marcadas; desmarque as que você acha que não vai passar, sem sair da projeção.",
      "É uma suposição sua: o histórico guardado continua exatamente como o PDF o descreve.",
      "A escolha viaja no savefile, junto das grades.",
    ],
  },
  {
    id: "avisos-flutuantes",
    titulo: "Avisos e conflitos agora aparecem no canto",
    icone: "aviso",
    resumo:
      "Os alertas do Simulador de Formatura saíram do topo da página, onde empurravam a projeção para baixo. Agora chegam como pop-up no canto inferior direito, somem sozinhos e fecham no X. O registro completo continua na página, recolhido.",
    detalhes: [
      "O choque de horário ao adicionar turma deixou de ser janela bloqueante.",
      "Passar o ponteiro sobre o aviso pausa a contagem para dar tempo de ler.",
    ],
  },
  {
    id: "simulador-modelavel",
    titulo: "Simulador modelável, com linha do tempo editável",
    icone: "estrela",
    resumo:
      "A projeção deixou de ser só leitura. Dá para escolher as trilhas-alvo, fixar as matérias que você quer cursar, definir o ritmo semestre a semestre, limitar a janela de aulas do dia e mover, tirar ou acrescentar disciplinas em cada semestre — arrastando, inclusive no celular.",
    detalhes: [
      "Quando um pedido não cabe na integralização, a plataforma explica por quê em vez de ignorá-lo.",
      "Reprovação com média igual ou maior que 4,0 passa a liberar a disciplina seguinte, como na prática da UTFPR.",
      "Matéria adiantada mais de dois períodos deixa de ser sugerida: a matrícula seria recusada.",
      "A busca do Planejamento unificou filtros de turno, horário e grupo curricular.",
    ],
  },
];
