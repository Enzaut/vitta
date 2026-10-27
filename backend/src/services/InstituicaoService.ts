import type { Instituicao } from "../../generated/prisma/client";
import { AppError } from "../errors/AppError";
import { InstituicaoRepository } from "../repositories/InstituicaoRepository";
import { distanciaKm } from "../utils/distancia";
import { normalizarParaBusca } from "../utils/texto";
import { tipoParaTexto, type TipoSanguineoTexto } from "../utils/tipoSanguineo";
import type { FiltroInstituicoes } from "../validators/instituicaoValidator";

// Até onde procurar quando o app não escolhe o raio.
export const RAIO_PADRAO_KM = 20;

// O que a API devolve sobre uma instituição.
export type InstituicaoResposta = {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string | null;
  horario: string;
  latitude: number;
  longitude: number;
  // Tipos em falta ("A+", "O-"...). Lista vazia + estoqueAtualizadoEm nulo = a instituição não informa o estoque.
  tiposEmFalta: TipoSanguineoTexto[];
  estoqueAtualizadoEm: string | null;
  // true = instituição de exemplo (não existe de verdade).
  demonstracao: boolean;
  // Distância em linha reta até a pessoa, em km, com uma casa decimal. Nulo se a pessoa não informou onde está.
  distanciaKm: number | null;
};

export type ListaDeInstituicoes = {
  instituicoes: InstituicaoResposta[];
  // Raio usado na busca. Nulo quando não houve filtro por raio (busca por nome ou sem localização).
  raioKm: number | null;
  total: number;
};

function paraResposta(instituicao: Instituicao, distancia: number | null): InstituicaoResposta {
  return {
    id: instituicao.id,
    nome: instituicao.nome,
    endereco: instituicao.endereco,
    cidade: instituicao.cidade,
    uf: instituicao.uf,
    telefone: instituicao.telefone,
    horario: instituicao.horario,
    latitude: instituicao.latitude,
    longitude: instituicao.longitude,
    tiposEmFalta: instituicao.tiposEmFalta.map(tipoParaTexto),
    estoqueAtualizadoEm: instituicao.estoqueAtualizadoEm?.toISOString() ?? null,
    demonstracao: instituicao.demonstracao,
    distanciaKm: distancia === null ? null : Math.round(distancia * 10) / 10,
  };
}

// A busca procura no nome, na cidade e no endereço, sem se importar com acento ou maiúsculas.
const textoDaBusca = (i: Instituicao) => normalizarParaBusca(`${i.nome} ${i.cidade} ${i.endereco}`);

export const InstituicaoService = {
  // HU-05: lista as instituições.
  //  - com lat/lng e sem busca: só as que estão dentro do raio, da mais perto para a mais longe (RE02, RN07);
  //  - com busca: as que combinam com o texto, em qualquer distância (cenários 3 e 5);
  //  - sem lat/lng (localização negada ou desligada): todas, em ordem de nome.
  async listar(filtro: FiltroInstituicoes): Promise<ListaDeInstituicoes> {
    const todas = await InstituicaoRepository.listarTodas();
    const origem = filtro.lat !== undefined && filtro.lng !== undefined ? { latitude: filtro.lat, longitude: filtro.lng } : null;
    const busca = filtro.busca ? normalizarParaBusca(filtro.busca) : "";
    const raioKm = filtro.raioKm ?? RAIO_PADRAO_KM;
    const filtraPorRaio = origem !== null && busca === "";

    let itens = todas.map((instituicao) => ({ instituicao, distancia: origem ? distanciaKm(origem, instituicao) : null }));
    if (busca) itens = itens.filter(({ instituicao }) => textoDaBusca(instituicao).includes(busca));
    if (filtraPorRaio) itens = itens.filter(({ distancia }) => distancia! <= raioKm);

    itens.sort(
      (a, b) =>
        (a.distancia ?? 0) - (b.distancia ?? 0) || a.instituicao.nome.localeCompare(b.instituicao.nome, "pt-BR"),
    );

    return {
      instituicoes: itens.map(({ instituicao, distancia }) => paraResposta(instituicao, distancia)),
      raioKm: filtraPorRaio ? raioKm : null,
      total: itens.length,
    };
  },

  // HU-05, cenário 2: os detalhes de uma instituição.
  async obter(id: string): Promise<InstituicaoResposta> {
    const instituicao = await InstituicaoRepository.buscarPorId(id);
    if (!instituicao) throw new AppError(404, "Instituição não encontrada.");
    return paraResposta(instituicao, null);
  },
};
