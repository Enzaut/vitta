import { requisicao } from "./client";

// HU-05: as instituições que fazem coleta de sangue (hemocentros e parceiras).

export type Instituicao = {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string | null;
  horario: string;
  latitude: number;
  longitude: number;
  // Tipos em falta ("A+", "O-"...). Lista vazia e estoqueAtualizadoEm nulo = a instituição não informa o estoque.
  tiposEmFalta: string[];
  estoqueAtualizadoEm: string | null;
  // true = instituição de exemplo, criada só para demonstrar o app.
  demonstracao: boolean;
  // Distância em linha reta até a pessoa, em km. Nulo se a localização não foi enviada.
  distanciaKm: number | null;
};

export type ListaDeInstituicoes = {
  instituicoes: Instituicao[];
  // Raio usado na busca. Nulo quando não houve filtro por raio (busca por nome ou sem localização).
  raioKm: number | null;
  total: number;
};

// lat e lng vão juntos. Com busca, a API ignora o raio (HU-05, cenários 3 e 5).
export type FiltroInstituicoes = { lat?: number; lng?: number; raioKm?: number; busca?: string };

function paraConsulta({ lat, lng, raioKm, busca }: FiltroInstituicoes): string {
  const partes: string[] = [];
  if (lat !== undefined && lng !== undefined) {
    partes.push(`lat=${lat}`, `lng=${lng}`);
    if (raioKm !== undefined) partes.push(`raioKm=${raioKm}`);
  }
  if (busca) partes.push(`busca=${encodeURIComponent(busca)}`);
  return partes.length > 0 ? `?${partes.join("&")}` : "";
}

export const apiInstituicoes = {
  listar: (token: string, filtro: FiltroInstituicoes) =>
    requisicao<ListaDeInstituicoes>(`/instituicoes${paraConsulta(filtro)}`, { token }),
};
