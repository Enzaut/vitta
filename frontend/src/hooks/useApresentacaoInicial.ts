import { useCallback, useEffect, useState } from "react";
import { apresentacaoJaVista, marcarApresentacaoComoVista } from "../storage/apresentacaoStorage";

// carregando = ainda conferindo no aparelho; pendente = primeira vez, mostrar o carrossel; vista = já passou por ele.
export type SituacaoDaApresentacao = "carregando" | "pendente" | "vista";

// Decide se o carrossel de boas-vindas aparece. Ao terminar (ou pular), ele nunca mais aparece sozinho neste aparelho.
export function useApresentacaoInicial() {
  const [situacao, setSituacao] = useState<SituacaoDaApresentacao>("carregando");

  useEffect(() => {
    let ativo = true;
    apresentacaoJaVista().then((vista) => {
      if (ativo) setSituacao(vista ? "vista" : "pendente");
    });
    return () => {
      ativo = false;
    };
  }, []);

  const concluir = useCallback(() => {
    setSituacao("vista");
    void marcarApresentacaoComoVista();
  }, []);

  return { situacao, concluir };
}
