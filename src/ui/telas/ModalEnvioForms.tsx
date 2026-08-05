// Ponte entre o Oásis e o Google Forms.
//
// Três responsabilidades e nada mais: escolher o professor, mostrar o que será
// público e abrir o formulário já preenchido. O que a pessoa responde acontece
// lá — aqui não há envio, nem rascunho, nem estado a guardar.
import { useEffect, useMemo, useState } from "react";
import { construirRoster, idDaUnidade } from "../../domain/reviews/professores";
import { CURSOS } from "../../domain/dadosCurso";
import { montarUrlDeAvaliacao, type AlvoAvaliacao } from "../../domain/reviews/forms";
import { Botao } from "../componentes";
import { IconWarning } from "../icons";

/** Marca a rota "não está na lista" sem se confundir com "ainda não escolhi". */
const FORA_DO_ELENCO = "__fora__";
const PROFESSOR_DO_HISTORICO = "__historico__";
const ROSTER = construirRoster(CURSOS);

/**
 * Uma opção da lista de professores.
 *
 * Desenhada como rádio, e não como linha de texto clicável: a escolha é
 * obrigatória e excludente, e sem a marca redonda a lista se lia como legenda —
 * dava para ficar olhando sem perceber que era preciso escolher.
 */
function OpcaoProfessor(props: {
  rotulo: string;
  auxiliar?: string;
  marcada: boolean;
  onEscolher: () => void;
}) {
  const { rotulo, auxiliar, marcada, onEscolher } = props;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      onClick={onEscolher}
      className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
        marcada
          ? "border-utfpr-500 bg-utfpr-500/15 dark:border-utfpr-500 dark:bg-utfpr-500/10"
          : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
          marcada
            ? "border-utfpr-600 dark:border-utfpr-400"
            : "border-zinc-300 dark:border-zinc-600"
        }`}
      >
        {marcada && <span className="h-2 w-2 rounded-full bg-utfpr-600 dark:bg-utfpr-400" />}
      </span>
      <span className="min-w-0">
        <span
          className={`block text-sm ${
            marcada
              ? "font-semibold text-zinc-900 dark:text-zinc-100"
              : "text-zinc-700 dark:text-zinc-200"
          }`}
        >
          {rotulo}
        </span>
        {auxiliar && (
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{auxiliar}</span>
        )}
      </span>
    </button>
  );
}

export function ModalEnvioForms(props: {
  alvo: AlvoAvaliacao | null;
  autor: string;
  onFechar: () => void;
}) {
  const { alvo, autor, onFechar } = props;
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const elenco = useMemo(() => {
    if (!alvo) return [];
    return ROSTER.elencoDaDisciplina(alvo.codigo);
  }, [alvo]);
  const idDoHistorico = alvo?.professoresHistorico?.length
    ? idDaUnidade(alvo.professoresHistorico)
    : null;
  const professorDoHistoricoForaDoElenco =
    !!idDoHistorico && !elenco.some((unidade) => unidade.id === idDoHistorico);

  // cada abertura recomeça: manter a escolha anterior faria a disciplina nova
  // herdar um professor que talvez nem esteja no elenco dela
  useEffect(() => {
    setEscolhido(
      idDoHistorico && !professorDoHistoricoForaDoElenco
        ? idDoHistorico
        : idDoHistorico
          ? PROFESSOR_DO_HISTORICO
          : null,
    );
    setBusca("");
  }, [alvo?.codigo, alvo?.semestre, idDoHistorico, professorDoHistoricoForaDoElenco]);

  useEffect(() => {
    if (!alvo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [alvo, onFechar]);

  const filtrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return elenco;
    return elenco.filter((u) => u.nome.toLowerCase().includes(q));
  }, [elenco, busca]);

  if (!alvo) return null;

  const professor =
    escolhido === null || escolhido === FORA_DO_ELENCO
      ? null
      : escolhido === PROFESSOR_DO_HISTORICO
        ? (alvo.professoresHistorico?.join(" / ") ?? null)
        : (elenco.find((u) => u.id === escolhido)?.nome ?? null);

  function abrir() {
    window.open(montarUrlDeAvaliacao(alvo!, autor, professor), "_blank", "noopener");
    onFechar();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Avaliar {alvo.nome}
        </h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
          <span className="font-mono font-bold">{alvo.codigo}</span> · cursada em{" "}
          {alvo.semestre}
        </p>

        <label className="mt-4 block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Quem deu a disciplina?{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            Escolha uma opção
          </span>
        </label>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar professor"
          className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-utfpr-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />

        <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto p-0.5" role="radiogroup">
          {alvo.professoresHistorico?.length && professorDoHistoricoForaDoElenco && (
            <OpcaoProfessor
              rotulo={alvo.professoresHistorico.join(" / ")}
              auxiliar="Professor identificado no seu histórico"
              marcada={escolhido === PROFESSOR_DO_HISTORICO}
              onEscolher={() => setEscolhido(PROFESSOR_DO_HISTORICO)}
            />
          )}
          {filtrado.map((u) => (
            <OpcaoProfessor
              key={u.id}
              rotulo={u.nome}
              marcada={escolhido === u.id}
              onEscolher={() => setEscolhido(u.id)}
            />
          ))}

          {/* Sempre presente, mesmo com a busca vazia: ~14% dos docentes reais não
              constam do elenco das ofertas, e 31% para quem está adiantado. É rota
              comum, e a interface a trata como escolha legítima, não como erro. */}
          <OpcaoProfessor
            rotulo="Meu professor não está na lista"
            auxiliar="Você digita o nome no formulário"
            marcada={escolhido === FORA_DO_ELENCO}
            onEscolher={() => setEscolhido(FORA_DO_ELENCO)}
          />
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            O que fica público na sua avaliação
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            Seu nome (<strong>{autor}</strong>), a disciplina, o semestre, o professor e
            o que você escrever. Seu e-mail institucional é usado só para confirmar que
            você é da UTFPR e <strong>não</strong> é publicado; seu RA e suas notas
            também não.
          </p>
        </div>

        {/* O prefill não trava campo: o Forms deixa editar tudo antes de enviar.
            Quem corrige "para melhorar" o código ou o semestre derruba a própria
            resposta na validação da ingestão, e o erro só aparece dias depois,
            quando a avaliação não sai. O aviso é o único ponto onde dá para
            evitar isso, então ele vem antes do botão e em tom de alerta. */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/80 p-3 dark:border-amber-800/80 dark:bg-amber-950/40">
          <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            <p className="font-bold">O formulário abre já preenchido. Não altere esses campos.</p>
            <p className="mt-1">
              Seu nome, o código, o nome da disciplina, o semestre e o professor chegam prontos
              do Oásis. Editar qualquer um deles faz a resposta ser recusada na hora de publicar,
              e você só descobre quando a avaliação não aparecer. Responda apenas as notas e o
              comentário.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Botao variante="sutil" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao onClick={abrir} desabilitado={escolhido === null}>
            Abrir formulário preenchido
          </Botao>
        </div>
      </div>
    </div>
  );
}
