// Telefone brasileiro com DDD. Aceita "(61) 99999-8888", "61 99999-8888", "61999998888" ou com +55,
// e devolve só os dígitos ("61999998888"). Se estiver fora do formato, devolve null.
//
// Regras:
//  - 11 dígitos: celular, DDD + 9 + 8 dígitos (o terceiro dígito é sempre 9);
//  - 10 dígitos: fixo, DDD + 8 dígitos (o terceiro dígito vai de 2 a 5);
//  - o DDD tem dois dígitos e nenhum deles é zero (11, 21, 61...).
export function lerTelefone(texto: string): string | null {
  let digitos = texto.replace(/\D/g, "");

  // Código do país (+55): só é removido quando sobra um número com DDD de 10 ou 11 dígitos.
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }

  if (digitos.length !== 10 && digitos.length !== 11) return null;
  if (!/^[1-9][1-9]/.test(digitos)) return null;

  const terceiro = digitos[2]!;
  if (digitos.length === 11) return terceiro === "9" ? digitos : null;
  return /[2-5]/.test(terceiro) ? digitos : null;
}

// Faz o caminho inverso de lerTelefone: "6133274413" -> "(61) 3327-4413" e "61999998888" -> "(61) 99999-8888".
// É o formato que as instituições dos dados iniciais usam e que o app mostra aos doadores.
export function formatarTelefone(digitos: string): string {
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return digitos;
}
