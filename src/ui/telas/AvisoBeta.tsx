// Faixa de ambiente do beta aberto.
//
// Só existe no build do sandbox: `__OASIS_BETA__` é constante trocada no build,
// então na produção o componente inteiro sai do bundle.
//
// É grande de propósito. O beta serve o MESMO código do site, com os mesmos
// dados e a mesma cara — quem chega por um link não tem como saber que está numa
// cópia de teste, e um erro visto aqui vira relato de bug do produto. A faixa é
// a única coisa que separa os dois na tela.
//
// O telefone do dono do projeto NÃO entra aqui. O aviso é público e fica no ar;
// o número circula pelo grupo dos dois cursos, que é onde a pessoa já é
// conhecida por alguém.
import { IconWarning } from "../icons";

declare const __OASIS_BETA__: boolean;

const EMAIL = "oasisutfpr@gmail.com";
const SITE_ESTAVEL = "https://oasisutfpr.com.br";

export function AvisoBeta() {
  if (!__OASIS_BETA__) return null;

  return (
    <div className="mx-auto mb-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border-2 border-amber-500/80 bg-amber-50 shadow-lg dark:border-amber-500/60 dark:bg-amber-950/60">
        <div className="flex items-center gap-3 border-b-2 border-amber-500/50 bg-amber-500 px-5 py-3 dark:bg-amber-500/90">
          <IconWarning className="h-6 w-6 shrink-0 text-zinc-950" />
          <span className="font-display text-lg font-black uppercase tracking-wide text-zinc-950 sm:text-xl">
            Ambiente de testes — não é o Oásis oficial
          </span>
        </div>

        <div className="space-y-4 p-5 text-sm leading-relaxed text-amber-950 dark:text-amber-100">
          <p className="text-base font-semibold">
            Esta ainda não é a versão final do Oásis. Ela serve para testar funcionalidades
            antes do deploy oficial, então pode conter erros, dados incompletos e telas que
            mudam de um dia para o outro.
          </p>

          <p>
            Para usar a versão estável, acesse{" "}
            <a
              href={SITE_ESTAVEL}
              className="font-black underline decoration-2 underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300"
            >
              oasisutfpr.com.br
            </a>
            .
          </p>

          <div className="rounded-2xl border border-amber-500/40 bg-white/70 p-4 dark:bg-zinc-950/40">
            <p className="font-bold">Achou um erro aqui? Me avise.</p>
            <p className="mt-1.5">
              Por e-mail, em{" "}
              <a
                href={`mailto:${EMAIL}`}
                className="font-bold underline decoration-2 underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300"
              >
                {EMAIL}
              </a>
              . Ou pelo telefone pessoal do Rômulo, que não fica público: qualquer pessoa de
              Engenharia de Computação ou Sistemas de Informação que esteja no grupo com gente
              dos dois cursos consegue passar o contato.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
