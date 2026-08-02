import { useMemo, useState, type ReactNode } from "react";
import type { Matriz, PerfilAluno } from "../../domain/tipos";
import { montarPainel } from "../../domain/motor/situacao";
import { nomeDeEletiva } from "../../domain/eletivas";
import { Badge, Barra, Botao, Card, Rosca } from "../componentes";
import { IconCheck, IconWarning } from "../icons";
import type { CategoriaCatalogo } from "./Catalogo";
import { ModalAvaliacao, type AlvoAvaliacao } from "./ModalAvaliacao";
import { coletaHabilitada } from "../../domain/reviews/config";
import {
  contaNoBlocoOptativo,
  descricaoDoCurso,
  categoriaSimples,
  ehGrupoOpcao,
  grupoOpcaoDe,
} from "../../domain/cursos";

export function renderizarTextoComCodigos(texto: string, matriz: Matriz) {
  const partes = texto.split(/([A-Z]{2,5}\d{1,4}[A-Z]?)/g);
  return partes.map((parte, idx) => {
    const d = matriz.disciplinas.find((dm) => dm.codigo === parte);
    if (d) {
      return (
        <span
          key={idx}
          title={`${d.codigo} — ${d.nome} (${d.periodo ? `${d.periodo}º período` : "Optativa"}) · ${d.horas.total}h`}
          className="cursor-help font-mono font-bold underline decoration-dotted decoration-utfpr-500 underline-offset-2 text-zinc-900 dark:text-zinc-100 hover:text-utfpr-600 dark:hover:text-utfpr-400 transition-colors"
        >
          {parte}
        </span>
      );
    }
    return parte;
  });
}

function CardProgresso(props: {
  titulo: string;
  cumprido: number;
  exigido: number;
  rodape?: ReactNode;
  concluidas?: { codigo: string; nome: string; cht?: number | null }[];
  categoria: CategoriaCatalogo;
  onAbrirCatalogo?: (cat: CategoriaCatalogo) => void;
}) {
  const completo = props.cumprido >= props.exigido && props.exigido > 0;

  return (
    <Card
      titulo={props.titulo}
      classe="flex flex-col justify-between transition-all hover:border-utfpr-500/40 hover:shadow-md cursor-pointer group"
    >
      <div
        onClick={() => {
          if (props.onAbrirCatalogo) props.onAbrirCatalogo(props.categoria);
        }}
      >
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {props.cumprido}
            <span className="font-sans text-sm font-normal text-zinc-400"> / {props.exigido}h</span>
          </span>
          {completo && (
            <Badge tom="ok" icon={<IconCheck className="h-3.5 w-3.5" />}>
              concluído
            </Badge>
          )}
        </div>
        <Barra valor={props.cumprido} max={props.exigido} />
        {props.rodape && <div className="mt-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{props.rodape}</div>}
      </div>

      <div className="mt-3.5 flex items-center justify-end border-t border-zinc-100 pt-1 dark:border-zinc-800">
        {/* min-h-11: no celular este link tinha 16px de altura, metade do
            mínimo confortável de toque */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (props.onAbrirCatalogo) props.onAbrirCatalogo(props.categoria);
          }}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-1 font-display text-xs font-black text-utfpr-500 transition-colors hover:text-utfpr-400"
        >
          <span>Exibir Lista</span>
          <span>→</span>
        </button>
      </div>
    </Card>
  );
}

export function TelaSituacao(props: {
  perfil: PerfilAluno | null;
  matriz: Matriz;
  onAbrirConfiguracoes?: () => void;
  onAbrirCatalogo?: (cat: CategoriaCatalogo) => void;
}) {
  const { perfil, matriz, onAbrirCatalogo } = props;
  const [avaliando, setAvaliando] = useState<AlvoAvaliacao | null>(null);

  /**
   * Disciplinas do último semestre do histórico — o conjunto que a RF16 convida a
   * avaliar. O semestre vem pronto de `DisciplinaCursada`, sem inferência.
   * Reprovadas entram de propósito: a opinião de quem reprovou é contexto legítimo.
   */
  const doUltimoSemestre = useMemo(() => {
    if (!perfil) return { semestre: null as string | null, itens: [] as AlvoAvaliacao[] };
    const avaliaveis = perfil.cursadas.filter(
      (c) => c.ano && c.semestre && (c.situacao === "aprovado" || c.situacao === "reprovado"),
    );
    if (!avaliaveis.length) return { semestre: null, itens: [] };
    const periodo = (c: { ano: number | null; semestre: number | null }) => `${c.ano}/${c.semestre}`;
    const ultimo = avaliaveis.map(periodo).sort().at(-1)!;
    const itens = avaliaveis
      .filter((c) => periodo(c) === ultimo)
      .map((c) => ({
        codigo: c.codigo,
        nome: matriz.disciplinas.find((d) => d.codigo === c.codigo)?.nome ?? nomeDeEletiva(c.codigo) ?? c.codigo,
        semestre: ultimo,
        situacao: c.situacao === "reprovado" ? ("reprovado" as const) : ("aprovado" as const),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return { semestre: ultimo, itens };
  }, [perfil, matriz]);

  const concluidasMapa = useMemo(() => {
    const mapa: Record<string, { codigo: string; nome: string; cht?: number | null }[]> = {
      obrigatorias: [],
      segundoEstrato: [],
      humanidades: [],
      opcoes: [],
      eletivas: [],
      extensao: [],
    };
    if (!perfil) return mapa;

    for (const c of perfil.cursadas) {
      if (c.situacao !== "aprovado" && c.situacao !== "consignado" && c.situacao !== "dispensado") continue;
      const dm = matriz.disciplinas.find((d) => d.codigo === c.codigo);
      // eletiva de outro curso não está na matriz: o nome vem da pool de eletivas
      const nome = dm ? dm.nome : nomeDeEletiva(c.codigo) ?? c.nome;
      const item = { codigo: c.codigo, nome, cht: c.cht || (dm ? dm.horas.total : null) };

      if (dm && dm.horas.chext > 0) {
        mapa.extensao.push(item);
      }

      if (c.origem === "obrigatoria" || (dm && dm.conjunto === null)) {
        mapa.obrigatorias.push(item);
      } else if (dm && categoriaSimples(descricaoDoCurso(matriz), dm.conjunto)?.id === "segundoEstrato") {
        mapa.segundoEstrato.push(item);
      } else if (dm && categoriaSimples(descricaoDoCurso(matriz), dm.conjunto)?.id === "humanidades") {
        mapa.humanidades.push(item);
      } else if (dm && ehGrupoOpcao(descricaoDoCurso(matriz), dm.conjunto)) {
        // o crédito é do grupo de topo, não da subárea em que a disciplina está
        const key = String(grupoOpcaoDe(descricaoDoCurso(matriz), dm.conjunto));
        if (!mapa[key]) mapa[key] = [];
        mapa[key].push(item);
        mapa.opcoes.push(item);
      } else if (dm && contaNoBlocoOptativo(descricaoDoCurso(matriz), dm.conjunto)) {
        const key = String(dm.conjunto);
        if (!mapa[key]) mapa[key] = [];
        mapa[key].push(item);
      } else {
        mapa.eletivas.push(item);
      }
    }
    return mapa;
  }, [perfil, matriz]);

  // Os estágios variam por curso: BSI tem dois de 200h, Eng. Comp. um de 400h.
  const estagios = useMemo(() => {
    const doCurso = descricaoDoCurso(matriz).estagios;
    const concluida = (c: { situacao: string }) =>
      c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado";
    return doCurso.map((e) => ({
      ...e,
      feito: Boolean(
        perfil?.cursadas.some(
          (c) =>
            (c.codigo === e.codigo ||
              c.nome.toLowerCase().includes(e.rotulo.toLowerCase())) &&
            concluida(c),
        ),
      ),
    }));
  }, [perfil, matriz]);

  const qtdEstagio = estagios.filter((e) => e.feito).length;

  const horasTotalPPC = matriz.cargas.ch_total_ppc || 3200;
  // A carga aprovada sai do Quadro Resumo do histórico, que já aplica os tetos por
  // categoria — eletivas, por exemplo, param no teto da matriz mesmo quando o aluno
  // cursou mais horas do que ele. Somar as cursadas devolveria um número acima do
  // oficial. A soma só é usada como fallback em histórico sem Quadro Resumo.
  const horasAprovadasGlobal = useMemo(() => {
    if (!perfil) return 0;
    const resumo = perfil.resumoGeral;
    if (resumo) {
      const oficial = resumo.obrigatorias.aprovada + resumo.optativas.aprovada + resumo.eletivas.aprovada;
      return Math.min(oficial, horasTotalPPC);
    }
    let soma = 0;
    for (const c of perfil.cursadas) {
      if (c.situacao === "aprovado" || c.situacao === "consignado" || c.situacao === "dispensado") {
        soma += c.cht || 0;
      }
    }
    return Math.min(soma, horasTotalPPC);
  }, [perfil, horasTotalPPC]);

  if (!perfil) {
    return (
      <Card titulo="Modo Livre — Sem Histórico Escolar Importado" classe="p-6 sm:p-8 text-center max-w-2xl mx-auto my-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6">
          Você está navegando no portal no modo <strong>Grade na Hora (Modo Livre)</strong> sem um histórico escolar do Portal do Aluno atrelado à sua sessão.
          Para visualizar o progresso de horas nos estratos (1º, 2º e 3º), trilhas cumpridas e checagem automática de pré-requisitos, importe seu PDF.
        </p>
        <button
          onClick={props.onAbrirConfiguracoes}
          className="inline-flex items-center gap-2 rounded-xl bg-utfpr-500 px-4 py-2.5 font-display text-xs font-bold text-zinc-950 shadow-xs transition-all hover:bg-utfpr-400 active:scale-[0.98]"
        >
          <span>Abrir Configurações e Importar Histórico (PDF)</span>
        </button>
      </Card>
    );
  }

  const painel = montarPainel(perfil, matriz);
  const obr = painel.obrigatorias;

  // A exigência do bloco de trilhas varia por curso: BSI pede 3 trilhas dentro
  // de 345h; Eng. Comp. pede 2 dentro de 270h. Ambos saem da descrição do curso
  // e do conjunto agregador da matriz.
  const cursoDesc = descricaoDoCurso(matriz);
  const totalExigido3Estrato =
    (cursoDesc.agregadorTrilhas
      ? matriz.conjuntos[String(cursoDesc.agregadorTrilhas)]?.ch
      : undefined) ?? 345;
  const somaCumpridoTrilhas =
    painel.blocoOptativo?.cumprido ??
    painel.trilhas.reduce((acc, t) => acc + t.cumprido, 0);
  const trilhasExigidas = cursoDesc.trilhasExigidas;
  const horasExcedentesTrilhas = Math.max(0, somaCumpridoTrilhas - totalExigido3Estrato);

  return (
    <div className="space-y-8">
      {painel.inconsistencias.map((inc) => (
        <div
          key={inc}
          className="flex items-center gap-2 rounded-xl border border-red-300/80 bg-red-50/80 p-3.5 text-sm font-medium text-red-800 dark:border-red-800/80 dark:bg-red-950/60 dark:text-red-200"
        >
          <IconWarning className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{inc}</span>
        </div>
      ))}

      {/* MINI CABEÇALHO COM PERÍODO, CR E PROGRESSO GLOBAL DE HORAS (ITEM 3) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 sm:gap-10">
          <div className="col-span-2 sm:col-span-1">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Período de Referência
            </span>
            <div className="mt-0.5 font-display text-lg font-black text-zinc-900 dark:text-zinc-100">
              {perfil.periodo ? `${perfil.periodo}º Período` : "Em Curso"}
              <span className="ml-2 font-sans text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                ({perfil.ingresso ? `Ingresso: ${perfil.ingresso}` : `Matriz ${matriz.matriz}`})
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          <div className="col-span-2 flex flex-row items-center justify-around gap-4 sm:gap-6 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2 dark:border-zinc-800/80 dark:bg-zinc-800/30 sm:col-span-1 sm:justify-start flex-nowrap whitespace-nowrap overflow-hidden">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                CR Absoluto
              </span>
              <div className="mt-0.5 font-display text-lg font-black text-utfpr-500">
                {perfil.coefAbsoluto?.toFixed(4) ?? "—"}
              </div>
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />

            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                CR Normalizado
              </span>
              <div className="mt-0.5 font-display text-lg font-black text-zinc-900 dark:text-zinc-100">
                {perfil.coefNormalizado?.toFixed(4) ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-auto lg:shrink-0">
          <Rosca
            valor={horasAprovadasGlobal}
            max={horasTotalPPC}
            tamanho={116}
            espessura={11}
            rotuloCentro="do curso"
            legenda={
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Progresso Geral do Curso
                </span>
                <div className="mt-1 font-display text-lg font-black text-zinc-900 dark:text-zinc-100">
                  {horasAprovadasGlobal}
                  <span className="font-sans text-xs font-semibold text-zinc-400"> / {horasTotalPPC}h</span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Faltam {Math.max(0, horasTotalPPC - horasAprovadasGlobal)}h para a integralização
                </p>
              </div>
            }
          />
        </div>
      </div>

      <section className={`grid gap-4 ${[obr, painel.segundoEstrato, painel.humanidades, painel.eletivas, painel.extensao, true].filter(Boolean).length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {obr && (
          <CardProgresso
            titulo={descricaoDoCurso(matriz).matriz === 981 ? "Obrigatórias (1º estrato)" : "Obrigatórias"}
            cumprido={obr.aprovada}
            exigido={obr.total}
            concluidas={concluidasMapa.obrigatorias}
            categoria="obrigatorias"
            onAbrirCatalogo={onAbrirCatalogo}
            rodape={
              perfil.obrigatoriasFaltantes.length ? (
                <div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    {perfil.obrigatoriasFaltantes.length === 1
                      ? "1 pendente:"
                      : `${perfil.obrigatoriasFaltantes.length} pendentes:`}
                  </span>
                  {renderizarTextoComCodigos(
                    perfil.obrigatoriasFaltantes
                      .slice(0, 3)
                      .map((f) => f.codigo)
                      .join(", "),
                    matriz
                  )}
                  {perfil.obrigatoriasFaltantes.length > 3 && (
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                      … e mais {perfil.obrigatoriasFaltantes.length - 3}
                    </span>
                  )}
                </div>
              ) : (
                "Todas as obrigatórias foram concluídas"
              )
            }
          />
        )}
        {painel.segundoEstrato && (
          <CardProgresso
            titulo="2º Estrato"
            cumprido={painel.segundoEstrato.cumprido}
            exigido={painel.segundoEstrato.exigido}
            concluidas={concluidasMapa.segundoEstrato}
            categoria="segundoEstrato"
            onAbrirCatalogo={onAbrirCatalogo}
          />
        )}
        {painel.humanidades && (
          <CardProgresso
            titulo="Ciclo de Humanidades"
            cumprido={painel.humanidades.cumprido}
            exigido={painel.humanidades.exigido}
            concluidas={concluidasMapa.humanidades}
            categoria="humanidades"
            onAbrirCatalogo={onAbrirCatalogo}
          />
        )}
        {painel.opcoes && (
          <CardProgresso
            titulo={cursoDesc.rotuloOpcoes ?? "Opções do Curso"}
            cumprido={painel.opcoes.cumprido}
            exigido={painel.opcoes.exigido}
            concluidas={concluidasMapa.opcoes}
            categoria="todas"
            onAbrirCatalogo={onAbrirCatalogo}
            rodape={
              painel.opcoes.gruposCumpridos === painel.opcoes.grupos.length
                ? "Todos os grupos de escolha foram cumpridos"
                : (() => {
                    const abertos = painel.opcoes!.grupos.filter((g) => g.cumprido < g.exigido);
                    return (
                      <div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                          {painel.opcoes!.gruposCumpridos} de {painel.opcoes!.grupos.length} grupos cumpridos.
                        </span>
                        <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                          Em aberto: {abertos.slice(0, 2).map((g) => g.nome).join(", ")}
                          {abertos.length > 2 && ` … e mais ${abertos.length - 2}`}
                        </span>
                      </div>
                    );
                  })()
            }
          />
        )}
        {painel.eletivas && (
          <CardProgresso
            titulo="Eletivas"
            cumprido={painel.eletivas.cumprido}
            exigido={painel.eletivas.exigido}
            concluidas={concluidasMapa.eletivas}
            categoria="eletivas"
            onAbrirCatalogo={onAbrirCatalogo}
          />
        )}
        {painel.extensao && (
          <CardProgresso
            titulo="Extensão Universitária"
            cumprido={painel.extensao.cumprido}
            exigido={painel.extensao.exigido}
            concluidas={concluidasMapa.extensao}
            categoria="extensao"
            onAbrirCatalogo={onAbrirCatalogo}
            rodape="Atividades extensionistas registradas no histórico"
          />
        )}
        <Card
          titulo="Estágio Curricular"
          classe="flex flex-col justify-between transition-all hover:border-utfpr-500/40 hover:shadow-md cursor-pointer group"
        >
          <div
            onClick={() => {
              if (onAbrirCatalogo) onAbrirCatalogo("todas");
            }}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Estágio {qtdEstagio}
                <span className="font-sans text-sm font-normal text-zinc-400"> / {estagios.length}</span>
              </span>
              {qtdEstagio === estagios.length && estagios.length > 0 && (
                <Badge tom="ok" icon={<IconCheck className="h-3.5 w-3.5" />}>
                  concluído
                </Badge>
              )}
            </div>

            {/* um bloco por estágio exigido pelo curso */}
            <div className="flex items-center gap-2 pt-1">
              {estagios.map((e) => (
                <div key={e.codigo} className="flex-1 space-y-1">
                  <div
                    className={`h-3.5 rounded-full transition-colors ${
                      e.feito
                        ? "bg-gradient-to-r from-utfpr-500 to-amber-500 shadow-xs"
                        : "bg-zinc-200/80 dark:bg-zinc-800"
                    }`}
                  />
                  <span className="block text-[10px] font-bold text-center uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {e.rotulo} ({e.ch}h)
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Estágio supervisionado obrigatório para a conclusão do curso
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-end border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAbrirCatalogo) onAbrirCatalogo("todas");
              }}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-1 font-display text-xs font-black text-utfpr-500 transition-colors hover:text-utfpr-400"
            >
              <span>Exibir Lista</span>
              <span>→</span>
            </button>
          </div>
        </Card>
      </section>

      {/* BLOCO ÚNICO DE TRILHAS NO MENU PRINCIPAL (ITEM 4) */}
      <section>
        <Card
          classe="p-6 transition-all hover:border-utfpr-500/40 hover:shadow-md cursor-pointer group bg-gradient-to-r from-white via-white to-utfpr-500/5 dark:from-zinc-900 dark:via-zinc-900 dark:to-utfpr-500/10"
        >
          <div
            onClick={() => {
              if (onAbrirCatalogo) onAbrirCatalogo("trilhas");
            }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {cursoDesc.rotuloBlocoTrilhas}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Exigência do curso: validação integral de <strong>{trilhasExigidas} {trilhasExigidas === 1 ? "trilha" : "trilhas distintas"}</strong>, com mínimo de {totalExigido3Estrato}h no total.
                  {cursoDesc.naoValidaveis.length > 0 &&
                    " As optativas isoladas também somam para o total, mas não validam uma trilha."}
                </p>
              </div>
              <Badge
                tom={painel.trilhasValidadas >= trilhasExigidas ? "ok" : "acento"}
                classe="px-3 py-1 text-xs font-bold shrink-0"
              >
                {painel.trilhasValidadas} de {trilhasExigidas} {trilhasExigidas === 1 ? "trilha validada" : "trilhas validadas"}
              </Badge>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    {cursoDesc.matriz === 981 ? "Total cursado no estrato:" : "Total cursado no bloco optativo:"}
                  </span>
                  <span className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {somaCumpridoTrilhas} <span className="font-sans text-xs font-normal text-zinc-400">/ {totalExigido3Estrato}h</span>
                  </span>
                </div>
                <Barra valor={somaCumpridoTrilhas} max={totalExigido3Estrato} />
                {cursoDesc.matriz === 844 &&
                  painel.blocoOptativo?.validado !== undefined && (
                    <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {painel.blocoOptativo.validado}h já validadas no histórico.
                      As demais horas aprovadas passam a integralizar o bloco conforme
                      a validação das duas trilhas obrigatórias.
                    </p>
                  )}
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Trilhas Concluídas:</span>
                  <span className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {painel.trilhasValidadas} <span className="font-sans text-xs font-normal text-zinc-400">/ {trilhasExigidas}</span>
                  </span>
                </div>
                <Barra valor={painel.trilhasValidadas} max={trilhasExigidas} destaque={painel.trilhasValidadas > 0} />
                {painel.trilhas.filter(t => t.validado).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {painel.trilhas.filter(t => t.validado).map(t => (
                      <div key={t.conjunto} className="flex items-center justify-between text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 rounded px-1.5 py-0.5">
                        <span className="truncate pr-2" title={t.nome}>✓ {t.nome}</span>
                        <span className="shrink-0 font-mono">({t.cumprido}/{t.exigido}h)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-zinc-50 p-3 border border-zinc-200/60 dark:bg-zinc-800/50 dark:border-zinc-700/60">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Horas Excedentes / Saldo Extra:
                </span>
                <div className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  +{horasExcedentesTrilhas}h <span className="font-sans text-xs font-normal text-zinc-400">acima do mínimo</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAbrirCatalogo) onAbrirCatalogo("trilhas");
                }}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-1 font-display text-xs font-black text-utfpr-500 transition-colors hover:text-utfpr-400"
              >
                <span>Exibir Lista</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </Card>
      </section>

      {coletaHabilitada() && doUltimoSemestre.itens.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Avaliar o semestre {doUltimoSemestre.semestre}
          </h2>
          <Card>
            <p className="mb-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              Sua experiência ajuda quem vai escolher turma. A avaliação é pública e
              assinada com o seu nome; seu RA não é publicado.
            </p>
            <div className="space-y-1.5">
              {doUltimoSemestre.itens.map((d) => (
                <div
                  key={`${d.codigo}-${d.semestre}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 px-3 py-2 dark:border-zinc-800/70"
                >
                  <span className="min-w-0 text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-mono text-xs font-bold">{d.codigo}</span>{" "}
                    <span className="truncate">{d.nome}</span>
                    {d.situacao === "reprovado" && (
                      <span className="ml-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                        reprovada
                      </span>
                    )}
                  </span>
                  <Botao onClick={() => setAvaliando(d)} variante="sutil" classe="shrink-0 !px-3 !py-1.5 !text-xs">
                    Avaliar
                  </Botao>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <ModalAvaliacao
        alvo={avaliando}
        autor={perfil.nome}
        ra={perfil.matricula}
        onFechar={() => setAvaliando(null)}
      />

      {perfil.dependencias.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Disciplinas em Dependência
          </h2>
          <div className="flex flex-wrap gap-2">
            {perfil.dependencias.map((d) => (
              <Badge key={d.codigo} tom="alerta" icon={<IconWarning className="h-3.5 w-3.5" />}>
                <span className="font-mono font-bold cursor-help" title={`${d.codigo} — ${d.nome}`}>
                  {d.codigo}
                </span>{" "}
                — {d.nome}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
