import type { Matriz, PerfilAluno } from "../../domain/tipos";
import { montarPainel } from "../../domain/motor/situacao";
import { Badge, Barra, Card } from "../componentes";
import { IconCheck, IconWarning } from "../icons";

function CardProgresso(props: {
  titulo: string;
  cumprido: number;
  exigido: number;
  rodape?: string;
}) {
  const completo = props.cumprido >= props.exigido && props.exigido > 0;
  return (
    <Card titulo={props.titulo}>
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
      {props.rodape && <p className="mt-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{props.rodape}</p>}
    </Card>
  );
}

export function TelaSituacao(props: { perfil: PerfilAluno; matriz: Matriz }) {
  const { perfil, matriz } = props;
  const painel = montarPainel(perfil, matriz);
  const obr = painel.obrigatorias;

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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {obr && (
          <CardProgresso
            titulo="Obrigatórias (1º estrato)"
            cumprido={obr.aprovada}
            exigido={obr.total}
            rodape={
              perfil.obrigatoriasFaltantes.length
                ? `Pendentemente: ${perfil.obrigatoriasFaltantes.map((f) => f.codigo).join(", ")}`
                : "Todas as obrigatórias foram concluídas"
            }
          />
        )}
        {painel.segundoEstrato && (
          <CardProgresso
            titulo="2º Estrato"
            cumprido={painel.segundoEstrato.cumprido}
            exigido={painel.segundoEstrato.exigido}
          />
        )}
        {painel.humanidades && (
          <CardProgresso
            titulo="Ciclo de Humanidades"
            cumprido={painel.humanidades.cumprido}
            exigido={painel.humanidades.exigido}
          />
        )}
        {painel.eletivas && (
          <CardProgresso
            titulo="Eletivas"
            cumprido={painel.eletivas.cumprido}
            exigido={painel.eletivas.exigido}
          />
        )}
        {painel.extensao && (
          <CardProgresso
            titulo="Extensão Universitária"
            cumprido={painel.extensao.cumprido}
            exigido={painel.extensao.exigido}
            rodape="Atividades extensionistas registradas no histórico"
          />
        )}
        <Card titulo="Coeficiente de Rendimento">
          <div className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {perfil.coefAbsoluto?.toFixed(4) ?? "—"}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Normalizado: <strong className="text-zinc-700 dark:text-zinc-300">{perfil.coefNormalizado?.toFixed(4) ?? "—"}</strong> · O coeficiente define sua prioridade na alocação de vagas
          </p>
        </Card>
      </section>

      <section className="space-y-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-200/80 pb-2 dark:border-zinc-800/80">
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Trilhas em Computação (3º Estrato)
          </h2>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {painel.trilhasValidadas} de 3 trilhas validadas · Exigência total de 345h no estrato
          </span>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {painel.trilhas.map((t) => (
            <Card key={t.conjunto} classe="p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate font-display text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {t.nome}
                </span>
                {t.validado ? (
                  <Badge tom="ok" icon={<IconCheck className="h-3 w-3" />}>
                    validada
                  </Badge>
                ) : t.cumprido > 0 ? (
                  <Badge tom="acento">{t.cumprido}h</Badge>
                ) : null}
              </div>
              <Barra valor={t.cumprido} max={t.exigido} destaque={t.cumprido > 0} />
            </Card>
          ))}
        </div>
      </section>

      {perfil.dependencias.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Disciplinas em Dependência
          </h2>
          <div className="flex flex-wrap gap-2">
            {perfil.dependencias.map((d) => (
              <Badge key={d.codigo} tom="alerta" icon={<IconWarning className="h-3.5 w-3.5" />}>
                <span className="font-mono font-bold">{d.codigo}</span> — {d.nome}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
