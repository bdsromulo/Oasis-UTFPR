// Fixture sintética de histórico (aluno fictício) — roda em qualquer máquina/CI.
// Reproduz os padrões de layout observados nos históricos reais, sem dados pessoais.
import { describe, it, expect } from "vitest";
import { parseHistorico } from "../src/domain/historico/parser";

const LINHAS = [
  "Ministério da Educação",
  "Universidade Tecnológica Federal do Paraná",
  "Histórico Escolar",
  "Aluno: 9999999 - ALUNO FICTICIO DA SILVA Identidade-UF: 000000000-PR",
  "Curso: 236 - Sist De Informação Período: 3",
  "Turno: Integral (T/N) Matriz: 981 - Matriz 3 De Sistemas De Informação Situação: Regular",
  "Coeficiente absoluto: 0,8000",
  "Ingresso: 1/2025 Data da colação: --/--/----",
  "Coeficiente normalizado: 0,6000",
  "Disciplinas Obrigatórias",
  "Disciplinas Obrigatórias Cursadas",
  "Per.Disc/Matriz Tipo CHS CHT CHEXT Freq.",
  // aprovada simples
  "1 ICSD20 Introdução À Lógica S73 R 3 45 0 9,0 100,0 1 2025 Aprovado Por Nota/Frequência",
  "Para Computação Professora Exemplo - Doutorado",
  // situação na linha anterior à linha-núcleo (padrão real)
  "Fundamentos De Aprovado Por Nota/Frequência",
  "1 ICSF13 S74 R 6 90 0 7,5 95,0 1 2025",
  "Programação 1 Professor Exemplo - Doutorado",
  // reprovação seguida de aprovação
  "2 ICSE20 Técnicas De Programação S01 R 4 60 0 3,0 80,0 2 2025 Reprovado Por Nota",
  "2 ICSE20 Técnicas De Programação S01 R 4 60 0 7,0 85,0 1 2026 Aprovado Por Nota/Frequência",
  // consignação
  "Crédito Consignado",
  "1 MAT7GA Geometria Analítica 4 60 0 8,0 100,0 1 2025 >> Consignação Manual - Programa de",
  "Convalidação",
  // atividades complementares com média/freq "*"
  "2 ICSX50 Atividades S73 E 0 90 0 * * 1 2026 Aprovado",
  "Complementares",
  "(0) Período da disciplina na matriz (1) Tipo Turma: R - Regular",
  "Disciplinas Optativas",
  "Disciplinas Optativas Cursadas",
  "3 FCH7HA História Da Técnica E Da S03 R 3 45 0 8,0 90,0 1 2026 Aprovado Por Nota/Frequência",
  "Tecnologia Docente Exemplo - Doutorado",
  "(0) Período da disciplina na matriz (1) Tipo Turma: R - Regular",
  "Resumo Optativas (Carga horária total)",
  "Optativa Nome do Conjunto Período inicial Período final CHSCH Obrigatória CH Cursada e Aprovada CH Faltante CH Validada",
  "1159 Segundo Estrato 3 6 24 360 45 315 0",
  "1161 Optativas Do Ciclo De Humanidades 3 6 9 135 0 135 0",
  "1160 (*) Terceiro Estrato - Trilhas Em Computação 4 8 23 345 0 Faltantes 0",
  "1165 Banco De Dados 4 8 6 90 0 90 0",
  "Resumo Eletiva (Carga horária total)",
  "Eletiva 105 4 8 4 0 105 0",
  "Atividade Extensionista",
  "Disciplinas Obrigatórias Faltantes",
  "Semestre na Matriz Código Disciplina",
  "3 ICSD21 Matemática Discreta",
  "6 ICSS30 Sistemas Distribuídos",
  "Dependências",
  "Código Disciplina",
  "*** Nenhuma ***",
  "Disciplinas Matriculadas - 2026/1",
  "ICSF20 Estruturas De Dados 1 S71 Aprovado Por Nota/Frequência",
  "Resumo Geral",
  "Quadro Resumo disciplinas",
  "CHT Disciplinas Obrigatórias 2.005 345 345 1.660 345",
  "CHT Disciplinas Optativas 840 45 0 840 45",
  "CHT Disciplinas Eletivas 105 0 0 105 0",
  "Quadro Resumo Atividades Extensionistas",
  "CHEXT geral do curso 330 0 330 Falta cumprir",
];

describe("histórico sintético", () => {
  const perfil = parseHistorico(LINHAS);

  it("cabeçalho", () => {
    expect(perfil.nome).toBe("ALUNO FICTICIO DA SILVA");
    expect(perfil.matriz).toBe(981);
    expect(perfil.periodo).toBe(3);
    expect(perfil.coefAbsoluto).toBeCloseTo(0.8);
  });

  it("cursadas: situações e recuperação de reprovação", () => {
    expect(perfil.cursadas.length).toBe(7);
    expect(perfil.aprovadas.has("ICSD20")).toBe(true);
    expect(perfil.aprovadas.has("ICSF13")).toBe(true); // situação na linha anterior
    expect(perfil.aprovadas.has("ICSE20")).toBe(true); // reprovado depois aprovado
    expect(perfil.aprovadas.has("MAT7GA")).toBe(true); // consignada
    expect(perfil.aprovadas.has("ICSX50")).toBe(true); // média/freq "*"
    expect(perfil.aprovadas.has("ICSF20")).toBe(true); // via matriculadas
    expect(perfil.aprovadas.has("FCH7HA")).toBe(true); // optativa
  });

  it("resumos consolidados", () => {
    expect(perfil.resumoConjuntos.length).toBe(4);
    expect(perfil.resumoConjuntos[0]).toMatchObject({ conjunto: "1159", chCursadaAprovada: 45 });
    expect(perfil.resumoConjuntos[2]).toMatchObject({ conjunto: "1160", chFaltante: "faltantes" });
    expect(perfil.eletivas).toMatchObject({ chTotal: 105, chFaltante: 105 });
    expect(perfil.extensao).toMatchObject({ chTotal: 330, chCursada: 0, chFaltante: 330 });
    expect(perfil.resumoGeral?.obrigatorias).toMatchObject({ total: 2005, aprovada: 345 });
  });

  it("faltantes, dependências e matriculadas", () => {
    expect(perfil.obrigatoriasFaltantes.map((f) => f.codigo)).toEqual(["ICSD21", "ICSS30"]);
    expect(perfil.dependencias).toEqual([]);
    expect(perfil.matriculadas.length).toBe(1);
  });

  it("sem anomalias silenciosas", () => {
    expect(perfil.avisos).toEqual([]);
  });
});
