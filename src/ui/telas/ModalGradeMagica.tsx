import { useState } from "react";
import type { Matriz, OfertaSemestre, PerfilAluno, SelecaoTurma } from "../../domain/tipos";
import { gerarGradeMagica, type OpcoesGradeMagica } from "../../domain/motor/grade-magica";
import { Botao } from "../componentes";
import { IconWarning } from "../icons";

export interface ModalGradeMagicaProps {
  aberto: boolean;
  onFechar: () => void;
  perfil: PerfilAluno | null;
  matriz: Matriz | null;
  oferta: OfertaSemestre;
  onGerarGrade: (selecao: SelecaoTurma[]) => void;
}

export function ModalGradeMagica({
  aberto,
  onFechar,
  perfil,
  matriz,
  oferta,
  onGerarGrade,
}: ModalGradeMagicaProps) {
  const [estrategia, setEstrategia] = useState<OpcoesGradeMagica["estrategia"]>("adiantar_maximo");
  const [naoManha, setNaoManha] = useState(false);
  const [naoTarde, setNaoTarde] = useState(false);
  const [naoNoite, setNaoNoite] = useState(false);

  const [sedeCentro, setSedeCentro] = useState(true);
  const [sedeEcoville, setSedeEcoville] = useState(false);
  const [sedeNeoville, setSedeNeoville] = useState(false);

  if (!aberto) return null;

  const bloqueiaConfirmacaoTurno = naoManha && naoTarde && naoNoite;
  const bloqueiaConfirmacaoSede = !sedeCentro && !sedeEcoville && !sedeNeoville;
  const bloqueiaConfirmacao = bloqueiaConfirmacaoTurno || bloqueiaConfirmacaoSede || !matriz;

  function handleGerar() {
    if (bloqueiaConfirmacao || !matriz) return;
    const s = gerarGradeMagica(perfil, matriz, oferta, {
      estrategia,
      naoManha,
      naoTarde,
      naoNoite,
      sedeCentro,
      sedeEcoville,
      sedeNeoville,
    });
    if (s.length === 0) {
      alert("Nenhuma disciplina compatível encontrada com os filtros, sedes e turnos selecionados.");
      return;
    }
    onGerarGrade(s);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>✨</span> Recomendação de Grade (Grade Mágica)
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              O motor Oásis analisa seu progresso e monta a grade ideal, respeitando pré-requisitos, categorias curriculares e prioridade entre turmas S73 (Prio 1) e S71 (Prio 2).
            </p>
          </div>
          <button
            onClick={onFechar}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer shrink-0"
            title="Fechar modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Objetivo Principal */}
          <div className="space-y-2.5">
            <label className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Objetivo Principal
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label
                className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors ${
                  estrategia === "adiantar_maximo"
                    ? "border-utfpr-500/60 bg-utfpr-500/10 shadow-2xs"
                    : "border-zinc-200 bg-zinc-50/60 hover:bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80"
                }`}
              >
                <input
                  type="radio"
                  name="estrategia"
                  checked={estrategia === "adiantar_maximo"}
                  onChange={() => setEstrategia("adiantar_maximo")}
                  className="mt-0.5 h-4 w-4 accent-utfpr-500"
                />
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">Adiantar ao máximo</div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Prioriza matérias em atraso no fluxo (1º estrato) com maior carga horária e até 7 disciplinas sem choques.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors ${
                  estrategia === "balanceado"
                    ? "border-utfpr-500/60 bg-utfpr-500/10 shadow-2xs"
                    : "border-zinc-200 bg-zinc-50/60 hover:bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80"
                }`}
              >
                <input
                  type="radio"
                  name="estrategia"
                  checked={estrategia === "balanceado"}
                  onChange={() => setEstrategia("balanceado")}
                  className="mt-0.5 h-4 w-4 accent-utfpr-500"
                />
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">Semestre balanceado</div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Foca em 4 a 6 matérias, distribuídas com poucas matérias por dia ou mantendo 1 dia útil livre.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Restrições de Turno */}
          <div className="space-y-2">
            <label className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Restrições de Turno
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  naoManha
                    ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={naoManha}
                  onChange={(e) => setNaoManha(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>Não quero Manhã</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  naoTarde
                    ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={naoTarde}
                  onChange={(e) => setNaoTarde(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>Não quero Tarde</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  naoNoite
                    ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={naoNoite}
                  onChange={(e) => setNaoNoite(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>Não quero Noite</span>
              </label>
            </div>
          </div>

          {/* Filtro de Sedes */}
          <div className="space-y-2">
            <label className="block font-display text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Sedes Permitidas
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  !sedeCentro
                    ? "border-zinc-200 bg-zinc-50/60 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500"
                    : "border-utfpr-500/60 bg-utfpr-500/10 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sedeCentro}
                  onChange={(e) => setSedeCentro(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>📍 Centro</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  !sedeEcoville
                    ? "border-zinc-200 bg-zinc-50/60 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500"
                    : "border-utfpr-500/60 bg-utfpr-500/10 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sedeEcoville}
                  onChange={(e) => setSedeEcoville(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>📍 Ecoville</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  !sedeNeoville
                    ? "border-zinc-200 bg-zinc-50/60 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500"
                    : "border-utfpr-500/60 bg-utfpr-500/10 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sedeNeoville}
                  onChange={(e) => setSedeNeoville(e.target.checked)}
                  className="accent-utfpr-500 rounded"
                />
                <span>📍 Neoville</span>
              </label>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Dica: turmas no Centro vêm habilitadas por padrão. Marque Ecoville ou Neoville caso aceite se deslocar para essas sedes.
            </p>
          </div>

          {bloqueiaConfirmacaoTurno && (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3.5 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2.5 leading-relaxed">
              <IconWarning className="h-5 w-5 shrink-0 text-red-500" />
              <span>
                Você não quer estudar mesmo né? Assim não dá pra te ajudar, escolha pelo menos um turno.
              </span>
            </div>
          )}

          {bloqueiaConfirmacaoSede && !bloqueiaConfirmacaoTurno && (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3.5 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2.5 leading-relaxed">
              <IconWarning className="h-5 w-5 shrink-0 text-red-500" />
              <span>
                Selecione pelo menos uma sede (ex: Centro) para podermos buscar turmas disponíveis.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Botao variante="neutro" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            desabilitado={bloqueiaConfirmacao}
            onClick={handleGerar}
            classe="!px-5 !py-2.5 font-bold"
          >
            Gerar Grade Mágica
          </Botao>
        </div>
      </div>
    </div>
  );
}
