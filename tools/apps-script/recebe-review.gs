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
 *
 * ---------------------------------------------------------------------------
 * O QUE ESTE ENDPOINT NÃO PROTEGE
 *
 * A URL `/exec` é pública e não tem como deixar de ser: ela precisa estar no
 * JavaScript que roda no navegador do aluno, então basta abrir o DevTools para
 * lê-la. Repositório privado, repositório separado ou variável de ambiente não
 * mudam nada — o Vite inlina `VITE_*` no bundle. Front-end estático não guarda
 * segredo (Estrategia.md §5.6).
 *
 * O raio de dano de quem descobrir a URL é limitado de propósito: envios caem na
 * aba PRIVADA e só viram acervo público depois de um humano marcar `aprovado`
 * (§6.2). Ou seja, spam custa tempo de moderação e cota — não polui o site.
 * ---------------------------------------------------------------------------
 */

/** Aba privada onde as respostas brutas caem. Nunca é publicada (§6.2). */
var ABA_RESPOSTAS = 'Respostas';

/** Vocabulário fechado de tags (§6.5). Precisa espelhar `src/domain/reviews/tipos.ts`. */
var TAGS = [
  'cobra-so-o-ensinado', 'cobra-alem-do-ensinado', 'prova-com-consulta',
  'da-revisao-antes-da-prova', 'oferece-substitutiva', 'trabalho-em-grupo-pesado',
  'slides-bastam', 'aula-pratica', 'resolve-exercicio-em-aula', 'aula-gravada',
  'acessivel', 'pouco-acessivel', 'trata-com-respeito', 'aberto-a-rever-nota',
  'chamada-rigorosa', 'chamada-flexivel', 'prazos-rigidos', 'aceita-atraso',
  'corrige-rapido', 'corrige-devagar'
];

/** Pares que se contradizem: marcar os dois é dado incoerente, não opinião matizada. */
var TAGS_OPOSTAS = [
  ['cobra-so-o-ensinado', 'cobra-alem-do-ensinado'],
  ['acessivel', 'pouco-acessivel'],
  ['chamada-rigorosa', 'chamada-flexivel'],
  ['prazos-rigidos', 'aceita-atraso'],
  ['corrige-rapido', 'corrige-devagar']
];

/** Teto de sanidade do detalhamento opcional. */
var MAX_AVALIACOES = 20;

var SISTEMAS = ['provas', 'trabalhos', 'misto'];
var LIMITE_COMENTARIO = 1000;

/**
 * Freio de vazão (§6.9). São dois, porque um só não basta.
 *
 * O freio POR IDENTIDADE só funciona quando a implantação exige Conta do Google
 * E o e-mail é legível pelo script. Numa implantação aberta a qualquer pessoa,
 * `Session.getActiveUser().getEmail()` devolve string vazia — e o freio vira
 * no-op silencioso. Por isso existe o teto GLOBAL abaixo, que não depende de
 * identidade nenhuma e protege a cota do Apps Script e o tamanho da planilha.
 *
 * Nenhum dos dois é rate limiting por IP: o Apps Script não expõe o IP de quem
 * chama, exatamente como o formulário externo não expunha.
 */
var JANELA_MINUTOS = 10;
var MAX_NA_JANELA = 5;

/** Teto global de envios por minuto, somando todo mundo. */
var MAX_GLOBAL_POR_MINUTO = 20;

/**
 * Chave secreta do Cloudflare Turnstile, se configurada.
 *
 * Este é o ÚNICO ponto de todo o desenho onde cabe um segredo: as Script
 * Properties do Apps Script são server-side de verdade, fora do bundle servido
 * ao navegador. Configurar em: Apps Script → Configurações do projeto →
 * Propriedades do script → `TURNSTILE_SECRET`.
 *
 * Sem a propriedade definida, a verificação é pulada e o endpoint segue
 * funcionando — só sem defesa contra bot.
 */
function segredoTurnstile() {
  return PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET') || '';
}

function turnstileValido(token) {
  var segredo = segredoTurnstile();
  if (!segredo) return true; // não configurado: não bloqueia
  if (!token) return false;
  try {
    var resposta = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: segredo, response: token },
      muteHttpExceptions: true
    });
    return JSON.parse(resposta.getContentText()).success === true;
  } catch (err) {
    return false; // na dúvida, recusa
  }
}

/** Conta os envios do minuto corrente, para todo mundo somado. */
function excedeuTetoGlobal() {
  var cache = CacheService.getScriptCache();
  var chave = 'envios-' + Math.floor(Date.now() / 60000);
  var trava = LockService.getScriptLock();
  try {
    trava.waitLock(2000);
    var atual = parseInt(cache.get(chave) || '0', 10);
    if (atual >= MAX_GLOBAL_POR_MINUTO) return true;
    cache.put(chave, String(atual + 1), 120);
    return false;
  } catch (err) {
    return false; // falha ao travar não pode derrubar envio legítimo
  } finally {
    try { trava.releaseLock(); } catch (err) {}
  }
}

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
    // o teto global vem primeiro: é o que segura uma enxurrada antes de ela
    // custar leitura de planilha e cota de execução
    if (excedeuTetoGlobal()) {
      return responder(429, {
        ok: false,
        erros: ['O serviço está recebendo envios demais agora. Tente de novo em instantes.']
      });
    }

    var dados = JSON.parse(e.postData.contents);

    if (!turnstileValido(dados.turnstileToken)) {
      return responder(403, { ok: false, erros: ['Verificação anti-robô falhou.'] });
    }

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
      numeroOuVazio(dados.qtdProvas),    // P  (vazio = não informado, ≠ zero)
      numeroOuVazio(dados.qtdTrabalhos), // Q
      (dados.tags || []).join('|'),      // R
      dados.comentario || '',            // S
      dados.consentimento === true,      // T
      ''                                 // U aprovado — preenchido na curadoria
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
  if (!Array.isArray(tags)) {
    erros.push('Tags em formato inválido.');
  } else {
    tags.forEach(function (t) {
      if (TAGS.indexOf(t) === -1) erros.push('Tag desconhecida: ' + t);
    });
    TAGS_OPOSTAS.forEach(function (par) {
      if (tags.indexOf(par[0]) !== -1 && tags.indexOf(par[1]) !== -1) {
        erros.push('Tags contraditórias: ' + par[0] + ' e ' + par[1] + '.');
      }
    });
  }

  // detalhamento é opcional: ausente é legítimo, presente precisa ser plausível
  ['qtdProvas', 'qtdTrabalhos'].forEach(function (campo) {
    var v = d[campo];
    if (v === undefined || v === null || v === '') return;
    if (!Number.isInteger(v) || v < 0 || v > MAX_AVALIACOES) {
      erros.push('Campo "' + campo + '" precisa ser inteiro de 0 a ' + MAX_AVALIACOES + '.');
    }
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
    'cargaTrabalho', 'avaliacao', 'qtdProvas', 'qtdTrabalhos', 'tags',
    'comentario', 'consentimento', 'aprovado'
  ]);
  aba.setFrozenRows(1);
  return aba;
}

/** Campo numérico opcional: em branco significa "não informado", e não zero. */
function numeroOuVazio(v) {
  return (v === null || v === undefined || v === '') ? '' : v;
}

function responder(codigo, corpo) {
  // O Apps Script não deixa definir status HTTP em Web App; o status real vai no
  // corpo, e o site lê `ok`. Mantido no payload para o log fazer sentido.
  corpo.status = codigo;
  return ContentService
    .createTextOutput(JSON.stringify(corpo))
    .setMimeType(ContentService.MimeType.JSON);
}
