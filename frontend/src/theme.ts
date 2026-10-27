// Cores, fontes e tamanhos do Guia de Estilo do VITTA (documentos/DOCX/GUIA DE ESTILO.docx).
export const cores = {
  primaria: "#D62828",
  primariaEscura: "#A4161A",
  fundo: "#FFFFFF",
  fundoSecundario: "#F5F5F5",
  texto: "#333333",
  textoSecundario: "#5F5F5F",
  sucesso: "#2E8B57",
  erro: "#D62828",
  fundoErro: "#FDECEC",
  fundoSucesso: "#E8F5EE",
  borda: "#BDBDBD",
  alerta: "#E0A800",
} as const;

// Poppins para títulos e botões, Roboto para o texto corrido.
export const fontes = {
  titulo: "Poppins_600SemiBold",
  subtitulo: "Poppins_500Medium",
  botao: "Poppins_600SemiBold",
  texto: "Roboto_400Regular",
  textoMedio: "Roboto_500Medium",
} as const;

export const tamanhos = {
  titulo: 28,
  subtitulo: 22,
  texto: 16,
  textoSecundario: 14,
  botao: 16,
} as const;

export const espaco = { p: 8, m: 16, g: 24, gg: 32 } as const;
export const raio = 12;
