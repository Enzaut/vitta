// CNPJ: aceita "11.222.333/0001-81" ou só os dígitos e devolve os 14 dígitos. Se for inválido, devolve null.
// Confere os dois dígitos verificadores e recusa sequências repetidas (00000000000000, 11111111111111...).
const PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_2 = [6, ...PESOS_1];

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = [...base].reduce((total, d, i) => total + Number(d) * pesos[i]!, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function lerCnpj(texto: string): string | null {
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length !== 14 || /^(\d)\1+$/.test(digitos)) return null;
  if (digitoVerificador(digitos.slice(0, 12), PESOS_1) !== Number(digitos[12])) return null;
  if (digitoVerificador(digitos.slice(0, 13), PESOS_2) !== Number(digitos[13])) return null;
  return digitos;
}

// Completa 12 dígitos com os dois verificadores. Serve para os testes e para os dados de exemplo.
export function completarCnpj(doze: string): string {
  const d1 = digitoVerificador(doze, PESOS_1);
  const d2 = digitoVerificador(doze + d1, PESOS_2);
  return `${doze}${d1}${d2}`;
}
