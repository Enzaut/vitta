import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/auth";
import { API_URL } from "../config";

// acordando = o servidor na internet estava dormindo e o app está esperando ele ligar (leva cerca de 1 minuto).
export type EstadoServidor = "verificando" | "acordando" | "ok" | "erro";

// Servidores grátis na internet dormem quando ninguém usa e demoram uns 60 segundos para acordar.
// Só o servidor da internet (https) ganha novas tentativas; no computador, se a API não responde, o aviso aparece logo.
const NA_INTERNET = API_URL.startsWith("https://");
const TENTATIVAS_NA_INTERNET = 12;
const PAUSA_ENTRE_TENTATIVAS_MS = 3_000;

const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Pergunta à API se ela está no ar (rota /health). Serve de diagnóstico: se o celular
// não alcança o servidor, a tela inicial avisa na hora (e, se ele estiver acordando, tenta de novo sozinha).
export function useServidor() {
  const [estado, setEstado] = useState<EstadoServidor>("verificando");
  // Só a verificação mais recente vale (e nenhuma continua depois que a tela fecha).
  const rodada = useRef(0);

  const verificar = useCallback(async () => {
    const minha = ++rodada.current;
    const maximo = NA_INTERNET ? TENTATIVAS_NA_INTERNET : 1;
    setEstado("verificando");

    for (let tentativa = 1; tentativa <= maximo; tentativa++) {
      try {
        const resposta = await api.saude();
        if (minha === rodada.current) setEstado(resposta.status === "ok" ? "ok" : "erro");
        return;
      } catch {
        if (minha !== rodada.current) return;
        if (tentativa === maximo) break;
        setEstado("acordando");
        await esperar(PAUSA_ENTRE_TENTATIVAS_MS);
        if (minha !== rodada.current) return;
      }
    }
    setEstado("erro");
  }, []);

  useEffect(() => {
    void verificar();
    return () => {
      rodada.current++;
    };
  }, [verificar]);

  return { estado, verificar };
}
