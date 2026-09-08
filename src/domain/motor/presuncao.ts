// Aprovação presumida: as matérias em curso contam como concluídas no plano.
//
// Quem monta a grade do próximo semestre não está no lugar em que o histórico o
// coloca. As matérias de 2026.2 ainda não têm nota, mas as subsequentes delas
// abrem em 2027.1 — e sem contá-las o planejamento devolve um semestre pobre,
// travado em pré-requisitos que na prática vão estar cumpridos.
//
// A presunção é aplicada UMA VEZ, na borda da interface, produzindo um perfil
// derivado. Todo o motor — `cumpre`, `bloqueio`, `listarElegiveis`,
// `progressoGrade`, `montarPainel`, `simularFormatura` — lê desse perfil e
// nenhum deles precisa saber que a presunção existe. Um interruptor dentro do
// simulador consertaria só o simulador, e Catálogo, Posso Cursar e o painel de
// Situação divergiriam.
import type { DisciplinaCursada, Matriz, PerfilAluno, ResumoConjunto } from "../tipos";
import { contaNoBlocoOptativo, descricaoDoCurso } from "../cursos";
import { disciplinaCanonicaDaOferta } from "./identidade";

/** Matérias em curso que ainda podem ser presumidas: as já aprovadas não contam. */
export function matriculadasPresumiveis(perfil: PerfilAluno | null): PerfilAluno["matriculadas"] {
  if (!perfil) return [];
  return perfil.matriculadas.filter((m) => !perfil.aprovadas.has(m.codigo));
}

/**
 * Perfil com as matérias escolhidas contadas como aprovadas.
 *
 * Devolve o próprio perfil quando não há nada a presumir, para o `useMemo` da
 * interface não invalidar a árvore inteira à toa.
 */
export function perfilComPresuncao(
  perfil: PerfilAluno | null,
  presumidas: string[],
  matriz: Matriz,
): PerfilAluno | null {
  if (!perfil) return null;

  // Código já aprovado no PDF não entra: `parser.ts` promove a matriculada com
  // situação "Aprovado" para `aprovadas`, e presumir de novo somaria a carga
  // horária dela duas vezes.
  const alvos = perfil.matriculadas.filter(
    (m) => presumidas.includes(m.codigo) && !perfil.aprovadas.has(m.codigo),
  );
  if (alvos.length === 0) return perfil;

  const curso = descricaoDoCurso(matriz);
  const aprovadas = new Set(perfil.aprovadas);
  const cursadas = [...perfil.cursadas];
  const conjuntos: ResumoConjunto[] = perfil.resumoConjuntos.map((r) => ({ ...r }));
  const resumoGeral = perfil.resumoGeral
    ? {
        obrigatorias: { ...perfil.resumoGeral.obrigatorias },
        optativas: { ...perfil.resumoGeral.optativas },
        eletivas: { ...perfil.resumoGeral.eletivas },
      }
    : null;
  const extensao = perfil.extensao ? { ...perfil.extensao } : null;

  /** Soma horas numa linha do Resumo Optativas, criando-a se o histórico não a trouxe. */
  function somarNoConjunto(codigo: string, horas: number) {
    const existente = conjuntos.find((c) => c.conjunto === codigo);
    if (existente) {
      existente.chCursadaAprovada += horas;
      if (typeof existente.chFaltante === "number") {
        existente.chFaltante = Math.max(0, existente.chFaltante - horas);
      }
      return;
    }
    conjuntos.push({
      conjunto: codigo,
      nome: matriz.conjuntos[codigo]?.nome ?? codigo,
      chObrigatoria: 0,
      chCursadaAprovada: horas,
      chFaltante: 0,
      chValidada: 0,
    });
  }

  for (const m of alvos) {
    aprovadas.add(m.codigo);

    const dm = disciplinaCanonicaDaOferta(matriz, m.codigo, m.nome);
    const horas = dm?.horas?.total ?? 0;
    const chext = dm?.horas?.chext ?? 0;
    const conjunto = dm?.conjunto ?? null;
    const origem: DisciplinaCursada["origem"] = conjunto === null ? "obrigatoria" : "optativa";

    // Uma cursada sintética para quem lê `perfil.cursadas` em vez de `aprovadas`
    // — o mapa do Catálogo e o fallback de `progressoGlobalDoCurso`.
    cursadas.push({
      codigo: dm?.codigo ?? m.codigo,
      nome: dm?.nome ?? m.nome,
      situacao: "aprovado",
      origem,
      media: null,
      frequencia: null,
      cht: horas || null,
      ano: null,
      semestre: null,
      presumida: true,
    });

    if (horas > 0) {
      if (conjunto === null) {
        if (resumoGeral) {
          resumoGeral.obrigatorias.aprovada += horas;
          resumoGeral.obrigatorias.faltante = Math.max(
            0,
            resumoGeral.obrigatorias.faltante - horas,
          );
          if (resumoGeral.obrigatorias.cursada !== undefined) {
            resumoGeral.obrigatorias.cursada += horas;
          }
          if (resumoGeral.obrigatorias.aprovadaTotal !== undefined) {
            resumoGeral.obrigatorias.aprovadaTotal += horas;
          }
        }
      } else {
        somarNoConjunto(String(conjunto), horas);
        // O simulador lê a linha AGREGADORA das trilhas quando o curso tem uma
        // (o conjunto 1160 da 981, por exemplo) e ignora as linhas por trilha;
        // a tela de Situação faz o oposto. Alimentar as duas é o que mantém as
        // duas contas iguais — e não duplica, porque nenhum consumidor soma
        // agregador e filhas ao mesmo tempo.
        if (curso.agregadorTrilhas && contaNoBlocoOptativo(curso, conjunto)) {
          somarNoConjunto(String(curso.agregadorTrilhas), horas);
        }
        if (resumoGeral) {
          resumoGeral.optativas.aprovada += horas;
          resumoGeral.optativas.faltante = Math.max(0, resumoGeral.optativas.faltante - horas);
          if (resumoGeral.optativas.cursada !== undefined) {
            resumoGeral.optativas.cursada += horas;
          }
          if (resumoGeral.optativas.aprovadaTotal !== undefined) {
            resumoGeral.optativas.aprovadaTotal += horas;
          }
        }
      }
    }

    // Extensão embutida na disciplina: é carga que o aluno cumpre assistindo à
    // aula, e some da conta de projeto próprio assim que ela é dada por feita.
    if (chext > 0 && extensao) {
      extensao.chCursada += chext;
      extensao.chFaltante = Math.max(0, extensao.chFaltante - chext);
    }
  }

  return { ...perfil, aprovadas, cursadas, resumoConjuntos: conjuntos, resumoGeral, extensao };
}
