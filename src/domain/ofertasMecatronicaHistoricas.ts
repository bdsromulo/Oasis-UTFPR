import oferta20262Json from "../../data/eng-mecatronica/turmas/2026-2.json";
import oferta20261Json from "../../data/eng-mecatronica/turmas/2026-1.json";
import oferta20252Json from "../../data/eng-mecatronica/turmas/2025-2.json";
import type { OfertaSemestre } from "./tipos";

/**
 * Ofertas de Engenharia Mecatrônica, compartilhadas pelas matrizes 823 e 973
 * e mantidas fora do caminho crítico da aplicação.
 *
 * A vigente vem do PDF oficial do Portal; os dois backups do Grade na Hora
 * completam a sazonalidade do Simulador e o roster histórico. As três entram
 * após a primeira renderização para não penalizar o bundle inicial de quem usa
 * outro curso.
 */
export const OFERTAS_MECATRONICA_HISTORICAS: Record<string, OfertaSemestre> = {
  "2026-2": oferta20262Json as unknown as OfertaSemestre,
  "2026-1": oferta20261Json as unknown as OfertaSemestre,
  "2025-2": oferta20252Json as unknown as OfertaSemestre,
};
