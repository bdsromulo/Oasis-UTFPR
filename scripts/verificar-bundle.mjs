import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";

const LIMITE_ENTRADA_GZIP = 420 * 1024;
const html = readFileSync(join("dist", "index.html"), "utf8");
const entrada = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];

if (!entrada) {
  throw new Error("Não foi possível localizar o JavaScript de entrada em dist/index.html.");
}

const arquivo = join("dist", "assets", basename(entrada));
const bytesGzip = gzipSync(readFileSync(arquivo)).byteLength;
const kib = (bytesGzip / 1024).toFixed(1);

if (bytesGzip > LIMITE_ENTRADA_GZIP) {
  throw new Error(
    `Bundle inicial acima do limite móvel: ${kib} KiB gzip (limite 420 KiB).`,
  );
}

console.log(`Bundle inicial dentro do limite móvel: ${kib} KiB gzip (limite 420 KiB).`);
