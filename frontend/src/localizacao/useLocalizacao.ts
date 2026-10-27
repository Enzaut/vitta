import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import type { EstadoLocalizacao, Posicao } from "./estado";

// Quanto esperar o GPS responder. Dentro de prédios ele pode demorar muito (ou nunca responder).
const TEMPO_MAXIMO_MS = 15_000;
// Ao voltar para o app ou para a aba, uma posição lida há menos que isso é reaproveitada (a permissão e o GPS são sempre conferidos).
const IDADE_MAXIMA_MS = 30_000;

function comLimiteDeTempo<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const relogio = setTimeout(() => reject(new Error("Tempo esgotado.")), ms);
    promessa.then(
      (valor) => {
        clearTimeout(relogio);
        resolve(valor);
      },
      (erro) => {
        clearTimeout(relogio);
        reject(erro);
      },
    );
  });
}

// Confere a permissão e o GPS e, estando tudo certo, lê a posição (RNF-008).
// pedirPermissao: se a permissão ainda não foi decidida, mostra o pedido do sistema.
// reaproveitar: posição recente que pode ser mantida em vez de ler o GPS de novo.
async function consultar(pedirPermissao: boolean, reaproveitar: Posicao | null): Promise<EstadoLocalizacao> {
  try {
    let permissao = await Location.getForegroundPermissionsAsync();
    if (!permissao.granted && permissao.canAskAgain && pedirPermissao) {
      permissao = await Location.requestForegroundPermissionsAsync();
    }
    if (!permissao.granted) return { tipo: "negada", podePedirDeNovo: permissao.canAskAgain };

    if (!(await Location.hasServicesEnabledAsync())) return { tipo: "gpsDesligado" };
    if (reaproveitar) return { tipo: "pronta", posicao: reaproveitar };

    const { coords } = await comLimiteDeTempo(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      TEMPO_MAXIMO_MS,
    );
    return {
      tipo: "pronta",
      posicao: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        precisaoM: coords.accuracy,
        // A pessoa pode liberar só a localização aproximada (Android 12 ou mais, iPhone com "Localização exata" desligada).
        aproximada: permissao.android?.accuracy === "coarse" || permissao.ios?.accuracy === "reduced",
      },
    };
  } catch (erro) {
    const { code, message } = (erro ?? {}) as { code?: unknown; message?: unknown };
    const texto = `${String(code ?? "")} ${String(message ?? "")}`;
    // O Android avisa assim quando o GPS foi desligado no meio do caminho ou a pessoa recusou ligá-lo.
    if (/SETTINGS_UNSATISFIED|unsatisfied device settings/i.test(texto)) return { tipo: "gpsDesligado" };
    // E assim quando a permissão foi retirada no meio do caminho.
    if (/UNAUTHORIZED|not authorized/i.test(texto)) return { tipo: "negada", podePedirDeNovo: true };
    return { tipo: "indisponivel" };
  }
}

// Cuida da localização do doador: pede a permissão, confere o GPS, lê a posição e
// confere tudo de novo quando a pessoa volta das configurações do aparelho.
export function useLocalizacao() {
  const [estado, setEstado] = useState<EstadoLocalizacao>({ tipo: "verificando" });
  // Cópia do estado para ler dentro das funções, e quando o GPS foi lido pela última vez.
  const atual = useRef<EstadoLocalizacao>(estado);
  const leituraEm = useRef(0);
  // Só o resultado da conferência mais recente vale.
  const sequencia = useRef(0);
  const emAndamento = useRef(false);
  const ativo = useRef(true);

  const aplicar = useCallback((novo: EstadoLocalizacao) => {
    atual.current = novo;
    setEstado(novo);
  }, []);

  // silencioso: não troca a tela por "verificando" (usado ao voltar para o app ou para a aba).
  // reaproveitarLeitura: se a posição foi lida há pouco, mantém ela (só confere a permissão e o GPS).
  const verificar = useCallback(
    async (pedirPermissao: boolean, silencioso = false, reaproveitarLeitura = false): Promise<EstadoLocalizacao> => {
      const minha = ++sequencia.current;
      emAndamento.current = true;
      if (!silencioso) aplicar({ tipo: "verificando" });

      const recente =
        reaproveitarLeitura && atual.current.tipo === "pronta" && Date.now() - leituraEm.current < IDADE_MAXIMA_MS
          ? atual.current.posicao
          : null;
      const resultado = await consultar(pedirPermissao, recente);

      if (ativo.current && minha === sequencia.current) {
        emAndamento.current = false;
        if (resultado.tipo === "pronta" && recente === null) leituraEm.current = Date.now();
        // Uma leitura silenciosa que falhou não derruba a posição que já tínhamos.
        const mantemAnterior = silencioso && resultado.tipo === "indisponivel" && atual.current.tipo === "pronta";
        if (!mantemAnterior) aplicar(resultado);
      }
      return resultado;
    },
    [aplicar],
  );

  // Ao abrir a tela do mapa: pede a permissão (HU-05, cenário 5) e lê a posição.
  useEffect(() => {
    ativo.current = true;
    void verificar(true);
    return () => {
      ativo.current = false;
    };
  }, [verificar]);

  const revalidar = useCallback(() => {
    if (!emAndamento.current) void verificar(false, true, true);
  }, [verificar]);

  // Voltou das configurações do aparelho (ou do painel de atalhos): a permissão ou o GPS podem ter mudado.
  useEffect(() => {
    const assinatura = AppState.addEventListener("change", (novo) => {
      if (novo === "active") revalidar();
    });
    return () => assinatura.remove();
  }, [revalidar]);

  const tentarDeNovo = useCallback(() => verificar(true), [verificar]);
  // "Perto de mim": lê a posição de novo sem esconder o mapa.
  const atualizar = useCallback(() => verificar(true, true), [verificar]);

  const abrirConfiguracoes = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  // Android: mostra o aviso do sistema "ativar a localização do dispositivo". No iPhone só as configurações resolvem.
  const ativarLocalizacao = useCallback(async () => {
    if (Platform.OS !== "android") {
      abrirConfiguracoes();
      return;
    }
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      // a pessoa recusou o aviso do sistema
    }
    await verificar(false);
  }, [abrirConfiguracoes, verificar]);

  return { estado, tentarDeNovo, atualizar, revalidar, abrirConfiguracoes, ativarLocalizacao };
}
