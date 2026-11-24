import { AppError } from "../errors/AppError";
import { ContaInstituicaoRepository } from "../repositories/ContaInstituicaoRepository";
import { conferirSenha, gerarHash } from "../utils/senha";
import { gerarToken } from "../utils/token";
import type { DadosLogin } from "../validators/authValidator";
import type { DadosCadastroInstituicao } from "../validators/contaInstituicaoValidator";
import { BLOQUEIO_MINUTOS, MAX_FALHAS } from "./AuthService";
import { contaParaResposta, type ContaResposta } from "./ContaInstituicaoService";

const MSG_CREDENCIAIS = "E-mail ou senha incorretos. Verifique seus dados e tente novamente.";
const MSG_BLOQUEIO = `Muitas tentativas incorretas. Tente novamente em ${BLOQUEIO_MINUTOS} minutos.`;
const MSG_EMAIL_EM_USO = "Este e-mail já está em uso. Faça login ou recupere sua senha.";
const MSG_CNPJ_EM_USO = "Já existe uma conta com este CNPJ.";

export type RespostaAuthInstituicao = { token: string; conta: ContaResposta };

const emailEmUso = () => new AppError(409, MSG_EMAIL_EM_USO, { email: MSG_EMAIL_EM_USO });
const cnpjEmUso = () => new AppError(409, MSG_CNPJ_EM_USO, { cnpj: MSG_CNPJ_EM_USO });

// Usado quando o e-mail não existe: gasta o mesmo tempo de uma conferência real,
// para a resposta não revelar quais e-mails têm conta.
let hashFalso: string | undefined;
async function conferirContraHashFalso(senha: string) {
  hashFalso ??= await gerarHash("senha-falsa-apenas-para-gastar-tempo");
  await conferirSenha(senha, hashFalso);
}

function violouUnico(erro: unknown): string | null {
  if (typeof erro !== "object" || erro === null || !("code" in erro) || erro.code !== "P2002") return null;
  return JSON.stringify(erro).includes("cnpj") ? "cnpj" : "email";
}

// Cadastro e login da conta da instituição. Segue as mesmas regras de segurança do doador (RN-011, RNF-003):
// senha com hash, mensagem igual para e-mail ou senha errados e bloqueio depois de 5 falhas seguidas.
export const AuthInstituicaoService = {
  async cadastrar(dados: DadosCadastroInstituicao): Promise<RespostaAuthInstituicao> {
    if (await ContaInstituicaoRepository.buscarPorEmail(dados.email)) throw emailEmUso();
    if (await ContaInstituicaoRepository.buscarPorCnpj(dados.cnpj)) throw cnpjEmUso();

    try {
      const conta = await ContaInstituicaoRepository.criar({
        nome: dados.nome,
        email: dados.email,
        cnpj: dados.cnpj,
        telefone: dados.telefone,
        senhaHash: await gerarHash(dados.senha),
      });
      return { token: gerarToken(conta.id, "instituicao"), conta: contaParaResposta(conta) };
    } catch (erro) {
      // Dois cadastros ao mesmo tempo com o mesmo e-mail ou CNPJ: o banco barra o segundo.
      const campo = violouUnico(erro);
      if (campo === "cnpj") throw cnpjEmUso();
      if (campo === "email") throw emailEmUso();
      throw erro;
    }
  },

  async login(dados: DadosLogin): Promise<RespostaAuthInstituicao> {
    const conta = await ContaInstituicaoRepository.buscarPorEmail(dados.email);
    if (!conta) {
      await conferirContraHashFalso(dados.senha);
      throw new AppError(401, MSG_CREDENCIAIS);
    }

    if (conta.bloqueadoAte && conta.bloqueadoAte.getTime() > Date.now()) throw new AppError(429, MSG_BLOQUEIO);

    if (!(await conferirSenha(dados.senha, conta.senhaHash))) {
      const falhas = await ContaInstituicaoRepository.registrarFalhaDeLogin(conta.id);
      if (falhas >= MAX_FALHAS) {
        await ContaInstituicaoRepository.bloquear(conta.id, new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000));
        throw new AppError(429, MSG_BLOQUEIO);
      }
      throw new AppError(401, MSG_CREDENCIAIS);
    }

    if (conta.tentativasFalhas > 0 || conta.bloqueadoAte) await ContaInstituicaoRepository.limparFalhasDeLogin(conta.id);
    return { token: gerarToken(conta.id, "instituicao"), conta: contaParaResposta(conta) };
  },
};
