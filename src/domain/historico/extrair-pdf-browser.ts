/**
 * Adaptador exclusivo do navegador.
 *
 * O `?url` é uma convenção do Vite e, por isso, não pertence ao extrator puro
 * usado pelos testes em Node. A UI importa este módulo sob demanda: pdf.js e o
 * endereço do worker ficam fora do carregamento inicial da aplicação.
 */
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { extrairLinhas } from "./extrair-linhas";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { extrairLinhas };
