import type { Campanha, Instituicao } from "../../generated/prisma/client";
import { AppError } from "../errors/AppError";
import { CampanhaRepository } from "../repositories/CampanhaRepository";
import { DoadorRepository } from "../repositories/DoadorRepository";
import { distanciaKm } from "../utils/distancia";
import { agora, hojeEmBrasilia } from "../utils/relogio";
import { tipoParaBanco, tipoParaTexto, type TipoSanguineoTexto } from "../utils/tipoSanguineo";
import {
  MAX_DIAS_DA_CAMPANHA,
  type DadosAlteracaoCampanha,
  type DadosNovaCampanha,
  type FiltroCampanhas,
} from "../validators/campanhaValidator";
import { instituicaoAprovadaDaConta } from "./ContaInstituicaoService";

// Quantas campanhas ativas ao mesmo tempo uma instituição pode ter.
export const MAX_CAMPANHAS_ATIVAS = 20;

export type SituacaoDaCampanha = "ATIVA" | "ENCERRADA" | "VENCIDA";

export type CampanhaResposta = {
  id: string;
  titulo: string;
  descricao: string;
  // Lista vazia = precisa de todos os tipos.
  tiposSanguineos: TipoSanguineoTexto[];
  // Último dia da campanha (AAAA-MM-DD).
  validaAte: string;
  situacao: SituacaoDaCampanha;
  encerradaEm: string | null;
  criadaEm: string;
};

// A campanha como o doador vê, com a instituição que pede ajuda.
export type CampanhaParaDoador = {
  id: string;
  titulo: string;
  descricao: string;
  tiposSanguineos: TipoSanguineoTexto[];
  validaAte: string;
  // true = a campanha precisa do tipo sanguíneo do doador (ou de todos os tipos).
  paraMeuTipo: boolean;
  instituicao: {
    id: string;
    nome: string;
    cidade: string;
    uf: string;
    telefone: string | null;
    // Distância em linha reta, em km, com uma casa decimal. Nulo se o doador não informou onde está.
    distanciaKm: number | null;
  };
};

const dia = (data: Date) => data.toISOString().slice(0, 10);
const umDiaDaData = (texto: string) => new Date(`${texto}T00:00:00.000Z`);

function situacao(c: Campanha): SituacaoDaCampanha {
  if (c.encerradaEm) return "ENCERRADA";
  return dia(c.validaAte) < hojeEmBrasilia() ? "VENCIDA" : "ATIVA";
}

function paraResposta(c: Campanha): CampanhaResposta {
  return {
    id: c.id,
    titulo: c.titulo,
    descricao: c.descricao,
    tiposSanguineos: c.tiposSanguineos.map(tipoParaTexto),
    validaAte: dia(c.validaAte),
    situacao: situacao(c),
    encerradaEm: c.encerradaEm?.toISOString() ?? null,
    criadaEm: c.criadaEm.toISOString(),
  };
}

// A data final não pode ser de ontem nem passar de 180 dias.
function conferirData(validaAte: string) {
  const hoje = hojeEmBrasilia();
  if (validaAte < hoje) throw new AppError(400, "Dados inválidos.", { validaAte: "A data final não pode ser anterior a hoje." });
  const limite = dia(new Date(umDiaDaData(hoje).getTime() + MAX_DIAS_DA_CAMPANHA * 86_400_000));
  if (validaAte > limite) {
    throw new AppError(400, "Dados inválidos.", {
      validaAte: `A campanha pode durar no máximo ${MAX_DIAS_DA_CAMPANHA} dias.`,
    });
  }
}

const naoEncontrada = () => new AppError(404, "Campanha não encontrada.");

export const CampanhaService = {
  // O painel da instituição: todas as campanhas dela, da mais nova para a mais antiga.
  async listarDaInstituicao(contaId: string): Promise<CampanhaResposta[]> {
    const instituicaoId = await instituicaoAprovadaDaConta(contaId);
    return (await CampanhaRepository.listarDaInstituicao(instituicaoId)).map(paraResposta);
  },

  async criar(contaId: string, dados: DadosNovaCampanha): Promise<CampanhaResposta> {
    const instituicaoId = await instituicaoAprovadaDaConta(contaId);
    conferirData(dados.validaAte);

    const ativas = await CampanhaRepository.contarAtivas(instituicaoId, umDiaDaData(hojeEmBrasilia()));
    if (ativas >= MAX_CAMPANHAS_ATIVAS) {
      throw new AppError(409, `Você já tem ${MAX_CAMPANHAS_ATIVAS} campanhas ativas. Encerre alguma para criar outra.`);
    }

    const criada = await CampanhaRepository.criar({
      instituicaoId,
      titulo: dados.titulo,
      descricao: dados.descricao,
      tiposSanguineos: dados.tiposSanguineos.map(tipoParaBanco),
      validaAte: umDiaDaData(dados.validaAte),
    });
    return paraResposta(criada);
  },

  // Só dá para alterar campanha da própria instituição e que ainda não foi encerrada.
  async atualizar(contaId: string, id: string, dados: DadosAlteracaoCampanha): Promise<CampanhaResposta> {
    const instituicaoId = await instituicaoAprovadaDaConta(contaId);
    const campanha = await CampanhaRepository.buscarDaInstituicao(id, instituicaoId);
    if (!campanha) throw naoEncontrada();
    if (campanha.encerradaEm) throw new AppError(409, "Esta campanha já foi encerrada e não pode mais ser alterada.");
    if (dados.validaAte !== undefined) conferirData(dados.validaAte);

    const atualizada = await CampanhaRepository.atualizar(campanha.id, {
      ...(dados.titulo !== undefined && { titulo: dados.titulo }),
      ...(dados.descricao !== undefined && { descricao: dados.descricao }),
      ...(dados.tiposSanguineos !== undefined && { tiposSanguineos: dados.tiposSanguineos.map(tipoParaBanco) }),
      ...(dados.validaAte !== undefined && { validaAte: umDiaDaData(dados.validaAte) }),
    });
    return paraResposta(atualizada);
  },

  // Encerra antes da data. A campanha continua na lista da instituição, mas some para os doadores.
  async encerrar(contaId: string, id: string): Promise<CampanhaResposta> {
    const instituicaoId = await instituicaoAprovadaDaConta(contaId);
    const campanha = await CampanhaRepository.buscarDaInstituicao(id, instituicaoId);
    if (!campanha) throw naoEncontrada();
    if (!(await CampanhaRepository.encerrar(campanha.id, agora()))) {
      throw new AppError(409, "Esta campanha já foi encerrada.");
    }
    return paraResposta((await CampanhaRepository.buscarDaInstituicao(id, instituicaoId))!);
  },

  async excluir(contaId: string, id: string): Promise<void> {
    const instituicaoId = await instituicaoAprovadaDaConta(contaId);
    const campanha = await CampanhaRepository.buscarDaInstituicao(id, instituicaoId);
    if (!campanha) throw naoEncontrada();
    await CampanhaRepository.excluir(campanha.id);
  },

  // O que o doador vê: campanhas ativas de qualquer instituição. As que precisam do tipo dele vêm primeiro.
  async listarParaDoador(doadorId: string, filtro: FiltroCampanhas): Promise<{ campanhas: CampanhaParaDoador[]; total: number }> {
    const doador = await DoadorRepository.buscarPorId(doadorId);
    const meuTipo = doador?.tipoSanguineo ?? null;
    const origem = filtro.lat !== undefined && filtro.lng !== undefined ? { latitude: filtro.lat, longitude: filtro.lng } : null;

    const ativas = await CampanhaRepository.listarAtivas(umDiaDaData(hojeEmBrasilia()));
    const campanhas = ativas.map((c: Campanha & { instituicao: Instituicao }) => {
      const distancia = origem ? distanciaKm(origem, c.instituicao) : null;
      return {
        id: c.id,
        titulo: c.titulo,
        descricao: c.descricao,
        tiposSanguineos: c.tiposSanguineos.map(tipoParaTexto),
        validaAte: dia(c.validaAte),
        paraMeuTipo: c.tiposSanguineos.length === 0 || (meuTipo !== null && c.tiposSanguineos.includes(meuTipo)),
        instituicao: {
          id: c.instituicao.id,
          nome: c.instituicao.nome,
          cidade: c.instituicao.cidade,
          uf: c.instituicao.uf,
          telefone: c.instituicao.telefone,
          distanciaKm: distancia === null ? null : Math.round(distancia * 10) / 10,
        },
      };
    });
    // Estável: quem precisa do meu tipo primeiro; dentro disso, a ordem do banco (a que vence antes, depois a mais nova).
    campanhas.sort((a, b) => Number(b.paraMeuTipo) - Number(a.paraMeuTipo));
    return { campanhas, total: campanhas.length };
  },
};
