// Ponte entre o Oásis e o Google Forms.
//
// Três responsabilidades e nada mais: escolher o professor, mostrar o que será
// público e abrir o formulário já preenchido. O que a pessoa responde acontece
// lá — aqui não há envio, nem rascunho, nem estado a guardar.
import { useEffect, useMemo, useState } from "react";
import { construirRoster } from "../../domain/reviews/professores";
import { CURSOS } from "../../domain/dadosCurso";
import { montarUrlDeAvaliacao, type AlvoAvaliacao } from "../../domain/reviews/forms";
import { Botao } from "../componentes";

/** Marca a rota "não está na lista" sem se confundir com "ainda não escolhi". */
const FORA_DO_ELENCO = "__fora__";

export function ModalEnvioForms(props: {
  alvo: AlvoAvaliacao | null;
  autor: string;
  onFechar: () => void;
}) {
  const { alvo, autor, onFechar } = props;
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  // cada abertura recomeça: manter a escolha anterior faria a disciplina nova
  // herdar um professor que talvez nem esteja no elenco dela
  useEffect(() => {
    setEscolhido(null);
    setBusca("");
  }, [alvo?.codigo, alvo?.semestre]);

  useEffect(() => {
    if (!alvo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [alvo, onFechar]);

  const elenco = useMemo(() => {
    if (!alvo) return [];
    return construirRoster(CURSOS).elencoDaDisciplina(alvo.codigo);
  }, [alvo]);

  const filtrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return elenco;
    return elenco.filter((u) => u.nome.toLowerCase().includes(q));
  }, [elenco, busca]);

  if (!alvo) return null;

  const professor =
    escolhido === null || escolhido === FORA_DO_ELENCO
      ? null
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
          Quem deu a disciplina?
        </label>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar professor"
          className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-utfpr-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />

        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {filtrado.map((u) => (
            <button
              key={u.id}
              onClick={() => setEscolhido(u.id)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                escolhido === u.id
                  ? "bg-utfpr-500/30 font-semibold text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {u.nome}
            </button>
          ))}

          {/* Sempre presente, mesmo com a busca vazia: ~14% dos docentes reais não
              constam do elenco das ofertas, e 31% para quem está adiantado. É rota
              comum, e a interface a trata como escolha legítima, não como erro. */}
          <button
            onClick={() => setEscolhido(FORA_DO_ELENCO)}
            className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
              escolhido === FORA_DO_ELENCO
                ? "bg-utfpr-500/30 font-semibold text-zinc-900 dark:text-zinc-100"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            Meu professor não está na lista
            <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
              Você digita o nome no formulário
            </span>
          </button>
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

        <div className="mt-4 flex justify-end gap-2">
          <Botao variante="sutil" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao onClick={abrir} desabilitado={escolhido === null}>
            Abrir formulário
          </Botao>
        </div>
      </div>
    </div>
  );
}
