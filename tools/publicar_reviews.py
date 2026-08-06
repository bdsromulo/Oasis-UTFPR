#!/usr/bin/env python3
"""
Roda o fluxo inteiro de publicação das avaliações da comunidade, do CSV da
planilha até o site no ar. É o equivalente local do workflow
`.github/workflows/ingerir-reviews.yml`, para quando não se quer esperar a
segunda-feira nem abrir a aba do Actions.

    python tools/publicar_reviews.py

Faz, nesta ordem, parando no primeiro problema:

  1. resolve a URL do CSV da aba `Homologado` (ver §"De onde vem a URL");
  2. confere que a árvore está limpa e no branch certo — publicar por cima de
     trabalho pela metade é o erro que este passo existe para impedir;
  3. baixa e valida o CSV via `scripts/ingerir-reviews.ts`, regenerando
     `data/reviews.json` (qualquer erro aborta sem publicar nada);
  4. roda `npm test` sobre o acervo recém-gerado, como o Action faz;
  5. mostra o que mudou e pede confirmação;
  6. commita e dá push, o que dispara o deploy do Pages.

Sem mudança no acervo, para no passo 3 e não commita nada — o `geradoEm` só
avança quando o conteúdo muda de fato, então rodar duas vezes seguidas é
inofensivo.

De onde vem a URL
-----------------
Na primeira vez o script pergunta e oferece salvar em `.env.local`, que o
`.gitignore` já cobre. Ordem de busca: `--url` > `URL_CSV_REVIEWS` no ambiente >
`.env.local` > variável `URL_CSV_REVIEWS` do repositório no GitHub (via `gh`) >
pergunta. A URL não é segredo (a aba publicada é pública por construção), e por
isso mora em *variable*, nunca em *secret* — esconder da revisão uma informação
já pública só atrapalha a auditoria.

Requisitos: Node com as dependências instaladas (`npm ci`), Git e, opcional,
o `gh` autenticado para ler/gravar a variável do repositório.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# O console do Windows abre em cp1252, e aí todo acento desta saída vira lixo
# ("avalia��es"). Reconfigurar aqui vale para o script inteiro e é inofensivo
# onde a saída já é UTF-8.
for _fluxo in (sys.stdout, sys.stderr):
    if hasattr(_fluxo, "reconfigure"):
        try:
            _fluxo.reconfigure(encoding="utf-8", errors="replace")
        except (OSError, ValueError):  # fluxo redirecionado que não aceita
            pass

RAIZ = Path(__file__).resolve().parent.parent
ACERVO = RAIZ / "data" / "reviews.json"
ENV_LOCAL = RAIZ / ".env.local"
CHAVE = "URL_CSV_REVIEWS"
REPO_PRODUCAO = "bdsromulo/Oasis-UTFPR"
BRANCH_PUBLICACAO = "main"


# --------------------------------------------------------------------------
# saída
# --------------------------------------------------------------------------

def _suporta_cor() -> bool:
    return sys.stdout.isatty() and os.environ.get("TERM") != "dumb"


COR = _suporta_cor()


def _pinta(texto: str, codigo: str) -> str:
    return f"\033[{codigo}m{texto}\033[0m" if COR else texto


def passo(n: int, total: int, texto: str) -> None:
    print(_pinta(f"\n[{n}/{total}] {texto}", "1;36"))


def ok(texto: str) -> None:
    print(_pinta(f"  OK  {texto}", "32"))


def aviso(texto: str) -> None:
    print(_pinta(f"  !   {texto}", "33"))


def erro(texto: str) -> None:
    # stdout e stderr têm buffers independentes: sem o flush o erro aparece
    # acima do passo que o causou, e a leitura fica invertida
    sys.stdout.flush()
    print(_pinta(f"  X   {texto}", "31"), file=sys.stderr)
    sys.stderr.flush()


def abortar(texto: str, dica: str = "") -> "NoReturn":  # type: ignore[valid-type]
    erro(texto)
    if dica:
        print(f"      {dica}", file=sys.stderr)
    sys.exit(1)


# --------------------------------------------------------------------------
# processos externos
# --------------------------------------------------------------------------

def executavel(nome: str) -> str | None:
    """Resolve o binário. No Windows `npx`/`gh` são `.cmd`, que `which` acha."""
    return shutil.which(nome)


def rodar(
    cmd: list[str],
    *,
    silencioso: bool = False,
    checar: bool = True,
    env_extra: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    ambiente = {**os.environ, **(env_extra or {})}
    # o filho escreve direto no console; sem esvaziar o nosso buffer antes, a
    # saída dele aparece acima do cabeçalho do passo que o disparou
    if not silencioso:
        sys.stdout.flush()
    proc = subprocess.run(
        cmd,
        cwd=RAIZ,
        env=ambiente,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=silencioso,
    )
    if checar and proc.returncode != 0:
        if silencioso:
            # sem isto o erro real do subprocesso some e sobra só o código
            for fluxo in (proc.stdout, proc.stderr):
                if fluxo and fluxo.strip():
                    print(fluxo.rstrip(), file=sys.stderr)
        abortar(f"comando falhou ({proc.returncode}): {' '.join(cmd)}")
    return proc


def git(*args: str, silencioso: bool = True, checar: bool = True) -> str:
    proc = rodar(["git", *args], silencioso=silencioso, checar=checar)
    return (proc.stdout or "").strip()


# --------------------------------------------------------------------------
# 1. URL do CSV
# --------------------------------------------------------------------------

def ler_env_local() -> str | None:
    if not ENV_LOCAL.exists():
        return None
    for linha in ENV_LOCAL.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        nome, valor = linha.split("=", 1)
        if nome.strip() == CHAVE:
            return valor.strip().strip('"').strip("'") or None
    return None


def ler_variavel_github() -> str | None:
    if not executavel("gh"):
        return None
    proc = rodar(
        ["gh", "variable", "get", CHAVE, "--repo", REPO_PRODUCAO],
        silencioso=True,
        checar=False,
    )
    valor = (proc.stdout or "").strip()
    return valor if proc.returncode == 0 and valor else None


def salvar_env_local(url: str) -> None:
    linhas: list[str] = []
    if ENV_LOCAL.exists():
        linhas = [
            l for l in ENV_LOCAL.read_text(encoding="utf-8").splitlines()
            if not l.strip().startswith(f"{CHAVE}=")
        ]
    else:
        linhas = [
            "# Configuração local do Oásis — coberta pelo .gitignore (.env.*),",
            "# não versionar. A URL abaixo é pública; não é segredo.",
        ]
    linhas.append(f"{CHAVE}={url}")
    ENV_LOCAL.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    ok(f"URL salva em {ENV_LOCAL.name} (ignorado pelo Git)")


def validar_forma_da_url(url: str) -> None:
    if not url.startswith("https://"):
        abortar("a URL precisa começar com https://")
    if "docs.google.com" not in url:
        aviso("a URL não parece ser do Google Sheets — siga só se souber o que está fazendo")
    elif "output=csv" not in url and "/pub?" not in url and "export?format=csv" not in url:
        aviso(
            "a URL não termina em CSV. Use Arquivo → Compartilhar → "
            "Publicar na web → aba Homologado → Valores separados por vírgula (.csv)"
        )


def resolver_url(arg: str | None, interativo: bool) -> str:
    for origem, valor in (
        ("--url", arg),
        (f"variável de ambiente {CHAVE}", os.environ.get(CHAVE)),
        (f"{ENV_LOCAL.name}", ler_env_local()),
        (f"variável do repositório {REPO_PRODUCAO}", ler_variavel_github()),
    ):
        if valor:
            ok(f"URL do CSV obtida de: {origem}")
            validar_forma_da_url(valor)
            return valor

    if not interativo:
        abortar(
            f"{CHAVE} não configurada.",
            "Passe --url, exporte a variável, ou rode sem --sim para informar interativamente.",
        )

    print(
        "\n  A URL do CSV da aba `Homologado` ainda não está configurada.\n"
        "  Obtenha em: Google Sheets → Arquivo → Compartilhar → Publicar na web\n"
        "              → aba `Homologado` → Valores separados por vírgula (.csv)\n"
    )
    url = input("  Cole a URL: ").strip()
    if not url:
        abortar("nenhuma URL informada.")
    validar_forma_da_url(url)
    if perguntar(f"  Salvar em {ENV_LOCAL.name} para as próximas execuções?", padrao=True):
        salvar_env_local(url)
    return url


def conferir_variavel_do_action(url: str, interativo: bool) -> None:
    """
    O Action semanal lê `vars.URL_CSV_REVIEWS`; sem ela a ingestão automática
    falha toda segunda mesmo com o fluxo local funcionando. Como o script já tem
    a URL em mãos, avisa e oferece corrigir de uma vez.
    """
    if not executavel("gh"):
        return
    if ler_variavel_github():
        return
    aviso(f"{CHAVE} não está configurada em {REPO_PRODUCAO} — a ingestão semanal falharia.")
    if interativo and perguntar("  Configurar agora no repositório?", padrao=True):
        proc = rodar(
            ["gh", "variable", "set", CHAVE, "--repo", REPO_PRODUCAO, "--body", url],
            silencioso=True,
            checar=False,
        )
        if proc.returncode == 0:
            ok("variável do repositório configurada; o Action semanal agora roda sozinho")
        else:
            aviso("não foi possível configurar (permissão do token?); faça em Settings → Variables")


# --------------------------------------------------------------------------
# 2. estado do repositório
# --------------------------------------------------------------------------

def perguntar(texto: str, *, padrao: bool = False) -> bool:
    sufixo = "[S/n]" if padrao else "[s/N]"
    try:
        resposta = input(f"{texto} {sufixo} ").strip().lower()
    except EOFError:
        return padrao
    if not resposta:
        return padrao
    return resposta in ("s", "sim", "y", "yes")


def conferir_repositorio(publicar: bool, interativo: bool) -> None:
    if not (RAIZ / ".git").exists():
        abortar(f"{RAIZ} não é um repositório Git.")
    if not (RAIZ / "node_modules").exists() or not any((RAIZ / "node_modules").iterdir()):
        abortar("node_modules ausente ou vazio.", "Rode: npm ci")

    sujo = git("status", "--porcelain")
    if sujo:
        # o acervo é regenerado adiante; qualquer outra pendência entraria no
        # commit por engano ou seria publicada sem revisão
        outros = [l for l in sujo.splitlines() if "data/reviews.json" not in l]
        if outros:
            erro("há mudanças não commitadas além do acervo:")
            for linha in outros:
                print(f"      {linha}", file=sys.stderr)
            abortar("commite ou guarde essas mudanças antes de publicar.")
        aviso("data/reviews.json já tinha mudanças locais; serão sobrescritas pela ingestão")

    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    if publicar and branch != BRANCH_PUBLICACAO:
        erro(f"branch atual é '{branch}', não '{BRANCH_PUBLICACAO}'.")
        abortar(
            "publicar daqui não atualizaria o site.",
            f"Rode: git checkout {BRANCH_PUBLICACAO}   (ou use --somente-gerar)",
        )
    ok(f"árvore limpa, no branch '{branch}'")


# --------------------------------------------------------------------------
# 3-4. ingestão e testes
# --------------------------------------------------------------------------

def carregar_acervo() -> dict:
    try:
        return json.loads(ACERVO.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def ingerir(url: str) -> None:
    npx = executavel("npx")
    if not npx:
        abortar("npx não encontrado no PATH.", "Instale o Node.js 22+.")
    rodar([npx, "tsx", "scripts/ingerir-reviews.ts"], env_extra={CHAVE: url})


def resumir_mudanca(antes: dict, depois: dict) -> tuple[bool, list[str]]:
    ids_antes = {r["id"] for r in antes.get("reviews", [])}
    ids_depois = {r["id"] for r in depois.get("reviews", [])}
    novas, removidas = ids_depois - ids_antes, ids_antes - ids_depois

    # o id é hash de (carimbo, autor, código, semestre, professor): editar o
    # texto de uma avaliação muda o conteúdo sem mudar o id, então comparar só
    # os conjuntos de id não basta para dizer que nada mudou
    por_id = {r["id"]: r for r in antes.get("reviews", [])}
    editadas = [
        r["id"] for r in depois.get("reviews", [])
        if r["id"] in por_id and r != por_id[r["id"]]
    ]

    linhas = []
    if novas:
        linhas.append(f"{len(novas)} avaliação(ões) nova(s)")
    if removidas:
        linhas.append(f"{len(removidas)} removida(s) (desaprovada(s) na curadoria)")
    if editadas:
        linhas.append(f"{len(editadas)} editada(s)")
    mudou = bool(novas or removidas or editadas)
    return mudou, linhas


# --------------------------------------------------------------------------
# 6. publicação
# --------------------------------------------------------------------------

def publicar(remotos: list[str]) -> None:
    git("add", "--", str(ACERVO.relative_to(RAIZ)).replace("\\", "/"))
    rodar(
        ["git", "commit", "-m", "chore(reviews): ingestão do acervo da comunidade"],
        silencioso=True,
    )
    ok("commit criado")
    for remoto in remotos:
        rodar(["git", "push", remoto, f"HEAD:{BRANCH_PUBLICACAO}"], silencioso=True)
        ok(f"push para '{remoto}' concluído")


def remotos_existentes(pedidos: list[str]) -> list[str]:
    disponiveis = set(git("remote").splitlines())
    faltando = [r for r in pedidos if r not in disponiveis]
    if faltando:
        abortar(f"remoto(s) não configurado(s): {', '.join(faltando)}")
    return pedidos


# --------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Ingere as avaliações da planilha e publica o acervo no site.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "exemplos:\n"
            "  python tools/publicar_reviews.py                 # fluxo completo, com confirmação\n"
            "  python tools/publicar_reviews.py --somente-gerar # só regenera e testa, não publica\n"
            "  python tools/publicar_reviews.py --sim           # sem perguntar (para automação)\n"
            "  python tools/publicar_reviews.py --remoto origin --remoto sandbox\n"
        ),
    )
    ap.add_argument("--url", help=f"URL do CSV publicado (senão usa {CHAVE})")
    ap.add_argument(
        "--somente-gerar", action="store_true",
        help="regenera e testa, mas não commita nem publica",
    )
    ap.add_argument(
        "--sim", "-y", action="store_true",
        help="não faz perguntas; assume sim (exige a URL já configurada)",
    )
    ap.add_argument(
        "--remoto", action="append", dest="remotos", metavar="NOME",
        help="remoto de destino, repetível (padrão: origin)",
    )
    ap.add_argument("--pular-testes", action="store_true", help="não roda npm test (desaconselhado)")
    args = ap.parse_args()

    interativo = not args.sim and sys.stdin.isatty()
    publicar_ao_fim = not args.somente_gerar
    remotos = args.remotos or ["origin"]
    total = 5 if args.somente_gerar else 6

    print(_pinta("Publicação das avaliações da comunidade — Oásis UTFPR", "1"))

    passo(1, total, "Resolvendo a URL do CSV")
    url = resolver_url(args.url, interativo)

    passo(2, total, "Conferindo o estado do repositório")
    conferir_repositorio(publicar_ao_fim, interativo)
    if publicar_ao_fim:
        remotos = remotos_existentes(remotos)

    passo(3, total, "Baixando e validando o CSV")
    antes = carregar_acervo()
    ingerir(url)
    depois = carregar_acervo()
    mudou, resumo = resumir_mudanca(antes, depois)

    if not mudou:
        ok("acervo já estava em dia — nada a publicar")
        # a ingestão reescreve o arquivo; sem isto sobra uma diferença de
        # formatação no diff sem nenhuma avaliação nova por trás
        git("checkout", "--", str(ACERVO.relative_to(RAIZ)).replace("\\", "/"), checar=False)
        return 0

    print(f"  {len(depois.get('reviews', []))} avaliação(ões) no acervo:")
    for linha in resumo:
        print(f"    - {linha}")

    passo(4, total, "Rodando a suíte de testes")
    if args.pular_testes:
        aviso("testes pulados por --pular-testes")
    else:
        npm = executavel("npm")
        if not npm:
            abortar("npm não encontrado no PATH.")
        rodar([npm, "test"], silencioso=True)
        ok("suíte passou")

    passo(5, total, "Revisão")
    rodar(["git", "--no-pager", "diff", "--stat", "--", "data/reviews.json"], checar=False)
    if args.somente_gerar:
        ok("acervo regenerado e validado; publicação não solicitada (--somente-gerar)")
        print(f"\n  Para publicar: git add {ACERVO.relative_to(RAIZ)} && git commit && git push")
        return 0

    destino = ", ".join(remotos)
    if interativo:
        print(
            f"\n  O push para '{destino}' dispara o deploy e coloca essas\n"
            "  avaliações no ar, com nome de quem escreveu. Isso é público.\n"
        )
        if not perguntar("  Publicar agora?", padrao=False):
            aviso("publicação cancelada; o acervo regenerado continua no diretório")
            return 1

    passo(6, total, f"Publicando em {destino}")
    publicar(remotos)
    conferir_variavel_do_action(url, interativo)

    print(_pinta("\nPronto. O deploy do Pages leva ~2 min para refletir no site.", "1;32"))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\ninterrompido pelo usuário.", file=sys.stderr)
        sys.exit(130)
