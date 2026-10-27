import { z } from "zod";

// Mensagens da busca de instituições (HU-05).
export const MSG_LATITUDE = "A latitude deve ser um número entre -90 e 90.";
export const MSG_LONGITUDE = "A longitude deve ser um número entre -180 e 180.";
export const MSG_COORDENADAS = "Informe latitude e longitude juntas.";
export const MSG_RAIO = "O raio de busca deve ser um número entre 1 e 100 km.";
export const MSG_BUSCA = "A busca deve ter no máximo 80 caracteres.";

// Os parâmetros chegam na URL, sempre como texto. Ausente ou vazio = não informado.
const numeroOpcional = (minimo: number, maximo: number, mensagem: string) =>
  z.preprocess(
    (valor) => (valor === undefined || valor === "" ? undefined : Number(valor)),
    z.number({ error: mensagem }).min(minimo, mensagem).max(maximo, mensagem).optional(),
  );

const buscaOpcional = z.preprocess(
  (valor) => (typeof valor === "string" ? valor.trim() || undefined : valor),
  z.string({ error: MSG_BUSCA }).max(80, MSG_BUSCA).optional(),
);

// GET /instituicoes?lat=-15.78&lng=-47.88&raioKm=20&busca=hemocentro
//  - lat e lng: onde a pessoa está (os dois ou nenhum);
//  - raioKm: até onde procurar, a partir de lat e lng (padrão definido no serviço);
//  - busca: parte do nome da instituição. Com busca, o raio não vale.
export const listarInstituicoesSchema = z
  .object({
    lat: numeroOpcional(-90, 90, MSG_LATITUDE),
    lng: numeroOpcional(-180, 180, MSG_LONGITUDE),
    raioKm: numeroOpcional(1, 100, MSG_RAIO),
    busca: buscaOpcional,
  })
  .refine((filtro) => (filtro.lat === undefined) === (filtro.lng === undefined), {
    path: ["lat"],
    error: MSG_COORDENADAS,
  });

export type FiltroInstituicoes = z.output<typeof listarInstituicoesSchema>;
