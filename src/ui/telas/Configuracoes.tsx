import { useState } from "react";
import type { PerfilAluno } from "../../domain/tipos";
import { Botao, Badge } from "../componentes";
import {
  IconX,
  IconSun,
  IconMoon,
  IconMonitor,
  IconUpload,
  IconUser,
  IconTrash,
  IconWarning,
} from "../icons";

export interface Preferencias {
  tema: "sistema" | "claro" | "escuro";
  layout: "oasis" | "gnh";
  modoPlanejamento?: "previa" | "corrido";
  filtrarConflitos?: boolean;
  campus?: string;
  curso?: string;
  matriz?: string;
  semestreAtivo?: string;
}

export function TelaConfiguracoes(props: {
  aberto: boolean;
  onFechar: () => void;
  preferencias: Preferencias;
  onSalvarPreferencias: (p: Preferencias) => void;
  perfil: PerfilAluno | null;
  onAtualizarPDF: (file: File) => void;
  onAnalisarPDF?: (file: File) => Promise<PerfilAluno>;
  onConfirmarPDF?: (perfil: PerfilAluno) => void;
  onTrocarUsuario: () => void;
  onLimparDados: () => void;
  carregandoPDF: boolean;
}) {
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const [perfilPreview, setPerfilPreview] = useState<PerfilAluno | null>(null);
  const [erroPreview, setErroPreview] = useState<string | null>(null);
  const [processandoPreview, setProcessandoPreview] = useState(false);

  if (!props.aberto) return null;

  const { preferencias, onSalvarPreferencias } = props;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onFechar();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Configurações da Plataforma
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Personalize a aparência, gerencie seu histórico escolar e controle seus dados locais.
            </p>
          </div>
          <button
            onClick={props.onFechar}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-8 py-6">
          {/* Seção 1: Tema e Aparência */}
          <div className="space-y-3">
            <label className="block font-display text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Aparência do Sistema (Modo de Cor)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "sistema" as const, rotulo: "Sistema", icon: IconMonitor },
                { id: "claro" as const, rotulo: "Claro", icon: IconSun },
                { id: "escuro" as const, rotulo: "Escuro", icon: IconMoon },
              ].map((op) => {
                const ativo = preferencias.tema === op.id;
                const Icone = op.icon;
                return (
                  <button
                    key={op.id}
                    onClick={() => onSalvarPreferencias({ ...preferencias, tema: op.id })}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-xs font-semibold transition-all ${
                      ativo
                        ? "border-utfpr-500 bg-utfpr-500/15 text-zinc-900 dark:text-white font-bold shadow-2xs"
                        : "border-zinc-200/80 bg-zinc-50/60 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Icone className={`w-5 h-5 ${ativo ? "text-utfpr-600 dark:text-utfpr-400" : ""}`} />
                    <span>{op.rotulo}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Preferências de Layout */}
          <div className="space-y-3">
            <label className="block font-display text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Estilo de Navegação (Layout)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: "oasis" as const,
                  rotulo: "Layout Oásis (Completo)",
                  desc: "Abas separadas, foco em progresso de estratos, estatísticas e visão estratégica.",
                },
                {
                  id: "gnh" as const,
                  rotulo: "Layout Grade na Hora",
                  desc: "Foco rápido em montagem de grade horária, turmas abertas e simulação direta.",
                },
              ].map((op) => {
                const ativo = preferencias.layout === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => onSalvarPreferencias({ ...preferencias, layout: op.id })}
                    className={`flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-all ${
                      ativo
                        ? "border-utfpr-500 bg-utfpr-500/15 dark:bg-utfpr-500/10 shadow-2xs"
                        : "border-zinc-200/80 bg-zinc-50/60 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-display text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {op.rotulo}
                      </span>
                      {ativo && <Badge tom="acento">Ativo</Badge>}
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {op.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 2.1: Filtro de Conflitos em Tempo Real */}
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
            <div>
              <span className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Filtrar horários que não encaixam na grade
              </span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Oculta automaticamente turmas e disciplinas que entram em conflito com as matérias que você já selecionou.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onSalvarPreferencias({
                  ...preferencias,
                  filtrarConflitos: !preferencias.filtrarConflitos,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                preferencias.filtrarConflitos ? "bg-utfpr-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  preferencias.filtrarConflitos ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Seção 3: Gerenciar Histórico e Usuário */}
          <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Sessão e Histórico Escolar
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {props.perfil
                    ? `Sessão ativa para ${props.perfil.nome.split(" ")[0]} (${props.perfil.periodo}º período)`
                    : "Você está navegando em Modo Livre sem histórico escolar submetido."}
                </p>
              </div>
              {props.perfil ? <Badge tom="ok">PDF Ativo</Badge> : <Badge tom="neutro">Modo Livre</Badge>}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-utfpr-500 px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-xs transition-all hover:bg-utfpr-400 active:scale-[0.98]">
                <IconUpload className="w-4 h-4" />
                <span>{processandoPreview || props.carregandoPDF ? "Analisando PDF..." : "Carregar histórico atualizado (PDF)"}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      if (props.onAnalisarPDF && props.onConfirmarPDF) {
                        setErroPreview(null);
                        setProcessandoPreview(true);
                        try {
                          const p = await props.onAnalisarPDF(file);
                          setPerfilPreview(p);
                        } catch (err) {
                          setErroPreview(err instanceof Error ? err.message : String(err));
                        } finally {
                          setProcessandoPreview(false);
                        }
                      } else {
                        props.onAtualizarPDF(file);
                        props.onFechar();
                      }
                    }
                  }}
                />
              </label>

              <Botao variante="sutil" onClick={() => { props.onTrocarUsuario(); props.onFechar(); }}>
                <IconUser className="w-4 h-4 shrink-0" />
                <span>Trocar usuário / Encerrar sessão</span>
              </Botao>
            </div>

            {processandoPreview && (
              <div className="mt-3 rounded-xl bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                ⏳ Lendo e extraindo dados do seu novo Histórico Escolar...
              </div>
            )}

            {erroPreview && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                ⚠️ Erro ao ler PDF: {erroPreview}
              </div>
            )}

            {perfilPreview && (
              <div className="mt-4 rounded-2xl border-2 border-utfpr-500 bg-utfpr-500/10 p-4 space-y-3 dark:bg-utfpr-500/5 animate-in fade-in duration-200">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge tom="acento">📄 Pré-visualização — Confirmação Dupla</Badge>
                    <h4 className="font-display font-bold text-base text-zinc-900 dark:text-zinc-100 mt-2">
                      {perfilPreview.nome} — {perfilPreview.curso}
                    </h4>
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 mt-1.5 space-y-1">
                      <p><strong>Período Letivo mais Recente:</strong> {perfilPreview.periodoDocumento || `${perfilPreview.periodo}º Período`}</p>
                      {perfilPreview.dataEmissao && (
                        <p><strong>Data de Emissão do Documento:</strong> {perfilPreview.dataEmissao}</p>
                      )}
                      <p><strong>Disciplinas Aprovadas Detectadas:</strong> {perfilPreview.aprovadas.size} matérias | <strong>CR Absoluto:</strong> {perfilPreview.coefAbsoluto ?? "N/A"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPerfilPreview(null)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    title="Descartar preview"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-utfpr-500/20">
                  <Botao variante="sutil" onClick={() => setPerfilPreview(null)}>
                    Cancelar
                  </Botao>
                  <Botao
                    variante="primario"
                    onClick={() => {
                      if (props.onConfirmarPDF && perfilPreview) {
                        props.onConfirmarPDF(perfilPreview);
                        setPerfilPreview(null);
                        props.onFechar();
                      }
                    }}
                  >
                    <IconUpload className="w-4 h-4 mr-1.5 inline" />
                    Clique em Concluir e Fechar para firmar suas alterações
                  </Botao>
                </div>
              </div>
            )}
          </div>

          {/* Seção 4: Zona de Perigo - Limpeza de Dados */}
          <div className="space-y-3 rounded-2xl border border-red-200/80 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-display text-sm font-bold text-red-800 dark:text-red-300">
                  Limpar Dados Locais
                </span>
                <p className="text-xs text-red-600/90 dark:text-red-400/90 mt-0.5">
                  Esta ação apaga todo o histórico salvo, grade horária e preferências armazenadas
                  no seu navegador (`localStorage`). A plataforma voltará ao estado original.
                </p>
              </div>
              {!confirmandoLimpeza ? (
                <Botao variante="perigo" onClick={() => setConfirmandoLimpeza(true)}>
                  <IconTrash className="w-4 h-4 shrink-0" />
                  <span>Limpar Dados</span>
                </Botao>
              ) : (
                <div className="flex items-center gap-2">
                  <Botao
                    variante="perigo"
                    onClick={() => {
                      props.onLimparDados();
                      props.onFechar();
                    }}
                  >
                    <span>Sim, apagar tudo</span>
                  </Botao>
                  <Botao variante="sutil" onClick={() => setConfirmandoLimpeza(false)}>
                    Cancelar
                  </Botao>
                </div>
              )}
            </div>
            {confirmandoLimpeza && (
              <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300 pt-1">
                <IconWarning className="w-4 h-4 shrink-0" />
                <span>Tem certeza? Esta ação não pode ser desfeita.</span>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex justify-end border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
          <Botao variante="primario" onClick={props.onFechar}>
            Concluído e Fechar
          </Botao>
        </div>
      </div>
    </div>
  );
}
