// Liberação de pré-requisito por desempenho (TASK-45).
//
// A UTFPR libera a disciplina subsequente para quem reprovou na pré-requisito
// POR NOTA com média 4,0 ou acima. Reprovação por frequência não libera, por
// alta que tenha sido a média.
import type { DisciplinaCursada, PerfilAluno } from "../tipos";
import type { MapaIdentidade } from "./identidade";

/** Média a partir da qual a reprovação deixa de travar a disciplina seguinte. */
export const MEDIA_MINIMA_LIBERACAO = 4;

/** Frequência mínima para a reprovação ter sido por nota, e não por falta. */
export const FREQUENCIA_MINIMA = 75;

/**
 * A reprovação foi por nota (e não por falta), com média suficiente?
 *
 * Frequência ausente conta como suficiente. Sem o campo não há como separar os
 * dois motivos, e o histórico só o omite fora do caso de reprovação com nota
 * lançada — aproveitamento, consignação e afins, que esta função já descarta
 * pela situação. Tratar o `null` como reprovação por falta esconderia do aluno
 * uma liberação que ele tem.
 */
function reprovadaPorNota(c: DisciplinaCursada): boolean {
  if (c.situacao !== "reprovado") return false;
  if (c.media === null || c.media < MEDIA_MINIMA_LIBERACAO) return false;
  return c.frequencia === null || c.frequencia >= FREQUENCIA_MINIMA;
}

/**
 * O aluno destravou `codigo` por desempenho, ainda que não o tenha cumprido?
 *
 * Deliberadamente separada de `cumpre()`, e nunca embutida nela. As duas
 * respondem perguntas diferentes: `cumpre()` diz o que integraliza o currículo e
 * é a base do cálculo de carga em `situacao.ts`, `progressoGrade.ts` e no
 * simulador; esta diz apenas o que destrava a disciplina seguinte. Creditar a
 * reprovada em `cumpre()` inflaria o 1º estrato do aluno e anteciparia a
 * formatura projetada por horas que ele não tem.
 */
export function liberadoPorDesempenho(
  codigo: string,
  perfil: PerfilAluno | null,
  mapa: MapaIdentidade,
): boolean {
  if (!perfil) return false;

  const canonico = mapa.resolver(codigo);

  for (const c of perfil.cursadas) {
    if (!reprovadaPorNota(c)) continue;

    if (mapa.mesmaExigencia(canonico, c.codigo)) return true;

    // Mesma via de escape que `cumpre()` usa: o histórico pode trazer a
    // disciplina sob código que a matriz não declara, e o nome resolve.
    if (c.nome) {
      const porNome = mapa.resolverPorNome(c.nome);
      if (porNome && mapa.mesmaExigencia(canonico, porNome)) return true;
    }
  }

  return false;
}
