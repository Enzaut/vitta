import type { Doador } from "../../generated/prisma/client";
import { AppError } from "../errors/AppError";
import { DoadorRepository } from "../repositories/DoadorRepository";
import { tipoParaBanco, tipoParaTexto, type TipoSanguineoTexto } from "../utils/tipoSanguineo";
import type { DadosPerfil } from "../validators/perfilValidator";

// O que a API devolve sobre o doador: nunca inclui senha, hash nem controle de bloqueio.
// telefone: só os dígitos, com DDD (ex.: "61999998888"). Os dois campos são nulos até a pessoa informar.
export type DoadorResposta = {
  id: string;
  nome: string;
  email: string;
  dataNascimento: string;
  telefone: string | null;
  tipoSanguineo: TipoSanguineoTexto | null;
};

export function paraResposta(doador: Doador): DoadorResposta {
  return {
    id: doador.id,
    nome: doador.nome,
    email: doador.email,
    dataNascimento: doador.dataNascimento.toISOString().slice(0, 10),
    telefone: doador.telefone,
    tipoSanguineo: doador.tipoSanguineo ? tipoParaTexto(doador.tipoSanguineo) : null,
  };
}

export const DoadorService = {
  async existe(id: string): Promise<boolean> {
    return (await DoadorRepository.buscarPorId(id)) !== null;
  },

  async obterPerfil(id: string): Promise<DoadorResposta> {
    const doador = await DoadorRepository.buscarPorId(id);
    if (!doador) throw new AppError(401, "Sessão inválida ou expirada. Faça login novamente.");
    return paraResposta(doador);
  },

  // HU-11: o doador altera o próprio telefone e/ou tipo sanguíneo (e só os dele: o id vem do token).
  async atualizarPerfil(id: string, dados: DadosPerfil): Promise<DoadorResposta> {
    const doador = await DoadorRepository.atualizarPerfil(id, {
      ...(dados.telefone !== undefined && { telefone: dados.telefone }),
      ...(dados.tipoSanguineo !== undefined && {
        tipoSanguineo: dados.tipoSanguineo === null ? null : tipoParaBanco(dados.tipoSanguineo),
      }),
    });
    return paraResposta(doador);
  },

  // HU-02 / RN-012: apaga a conta e os dados de forma definitiva.
  // O token antigo deixa de valer porque o middleware confere se o doador ainda existe.
  async excluirConta(id: string): Promise<void> {
    await DoadorRepository.excluir(id);
  },
};
