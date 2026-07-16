import type { Matriz, PerfilAluno } from "../../domain/tipos";
import { montarPainel } from "../../domain/motor/situacao";
import { Badge, Barra, Card } from "../componentes";

function CardProgresso(props: {
  titulo: string;
  cumprido: number;
  exigido: number;
  rodape?: string;
}) {
  const completo = props.cumprido >= props.exigido;
  return (
    <Card titulo={props.titulo}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-2xl font-bold">
          {props.cumprido}
          <span className="text-sm font-normal text-zinc-400"> / {props.exigido}h</span>
        </span>
        {completo && <Badge tom="ok">completo</Badge>}
      </div>
      <Barra valor={props.cumprido} max={props.exigido} />
      {props.rodape && <p className="mt-2 text-xs text-zinc-500">{props.rodape}</p>}
    </Card>
  );
}

export function TelaSituacao(props: { perfil: PerfilAluno; matriz: Matriz }) {
  const { perfil, matriz } = props;
  const painel = montarPainel(perfil, matriz);
  const obr = painel.obrigatorias;

  return (
    <div className="space-y-6">
      {painel.inconsistencias.map((inc) => (
        <div
          key={inc}
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {inc}
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
                ? `faltam: ${perfil.obrigatoriasFaltantes.map((f) => f.codigo).join(", ")}`
                : "todas cumpridas"
            }
          />
        )}
        {painel.segundoEstrato && (
          <CardProgresso
            titulo="2º estrato"
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
            titulo="Extensão"
            cumprido={painel.extensao.cumprido}
            exigido={painel.extensao.exigido}
            rodape="atividades extensionistas registradas no histórico"
          />
        )}
        <Card titulo="Coeficiente">
          <div className="text-2xl font-bold">{perfil.coefAbsoluto?.toFixed(4) ?? "—"}</div>
          <p className="mt-1 text-xs text-zinc-500">
            normalizado: {perfil.coefNormalizado?.toFixed(4) ?? "—"} · o coeficiente define
            sua prioridade na disputa por vagas
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-bold">Trilhas em Computação</h2>
          <span className="text-sm text-zinc-500">
            {painel.trilhasValidadas} de 3 trilhas validadas · 345h no total do 3º estrato
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {painel.trilhas.map((t) => (
            <Card key={t.conjunto}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{t.nome}</span>
                {t.validado ? (
                  <Badge tom="ok">validada</Badge>
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
        <section>
          <h2 className="mb-2 font-bold">Dependências</h2>
          <div className="flex flex-wrap gap-2">
            {perfil.dependencias.map((d) => (
              <Badge key={d.codigo} tom="alerta">
                {d.codigo} — {d.nome}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
