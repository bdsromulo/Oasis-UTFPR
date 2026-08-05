import oferta20261Json from "../../data/eng-mecatronica/turmas/2026-1.json";
import oferta20252Json from "../../data/eng-mecatronica/turmas/2025-2.json";
import type { OfertaSemestre } from "./tipos";

/**
 * Ofertas passadas da matriz 973, fora do caminho crítico da aplicação.
 *
 * O semestre vigente continua no bundle inicial. Estes dois backups do Grade
 * na Hora entram após a primeira renderização e completam a sazonalidade do
 * Simulador e o roster histórico sem atrasar o Planejamento atual.
 */
export const OFERTAS_MECATRONICA_HISTORICAS: Record<string, OfertaSemestre> = {
  "2026-1": oferta20261Json as unknown as OfertaSemestre,
  "2025-2": oferta20252Json as unknown as OfertaSemestre,
};
