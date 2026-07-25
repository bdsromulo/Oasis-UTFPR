/**
 * Ilustrações do manual ("Como Usar o Site").
 *
 * São SVG inline, e não capturas de tela, de propósito: acompanham o tema claro
 * e escuro pelas próprias classes do Tailwind, não pesam no bundle, não quebram
 * a Content-Security-Policy (que só aceita imagem de mesma origem) e não
 * envelhecem a cada ajuste de layout da interface.
 *
 * Convenções: `fill-*`/`stroke-*` com variante `dark:` em vez de cor fixa, e
 * texto curto — o diagrama explica a forma, o parágrafo ao lado explica o resto.
 */

/** Caixa retangular com rótulo, reaproveitada pelos três diagramas. */
function Caixa(props: {
  x: number;
  y: number;
  w: number;
  h: number;
  destaque?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <rect
        x={props.x}
        y={props.y}
        width={props.w}
        height={props.h}
        rx="10"
        className={
          props.destaque
            ? "fill-utfpr-500/20 stroke-utfpr-600/70 dark:fill-utfpr-500/15 dark:stroke-utfpr-500/60"
            : "fill-zinc-100 stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-700"
        }
        strokeWidth="1.5"
      />
      {props.children}
    </>
  );
}

/** Seta horizontal simples entre dois pontos. */
function Seta(props: { x1: number; x2: number; y: number }) {
  return (
    <g className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth="1.8">
      <line x1={props.x1} y1={props.y} x2={props.x2 - 6} y2={props.y} strokeLinecap="round" />
      <polyline
        points={`${props.x2 - 11},${props.y - 4.5} ${props.x2 - 5},${props.y} ${props.x2 - 11},${props.y + 4.5}`}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

const TITULO = "font-display text-[13px] font-bold fill-zinc-900 dark:fill-zinc-100";
const CORPO = "text-[11px] fill-zinc-600 dark:fill-zinc-400";
const ETIQUETA = "font-display text-[10px] font-black uppercase tracking-wider";

/**
 * Caminho do histórico: o PDF entra, mas o processamento inteiro fica dentro do
 * navegador — a moldura tracejada é o ponto do desenho.
 */
export function IlustracaoFluxoHistorico() {
  return (
    <svg
      viewBox="0 0 720 210"
      role="img"
      aria-label="O PDF do histórico é lido dentro do próprio navegador: o parser extrai as linhas, elas viram disciplinas, notas e situação, e o motor cruza tudo com a matriz do curso. Nada é enviado para fora."
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* moldura: o navegador do aluno */}
      <rect
        x="104" y="8" width="608" height="150" rx="16"
        className="fill-emerald-500/5 stroke-emerald-500/60 dark:fill-emerald-500/10"
        strokeWidth="1.8" strokeDasharray="7 5"
      />
      <text x="118" y="28" className={`${ETIQUETA} fill-emerald-700 dark:fill-emerald-400`}>
        dentro do seu navegador
      </text>

      {/* PDF de entrada */}
      <Caixa x={8} y={52} w={80} h={62}>
        <path
          d="M32 68h20l10 10v26a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4V72a4 4 0 0 1 4-4z"
          className="fill-none stroke-zinc-500 dark:stroke-zinc-400" strokeWidth="1.8" strokeLinejoin="round"
        />
        <text x="48" y="130" textAnchor="middle" className={CORPO}>seu PDF</text>
      </Caixa>
      <Seta x1={90} x2={128} y={83} />

      {/* etapas */}
      <Caixa x={128} y={44} w={172} h={78} destaque>
        <text x="214" y="72" textAnchor="middle" className={TITULO}>1. Parser</text>
        <text x="214" y="92" textAnchor="middle" className={CORPO}>lê o PDF e reconstrói</text>
        <text x="214" y="107" textAnchor="middle" className={CORPO}>as linhas da tabela</text>
      </Caixa>
      <Seta x1={302} x2={332} y={83} />

      <Caixa x={332} y={44} w={172} h={78}>
        <text x="418" y="72" textAnchor="middle" className={TITULO}>2. Dados</text>
        <text x="418" y="92" textAnchor="middle" className={CORPO}>disciplinas, notas,</text>
        <text x="418" y="107" textAnchor="middle" className={CORPO}>situação e resumos</text>
      </Caixa>
      <Seta x1={506} x2={536} y={83} />

      <Caixa x={536} y={44} w={168} h={78}>
        <text x="620" y="72" textAnchor="middle" className={TITULO}>3. Motor</text>
        <text x="620" y="92" textAnchor="middle" className={CORPO}>cruza com a matriz</text>
        <text x="620" y="107" textAnchor="middle" className={CORPO}>e o PPC do curso</text>
      </Caixa>

      {/* saída */}
      <line
        x1="620" y1="158" x2="620" y2="176"
        className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth="1.8" strokeLinecap="round"
      />
      <polyline
        points="615.5,171 620,177 624.5,171"
        className="stroke-zinc-400 dark:stroke-zinc-600" fill="none"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      <text x="620" y="196" textAnchor="middle" className={`${TITULO}`}>as suas telas</text>

      {/* o ponto do desenho: a seta de saída não existe */}
      <g className="stroke-red-500/80" strokeWidth="2" strokeLinecap="round">
        <circle cx="20" cy="170" r="8" className="fill-none" />
        <line x1="14.5" y1="175.5" x2="25.5" y2="164.5" />
      </g>
      <text x="36" y="175" className={`${ETIQUETA} fill-red-600 dark:fill-red-400`}>
        nada sai daqui
      </text>
    </svg>
  );
}

/**
 * As cinco fontes: quatro públicas e versionadas, uma privada e local. A
 * assimetria é o que o desenho precisa deixar claro.
 */
export function IlustracaoFontes() {
  const publicas = [
    "Vivências da comunidade",
    "Projetos Pedagógicos (PPCs)",
    "Matrizes curriculares",
    "Turmas Abertas do Portal",
  ];
  return (
    <svg
      viewBox="0 0 720 260"
      role="img"
      aria-label="Quatro fontes públicas — vivências da comunidade, projetos pedagógicos, matrizes curriculares e turmas abertas — ficam no repositório e alimentam o Oásis. O seu histórico entra por fora, direto no seu navegador, e não é enviado a lugar nenhum."
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* bloco público */}
      <rect
        x="6" y="6" width="286" height="180" rx="14"
        className="fill-zinc-100/60 stroke-zinc-300 dark:fill-zinc-800/40 dark:stroke-zinc-700"
        strokeWidth="1.5"
      />
      <text x="20" y="26" className={`${ETIQUETA} fill-zinc-500 dark:fill-zinc-400`}>
        públicas · no repositório
      </text>
      {publicas.map((nome, i) => (
        <g key={nome}>
          <Caixa x={20} y={38 + i * 36} w={258} h={28} />
          <text x={34} y={57 + i * 36} className={CORPO}>{nome}</text>
        </g>
      ))}

      {/* histórico: privado */}
      <rect
        x="6" y="196" width="286" height="56" rx="14"
        className="fill-emerald-500/10 stroke-emerald-500/60" strokeWidth="1.8" strokeDasharray="7 5"
      />
      <text x="20" y="216" className={`${ETIQUETA} fill-emerald-700 dark:fill-emerald-400`}>
        privado · só no seu navegador
      </text>
      <text x="20" y="238" className={`${TITULO}`}>O seu Histórico Escolar</text>

      {/* convergência */}
      <Seta x1={292} x2={356} y={96} />
      <Seta x1={292} x2={356} y={224} />

      <Caixa x={356} y={76} w={150} h={96} destaque>
        <text x="431" y="118" textAnchor="middle" className={TITULO}>Oásis</text>
        <text x="431" y="138" textAnchor="middle" className={CORPO}>cruza tudo</text>
        <text x="431" y="153" textAnchor="middle" className={CORPO}>no seu navegador</text>
      </Caixa>

      <Seta x1={508} x2={556} y={124} />
      <Caixa x={556} y={76} w={156} h={96}>
        <text x="634" y="112" textAnchor="middle" className={TITULO}>O que você vê</text>
        <text x="634" y="132" textAnchor="middle" className={CORPO}>situação, elegibilidade,</text>
        <text x="634" y="147" textAnchor="middle" className={CORPO}>grade e projeção</text>
      </Caixa>
    </svg>
  );
}

/** Os três estados de um semestre e de onde vem a oferta de cada um. */
export function IlustracaoSemestres() {
  const etapas = [
    {
      titulo: "Semestres anteriores",
      fonte: "Grade na Hora",
      nota: "referência histórica",
      cor: "zinc" as const,
    },
    {
      titulo: "Semestre corrente",
      fonte: "Portal do Aluno",
      nota: "oferta consolidada",
      cor: "zinc" as const,
    },
    {
      titulo: "Próximo semestre",
      fonte: "Portal do Aluno",
      nota: "ainda pode mudar",
      cor: "emerald" as const,
    },
  ];
  return (
    <svg
      viewBox="0 0 720 150"
      role="img"
      aria-label="Semestres anteriores vêm do Grade na Hora, como referência histórica. O semestre corrente e o próximo vêm do Portal do Aluno; o próximo está em pré-matrícula e ainda pode mudar."
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        x1="16" y1="118" x2="704" y2="118"
        className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="2" strokeLinecap="round"
      />
      {etapas.map((e, i) => {
        const x = 16 + i * 236;
        const destaque = e.cor === "emerald";
        return (
          <g key={e.titulo}>
            <rect
              x={x} y="12" width="216" height="86" rx="12"
              className={
                destaque
                  ? "fill-emerald-500/10 stroke-emerald-500/70"
                  : "fill-zinc-100 stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-700"
              }
              strokeWidth="1.6"
            />
            <text x={x + 16} y="36" className={TITULO}>{e.titulo}</text>
            <text
              x={x + 16} y="58"
              className={`${ETIQUETA} ${
                destaque ? "fill-emerald-700 dark:fill-emerald-400" : "fill-zinc-500 dark:fill-zinc-400"
              }`}
            >
              {e.fonte}
            </text>
            <text x={x + 16} y="80" className={CORPO}>{e.nota}</text>
            <circle
              cx={x + 108} cy="118" r="6"
              className={
                destaque
                  ? "fill-emerald-500 stroke-emerald-600"
                  : "fill-zinc-300 stroke-zinc-400 dark:fill-zinc-600 dark:stroke-zinc-500"
              }
              strokeWidth="1.5"
            />
            <text
              x={x + 108} y="142" textAnchor="middle"
              className={`${ETIQUETA} ${
                destaque ? "fill-emerald-700 dark:fill-emerald-400" : "fill-zinc-400 dark:fill-zinc-500"
              }`}
            >
              {destaque ? "pré-matrícula" : "fechado"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
