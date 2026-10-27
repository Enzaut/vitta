import { TipoSanguineo } from "../../generated/prisma/enums";

// Os tipos sanguíneos como a pessoa vê e como a API conversa: "A+", "A-", "B+"...
export const TIPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type TipoSanguineoTexto = (typeof TIPOS_SANGUINEOS)[number];

// Dentro do código (Prisma) cada tipo tem um nome sem símbolos: A_POSITIVO, O_NEGATIVO...
const TEXTO_PARA_BANCO: Record<TipoSanguineoTexto, TipoSanguineo> = {
  "A+": TipoSanguineo.A_POSITIVO,
  "A-": TipoSanguineo.A_NEGATIVO,
  "B+": TipoSanguineo.B_POSITIVO,
  "B-": TipoSanguineo.B_NEGATIVO,
  "AB+": TipoSanguineo.AB_POSITIVO,
  "AB-": TipoSanguineo.AB_NEGATIVO,
  "O+": TipoSanguineo.O_POSITIVO,
  "O-": TipoSanguineo.O_NEGATIVO,
};

export function tipoParaBanco(tipo: TipoSanguineoTexto): TipoSanguineo {
  return TEXTO_PARA_BANCO[tipo];
}

export function tipoParaTexto(tipo: TipoSanguineo): TipoSanguineoTexto {
  const par = Object.entries(TEXTO_PARA_BANCO).find(([, valor]) => valor === tipo);
  return par![0] as TipoSanguineoTexto;
}

// Aceita "a+", " AB- " etc. e devolve o tipo no formato oficial. Se não for um dos 8 tipos, devolve null.
export function lerTipoSanguineo(texto: string): TipoSanguineoTexto | null {
  const limpo = texto.trim().toUpperCase();
  return (TIPOS_SANGUINEOS as readonly string[]).includes(limpo) ? (limpo as TipoSanguineoTexto) : null;
}
