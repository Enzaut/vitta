import { z } from "zod";
import { lerTelefone } from "../utils/telefone";
import { lerTipoSanguineo, type TipoSanguineoTexto } from "../utils/tipoSanguineo";

// Mensagens da HU-11.
export const MSG_TELEFONE = "Informe um telefone válido com DDD, por exemplo (61) 99999-8888.";
export const MSG_TIPO_SANGUINEO = "Escolha um tipo sanguíneo válido: A+, A-, B+, B-, AB+, AB-, O+ ou O-.";
export const MSG_NADA_PARA_ALTERAR = "Informe o telefone e/ou o tipo sanguíneo.";

const vazio = (valor: string | null) => valor === null || valor.trim() === "";

// Cada campo pode vir de três jeitos:
//  - ausente (undefined): não muda;
//  - nulo ou texto vazio: apaga o dado;
//  - preenchido: precisa estar no formato certo.
const telefone = z
  .string({ error: MSG_TELEFONE })
  .nullable()
  .refine((valor) => vazio(valor) || lerTelefone(valor!) !== null, MSG_TELEFONE)
  .transform((valor): string | null => (vazio(valor) ? null : lerTelefone(valor!)));

const tipoSanguineo = z
  .string({ error: MSG_TIPO_SANGUINEO })
  .nullable()
  .refine((valor) => vazio(valor) || lerTipoSanguineo(valor!) !== null, MSG_TIPO_SANGUINEO)
  .transform((valor): TipoSanguineoTexto | null => (vazio(valor) ? null : lerTipoSanguineo(valor!)));

export const atualizarPerfilSchema = z
  .object({
    telefone: telefone.optional(),
    tipoSanguineo: tipoSanguineo.optional(),
  })
  .refine((dados) => dados.telefone !== undefined || dados.tipoSanguineo !== undefined, {
    path: ["corpo"],
    error: MSG_NADA_PARA_ALTERAR,
  });

export type DadosPerfil = z.output<typeof atualizarPerfilSchema>;
