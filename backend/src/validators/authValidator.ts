import { z } from "zod";
import { AppError } from "../errors/AppError";
import { ESPECIAIS, senhaAtendeRegra } from "../utils/senha";

// Mensagens iguais às da HU-01 (Documento de Requisitos).
const OBRIGATORIO = "Este campo é obrigatório.";
const EMAIL_INVALIDO = "Informe um endereço de e-mail válido.";
const REGRA_SENHA = `A senha deve ter no mínimo 8 caracteres, com uma letra maiúscula, um número e um caractere especial (${ESPECIAIS}).`;

const textoObrigatorio = z.string({ error: OBRIGATORIO }).trim().min(1, OBRIGATORIO);

const email = textoObrigatorio.pipe(z.email({ error: EMAIL_INVALIDO })).transform((e) => e.toLowerCase());

// A data chega como "AAAA-MM-DD". Precisa existir no calendário e não pode ser futura.
function lerData(texto: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const existe = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  return existe ? data : null;
}

const dataNascimento = textoObrigatorio
  .refine((t) => lerData(t) !== null && lerData(t)!.getUTCFullYear() >= 1900, "Informe uma data de nascimento válida.")
  .refine((t) => lerData(t) === null || lerData(t)!.getTime() <= Date.now(), "A data de nascimento não pode estar no futuro.")
  .transform((t) => lerData(t)!);

export const cadastroSchema = z
  .object({
    nome: textoObrigatorio.min(3, "Informe seu nome completo.").max(120, "O nome deve ter no máximo 120 caracteres."),
    email,
    dataNascimento,
    senha: z.string({ error: OBRIGATORIO }).min(1, OBRIGATORIO).refine(senhaAtendeRegra, REGRA_SENHA),
    // O app confere a confirmação; se ela vier, a API confere também.
    confirmarSenha: z.string().optional(),
  })
  .refine((d) => d.confirmarSenha === undefined || d.confirmarSenha === d.senha, {
    path: ["confirmarSenha"],
    error: "As senhas não coincidem.",
  });

export const loginSchema = z.object({
  email,
  senha: z.string({ error: OBRIGATORIO }).min(1, OBRIGATORIO),
});

export type DadosCadastro = z.output<typeof cadastroSchema>;
export type DadosLogin = z.output<typeof loginSchema>;

// Valida o corpo da requisição. Se houver erro, lança 400 com a mensagem de cada campo.
export function validar<T extends z.ZodType>(schema: T, corpo: unknown): z.output<T> {
  const resultado = schema.safeParse(corpo ?? {});
  if (resultado.success) return resultado.data;

  const campos: Record<string, string> = {};
  for (const erro of resultado.error.issues) {
    const campo = String(erro.path[0] ?? "corpo");
    if (!(campo in campos)) campos[campo] = erro.message;
  }
  throw new AppError(400, "Dados inválidos.", campos);
}
