// Formulário nativo de avaliação da comunidade (Estrategia.md §6.4 e §6.6).
//
// É nativo, e não um formulário de terceiro, por uma razão funcional: a lista de
// professores muda por disciplina, e formulário externo tem campos estáticos.
// Aqui a mesma tela já conhece o histórico, então pré-preenche disciplina,
// semestre e situação, e monta o elenco a partir das ofertas oficiais.
import { useEffect, useMemo, useState } from "react";
import { Botao } from "../componentes";
import { EMAIL_CONTATO } from "./Contato";
import { construirRoster, type UnidadeDocente } from "../../domain/reviews/professores";
import { enviarReview, type EnvioReview } from "../../domain/reviews/envio";
import { coletaHabilitada } from "../../domain/reviews/config";
import {
  CATEGORIAS_TAG,
  DESCRICAO_TAG,
  LIMITE_COMENTARIO,
  MAX_AVALIACOES_NO_SEMESTRE,
  opostaDe,
  type Estrelas,
  type SistemaAvaliativo,
  type Tag,
} from "../../domain/reviews/tipos";
import { IconStar } from "../icons";
import { CURSOS } from "../../domain/dadosCurso";

/** Disciplina concluída que o aluno escolheu avaliar. */
export interface AlvoAvaliacao {
  codigo: string;
  nome: string;
  /** Formato "2025/2", vindo direto do histórico. */
  semestre: string;
  situacao: "aprovado" | "reprovado";
  turma?: string;
}

const SISTEMAS: { id: SistemaAvaliativo; rotulo: string }[] = [
  { id: "provas", rotulo: "Provas síncronas" },
  { id: "trabalhos", rotulo: "Trabalhos" },
  { id: "misto", rotulo: "Misto" },
];

/**
 * Avaliação geral em estrelas.
 *
 * Só a nota geral vira estrela. Nas outras três a escala não é "mais = melhor" —
 * 5 em Dificuldade significa matéria pesada, e estrela ali leria como elogio.
 * Essas seguem numéricas, com a legenda da escala à vista.
 */
function EstrelasGeral(props: { valor: Estrelas | 0; onChange: (v: Estrelas) => void }) {
  const [passando, setPassando] = useState<number>(0);
  const ativo = passando || props.valor;
  const LEGENDA = ["", "Ruim", "Fraca", "Regular", "Boa", "Excelente"];
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 text-center dark:border-zinc-800/80 dark:bg-zinc-950/50">
      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Avaliação geral</div>
      <div
        className="mt-2 flex justify-center gap-1"
        role="radiogroup"
        aria-label="Avaliação geral"
        onMouseLeave={() => setPassando(0)}
      >
        {([1, 2, 3, 4, 5] as Estrelas[]).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={props.valor === n}
            aria-label={`${n} de 5`}
            onMouseEnter={() => setPassando(n)}
            onClick={() => props.onChange(n)}
            className="cursor-pointer p-0.5 transition-transform hover:scale-110"
          >
            <IconStar
              className={`h-8 w-8 ${
                ativo >= n
                  ? "fill-utfpr-500 text-utfpr-500"
                  : "fill-transparent text-zinc-300 dark:text-zinc-700"
              }`}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 h-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {LEGENDA[ativo] ?? ""}
      </div>
    </div>
  );
}

function Estrelinhas(props: {
  rotulo: string;
  ajuda: string;
  valor: Estrelas | 0;
  onChange: (v: Estrelas) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{props.rotulo}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{props.ajuda}</div>
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label={props.rotulo}>
        {([1, 2, 3, 4, 5] as Estrelas[]).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={props.valor === n}
            aria-label={`${n} de 5`}
            onClick={() => props.onChange(n)}
            className={`h-9 w-9 rounded-xl border text-sm font-bold transition-colors ${
              props.valor >= n
                ? "border-utfpr-500/40 bg-utfpr-500 text-zinc-950"
                : "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModalAvaliacao(props: {
  alvo: AlvoAvaliacao | null;
  /** Nome completo (ou social) de quem assina — público, conforme RNF06. */
  autor: string;
  /** Fica só na aba privada da planilha; jamais publicado. */
  ra?: string | null;
  onFechar: () => void;
}) {
  const { alvo, autor, ra, onFechar } = props;

  const [professorId, setProfessorId] = useState("");
  const [naoOfertado, setNaoOfertado] = useState(false);
  const [professorTexto, setProfessorTexto] = useState("");
  const [geral, setGeral] = useState<Estrelas | 0>(0);
  const [didatica, setDidatica] = useState<Estrelas | 0>(0);
  const [dificuldade, setDificuldade] = useState<Estrelas | 0>(0);
  const [cargaTrabalho, setCargaTrabalho] = useState<Estrelas | 0>(0);
  const [avaliacao, setAvaliacao] = useState<SistemaAvaliativo | "">("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [qtdProvas, setQtdProvas] = useState("");
  const [qtdTrabalhos, setQtdTrabalhos] = useState("");
  const [comentario, setComentario] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [enviado, setEnviado] = useState(false);

  // o elenco vem das ofertas de TODOS os cursos: o mesmo docente leciona a mesma
  // matéria em BSI e Eng. Comp., e o acervo é único (§6.10). Cada item é uma
  // UNIDADE: quem dividiu a turma no mesmo horário aparece como uma opção só.
  const elenco: UnidadeDocente[] = useMemo(
    () => (alvo ? construirRoster(CURSOS).elencoDaDisciplina(alvo.codigo) : []),
    [alvo],
  );
  const temDupla = elenco.some((u) => u.nomes.length > 1);

  useEffect(() => {
    if (!alvo) return;
    setProfessorId("");
    setNaoOfertado(false);
    setProfessorTexto("");
    setGeral(0);
    setDidatica(0);
    setDificuldade(0);
    setCargaTrabalho(0);
    setAvaliacao("");
    setTags([]);
    setDetalheAberto(false);
    setQtdProvas("");
    setQtdTrabalhos("");
    setComentario("");
    setConsentimento(false);
    setErros([]);
    setEnviado(false);
  }, [alvo]);

  useEffect(() => {
    if (!alvo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [alvo, onFechar]);

  if (!alvo) return null;

  /**
   * Trocar o sistema avaliativo limpa o detalhamento que deixa de fazer sentido.
   *
   * Sem isso, quem preenche "3 trabalhos" e depois muda para "Provas" enviaria um
   * número de trabalhos que o formulário nem mostra mais — dado fantasma, invisível
   * para quem o produziu.
   */
  function escolherSistema(s: SistemaAvaliativo) {
    setAvaliacao(s);
    if (s === "provas") setQtdTrabalhos("");
    if (s === "trabalhos") setQtdProvas("");
  }

  const mostraProvas = avaliacao === "provas" || avaliacao === "misto";
  const mostraTrabalhos = avaliacao === "trabalhos" || avaliacao === "misto";

  function alternarTag(t: Tag) {
    setTags((atual) => {
      if (atual.includes(t)) return atual.filter((x) => x !== t);
      // marcar uma tag desmarca a oposta: "acessível" e "pouco acessível" juntas
      // não são opinião matizada, são dado incoerente
      const oposta = opostaDe(t);
      const limpo = oposta ? atual.filter((x) => x !== oposta) : atual;
      return [...limpo, t];
    });
  }

  async function submeter() {
    setEnviando(true);
    setErros([]);
    const dados: EnvioReview = {
      codigo: alvo!.codigo,
      semestre: alvo!.semestre,
      situacao: alvo!.situacao,
      turma: alvo!.turma,
      professorId: naoOfertado ? undefined : professorId || undefined,
      professorTexto: naoOfertado ? professorTexto.trim() || undefined : undefined,
      autor,
      ra: ra ?? undefined,
      geral: geral as Estrelas,
      didatica: didatica as Estrelas,
      dificuldade: dificuldade as Estrelas,
      cargaTrabalho: cargaTrabalho as Estrelas,
      avaliacao: avaliacao as SistemaAvaliativo,
      // campo vazio é "não informado", e não zero — por isso undefined
      qtdProvas: qtdProvas === "" ? undefined : Number(qtdProvas),
      qtdTrabalhos: qtdTrabalhos === "" ? undefined : Number(qtdTrabalhos),
      tags,
      comentario: comentario.trim(),
      consentimento,
    };
    const r = await enviarReview(dados);
    setEnviando(false);
    if (r.ok) setEnviado(true);
    else setErros(r.erros);
  }

  const restantes = LIMITE_COMENTARIO - comentario.length;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 fade-in backdrop-blur-xs duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-avaliacao"
      onClick={onFechar}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg animate-in overflow-y-auto rounded-3xl border border-zinc-200/80 bg-white p-6 text-left shadow-2xl zoom-in-95 duration-150 dark:border-zinc-800/80 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="titulo-avaliacao"
          className="font-display text-lg font-black tracking-tight text-zinc-900 dark:text-white"
        >
          Avaliar {alvo.nome}
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-mono">{alvo.codigo}</span> · cursada em {alvo.semestre} ·{" "}
          {alvo.situacao === "aprovado" ? "aprovada" : "reprovada"}
        </p>

        {enviado ? (
          <div className="mt-6">
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
              Avaliação enviada. Ela passa por curadoria antes de aparecer para as outras
              pessoas — normalmente na revisão semanal.
            </p>
            <div className="mt-5 flex justify-end">
              <Botao onClick={onFechar} variante="primario">
                Fechar
              </Botao>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* professor */}
            <div>
              <label
                htmlFor="professor-avaliacao"
                className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Com quem você cursou?
              </label>
              {!naoOfertado ? (
                <>
                  <select
                    id="professor-avaliacao"
                    value={professorId}
                    onChange={(e) => setProfessorId(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">Selecione…</option>
                    {elenco.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                  {temDupla && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      Turmas divididas aparecem como <strong>Fulano / Sicrano</strong>: quem
                      deu a mesma turma no mesmo horário é avaliado em conjunto, porque a
                      experiência foi da dupla.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setNaoOfertado(true)}
                    className="mt-2 cursor-pointer text-xs font-semibold text-utfpr-700 underline underline-offset-2 dark:text-utfpr-500"
                  >
                    Meu professor não está na lista
                  </button>
                </>
              ) : (
                <div className="mt-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3">
                  <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
                    Selecionar esta opção significa que o seu professor{" "}
                    <strong>não consta na oferta atual nem na mais recente</strong> desta
                    disciplina. Confirme se é esse o caso — se não for, fale com a gente pelo{" "}
                    <a
                      className="underline underline-offset-2"
                      href={`mailto:${EMAIL_CONTATO}`}
                    >
                      {EMAIL_CONTATO}
                    </a>
                    . O nome digitado passa por conferência antes de a avaliação aparecer.
                  </p>
                  <input
                    type="text"
                    value={professorTexto}
                    onChange={(e) => setProfessorTexto(e.target.value)}
                    placeholder="Nome completo do professor"
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNaoOfertado(false);
                      setProfessorTexto("");
                    }}
                    className="mt-2 cursor-pointer text-xs font-semibold text-zinc-600 underline underline-offset-2 dark:text-zinc-300"
                  >
                    Voltar para a lista
                  </button>
                </div>
              )}
            </div>

            {/* avaliação geral: seção própria, em estrelas */}
            <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
              <EstrelasGeral valor={geral} onChange={setGeral} />
            </div>

            {/* classificações específicas: numéricas, porque a escala não é
                "mais = melhor" em Dificuldade nem em Carga */}
            <div className="space-y-3 border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Classificações específicas
              </div>
              <Estrelinhas rotulo="Didática" ajuda="1 = ruim, 5 = excelente" valor={didatica} onChange={setDidatica} />
              <Estrelinhas rotulo="Dificuldade" ajuda="1 = fácil, 5 = difícil" valor={dificuldade} onChange={setDificuldade} />
              <Estrelinhas rotulo="Carga de trabalho" ajuda="1 = pouca, 5 = muita" valor={cargaTrabalho} onChange={setCargaTrabalho} />
            </div>

            {/* sistema avaliativo */}
            <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Como a nota era composta?
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SISTEMAS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => escolherSistema(s.id)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                      avaliacao === s.id
                        ? "border-utfpr-500/40 bg-utfpr-500 text-zinc-950"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    {s.rotulo}
                  </button>
                ))}
              </div>
            </div>

            {/* detalhamento opcional da composição da nota */}
            <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
              <button
                type="button"
                onClick={() => setDetalheAberto((v) => !v)}
                aria-expanded={detalheAberto}
                className="flex w-full cursor-pointer items-center justify-between text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                <span>
                  Detalhamento{" "}
                  <span className="font-normal text-zinc-400">· opcional</span>
                </span>
                <span className="text-xs text-zinc-400">{detalheAberto ? "▲" : "▼"}</span>
              </button>
              {detalheAberto && !avaliacao && (
                <p className="mt-3 rounded-xl border border-zinc-200/70 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-950/50 dark:text-zinc-300">
                  Escolha acima como a nota era composta — os campos aqui dependem disso.
                </p>
              )}
              {detalheAberto && avaliacao && (
                <div className={`mt-3 grid gap-3 ${avaliacao === "misto" ? "grid-cols-2" : "grid-cols-1"}`}>
                  {/* os campos seguem o sistema avaliativo: perguntar quantas provas
                      a quem marcou "Trabalhos" só produz resposta sem sentido */}
                  {[
                    ...(mostraProvas
                      ? [{ rotulo: "Quantas provas?", valor: qtdProvas, set: setQtdProvas, id: "qtd-provas" }]
                      : []),
                    ...(mostraTrabalhos
                      ? [{ rotulo: "Quantos trabalhos?", valor: qtdTrabalhos, set: setQtdTrabalhos, id: "qtd-trabalhos" }]
                      : []),
                  ].map((campo) => (
                    <div key={campo.id}>
                      <label htmlFor={campo.id} className="text-xs text-zinc-600 dark:text-zinc-300">
                        {campo.rotulo}
                      </label>
                      <input
                        id={campo.id}
                        type="number"
                        min={0}
                        max={MAX_AVALIACOES_NO_SEMESTRE}
                        inputMode="numeric"
                        value={campo.valor}
                        onChange={(e) => campo.set(e.target.value)}
                        placeholder="—"
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>
                  ))}
                  <p className="col-span-full text-[11px] text-zinc-500 dark:text-zinc-400">
                    Deixar em branco significa "não informado" — diferente de zero.
                  </p>
                </div>
              )}
            </div>

            {/* tags, agrupadas por natureza */}
            <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                O que descreve a experiência?
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Opcional. Passe o mouse para ver o que cada uma quer dizer. Marcar uma
                opção desmarca a que a contradiz.
              </p>
              <div className="mt-3 space-y-3">
                {CATEGORIAS_TAG.map((cat) => (
                  <div key={cat.id}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {cat.rotulo}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {cat.tags.map((t) => {
                        const oposta = opostaDe(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            aria-pressed={tags.includes(t)}
                            title={
                              DESCRICAO_TAG[t].comportamento +
                              (oposta ? `\n(exclui "${DESCRICAO_TAG[oposta].rotulo}")` : "")
                            }
                            onClick={() => alternarTag(t)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                              tags.includes(t)
                                ? "border-utfpr-500/40 bg-utfpr-500/20 text-zinc-900 dark:text-zinc-100"
                                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            {DESCRICAO_TAG[t].rotulo}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* comentário */}
            <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800/70">
              <label
                htmlFor="comentario-avaliacao"
                className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Comentário
              </label>
              <textarea
                id="comentario-avaliacao"
                value={comentario}
                onChange={(e) => setComentario(e.target.value.slice(0, LIMITE_COMENTARIO))}
                rows={4}
                placeholder="O que ajudaria alguém decidindo se pega essa turma?"
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <div className="mt-1 text-right text-xs text-zinc-400">{restantes} restantes</div>
            </div>

            {/* consentimento — RNF07 */}
            <label className="flex items-start gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={consentimento}
                onChange={(e) => setConsentimento(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>
                Entendo que esta avaliação será <strong>pública e assinada com meu nome</strong> (
                {autor}), com a finalidade de ajudar outros estudantes a escolher turmas. Sei que a
                publicação fica registrada no histórico do repositório e que retirá-la a remove das
                publicações seguintes, mas não do histórico já versionado. Meu RA não é publicado.
              </span>
            </label>

            {erros.length > 0 && (
              <ul className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-800 dark:text-red-300">
                {erros.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            )}

            {!coletaHabilitada() && (
              <p className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-300">
                A coleta de avaliações ainda não foi ativada nesta instalação.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Botao onClick={onFechar} variante="sutil">
                Cancelar
              </Botao>
              <Botao
                onClick={submeter}
                variante="primario"
                desabilitado={enviando || !coletaHabilitada()}
              >
                {enviando ? "Enviando…" : "Enviar avaliação"}
              </Botao>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
