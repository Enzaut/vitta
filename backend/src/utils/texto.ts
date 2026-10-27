// Deixa o texto pronto para comparar em buscas: sem acento, tudo minúsculo e sem espaços sobrando.
// Assim "brasilia", "BRASÍLIA" e " Brasília " são a mesma busca.
export function normalizarParaBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
