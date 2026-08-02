/**
 * Endpoint de recepção das avaliações da comunidade — Oásis UTFPR.
 * Ver `Estrategia.md` §6.2 e §6.6.
 *
 * Este arquivo NÃO roda no site. Ele é colado no editor de Apps Script vinculado
 * à planilha de respostas e publicado como Web App. O site faz POST aqui; este
 * script valida e grava uma linha na aba privada `Respostas`.
 *
 * ---------------------------------------------------------------------------
 * COMO PUBLICAR (uma vez)
 *
 * 1. Abra a planilha → Extensões → Apps Script.
 * 2. Apague o conteúdo padrão e cole este arquivo inteiro.
 * 3. Implantar → Nova implantação → tipo "App da Web".
 *      - Executar como: EU (o dono da planilha)
 *      - Quem tem acesso: QUALQUER PESSOA
 * 4. Copie a URL que termina em `/exec` e entregue a quem for configurar o site.
 * 5. A cada alteração deste script, publique uma NOVA VERSÃO (a URL /exec
 *    continua a mesma se você editar a implantação existente).
 *
 * Nota de CORS: o site envia `Content-Type: text/plain` de propósito. Com
 * `application/json` o navegador dispara preflight OPTIONS, que o Apps Script não
 * responde, e a requisição falha. O corpo continua sendo JSON — só o rótulo do
 * tipo é que muda.
 * ---------------------------------------------------------------------------
 */

/** Aba privada onde as respostas brutas caem. Nunca é publicada (§6.2). */
var ABA_RESPOSTAS = 'Respostas';

/** Vocabulário fechado de tags (§6.5). Precisa espelhar `src/domain/reviews/tipos.ts`. */
var TAGS = [
  'chamada-rigorosa', 'chamada-flexivel', 'acessivel', 'pouco-acessivel',
  'trata-com-respeito', 'aberto-a-rever-nota', 'cobra-so-o-ensinado',
  'cobra-alem-do-ensinado', 'slides-bastam', 'corrige-rapido', 'corrige-devagar',
  'prazos-rigidos', 'aceita-atraso', 'da-revisao-antes-da-prova',
  'oferece-substitutiva', 'trabalho-em-grupo-pesado', 'aula-pratica'
];

var SISTEMAS = ['provas', 'trabalhos', 'misto'];
var LIMITE_COMENTARIO = 1000;

/** Janela e teto do freio de vazão por identidade (§6.9). */
var JANELA_MINUTOS = 10;
var MAX_NA_JANELA = 5;

/**
 * Padrões que não podem entrar num campo aberto. É a guarda de PII: o texto é
 * publicado, e RA/e-mail/telefone de terceiros não podem vazar por descuido.
 */
var PII = [
  /\b\d{7}\b/,                                   // RA
  /[\w.+-]+@[\w-]+\.[\w.]+/,                     // e-mail
  /\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/             // telefone
];

function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);
    var erros = validar(dados);
    if (erros.length) return responder(400, { ok: false, erros: erros });

    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var aba = planilha.getSheetByName(ABA_RESPOSTAS) || criarAba(planilha);

    var email = pegarEmail();
    if (excedeuVazao(aba, email)) {
      return responder(429, {
        ok: false,
        erros: ['Muitos envios seguidos. Tente de novo em alguns minutos.']
      });
    }

    aba.appendRow([
      new Date(),                        // A carimbo
      email,                             // B identidade (privada)
      dados.ra || '',                    // C RA (PRIVADA — nunca projetada)
      dados.autor,                       // D nome público
      dados.codigo,                      // E
      dados.semestre,                    // F
      dados.situacao,                    // G
      dados.turma || '',                 // H
      dados.professorId || '',           // I
      dados.professorTexto || '',        // J
      dados.geral,                       // K
      dados.didatica,                    // L
      dados.dificuldade,                 // M
      dados.cargaTrabalho,               // N
      dados.avaliacao,                   // O
      (dados.tags || []).join('|'),      // P
      dados.comentario || '',            // Q
      dados.consentimento === true,      // R
      ''                                 // S aprovado — preenchido na curadoria
    ]);

    return responder(200, { ok: true });
  } catch (err) {
    return responder(500, { ok: false, erros: ['Falha ao registrar: ' + err.message] });
  }
}

/** Sonda de saúde, para o site conseguir checar que o endpoint está no ar. */
function doGet() {
  return responder(200, { ok: true, servico: 'oasis-reviews' });
}

function validar(d) {
  var erros = [];
  var estrela = function (v) { return Number.isInteger(v) && v >= 1 && v <= 5; };

  if (!d || typeof d !== 'object') return ['Corpo inválido.'];
  if (!d.codigo) erros.push('Código da disciplina ausente.');
  if (!/^20\d{2}\/[12]$/.test(d.semestre || '')) erros.push('Semestre fora do formato AAAA/S.');
  if (['aprovado', 'reprovado'].indexOf(d.situacao) === -1) erros.push('Situação inválida.');
  if (!d.autor || String(d.autor).trim().length < 3) erros.push('Nome do autor ausente.');

  // exatamente uma das duas rotas de professor (§6.4)
  var temId = !!d.professorId;
  var temTexto = !!(d.professorTexto && String(d.professorTexto).trim());
  if (temId === temTexto) {
    erros.push('Informe o professor da lista OU o nome pela rota "Professor Não Ofertado" — nunca ambos.');
  }

  ['geral', 'didatica', 'dificuldade', 'cargaTrabalho'].forEach(function (campo) {
    if (!estrela(d[campo])) erros.push('Nota "' + campo + '" precisa ser inteiro de 1 a 5.');
  });

  if (SISTEMAS.indexOf(d.avaliacao) === -1) erros.push('Sistema avaliativo inválido.');

  var tags = d.tags || [];
  if (!Array.isArray(tags)) erros.push('Tags em formato inválido.');
  else tags.forEach(function (t) {
    if (TAGS.indexOf(t) === -1) erros.push('Tag desconhecida: ' + t);
  });

  var comentario = d.comentario || '';
  if (comentario.length > LIMITE_COMENTARIO) {
    erros.push('Comentário passa de ' + LIMITE_COMENTARIO + ' caracteres.');
  }
  // a guarda de PII vale para todo campo aberto, inclusive o nome do professor
  [comentario, d.professorTexto || ''].forEach(function (texto) {
    PII.forEach(function (re) {
      if (re.test(texto)) erros.push('Remova dados pessoais (RA, e-mail ou telefone) do texto.');
    });
  });

  // RNF07: sem consentimento explícito não se grava nada
  if (d.consentimento !== true) erros.push('É preciso aceitar os termos para enviar.');

  return erros;
}

/** Vazio quando a implantação não exige login — o freio então não se aplica. */
function pegarEmail() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (err) { return ''; }
}

function excedeuVazao(aba, email) {
  if (!email) return false;
  var linhas = aba.getLastRow();
  if (linhas < 2) return false;
  var limite = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000);
  var buscar = Math.min(linhas - 1, 200);
  var valores = aba.getRange(linhas - buscar + 1, 1, buscar, 2).getValues();
  var recentes = valores.filter(function (l) {
    return l[1] === email && l[0] instanceof Date && l[0] > limite;
  });
  return recentes.length >= MAX_NA_JANELA;
}

function criarAba(planilha) {
  var aba = planilha.insertSheet(ABA_RESPOSTAS);
  aba.appendRow([
    'carimbo', 'identidade', 'ra', 'autor', 'codigo', 'semestre', 'situacao',
    'turma', 'professorId', 'professorTexto', 'geral', 'didatica', 'dificuldade',
    'cargaTrabalho', 'avaliacao', 'tags', 'comentario', 'consentimento', 'aprovado'
  ]);
  aba.setFrozenRows(1);
  return aba;
}

function responder(codigo, corpo) {
  // O Apps Script não deixa definir status HTTP em Web App; o status real vai no
  // corpo, e o site lê `ok`. Mantido no payload para o log fazer sentido.
  corpo.status = codigo;
  return ContentService
    .createTextOutput(JSON.stringify(corpo))
    .setMimeType(ContentService.MimeType.JSON);
}
