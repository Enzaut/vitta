import { cores } from "../theme";

// Mensagens iguais às da HU-01 (Documento de Requisitos).
export const OBRIGATORIO = "Este campo é obrigatório.";
export const EMAIL_INVALIDO = "Informe um endereço de e-mail válido.";

// Regra de senha do caso de uso Cadastro e Login (RN06).
export const ESPECIAIS = "!@#$%*";
export const REGRA_SENHA = `A senha deve ter no mínimo 8 caracteres, com uma letra maiúscula, um número e um caractere especial (${ESPECIAIS}).`;

// HU-11: tipos sanguíneos aceitos e mensagem para telefone fora do formato.
export const TIPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const MSG_TELEFONE = "Informe um telefone válido com DDD, por exemplo (61) 99999-8888.";

// Vai formatando o telefone enquanto a pessoa digita: 61999998888 -> (61) 99999-8888.
export function mascararTelefone(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Mesma regra da API: 11 dígitos (celular, DDD + 9...) ou 10 dígitos (fixo, DDD + 2 a 5...), DDD sem zeros.
export function telefoneValido(texto: string): boolean {
  let d = texto.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return false;
  if (!/^[1-9][1-9]/.test(d)) return false;
  return d.length === 11 ? d[2] === "9" : /[2-5]/.test(d[2] ?? "");
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function senhaAtendeRegra(senha: string): boolean {
  return (
    senha.length >= 8 &&
    /[A-Z]/.test(senha) &&
    /[0-9]/.test(senha) &&
    [...ESPECIAIS].some((c) => senha.includes(c))
  );
}

export type ForcaDaSenha = { nivel: 0 | 1 | 2 | 3; rotulo: string; cor: string };

// Barra de força da senha (vermelha, amarela ou verde), exibida enquanto a pessoa digita.
export function forcaDaSenha(senha: string): ForcaDaSenha {
  if (!senha) return { nivel: 0, rotulo: "", cor: cores.borda };
  if (senhaAtendeRegra(senha)) return { nivel: 3, rotulo: "Forte", cor: cores.sucesso };

  const criterios = [senha.length >= 8, /[A-Z]/.test(senha), /[a-z]/.test(senha), /[0-9]/.test(senha), /[^A-Za-z0-9]/.test(senha)];
  const atendidos = criterios.filter(Boolean).length;
  return atendidos >= 3
    ? { nivel: 2, rotulo: "Média", cor: cores.alerta }
    : { nivel: 1, rotulo: "Fraca", cor: cores.erro };
}

// Vai formatando a data enquanto a pessoa digita: 15031995 -> 15/03/1995.
export function mascararData(texto: string): string {
  const digitos = texto.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

// "15/03/1995" -> "1995-03-15" (formato que a API espera). Devolve null se a data não existir ou for futura.
export function dataParaIso(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const existe = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  if (!existe || ano < 1900 || data.getTime() > Date.now()) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// "1995-03-15" -> "15/03/1995"
export function formatarDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
