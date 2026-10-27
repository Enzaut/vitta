import { AppError } from "../errors/AppError";
import { DoadorRepository } from "../repositories/DoadorRepository";
import { conferirSenha, gerarHash } from "../utils/senha";
import { gerarToken } from "../utils/token";
import type { DadosCadastro, DadosLogin } from "../validators/authValidator";
import { paraResposta, type DoadorResposta } from "./DoadorService";

// HU-01, cenário 3: 5 falhas seguidas bloqueiam a conta por 15 minutos.
export const MAX_FALHAS = 5;
export const BLOQUEIO_MINUTOS = 15;

const MSG_CREDENCIAIS = "E-mail ou senha incorretos. Verifique seus dados e tente novamente.";
const MSG_BLOQUEIO = `Muitas tentativas incorretas. Tente novamente em ${BLOQUEIO_MINUTOS} minutos.`;
const MSG_EMAIL_EM_USO = "Este e-mail já está em uso. Faça login ou recupere sua senha.";

export type RespostaAuth = { token: string; doador: DoadorResposta };

const emailEmUso = () => new AppError(409, MSG_EMAIL_EM_USO, { email: MSG_EMAIL_EM_USO });
const credenciaisInvalidas = () => new AppError(401, MSG_CREDENCIAIS);
const contaBloqueada = () => new AppError(429, MSG_BLOQUEIO);

// Usado quando o e-mail não existe: gasta o mesmo tempo de uma conferência real,
// para a resposta não revelar quais e-mails têm conta.
let hashFalso: string | undefined;
async function conferirContraHashFalso(senha: string) {
  hashFalso ??= await gerarHash("senha-falsa-apenas-para-gastar-tempo");
  await conferirSenha(senha, hashFalso);
}

function violouEmailUnico(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null && "code" in erro && erro.code === "P2002";
}

export const AuthService = {
  // HU-01, cenário 1: valida, cria a conta e já devolve o token (a pessoa entra logada).
  async cadastrar(dados: DadosCadastro): Promise<RespostaAuth> {
    if (await DoadorRepository.buscarPorEmail(dados.email)) throw emailEmUso();

    try {
      const doador = await DoadorRepository.criar({
        nome: dados.nome,
        email: dados.email,
        dataNascimento: dados.dataNascimento,
        senhaHash: await gerarHash(dados.senha),
      });
      return { token: gerarToken(doador.id), doador: paraResposta(doador) };
    } catch (erro) {
      // Dois cadastros ao mesmo tempo com o mesmo e-mail: o banco barra o segundo.
      if (violouEmailUnico(erro)) throw emailEmUso();
      throw erro;
    }
  },

  // HU-01, cenários 2 e 3.
  async login(dados: DadosLogin): Promise<RespostaAuth> {
    const doador = await DoadorRepository.buscarPorEmail(dados.email);
    if (!doador) {
      await conferirContraHashFalso(dados.senha);
      throw credenciaisInvalidas();
    }

    // Conta bloqueada: nem confere a senha.
    if (doador.bloqueadoAte && doador.bloqueadoAte.getTime() > Date.now()) throw contaBloqueada();

    if (!(await conferirSenha(dados.senha, doador.senhaHash))) {
      const falhas = await DoadorRepository.registrarFalhaDeLogin(doador.id);
      if (falhas >= MAX_FALHAS) {
        await DoadorRepository.bloquear(doador.id, new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000));
        throw contaBloqueada();
      }
      throw credenciaisInvalidas();
    }

    if (doador.tentativasFalhas > 0 || doador.bloqueadoAte) await DoadorRepository.limparFalhasDeLogin(doador.id);
    return { token: gerarToken(doador.id), doador: paraResposta(doador) };
  },
};
