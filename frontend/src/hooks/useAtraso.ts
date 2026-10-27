import { useEffect, useState } from "react";

// Devolve o valor só depois que ele para de mudar por `ms` milissegundos
// (a busca por nome só chama a API quando a pessoa para de digitar).
export function useAtraso<T>(valor: T, ms: number): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const relogio = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(relogio);
  }, [valor, ms]);

  return atrasado;
}
