import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import type { FiltroInstituicoes, ListaDeInstituicoes } from "../api/instituicoes";

type Resposta = { chave: string; dados: ListaDeInstituicoes };

// Busca as instituições na API sempre que o filtro muda. Filtro nulo = não busca
// (ainda falta saber algo, como a localização da pessoa).
export function useInstituicoes(listar: (filtro: FiltroInstituicoes) => Promise<ListaDeInstituicoes>, filtro: FiltroInstituicoes | null) {
  // O filtro vira texto para o efeito só rodar quando o conteúdo muda, não a cada renderização.
  const chave = filtro ? JSON.stringify(filtro) : null;
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (chave === null) {
      setCarregando(false);
      setErro(null);
      return;
    }

    // Se o filtro mudar antes da resposta chegar, a resposta velha é descartada.
    let atual = true;
    setCarregando(true);
    setErro(null);
    listar(JSON.parse(chave) as FiltroInstituicoes)
      .then((dados) => {
        if (atual) setResposta({ chave, dados });
      })
      .catch((falha) => {
        if (atual) setErro(falha instanceof ApiError ? falha.message : "Não foi possível carregar as instituições. Tente novamente.");
      })
      .finally(() => {
        if (atual) setCarregando(false);
      });

    return () => {
      atual = false;
    };
  }, [chave, tentativa, listar]);

  const recarregar = useCallback(() => setTentativa((t) => t + 1), []);

  return {
    // A resposta para o filtro de agora (nula enquanto carrega).
    dados: resposta !== null && resposta.chave === chave ? resposta.dados : null,
    // A última resposta recebida, de qualquer filtro: a tela a mostra enquanto a nova chega, sem piscar.
    anteriores: resposta?.dados ?? null,
    carregando,
    erro,
    recarregar,
  };
}
