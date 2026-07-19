import type { DisciplinaMatriz, Matriz, PerfilAluno } from "../tipos";
import { normNome } from "./elegiveis";
import type { ItemGrade } from "./grade";

export interface DadosProgressoCategoria {
  categoriaId: string;
  categoriaNome: string;
  exigido: number;
  cumpridoBase: number;
  previewCarga: number;
  cumpridoSimulado: number;
  statusTexto: string;
  jaConcluidaNoHistorico: boolean;
  emCursoNoHistorico: boolean;
}

export interface ResumoCategoriaGrade {
  categoriaId: string;
  categoriaNome: string;
  exigido: number;
  cumpridoBase: number;
  impulsoGrade: number;
  cumpridoSimulado: number;
  disciplinasEnvolvidas: { codigo: string; nome: string; carga: number }[];
  statusTexto: string;
}

export function obterCargaHoraria(
  d?: {
    codigo?: string;
    nome?: string;
    aulas_semanais_presenciais?: number | null;
    aulas_semanais_assincronas?: number | null;
    horas?: { total: number };
  } | null,
  matriz?: Matriz | null
): number {
  if (!d) return 60;
  if ("horas" in d && d.horas?.total) return d.horas.total;
  if (matriz && d.codigo) {
    const dm = matriz.disciplinas.find(
      (x) => x.codigo === d.codigo || (d.nome && normNome(x.nome) === normNome(d.nome))
    );
    if (dm?.horas?.total) return dm.horas.total;
  }
  const pres = "aulas_semanais_presenciais" in d && d.aulas_semanais_presenciais ? d.aulas_semanais_presenciais : 4;
  const assinc = "aulas_semanais_assincronas" in d && d.aulas_semanais_assincronas ? d.aulas_semanais_assincronas : 0;
  return (pres + assinc) * 15;
}

export function calcularProgressoMateria(
  codigoDisciplina: string,
  nomeDisciplina: string,
  cargaHoraria: number,
  perfil: PerfilAluno | null | undefined,
  matriz: Matriz | null | undefined
): DadosProgressoCategoria {
  const d: DisciplinaMatriz | undefined = matriz?.disciplinas.find(
    (x) => x.codigo === codigoDisciplina || normNome(x.nome) === normNome(nomeDisciplina)
  );

  const conjunto = d?.conjunto ?? null;
  const chext = d?.horas?.chext ?? 0;
  const carga = cargaHoraria || (d?.horas?.total ?? 60);

  // Checar histórico se já foi concluída ou em curso
  const jaConcluidaNoHistorico = Boolean(
    perfil?.aprovadas?.has(codigoDisciplina) ||
      perfil?.cursadas?.some(
        (c) =>
          (c.codigo === codigoDisciplina || (c.nome && normNome(c.nome) === normNome(nomeDisciplina))) &&
          (c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado")
      )
  );

  const emCursoNoHistorico = Boolean(
    !jaConcluidaNoHistorico &&
      perfil?.matriculadas?.some(
        (m) => m.codigo === codigoDisciplina || (m.nome && normNome(m.nome) === normNome(nomeDisciplina))
      )
  );

  let categoriaId = "obrigatorias";
  let categoriaNome = "Obrigatórias (1º Estrato)";
  let exigido = 1815;
  let cumpridoBase = 0;

  if (codigoDisciplina === "ICSX51" || codigoDisciplina === "ICSX52" || nomeDisciplina.toLowerCase().includes("estágio") || nomeDisciplina.toLowerCase().includes("estagio")) {
    categoriaId = "estagio";
    categoriaNome = "Estágio Curricular";
    exigido = 400;
    let est1 = false;
    let est2 = false;
    if (perfil) {
      est1 = perfil.cursadas.some(
        (c) =>
          (c.codigo === "ICSX51" || c.nome.toLowerCase().includes("estágio 1") || c.nome.toLowerCase().includes("estagio 1")) &&
          (c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado")
      );
      est2 = perfil.cursadas.some(
        (c) =>
          (c.codigo === "ICSX52" || c.nome.toLowerCase().includes("estágio 2") || c.nome.toLowerCase().includes("estagio 2")) &&
          (c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado")
      );
    }
    cumpridoBase = (est1 ? 200 : 0) + (est2 ? 200 : 0);
  } else if (chext > 0 && conjunto === 1199) {
    categoriaId = "extensao";
    categoriaNome = "Extensão Universitária";
    exigido = perfil?.extensao?.chTotal ?? 320;
    cumpridoBase = perfil?.extensao?.chCursada ?? 0;
  } else if (conjunto === null || (!d && !chext)) {
    categoriaId = "obrigatorias";
    categoriaNome = "Obrigatórias (1º Estrato)";
    exigido = perfil?.resumoGeral?.obrigatorias?.total ?? matriz?.cargas?.obrigatorias ?? 1815;
    cumpridoBase = perfil?.resumoGeral?.obrigatorias?.aprovada ?? 0;
  } else if (conjunto === 1159) {
    categoriaId = "1159";
    categoriaNome = "2º Estrato";
    const r = perfil?.resumoConjuntos.find((x) => x.conjunto === "1159");
    exigido = r?.chObrigatoria ?? matriz?.conjuntos?.["1159"]?.ch ?? 345;
    cumpridoBase = r ? Math.min(r.chCursadaAprovada, r.chObrigatoria) : 0;
  } else if (conjunto === 1161) {
    categoriaId = "1161";
    categoriaNome = "Ciclo de Humanidades";
    const r = perfil?.resumoConjuntos.find((x) => x.conjunto === "1161");
    exigido = r?.chObrigatoria ?? matriz?.conjuntos?.["1161"]?.ch ?? 60;
    cumpridoBase = r ? Math.min(r.chCursadaAprovada, r.chObrigatoria) : 0;
  } else if (typeof conjunto === "number" && conjunto >= 1162 && conjunto <= 1173) {
    categoriaId = String(conjunto);
    const nomeTrilha = matriz?.conjuntos?.[String(conjunto)]?.nome ?? "Trilha";
    categoriaNome = `${nomeTrilha} (3º Estrato)`;
    const r = perfil?.resumoConjuntos.find((x) => x.conjunto === String(conjunto));
    exigido = r?.chObrigatoria ?? matriz?.conjuntos?.[String(conjunto)]?.ch ?? 115;
    cumpridoBase = r ? Math.min(r.chCursadaAprovada, r.chObrigatoria) : 0;
  } else if (conjunto === 1199 || !d) {
    categoriaId = "eletivas";
    categoriaNome = "Eletivas";
    exigido = perfil?.eletivas?.chTotal ?? 120;
    cumpridoBase = perfil?.eletivas ? Math.max(0, perfil.eletivas.chTotal - perfil.eletivas.chFaltante) : 0;
  }

  const previewCarga = jaConcluidaNoHistorico ? 0 : carga;
  const cumpridoSimulado = cumpridoBase + previewCarga;

  let statusTexto = "";
  if (jaConcluidaNoHistorico) {
    statusTexto = "✅ Disciplina já concluída no seu histórico";
  } else if (emCursoNoHistorico) {
    statusTexto = `⏳ Disciplina em curso no histórico (+${previewCarga}h nesta simulação)`;
  } else if (cumpridoBase >= exigido && exigido > 0) {
    statusTexto = `⭐️ Carga da categoria já concluída (+${previewCarga}h excedentes/opcionais)`;
  } else if (cumpridoSimulado >= exigido && exigido > 0) {
    statusTexto = `🎉 Esta matéria completa a carga exigida para ${categoriaNome}!`;
  } else {
    const faltantes = Math.max(0, exigido - cumpridoSimulado);
    statusTexto = `Impulsiona +${previewCarga}h de progresso (faltarão ${faltantes}h para concluir)`;
  }

  return {
    categoriaId,
    categoriaNome,
    exigido,
    cumpridoBase,
    previewCarga,
    cumpridoSimulado,
    statusTexto,
    jaConcluidaNoHistorico,
    emCursoNoHistorico,
  };
}

export function calcularResumoProgressoGrade(
  itens: ItemGrade[],
  perfil: PerfilAluno | null | undefined,
  matriz: Matriz | null | undefined
): ResumoCategoriaGrade[] {
  const categoriasMapa: Record<
    string,
    {
      nome: string;
      exigido: number;
      cumpridoBase: number;
      impulsoGrade: number;
      disciplinas: { codigo: string; nome: string; carga: number }[];
    }
  > = {
    obrigatorias: {
      nome: "Obrigatórias (1º Estrato)",
      exigido: perfil?.resumoGeral?.obrigatorias?.total ?? matriz?.cargas?.obrigatorias ?? 1815,
      cumpridoBase: perfil?.resumoGeral?.obrigatorias?.aprovada ?? 0,
      impulsoGrade: 0,
      disciplinas: [],
    },
    "1159": {
      nome: "2º Estrato",
      exigido: perfil?.resumoConjuntos.find((x) => x.conjunto === "1159")?.chObrigatoria ?? matriz?.conjuntos?.["1159"]?.ch ?? 345,
      cumpridoBase: perfil?.resumoConjuntos.find((x) => x.conjunto === "1159")?.chCursadaAprovada ?? 0,
      impulsoGrade: 0,
      disciplinas: [],
    },
    "1161": {
      nome: "Ciclo de Humanidades",
      exigido: perfil?.resumoConjuntos.find((x) => x.conjunto === "1161")?.chObrigatoria ?? matriz?.conjuntos?.["1161"]?.ch ?? 60,
      cumpridoBase: perfil?.resumoConjuntos.find((x) => x.conjunto === "1161")?.chCursadaAprovada ?? 0,
      impulsoGrade: 0,
      disciplinas: [],
    },
    trilhas_geral: {
      nome: "Trilhas em Computação (3º Estrato - Geral)",
      exigido: 345,
      cumpridoBase: (() => {
        if (!perfil || !matriz) return 0;
        let soma = 0;
        for (const [cod] of Object.entries(matriz.conjuntos)) {
          const numCod = Number(cod);
          if (numCod >= 1162 && numCod <= 1173) {
            const r = perfil.resumoConjuntos.find((x) => x.conjunto === cod);
            if (r) soma += Math.min(r.chCursadaAprovada, r.chObrigatoria);
          }
        }
        return Math.min(soma, 345);
      })(),
      impulsoGrade: 0,
      disciplinas: [],
    },
    eletivas: {
      nome: "Eletivas",
      exigido: perfil?.eletivas?.chTotal ?? 120,
      cumpridoBase: perfil?.eletivas ? Math.max(0, perfil.eletivas.chTotal - perfil.eletivas.chFaltante) : 0,
      impulsoGrade: 0,
      disciplinas: [],
    },
    extensao: {
      nome: "Extensão Universitária",
      exigido: perfil?.extensao?.chTotal ?? 320,
      cumpridoBase: perfil?.extensao?.chCursada ?? 0,
      impulsoGrade: 0,
      disciplinas: [],
    },
  };

  if (matriz?.conjuntos) {
    for (const [cod, cinfo] of Object.entries(matriz.conjuntos)) {
      const numCod = Number(cod);
      if (numCod >= 1162 && numCod <= 1173) {
        const r = perfil?.resumoConjuntos.find((x) => x.conjunto === cod);
        const cump = r ? Math.min(r.chCursadaAprovada, r.chObrigatoria) : 0;
        if (cump > 0 || !categoriasMapa[cod]) {
          if (!categoriasMapa[cod]) {
            categoriasMapa[cod] = {
              nome: `${cinfo.nome} (3º Estrato)`,
              exigido: r?.chObrigatoria ?? cinfo.ch ?? 115,
              cumpridoBase: cump,
              impulsoGrade: 0,
              disciplinas: [],
            };
          }
        }
      }
    }
  }

  for (const item of itens) {
    const carga = obterCargaHoraria(item.disciplina, matriz);
    const jaConcluida = Boolean(
      perfil?.aprovadas?.has(item.disciplina.codigo) ||
        perfil?.cursadas?.some(
          (c) =>
            (c.codigo === item.disciplina.codigo || normNome(c.nome) === normNome(item.disciplina.nome)) &&
            (c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado")
        )
    );
    const acrescimo = jaConcluida ? 0 : carga;

    const info = calcularProgressoMateria(item.disciplina.codigo, item.disciplina.nome, carga, perfil, matriz);
    const catId = info.categoriaId;

    if (catId === "obrigatorias") {
      categoriasMapa.obrigatorias.impulsoGrade += acrescimo;
      categoriasMapa.obrigatorias.disciplinas.push({ codigo: item.disciplina.codigo, nome: item.disciplina.nome, carga });
    } else if (catId === "1159") {
      categoriasMapa["1159"].impulsoGrade += acrescimo;
      categoriasMapa["1159"].disciplinas.push({ codigo: item.disciplina.codigo, nome: item.disciplina.nome, carga });
    } else if (catId === "1161") {
      categoriasMapa["1161"].impulsoGrade += acrescimo;
      categoriasMapa["1161"].disciplinas.push({ codigo: item.disciplina.codigo, nome: item.disciplina.nome, carga });
    } else if (Number(catId) >= 1162 && Number(catId) <= 1173) {
      categoriasMapa.trilhas_geral.impulsoGrade += acrescimo;
      categoriasMapa.trilhas_geral.disciplinas.push({ codigo: item.disciplina.codigo, nome: item.disciplina.nome, carga });

      if (!categoriasMapa[catId]) {
        categoriasMapa[catId] = {
          nome: info.categoriaNome,
          exigido: info.exigido,
          cumpridoBase: info.cumpridoBase,
          impulsoGrade: 0,
          disciplinas: [],
        };
      }
      categoriasMapa[catId].impulsoGrade += acrescimo;
      categoriasMapa[catId].disciplinas.push({ codigo: item.disciplina.codigo, nome: item.disciplina.nome, carga });
    } else if (catId === "extensao") {
      categoriasMapa.extensao.impulsoGrade += acrescimo;
      categoriasMapa.extensao.disciplinas.push({ codigo: item.disciplina.codigo, nome: item.disciplina.nome, carga });
    } else if (catId === "estagio") {
      if (!categoriasMapa.estagio) {
        categoriasMapa.estagio = {
          nome: "Estágio Curricular",
          exigido: 400,
          cumpridoBase: info.cumpridoBase,
          impulsoGrade: 0,
          disciplinas: [],
        };
      }
      categoriasMapa.estagio.impulsoGrade += acrescimo;
      categoriasMapa.estagio.disciplinas.push({ codigo: item.disciplina.codigo, nome: item.disciplina.nome, carga });
    } else {
      categoriasMapa.eletivas.impulsoGrade += acrescimo;
      categoriasMapa.eletivas.disciplinas.push({ codigo: item.disciplina.codigo, nome: item.disciplina.nome, carga });
    }
  }

  const resultado: ResumoCategoriaGrade[] = [];
  const chavesOrdem = ["obrigatorias", "1159", "1161", "trilhas_geral", "eletivas", "extensao"];
  const todasChaves = new Set([...chavesOrdem, ...Object.keys(categoriasMapa)]);

  for (const chave of todasChaves) {
    if (chave === "estagio") continue;
    const c = categoriasMapa[chave];
    if (!c) continue;
    const ehPrincipal = chavesOrdem.includes(chave);
    const ehSubTrilha = !isNaN(Number(chave)) && Number(chave) >= 1162 && Number(chave) <= 1173;
    if (!ehPrincipal && c.impulsoGrade === 0 && c.disciplinas.length === 0 && (!ehSubTrilha || c.cumpridoBase === 0)) continue;

    const cumpridoSimulado = c.cumpridoBase + c.impulsoGrade;
    let statusTexto = "";
    if (ehSubTrilha && c.cumpridoBase >= c.exigido && c.impulsoGrade > 0) {
      statusTexto = `⭐️ Trilha já concluída (${c.cumpridoBase}/${c.exigido}h) · +${c.impulsoGrade}h somam como excedente`;
    } else if (c.cumpridoBase >= c.exigido && c.exigido > 0) {
      statusTexto = `⭐️ Estrato já cumprido no histórico (${c.cumpridoBase}/${c.exigido}h)`;
    } else if (cumpridoSimulado >= c.exigido && c.exigido > 0) {
      if (chave === "trilhas_geral" && cumpridoSimulado > c.exigido) {
        statusTexto = `🎉 Completa as ${c.exigido}h exigidas (+${cumpridoSimulado - c.exigido}h excedentes em trilha)!`;
      } else {
        statusTexto = `🎉 Esta grade completa todas as horas exigidas para este estrato!`;
      }
    } else if (c.impulsoGrade > 0) {
      const falta = Math.max(0, c.exigido - cumpridoSimulado);
      statusTexto = `🚀 Grade impulsiona +${c.impulsoGrade}h (faltarão ${falta}h para concluir)`;
    } else {
      statusTexto = `Faltam ${Math.max(0, c.exigido - c.cumpridoBase)}h para a conclusão do estrato`;
    }

    resultado.push({
      categoriaId: chave,
      categoriaNome: c.nome,
      exigido: c.exigido,
      cumpridoBase: c.cumpridoBase,
      impulsoGrade: c.impulsoGrade,
      cumpridoSimulado,
      disciplinasEnvolvidas: c.disciplinas,
      statusTexto,
    });
  }

  return resultado;
}
