import { z } from "zod";
import { lerTipoSanguineo, type TipoSanguineoTexto } from "../utils/tipoSanguineo";
import { textoObrigatorio } from "./authValidator";
import { MSG_TIPO } from "./contaInstituicaoValidator";
import { MSG_COORDENADAS, MSG_LATITUDE, MSG_LONGITUDE } from "./instituicaoValidator";

export const MSG_DATA = "Informe a data final da campanha no formato AAAA-MM-DD.";
export const MSG_NADA_PARA_ALTERAR_CAMPANHA = "Informe o que deseja alterar na campanha.";

// Uma campanha pode durar até 180 dias.
export const MAX_DIAS_DA_CAMPANHA = 180;

const titulo = textoObrigatorio.min(3, "O título deve ter pelo menos 3 caracteres.").max(80, "O título deve ter no máximo 80 caracteres.");
const descricao = textoObrigatorio
  .min(10, "A descrição deve ter pelo menos 10 caracteres.")
  .max(500, "A descrição deve ter no máximo 500 caracteres.");

const tipos = z
  .array(z.string({ error: MSG_TIPO }), { error: MSG_TIPO })
  .max(8, MSG_TIPO)
  .refine((lista) => lista.every((t) => lerTipoSanguineo(t) !== null), MSG_TIPO)
  .transform((lista) => [...new Set(lista.map((t) => lerTipoSanguineo(t)!))] as TipoSanguineoTexto[]);

// "AAAA-MM-DD" que existe no calendário (a conferência de hoje e do limite fica no serviço, que usa o relógio do sistema).
const data = textoObrigatorio.refine((t) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}, MSG_DATA);

export const criarCampanhaSchema = z.object({
  titulo,
  descricao,
  // Ausente ou lista vazia = precisa de todos os tipos.
  tiposSanguineos: tipos.optional().transform((t) => t ?? []),
  validaAte: data,
});

export const atualizarCampanhaSchema = z
  .object({
    titulo: titulo.optional(),
    descricao: descricao.optional(),
    tiposSanguineos: tipos.optional(),
    validaAte: data.optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { path: ["corpo"], error: MSG_NADA_PARA_ALTERAR_CAMPANHA });

export type DadosNovaCampanha = z.output<typeof criarCampanhaSchema>;
export type DadosAlteracaoCampanha = z.output<typeof atualizarCampanhaSchema>;

// GET /campanhas?lat=..&lng=.. : onde a pessoa está (os dois ou nenhum), para mostrar a distância.
const coordenada = (minimo: number, maximo: number, mensagem: string) =>
  z.preprocess(
    (valor) => (valor === undefined || valor === "" ? undefined : Number(valor)),
    z.number({ error: mensagem }).min(minimo, mensagem).max(maximo, mensagem).optional(),
  );

export const listarCampanhasSchema = z
  .object({ lat: coordenada(-90, 90, MSG_LATITUDE), lng: coordenada(-180, 180, MSG_LONGITUDE) })
  .refine((f) => (f.lat === undefined) === (f.lng === undefined), { path: ["lat"], error: MSG_COORDENADAS });

export type FiltroCampanhas = z.output<typeof listarCampanhasSchema>;
