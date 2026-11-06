import { z } from "zod";
import { StatusAgendamento } from "../../generated/prisma/enums";
import { lerTipoSanguineo, type TipoSanguineoTexto } from "../utils/tipoSanguineo";
import { MSG_TIPO_SANGUINEO } from "./perfilValidator";

// Mensagens da HU-04 (formulário de agendamento).
export const MSG_OBRIGATORIO = "Este campo é obrigatório."; // cenário 3
export const MSG_INSTITUICAO_INVALIDA = "Escolha uma instituição válida.";
export const MSG_HORARIO_INVALIDO = "Escolha um horário disponível.";
export const MSG_STATUS = "O status deve ser AGENDADO, FINALIZADO ou CANCELADO.";

const obrigatorio = z.string({ error: MSG_OBRIGATORIO }).trim().min(1, MSG_OBRIGATORIO);

// "2026-11-09T11:30:00.000Z" (ou com outro fuso). O app sempre devolve o valor que a agenda mostrou.
const DATA_E_HORA_COM_FUSO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

// POST /doadores/me/agendamentos
//  - instituicaoId: onde vai doar;
//  - medicoCodigo + inicio: o horário escolhido na agenda daquele médico;
//  - tipoSanguineo: o tipo confirmado ou atualizado na hora de agendar.
export const agendarSchema = z.object({
  instituicaoId: obrigatorio,
  medicoCodigo: obrigatorio,
  inicio: obrigatorio
    .refine((texto) => DATA_E_HORA_COM_FUSO.test(texto) && !Number.isNaN(Date.parse(texto)), MSG_HORARIO_INVALIDO)
    .transform((texto) => new Date(texto)),
  tipoSanguineo: obrigatorio
    .refine((texto) => lerTipoSanguineo(texto) !== null, MSG_TIPO_SANGUINEO)
    .transform((texto): TipoSanguineoTexto => lerTipoSanguineo(texto)!),
});

export type DadosDoPedido = z.output<typeof agendarSchema>;

// GET /doadores/me/agendamentos?status=AGENDADO (sem status, vêm todos)
export const listarAgendamentosSchema = z.object({
  status: z.preprocess(
    (valor) => (valor === "" ? undefined : valor),
    z.enum(Object.values(StatusAgendamento) as [StatusAgendamento, ...StatusAgendamento[]], { error: MSG_STATUS }).optional(),
  ),
});
