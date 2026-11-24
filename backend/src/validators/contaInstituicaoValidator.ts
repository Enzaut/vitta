import { z } from "zod";
import { lerCnpj } from "../utils/cnpj";
import { senhaAtendeRegra } from "../utils/senha";
import { lerTelefone } from "../utils/telefone";
import { lerTipoSanguineo, type TipoSanguineoTexto } from "../utils/tipoSanguineo";
import { OBRIGATORIO, REGRA_SENHA, email, textoObrigatorio } from "./authValidator";
import { MSG_LATITUDE, MSG_LONGITUDE } from "./instituicaoValidator";

export const MSG_CNPJ = "Informe um CNPJ válido.";
export const MSG_TELEFONE_INSTITUICAO = "Informe um telefone válido com DDD, por exemplo (61) 3327-4413.";
export const MSG_UF = "Informe a sigla do estado com 2 letras, por exemplo DF.";
export const MSG_TIPO = "Escolha tipos sanguíneos válidos: A+, A-, B+, B-, AB+, AB-, O+ ou O-.";
export const MSG_NADA_PARA_ALTERAR = "Informe o telefone e/ou o horário.";

const vazio = (valor: string | null | undefined) => valor === null || valor === undefined || valor.trim() === "";

// Telefone opcional: ausente ou vazio = sem telefone; preenchido precisa estar no formato certo.
const telefoneOpcional = z
  .string({ error: MSG_TELEFONE_INSTITUICAO })
  .nullable()
  .refine((valor) => vazio(valor) || lerTelefone(valor!) !== null, MSG_TELEFONE_INSTITUICAO)
  .transform((valor): string | null => (vazio(valor) ? null : lerTelefone(valor!)));

// Cadastro da conta da instituição.
export const cadastroInstituicaoSchema = z
  .object({
    nome: textoObrigatorio.min(3, "Informe o nome da instituição.").max(120, "O nome deve ter no máximo 120 caracteres."),
    email,
    cnpj: textoObrigatorio.refine((t) => lerCnpj(t) !== null, MSG_CNPJ).transform((t) => lerCnpj(t)!),
    telefone: telefoneOpcional.optional().transform((t) => t ?? null),
    senha: z.string({ error: OBRIGATORIO }).min(1, OBRIGATORIO).refine(senhaAtendeRegra, REGRA_SENHA),
    confirmarSenha: z.string().optional(),
  })
  .refine((d) => d.confirmarSenha === undefined || d.confirmarSenha === d.senha, {
    path: ["confirmarSenha"],
    error: "As senhas não coincidem.",
  });

export type DadosCadastroInstituicao = z.output<typeof cadastroInstituicaoSchema>;

const texto = (campo: string, minimo: number, maximo: number) =>
  textoObrigatorio.min(minimo, `Informe ${campo}.`).max(maximo, `Use no máximo ${maximo} caracteres em ${campo}.`);

const numero = (minimo: number, maximo: number, mensagem: string) =>
  z.number({ error: mensagem }).min(minimo, mensagem).max(maximo, mensagem);

// Pedido de inclusão da instituição no mapa.
export const solicitacaoSchema = z.object({
  nome: texto("o nome da instituição", 3, 120),
  endereco: texto("o endereço", 5, 200),
  cidade: texto("a cidade", 2, 80),
  uf: textoObrigatorio.regex(/^[A-Za-z]{2}$/, MSG_UF).transform((u) => u.toUpperCase()),
  telefone: telefoneOpcional.optional().transform((t) => t ?? null),
  horario: texto("o horário de atendimento", 3, 200),
  latitude: numero(-90, 90, MSG_LATITUDE),
  longitude: numero(-180, 180, MSG_LONGITUDE),
});

export type DadosSolicitacao = z.output<typeof solicitacaoSchema>;

// Decisão simulada do pedido (só existe enquanto não há administrador).
export const decisaoSchema = z.object({
  decisao: z.enum(["APROVADA", "RECUSADA"], { error: "Escolha APROVADA ou RECUSADA." }),
  motivo: z.string().trim().max(200, "O motivo deve ter no máximo 200 caracteres.").optional(),
});

export type DadosDecisao = z.output<typeof decisaoSchema>;

// Telefone e horário da instituição já aprovada. Campo ausente = não muda.
export const dadosDaInstituicaoSchema = z
  .object({
    telefone: telefoneOpcional.optional(),
    horario: texto("o horário de atendimento", 3, 200).optional(),
  })
  .refine((d) => d.telefone !== undefined || d.horario !== undefined, { path: ["corpo"], error: MSG_NADA_PARA_ALTERAR });

export type DadosDaInstituicao = z.output<typeof dadosDaInstituicaoSchema>;

// Estoque: os tipos sanguíneos em falta agora. Lista vazia = nenhum em falta (e o estoque passa a ser "informado hoje").
export const tiposEmFaltaSchema = z.object({
  tiposEmFalta: z
    .array(z.string({ error: MSG_TIPO }), { error: MSG_TIPO })
    .max(8, MSG_TIPO)
    .refine((lista) => lista.every((t) => lerTipoSanguineo(t) !== null), MSG_TIPO)
    .transform((lista) => [...new Set(lista.map((t) => lerTipoSanguineo(t)!))] as TipoSanguineoTexto[]),
});

export type DadosDoEstoque = z.output<typeof tiposEmFaltaSchema>;
