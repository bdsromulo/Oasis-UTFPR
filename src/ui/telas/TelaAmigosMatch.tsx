import { useMemo, useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno, Horario } from "../../domain/tipos";
import type { SelecaoTurma } from "../App";
import {
  codificarGradeParaShare,
  decodificarGradeDeShare,
} from "../../domain/social/compartilhamento";
import {
  calcularMatchSocial,
  type ResultadoComparacaoSocial,
} from "../../domain/social/comparador";
import { Badge, Botao, Card } from "../componentes";
import { faixaDoSlot } from "../../domain/horarios";

const DIAS_EXTENSOS: Record<number, string> = {
  2: "Segunda-Feira",
  3: "Terça-Feira",
  4: "Quarta-Feira",
  5: "Quinta-Feira",
  6: "Sexta-Feira",
  7: "Sábado",
};

function toMinutos(hr: string): number {
  const [h, m] = hr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function resumirHorariosPorDia(horarios: Horario[]): { diaNome: string; intervalo: string; salas: string }[] {
  const porDia = new Map<number, Horario[]>();
  for (const h of horarios) {
    if (!porDia.has(h.dia)) porDia.set(h.dia, []);
    porDia.get(h.dia)!.push(h);
  }

  const diasOrdenados = Array.from(porDia.keys()).sort((a, b) => a - b);
  return diasOrdenados.map((dia) => {
    const slots = porDia.get(dia)!;
    let minInicio = "23:59";
    let maxFim = "00:00";

    for (const s of slots) {
      const f = faixaDoSlot(s.turno, s.aula);
      if (f) {
        if (toMinutos(f.inicio) < toMinutos(minInicio)) minInicio = f.inicio;
        if (toMinutos(f.fim) > toMinutos(maxFim)) maxFim = f.fim;
      }
    }

    const intervalo =
      minInicio !== "23:59" && maxFim !== "00:00"
        ? `${minInicio} - ${maxFim}`
        : slots.map((s) => `${s.turno}${s.aula}`).join(", ");
    const salas = Array.from(new Set(slots.map((s) => s.sala || "A defin."))).join(", ");
    return {
      diaNome: DIAS_EXTENSOS[dia] || `Dia ${dia}`,
      intervalo,
      salas,
    };
  });
}

interface TelaAmigosMatchProps {
  perfil: PerfilAluno | null;
  selecao: SelecaoTurma[];
  oferta: OfertaSemestre;
  matriz: Matriz;
  onAdicionarOuTrocarTurma: (codDisciplina: string, codTurma: string) => void;
}

export function TelaAmigosMatch({
  perfil,
  selecao,
  oferta,
  matriz,
  onAdicionarOuTrocarTurma,
}: TelaAmigosMatchProps) {
  const [codigoInput, setCodigoInput] = useState("");
  const [nomeApelido, setNomeApelido] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [resultado, setResultado] = useState<ResultadoComparacaoSocial | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const meuCodigo = useMemo(
    () => codificarGradeParaShare(perfil, selecao, nomeApelido),
    [perfil, selecao, nomeApelido],
  );

  function handleCopiar() {
    navigator.clipboard.writeText(meuCodigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  function handleComparar() {
    setErro(null);
    if (!codigoInput.trim()) {
      setErro("Cole o código do seu amigo para calcular a compatibilidade.");
      return;
    }

    const payload = decodificarGradeDeShare(codigoInput);
    if (!payload) {
      setErro("Código Oásis inválido ou corrompido. Verifique com seu amigo e tente novamente.");
      return;
    }

    const res = calcularMatchSocial(perfil, selecao, payload, oferta, matriz);
    setResultado(res);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div>
        <h2 className="font-display text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
          <span>🤝 Oásis Match — Estudar Junto com Amigos</span>
          <Badge tom="ok">P2P Instantâneo</Badge>
        </h2>
        <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Compartilhe sua prévia de grade com um amigo ou cole o código dele abaixo. O Oásis compara os horários instantaneamente, mostra em quais turmas vocês já estão juntos e aponta **Oportunidades de Ouro** para cursarem a mesma matéria sem conflito de horário!
        </p>
      </div>

      {/* Grid: Exportar e Importar Código */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card: Meu Código */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-utfpr-500/50 bg-gradient-to-br from-utfpr-500/10 via-amber-400/5 to-white/90 p-6 shadow-md dark:to-zinc-900/90">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span>📤 Compartilhar Minha Grade</span>
              </h3>
              <Badge tom="neutro">{selecao.length} turmas selecionadas</Badge>
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Copie o código gerado ou personalize seu nome/apelido antes de enviar:
            </p>

            {!perfil && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Seu nome ou apelido..."
                  value={nomeApelido}
                  onChange={(e) => setNomeApelido(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 shadow-2xs focus:border-utfpr-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            )}

            <div className="mt-4">
              <textarea
                readOnly
                rows={3}
                value={meuCodigo}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full rounded-2xl border border-zinc-300/80 bg-white/90 p-3 font-mono text-xs font-bold text-zinc-800 shadow-2xs focus:outline-none dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:text-zinc-200 resize-none"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-xs font-semibold text-zinc-500">
              {copiado ? "✅ Copiado para a área de transferência!" : "Clique no botão ou no texto para copiar"}
            </span>
            <Botao onClick={handleCopiar} variante="primario" classe="!px-4 !py-2.5 !text-xs font-black shadow-md cursor-pointer">
              {copiado ? "✅ Copiado!" : "📋 Copiar Código"}
            </Botao>
          </div>
        </div>

        {/* Card: Importar Código do Amigo */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-zinc-200/90 bg-white/95 p-6 shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/95">
          <div>
            <h3 className="font-display text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <span>📥 Comparar com Código de Amigo</span>
            </h3>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Cole abaixo o código compartilhado pelo seu amigo(a) para descobrir matérias em comum e compatibilidade de horários.
            </p>

            <div className="mt-4">
              <textarea
                rows={3}
                placeholder="Cole aqui o código do amigo(a)... (ex: OASIS-SHARE-v1:...)"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300/80 bg-white/90 p-3 font-mono text-xs text-zinc-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-utfpr-400 dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:text-zinc-200 resize-none"
              />
            </div>

            {erro && (
              <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                ⚠️ {erro}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
            {resultado && (
              <Botao
                onClick={() => {
                  setResultado(null);
                  setCodigoInput("");
                }}
                variante="neutro"
                classe="!px-3 !py-2 !text-xs"
              >
                Limpar
              </Botao>
            )}
            <Botao onClick={handleComparar} variante="primario" classe="!px-5 !py-2.5 !text-xs font-black shadow-md cursor-pointer">
              ✨ Calcular Match
            </Botao>
          </div>
        </div>
      </div>

      {/* Resultados do Match */}
      {resultado && (
        <div className="space-y-6 animate-in slide-in-from-bottom-3 duration-300">
          {/* Card Resumo do Amigo */}
          <div className="rounded-3xl border-2 border-zinc-300/80 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white shadow-xl dark:border-zinc-700">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-black uppercase text-utfpr-400 tracking-wider">
                  Resultado da Análise Conjunta
                </span>
                <h3 className="font-display text-2xl font-black mt-1">
                  VOCÊ E {resultado.amigoNome.toUpperCase()}
                </h3>
                <p className="text-xs text-zinc-300 font-medium mt-0.5">
                  {resultado.amigoCurso} {resultado.amigoPeriodo ? `· ${resultado.amigoPeriodo}º período` : ""}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/15">
                <div className="text-right">
                  <div className="text-[11px] uppercase font-black text-zinc-300">Compatibilidade</div>
                  <div className="font-display text-3xl font-black text-utfpr-400">
                    {resultado.compatibilidadePercentual}%
                  </div>
                </div>
                <div className="h-12 w-1.5 rounded-full bg-utfpr-400/30 overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full bg-utfpr-400 transition-all duration-500"
                    style={{ height: `${resultado.compatibilidadePercentual}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 1: Turmas exatas em comum */}
          <div>
            <h3 className="font-display text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
              <span>Turmas Idênticas Confirmadas</span>
              <Badge tom="ok">{resultado.matchPerfeito.length}</Badge>
            </h3>

            {resultado.matchPerfeito.length === 0 ? (
              <Card classe="p-5 text-center text-xs text-zinc-500 dark:text-zinc-400 italic">
                Nenhuma turma idêntica confirmada até o momento. Dê uma olhada nas Oportunidades de Ouro abaixo!
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {resultado.matchPerfeito.map((item) => (
                  <div
                    key={`${item.disciplina.codigo}-${item.turma.codigo}`}
                    className="rounded-2xl border-2 border-emerald-500/60 bg-emerald-50/80 p-4 dark:border-emerald-500/60 dark:bg-emerald-950/40 shadow-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          {item.disciplina.codigo}
                        </span>
                        <span className="rounded bg-emerald-500 text-zinc-950 font-mono text-[10px] font-black px-2 py-0.5">
                          Turma {item.turma.codigo}
                        </span>
                      </div>
                      <div className="mt-1 font-display text-sm font-black text-emerald-950 dark:text-emerald-100">
                        {item.disciplina.nome}
                      </div>
                      <div className="mt-2.5 space-y-1 font-mono text-xs text-emerald-900 dark:text-emerald-300">
                        {resumirHorariosPorDia(item.turma.horarios).map((h, i) => (
                          <div key={i} className="font-semibold">
                            ⏰ {h.diaNome} ({h.intervalo}) · Sala {h.salas}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 2: Comparativo de Jornada e Mentoria */}
          <div>
            <h3 className="font-display text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
              <span>Mentoria</span>
              <Badge tom="neutro">{resultado.comparativo.aPodeMentorarB.length + resultado.comparativo.bPodeMentorarA.length}</Badge>
            </h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Card classe="p-5">
                <h4 className="font-display text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>🌱 Matérias em que você pode mentorar {resultado.amigoNome}</span>
                  <Badge tom="neutro">{resultado.comparativo.aPodeMentorarB.length}</Badge>
                </h4>
                <p className="mt-1 text-xs text-zinc-500">
                  Você já concluiu estas disciplinas que o(a) {resultado.amigoNome} selecionou nesta prévia de grade:
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {resultado.comparativo.aPodeMentorarB.map((d) => (
                    <span
                      key={d.codigo}
                      className="rounded-lg bg-zinc-100 px-2.5 py-1 font-mono text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {d.codigo} - {d.nome}
                    </span>
                  ))}
                  {resultado.comparativo.aPodeMentorarB.length === 0 && (
                    <span className="text-xs text-zinc-400 italic">Nenhuma disciplina identificada.</span>
                  )}
                </div>
              </Card>

              <Card classe="p-5">
                <h4 className="font-display text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>🤝 Matérias em que {resultado.amigoNome} pode te ajudar</span>
                  <Badge tom="neutro">{resultado.comparativo.bPodeMentorarA.length}</Badge>
                </h4>
                <p className="mt-1 text-xs text-zinc-500">
                  O(a) {resultado.amigoNome} já concluiu estas matérias que você selecionou nesta prévia de grade:
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {resultado.comparativo.bPodeMentorarA.map((d) => (
                    <span
                      key={d.codigo}
                      className="rounded-lg bg-zinc-100 px-2.5 py-1 font-mono text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {d.codigo} - {d.nome}
                    </span>
                  ))}
                  {resultado.comparativo.bPodeMentorarA.length === 0 && (
                    <span className="text-xs text-zinc-400 italic">Nenhuma disciplina identificada.</span>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* SEÇÃO 3: Oportunidade de Ouro (Matéria em comum na prévia com horários livres) */}
          <div>
            <h3 className="font-display text-lg font-black text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-3">
              <span>💡 Oportunidades de Ouro (Matérias em comum na Prévia)</span>
              <Badge tom="ok">{resultado.oportunidadesDeOuro.length}</Badge>
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
              Vocês dois colocaram estas disciplinas em suas prévias de grade, mas estão em turmas separadas! As opções abaixo **não geram conflito na grade nem sua nem do {resultado.amigoNome}**:
            </p>

            {resultado.oportunidadesDeOuro.length === 0 ? (
              <Card classe="p-5 text-center text-xs text-zinc-500 dark:text-zinc-400 italic">
                Nenhuma oportunidade de ajuste simultâneo identificada nesta prévia.
              </Card>
            ) : (
              <div className="space-y-4">
                {resultado.oportunidadesDeOuro.map((op) => (
                  <div
                    key={op.disciplina.codigo}
                    className="rounded-3xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-white/90 p-5 shadow-md dark:border-amber-500/70 dark:from-amber-950/60 dark:to-zinc-900/90"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-3 dark:border-amber-800/60">
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
                          {op.disciplina.codigo}
                        </span>
                        <h4 className="font-display text-base font-black text-zinc-900 dark:text-white">
                          {op.disciplina.nome}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="rounded-lg bg-zinc-200 px-2 py-1 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                          Sua turma atual: <strong>{op.turmaAtualA || "Nenhuma"}</strong>
                        </span>
                        <span className="rounded-lg bg-zinc-200 px-2 py-1 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                          {resultado.amigoNome}: <strong>{op.turmaAtualB || "Nenhuma"}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <span className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider">
                        ✨ Turmas compatíveis sem conflito com a grade dos dois:
                      </span>

                      {op.turmasSugeridasLivreParaAmbos.length === 0 ? (
                        <p className="mt-2 text-xs text-zinc-500 italic">
                          Infelizmente, todas as outras turmas dessa disciplina entram em conflito com algum horário da sua grade ou do seu amigo.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-2">
                          {op.turmasSugeridasLivreParaAmbos.map((t) => (
                            <div
                              key={t.codigo}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-white/95 p-3.5 shadow-2xs dark:border-amber-700 dark:bg-zinc-900"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-amber-500 px-2 py-0.5 font-mono text-xs font-black text-zinc-950">
                                    Turma {t.codigo}
                                  </span>
                                  <span className="text-[11px] font-bold text-zinc-500">{t.professores_raw || "Prof. a definir"}</span>
                                </div>
                                <div className="mt-1.5 space-y-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                                  {resumirHorariosPorDia(t.horarios).map((h, i) => (
                                    <div key={i} className="font-semibold">
                                      ⏰ {h.diaNome} ({h.intervalo}) · Sala {h.salas}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <Botao
                                onClick={() => onAdicionarOuTrocarTurma(op.disciplina.codigo, t.codigo)}
                                variante="primario"
                                classe="!px-3 !py-2 !text-xs font-black shrink-0 cursor-pointer"
                                title="Mudar sua grade para esta turma e cursar junto!"
                              >
                                ✨ Unificar
                              </Botao>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
