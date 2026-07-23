// Parser do Histórico Escolar (Portal do Aluno UTFPR) — texto → PerfilAluno.
//
// Estratégia (validada nos históricos reais de referência):
//  - Os CONTADORES vêm das tabelas-resumo do próprio histórico (Resumo Optativas,
//    Resumo Eletiva, CHEXT geral, Quadro Resumo) — regulares e confiáveis.
//  - As DISCIPLINAS CURSADAS são segmentadas pela "linha-núcleo" numérica
//    (CHS CHT CHEXT média freq sem ano); código e situação são buscados no bloco
//    entre a linha-núcleo anterior e a seguinte, pois o PDF intercala as células.
//  - Anomalia não explicada vira aviso no perfil — erro alto > erro silencioso.
import type { DisciplinaCursada, PerfilAluno, ResumoConjunto, Situacao } from "../tipos";

// O primeiro campo aceita 3 dígitos porque a carga horária pode passar de 99:
// o Estágio Supervisionado de Eng. Comp. tem 400h, e com o limite de 2 dígitos a
// linha inteira deixava de casar — a disciplina sumia do histórico em silêncio.
const RE_NUCLEO =
  /(?:^|\s)(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+([\d,]+|\*)\s+([\d,]+|\*)\s+([12])\s*(20\d{2})/;
const RE_CODIGO = /^[A-Z]{2,4}[0-9][A-Z0-9]{1,3}$|^[A-Z]{3,5}[0-9]{2}[A-Z0-9]?$/;
const RE_TURMA = /^[A-Z]\d{2}$/;

// A tabela "Detalhes das Disciplinas Eletivas" tem schema próprio, diferente do das
// obrigatórias/optativas:
//   Período País [Instituição] [Disciplina] [Turma] CHT [CHEXT] Nota Freq Per Ano
//   [NF x CH] Situação Validado
// Turma, CHEXT e "NF x CH" aparecem ou não conforme o histórico, então o núcleo é
// ancorado no trecho estável (CHT..Ano) somado ao Sim/Não do fim da linha.
// O lookbehind é essencial: sem ele, os dígitos de uma turma ("S73") seriam lidos
// como CHT e a carga sairia errada.
const RE_NUCLEO_ELETIVA =
  /(?<![A-Za-z0-9])(\d{1,3})\s+(?:(\d{1,3})\s+)?([\d,]+|\*)\s+([\d,]+|\*)\s+([12])\s+(20\d{2})\b/;
const RE_VALIDADO = /\b(Sim|Não)\s*$/;
// o código raramente cai na linha-núcleo; costuma vir num fragmento "CODIGO - Nome",
// às vezes com o nome quebrado para a linha seguinte (daí o fim de linha aceito)
const RE_CODIGO_ELETIVA = /\b([A-Z]{2,5}[0-9][A-Z0-9]{0,3})\s*-(?:\s|$)/;

function ehCodigo(tok: string): boolean {
  return (
    tok.length >= 5 &&
    tok.length <= 7 &&
    /^[A-Z][A-Z0-9]+$/.test(tok) &&
    /\d/.test(tok) &&
    !RE_TURMA.test(tok) &&
    RE_CODIGO.test(tok)
  );
}

function acharCodigo(linhas: string[]): string | null {
  for (const l of linhas) {
    for (const tok of l.split(/\s+/)) {
      if (ehCodigo(tok)) return tok;
    }
  }
  return null;
}

function acharSituacao(linhas: string[]): Situacao | null {
  // linhas do ENADE ("Estudante Dispensado De Realização Do Enade") não têm
  // linha-núcleo própria e vazam para o bloco da disciplina vizinha — ignorá-las
  const txt = linhas.filter((l) => !/enade/i.test(l)).join(" ");
  if (/Reprovado/i.test(txt)) return "reprovado";
  if (/Consigna|Crédito Consignado/i.test(txt)) return "consignado";
  if (/Cancelado/i.test(txt)) return "cancelado";
  if (/Dispensa/i.test(txt)) return "dispensado";
  if (/Aprovado/i.test(txt)) return "aprovado";
  if (/Matriculado|Cursando/i.test(txt)) return "cursando";
  return null;
}

function num(s: string): number | null {
  if (s === "*" || s === undefined) return null;
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

export function parseHistorico(linhasIn: string[]): PerfilAluno {
  const linhas = linhasIn.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const avisos: string[] = [];
  const perfil: PerfilAluno = {
    nome: "",
    matricula: null,
    curso: "",
    matriz: null,
    periodo: null,
    coefAbsoluto: null,
    coefNormalizado: null,
    ingresso: null,
    cursadas: [],
    aprovadas: new Set(),
    matriculadas: [],
    obrigatoriasFaltantes: [],
    dependencias: [],
    resumoConjuntos: [],
    eletivas: null,
    extensao: null,
    resumoGeral: null,
    avisos,
  };

  // ---------- cabeçalho ----------
  for (const l of linhas) {
    let m = l.match(/Aluno:\s*(\d+)\s*-\s*(.+?)\s+Identidade/);
    if (m) {
      perfil.matricula = m[1];
      perfil.nome = m[2].trim();
    }
    m = l.match(/Curso:\s*(\d+\s*-\s*.+?)\s+Período:\s*(\d+)/);
    if (m) {
      perfil.curso = m[1].trim();
      perfil.periodo = parseInt(m[2]);
    }
    m = l.match(/Matriz:\s*(\d+)/);
    if (m && !perfil.matriz) perfil.matriz = parseInt(m[1]);
    m = l.match(/Coeficiente absoluto:\s*([\d,]+)/);
    if (m) perfil.coefAbsoluto = num(m[1]);
    m = l.match(/Coeficiente normalizado:\s*([\d,]+)/);
    if (m) perfil.coefNormalizado = num(m[1]);
    m = l.match(/Ingresso:\s*(\d\/\d{4})/);
    if (m) perfil.ingresso = m[1];
    m = l.match(/Data\/?Hora da Emissão:\s*([\d/:-]+|\d{2}\/\d{2}\/\d{4})/i) || l.match(/Emitido em:\s*([\d/:-]+|\d{2}\/\d{2}\/\d{4})/i) || l.match(/Data de Emissão:\s*([\d/:-]+|\d{2}\/\d{2}\/\d{4})/i) || l.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
    if (m && !perfil.dataEmissao) {
      perfil.dataEmissao = m[1];
    }
  }
  if (!perfil.nome) avisos.push("cabeçalho: nome do aluno não encontrado");

  // ---------- máquina de seções ----------
  type Secao =
    | "nenhuma"
    | "obrigatorias"
    | "optativas"
    | "resumoOptativas"
    | "eletivas"
    | "eletivasDetalhe"
    | "faltantes"
    | "dependencias"
    | "matriculadas"
    | "resumoGeral";
  let secao: Secao = "nenhuma";
  // linhas de cursadas acumuladas por seção de origem
  const cursadasLinhas: { texto: string; origem: "obrigatoria" | "optativa" }[] = [];
  // a tabela de eletivas é acumulada à parte: schema e segmentação são próprios
  const eletivasLinhas: string[] = [];

  for (const l of linhas) {
    // transições de seção (a ordem importa: cabeçalhos mais específicos primeiro)
    if (/Disciplinas Obrigatórias Cursadas/.test(l)) { secao = "obrigatorias"; continue; }
    if (/Disciplinas Optativas Cursadas/.test(l)) { secao = "optativas"; continue; }
    if (/Resumo Optativas/.test(l)) { secao = "resumoOptativas"; continue; }
    if (/Detalhes das Optativas Cursadas/.test(l)) { secao = "nenhuma"; continue; }
    if (/Detalhamento do Conjunto/.test(l)) { secao = "resumoOptativas"; continue; }
    if (/Detalhes das Disciplinas Eletivas/.test(l)) { secao = "eletivasDetalhe"; continue; }
    if (/Resumo Eletiva/.test(l)) { secao = "eletivas"; continue; }
    if (/Atividade Extensionista|Componentes Curriculares/.test(l)) { secao = "nenhuma"; }
    if (/Disciplinas Obrigatórias Faltantes/.test(l)) { secao = "faltantes"; continue; }
    if (/^Dependências/.test(l)) { secao = "dependencias"; continue; }
    if (/Disciplinas Matriculadas/.test(l)) { secao = "matriculadas"; continue; }
    if (/Exame De Curso|Exame de Suficiência/.test(l)) { secao = "nenhuma"; continue; }
    if (/Quadro Resumo disciplinas/.test(l)) { secao = "resumoGeral"; continue; }
    if (/Detalhes Para o Cálculo|Quadro De Carga Horária|Histórico de Disciplinas Faltantes/.test(l)) {
      secao = "nenhuma";
      continue;
    }
    // legenda de rodapé encerra tabela de cursadas
    if (/^\(0\) Período da disciplina/.test(l)) { secao = "nenhuma"; continue; }

    switch (secao) {
      case "obrigatorias":
        cursadasLinhas.push({ texto: l, origem: "obrigatoria" });
        break;
      case "optativas":
        cursadasLinhas.push({ texto: l, origem: "optativa" });
        break;
      case "eletivasDetalhe":
        eletivasLinhas.push(l);
        break;
      case "resumoOptativas": {
        // BSI: "1159 Segundo Estrato 3 6 24 360 225 135 0"
        // Eng. Comp.: "959 (*) Optativas 8 10 18 270 180 Faltantes 90"
        // O identificador tem 3 ou 4 dígitos e o período final chega a 10.
        //
        // A última coluna (CH Validada) é opcional porque nem sempre chega junto
        // da linha: em alguns PDFs ela é renderizada com um deslocamento vertical
        // e o agrupamento por Y a manda para uma linha própria. Sem tolerar isso,
        // um histórico de Eng. Comp. inteiro sai com zero conjuntos.
        const m = l.match(
          /^(\d{3,4})\s+(?:\(\*\)\s+)?(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+([\d,]+)\s+(\d+)\s+(\d+)\s+(Faltantes|\d+)(?:\s+(\d+))?$/,
        );
        if (m) {
          const chObrigatoria = parseInt(m[6]);
          const chFaltante = m[8] === "Faltantes" ? ("faltantes" as const) : parseInt(m[8]);
          // sem a coluna, o conjunto conta como validado quando nada falta
          const chValidada =
            m[9] !== undefined
              ? parseInt(m[9])
              : chFaltante === 0
                ? chObrigatoria
                : 0;
          perfil.resumoConjuntos.push({
            conjunto: m[1],
            nome: m[2].trim(),
            chObrigatoria,
            chCursadaAprovada: parseInt(m[7]),
            chFaltante,
            chValidada,
          } satisfies ResumoConjunto);
        }
        break;
      }
      case "eletivas": {
        // BSI:        "Eletiva 105 4 8 4 195 0 105"  (traz a coluna CHS)
        // Eng. Comp.: "Eletiva 90 8 10 30 60 30"     (não traz)
        const m = l.match(
          /^Eletiva\s+(\d+)\s+\d{1,2}\s+\d{1,2}\s+(?:\d+\s+)?(\d+)\s+(\d+)\s+(\d+)$/,
        );
        if (m) {
          perfil.eletivas = {
            chTotal: parseInt(m[1]),
            chCursadaAprovada: parseInt(m[2]),
            chFaltante: parseInt(m[3]),
            chValidada: parseInt(m[4]),
          };
          secao = "nenhuma";
        }
        break;
      }
      case "faltantes": {
        // Engenharia de Computação chega ao 10º período. O padrão antigo de um
        // único dígito descartava silenciosamente as faltantes desse período.
        const m = l.match(/^(\d{1,2})\s+([A-Z0-9]{4,7})\s+(.+)$/);
        if (m && ehCodigo(m[2])) {
          perfil.obrigatoriasFaltantes.push({ periodo: parseInt(m[1]), codigo: m[2], nome: m[3].trim() });
        }
        break;
      }
      case "dependencias": {
        const m = l.match(/^([A-Z0-9]{4,7})\s+(.+)$/);
        if (m && ehCodigo(m[1])) perfil.dependencias.push({ codigo: m[1], nome: m[2].trim() });
        break;
      }
      case "matriculadas": {
        const m = l.match(/^([A-Z0-9]{4,7})\s+(.+?)\s+([A-Z]\d{2})\s*(.*)$/);
        if (m && ehCodigo(m[1])) {
          perfil.matriculadas.push({ codigo: m[1], nome: m[2].trim(), turma: m[3], situacao: m[4].trim() });
        }
        break;
      }
      case "resumoGeral": {
        let m = l.match(/CHT Disciplinas Obrigatórias\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
        if (m) {
          perfil.resumoGeral = perfil.resumoGeral ?? {
            obrigatorias: { total: 0, aprovada: 0, faltante: 0 },
            optativas: { total: 0, aprovada: 0, faltante: 0 },
            eletivas: { total: 0, aprovada: 0, faltante: 0 },
          };
          perfil.resumoGeral.obrigatorias = {
            total: num(m[1])!,
            cursada: num(m[2])!,
            aprovada: num(m[3])!,
            faltante: num(m[4])!,
            aprovadaTotal: num(m[5])!,
          };
        }
        m = l.match(/CHT Disciplinas Optativas\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
        if (m && perfil.resumoGeral) {
          perfil.resumoGeral.optativas = {
            total: num(m[1])!,
            cursada: num(m[2])!,
            aprovada: num(m[3])!,
            faltante: num(m[4])!,
            aprovadaTotal: num(m[5])!,
          };
        }
        m = l.match(/CHT Disciplinas Eletivas\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
        if (m && perfil.resumoGeral) {
          perfil.resumoGeral.eletivas = {
            total: num(m[1])!,
            cursada: num(m[2])!,
            aprovada: num(m[3])!,
            faltante: num(m[4])!,
            aprovadaTotal: num(m[5])!,
          };
        }
        break;
      }
    }

    // extensão geral aparece fora das seções mapeadas
    const ext = l.match(/CHEXT geral do curso\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (ext) {
      perfil.extensao = { chTotal: parseInt(ext[1]), chCursada: parseInt(ext[2]), chFaltante: parseInt(ext[3]) };
    }
  }

  // ---------- cursadas: segmentação por linha-núcleo ----------
  const nucleos: number[] = [];
  cursadasLinhas.forEach((cl, i) => {
    if (RE_NUCLEO.test(cl.texto)) nucleos.push(i);
  });
  nucleos.forEach((idx, k) => {
    const ini = k === 0 ? 0 : nucleos[k - 1] + 1;
    const fim = k + 1 < nucleos.length ? nucleos[k + 1] : cursadasLinhas.length;
    const antes = cursadasLinhas.slice(ini, idx).map((c) => c.texto);
    const depois = cursadasLinhas.slice(idx + 1, fim).map((c) => c.texto);
    const linhaNucleo = cursadasLinhas[idx].texto;
    const m = linhaNucleo.match(RE_NUCLEO)!;

    const codigo = acharCodigo([linhaNucleo, ...antes, ...depois]);
    const situacao =
      acharSituacao([linhaNucleo]) ?? acharSituacao(antes) ?? acharSituacao(depois);
    if (!codigo) {
      avisos.push(`cursadas: linha-núcleo sem código identificável: "${linhaNucleo.slice(0, 80)}"`);
      return;
    }
    if (!situacao) {
      avisos.push(`cursadas: ${codigo} sem situação identificável`);
      return;
    }
    perfil.cursadas.push({
      codigo,
      // o texto do PDF intercala células demais para reconstruir o nome com
      // segurança; quem exibe resolve o nome pelo código na matriz
      nome: "",
      situacao,
      origem: cursadasLinhas[idx].origem,
      media: num(m[4]),
      frequencia: num(m[5]),
      cht: parseInt(m[2]),
      semestre: parseInt(m[6]),
      ano: parseInt(m[7]),
    } satisfies DisciplinaCursada);
  });

  // ---------- eletivas: tabela própria ----------
  // Guarda só as validadas: uma eletiva com Validado="Não" ou é reprovação ou teve o
  // crédito convalidado numa obrigatória (o caso real observado), e nos dois casos a
  // carga já está contabilizada em outro lugar. A CH de eletivas do aluno continua
  // vindo exclusivamente do "Resumo Eletiva" — a soma desta lista pode ultrapassar o
  // teto do curso e não serve como carga.
  const nucleosEletiva: number[] = [];
  eletivasLinhas.forEach((l, i) => {
    if (RE_VALIDADO.test(l) && RE_NUCLEO_ELETIVA.test(l)) nucleosEletiva.push(i);
  });
  nucleosEletiva.forEach((idx, k) => {
    const ini = k === 0 ? 0 : nucleosEletiva[k - 1] + 1;
    const fim = k + 1 < nucleosEletiva.length ? nucleosEletiva[k + 1] : eletivasLinhas.length;
    const linhaNucleo = eletivasLinhas[idx];
    const antes = eletivasLinhas.slice(ini, idx);
    const depois = eletivasLinhas.slice(idx + 1, fim);
    const m = linhaNucleo.match(RE_NUCLEO_ELETIVA)!;

    // O fragmento "CODIGO - Nome" sempre cai na linha-núcleo ou ACIMA dela. Procurar
    // abaixo faria uma linha sem código identificável roubar o da linha seguinte —
    // melhor um aviso alto do que uma eletiva atribuída ao código errado.
    let codigo: string | null = null;
    for (const linha of [linhaNucleo, ...antes]) {
      const mc = linha.match(RE_CODIGO_ELETIVA);
      if (mc && ehCodigo(mc[1])) {
        codigo = mc[1];
        break;
      }
    }
    if (!codigo) {
      avisos.push(`eletivas: linha sem código identificável: "${linhaNucleo.slice(0, 80)}"`);
      return;
    }
    if (!/Sim\s*$/.test(linhaNucleo)) return;

    perfil.cursadas.push({
      codigo,
      // igual às demais cursadas: o nome sai do código (matriz ou pool de eletivas)
      nome: "",
      situacao: acharSituacao([linhaNucleo, ...antes, ...depois]) ?? "aprovado",
      origem: "eletiva",
      validado: true,
      media: num(m[3]),
      frequencia: num(m[4]),
      cht: parseInt(m[1]),
      semestre: parseInt(m[5]),
      ano: parseInt(m[6]),
    } satisfies DisciplinaCursada);
  });

  // aprovadas: última ocorrência vence (reprovação seguida de aprovação conta)
  for (const c of perfil.cursadas) {
    if (c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado") {
      perfil.aprovadas.add(c.codigo);
    }
  }
  for (const mtr of perfil.matriculadas) {
    if (/Aprovado/i.test(mtr.situacao)) perfil.aprovadas.add(mtr.codigo);
  }

  let maxAno = 0;
  let maxSem = 0;
  for (const c of perfil.cursadas) {
    if (c.ano && c.semestre && (c.ano > maxAno || (c.ano === maxAno && c.semestre > maxSem))) {
      maxAno = c.ano;
      maxSem = c.semestre;
    }
  }
  if (maxAno > 0) {
    perfil.periodoDocumento = `${maxAno}/${maxSem}`;
  } else if (perfil.ingresso) {
    perfil.periodoDocumento = `Ingresso ${perfil.ingresso}`;
  }

  if (perfil.cursadas.length === 0) avisos.push("nenhuma disciplina cursada encontrada");
  if (perfil.resumoConjuntos.length === 0) avisos.push("Resumo Optativas não encontrado");
  return perfil;
}
