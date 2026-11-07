import { AppError } from "../errors/AppError";
import { agenda } from "../agenda/agendaSimulada";
import { horaEmBrasilia } from "../agenda/horario";
import {
  HorarioInexistenteError,
  HorarioOcupadoError,
  InstituicaoIndisponivelError,
  type DiaDaAgenda,
} from "../agenda/tipos";
import { AgendamentoRepository, type AgendamentoComInstituicao } from "../repositories/AgendamentoRepository";
import { DoadorRepository } from "../repositories/DoadorRepository";
import { InstituicaoRepository } from "../repositories/InstituicaoRepository";
import { formatarDataHoraBr, hojeNoBrasil } from "../triagem/datas";
import { tipoParaBanco, tipoParaTexto, type TipoSanguineoTexto } from "../utils/tipoSanguineo";
import { agora } from "../utils/relogio";
import type { StatusAgendamento } from "../../generated/prisma/enums";
import { MSG_HORARIO_INVALIDO, MSG_INSTITUICAO_INVALIDA, agendarSchema } from "../validators/agendamentoValidator";
import { validar } from "../validators/authValidator";
import { PONTOS_POR_DOACAO, calcularProgresso } from "../gamificacao/regras";
import { FormularioService } from "./FormularioService";
import { resumoParaDoacoes, type ResumoDeGamificacao } from "./GamificacaoService";

// Mensagens da HU-04 (agendar) e da HU-06 (cancelar).
export const MSG_HORARIO_INDISPONIVEL = "Este horário não está mais disponível. Escolha outro horário."; // Caso de Uso, exceção E01
export const MSG_INSTITUICAO_FORA_DO_AR =
  "Não foi possível confirmar seu agendamento com a instituição no momento. Tente novamente em alguns instantes ou entre em contato com a instituição diretamente."; // cenário 4
export const MSG_AGENDA_FORA_DO_AR = "Não foi possível consultar os horários da instituição no momento. Tente novamente em alguns instantes.";
export const MSG_CANCELAMENTO_FALHOU =
  "Não foi possível cancelar com a instituição no momento. Tente novamente em alguns instantes ou entre em contato com a instituição diretamente.";
export const MSG_CANCELADO = "Agendamento cancelado com sucesso.";
export const MSG_NAO_CANCELAVEL = "Só é possível cancelar agendamentos com status Agendado."; // RN-006
export const MSG_JA_PASSOU = "Este horário já passou e o agendamento não pode mais ser cancelado.";
// Confirmação da doação (RN-007): quem confirma é a instituição; aqui ela é simulada.
export const MSG_DOACAO_JA_CONFIRMADA = "Esta doação já foi confirmada.";
export const MSG_NAO_CONFIRMAVEL = "Só é possível confirmar doações de agendamentos com status Agendado.";
export const MSG_SO_A_INSTITUICAO = "A confirmação da doação vem da instituição.";

// O que a API devolve sobre um agendamento.
export type AgendamentoResposta = {
  id: string;
  status: StatusAgendamento;
  // Começo e fim do atendimento (ISO, UTC).
  inicio: string;
  fim: string;
  // O mesmo horário em Brasília, pronto para mostrar: dia (AAAA-MM-DD) e horas ("08:30").
  data: string;
  hora: string;
  horaFim: string;
  instituicao: { id: string; nome: string; endereco: string; cidade: string; uf: string; demonstracao: boolean };
  medico: { codigo: string; nome: string; especialidade: string };
  tipoSanguineo: TipoSanguineoTexto;
  // Código que a instituição devolveu ao receber o pedido (RN-005).
  protocolo: string;
  criadoEm: string;
  canceladoEm: string | null;
  // Só em doação confirmada (status Finalizado): quando a instituição confirmou e quantos pontos deu (RN-007).
  finalizadoEm: string | null;
  pontosGanhos: number | null;
  // true = a instituição é simulada: a confirmação da doação pode ser simulada pelo próprio app (só na demonstração).
  simulado: boolean;
};

// O que a API devolve ao confirmar uma doação.
export type RespostaDaDoacao = {
  agendamento: AgendamentoResposta;
  mensagem: string;
  gamificacao: ResumoDeGamificacao;
  subiuDePatente: boolean;
};

export type AgendaResposta = {
  instituicao: { id: string; nome: string; demonstracao: boolean };
  // true = médicos e horários inventados (ainda não há integração com a instituição).
  simulado: boolean;
  dias: DiaDaAgenda[];
};

function paraResposta(a: AgendamentoComInstituicao): AgendamentoResposta {
  const fim = new Date(a.inicio.getTime() + a.duracaoMin * 60_000);
  return {
    id: a.id,
    status: a.status,
    inicio: a.inicio.toISOString(),
    fim: fim.toISOString(),
    data: hojeNoBrasil(a.inicio),
    hora: horaEmBrasilia(a.inicio),
    horaFim: horaEmBrasilia(fim),
    instituicao: {
      id: a.instituicao.id,
      nome: a.instituicao.nome,
      endereco: a.instituicao.endereco,
      cidade: a.instituicao.cidade,
      uf: a.instituicao.uf,
      demonstracao: a.instituicao.demonstracao,
    },
    medico: { codigo: a.medicoCodigo, nome: a.medicoNome, especialidade: a.medicoEspecialidade },
    tipoSanguineo: tipoParaTexto(a.tipoSanguineo),
    protocolo: a.protocolo,
    criadoEm: a.criadoEm.toISOString(),
    canceladoEm: a.canceladoEm?.toISOString() ?? null,
    finalizadoEm: a.finalizadoEm?.toISOString() ?? null,
    pontosGanhos: a.pontosGanhos,
    simulado: agenda().simulado,
  };
}

// Traduz o que a instituição respondeu (ou deixou de responder) para o que o doador vê.
async function daInstituicao<T>(chamada: () => Promise<T>, mensagemSeForaDoAr: string): Promise<T> {
  try {
    return await chamada();
  } catch (erro) {
    if (erro instanceof HorarioInexistenteError) throw new AppError(400, MSG_HORARIO_INVALIDO, { inicio: MSG_HORARIO_INVALIDO });
    if (erro instanceof HorarioOcupadoError) throw new AppError(409, MSG_HORARIO_INDISPONIVEL);
    if (erro instanceof InstituicaoIndisponivelError) throw new AppError(502, mensagemSeForaDoAr);
    throw erro;
  }
}

const jaTemAgendamento = (existente: AgendamentoComInstituicao) =>
  new AppError(
    409,
    `Você já tem uma doação agendada para ${formatarDataHoraBr(existente.inicio)}. Para marcar outra, cancele esse agendamento antes.`,
  );

export const AgendamentoService = {
  // HU-04: os médicos da instituição e os horários livres e ocupados dos próximos dias.
  async agenda(instituicaoId: string): Promise<AgendaResposta> {
    const instituicao = await InstituicaoRepository.buscarPorId(instituicaoId);
    if (!instituicao) throw new AppError(404, "Instituição não encontrada.");

    const dias = await daInstituicao(() => agenda().consultar(instituicao, agora()), MSG_AGENDA_FORA_DO_AR);
    return {
      instituicao: { id: instituicao.id, nome: instituicao.nome, demonstracao: instituicao.demonstracao },
      simulado: agenda().simulado,
      dias,
    };
  },

  // HU-04: reserva o horário. A ordem importa:
  //  1) quem não passou no formulário (ou deixou vencer) não agenda (RN-004, cenário 2);
  //  2) campos em branco ou inválidos (cenário 3);
  //  3) um agendamento por vez (o pedido só segue se o doador não tiver outro por vir);
  //  4) o pedido vai para a instituição (RN-005), que pode recusar ou estar fora do ar (cenário 4);
  //  5) o VITTA registra com o status "Agendado".
  async agendar(doadorId: string, corpo: unknown): Promise<{ agendamento: AgendamentoResposta; mensagem: string }> {
    const doador = await DoadorRepository.buscarPorId(doadorId);
    if (!doador) throw new AppError(401, "Sessão inválida ou expirada. Faça login novamente.");

    // A conferência é refeita a cada pedido, sem confiar no que o app achava.
    await FormularioService.exigirAprovadoParaAgendar(doadorId);

    const dados = validar(agendarSchema, corpo);
    const instituicao = await InstituicaoRepository.buscarPorId(dados.instituicaoId);
    if (!instituicao) throw new AppError(400, MSG_INSTITUICAO_INVALIDA, { instituicaoId: MSG_INSTITUICAO_INVALIDA });

    const momento = agora();
    const existente = await AgendamentoRepository.proximoDoDoador(doadorId, momento);
    if (existente) throw jaTemAgendamento(existente);

    const confirmacao = await daInstituicao(
      () =>
        agenda().reservar(
          {
            instituicao: { id: instituicao.id, codigo: instituicao.codigo, nome: instituicao.nome },
            medicoCodigo: dados.medicoCodigo,
            inicio: dados.inicio,
            doador: { id: doador.id, nome: doador.nome },
            tipoSanguineo: dados.tipoSanguineo,
          },
          momento,
        ),
      MSG_INSTITUICAO_FORA_DO_AR,
    );

    const tipo = tipoParaBanco(dados.tipoSanguineo);
    const resultado = await AgendamentoRepository.criarSeNaoTemAgendado(
      {
        doadorId,
        instituicaoId: instituicao.id,
        medicoCodigo: confirmacao.medico.codigo,
        medicoNome: confirmacao.medico.nome,
        medicoEspecialidade: confirmacao.medico.especialidade,
        inicio: dados.inicio,
        duracaoMin: confirmacao.duracaoMin,
        tipoSanguineo: tipo,
        protocolo: confirmacao.protocolo,
        reservaDoHorario: `${instituicao.id}|${confirmacao.medico.codigo}|${dados.inicio.toISOString()}`,
      },
      momento,
      doador.tipoSanguineo !== tipo,
    );

    if (resultado.tipo === "criado") {
      return {
        agendamento: paraResposta(resultado.agendamento),
        mensagem: `Agendamento realizado com sucesso! Nos vemos em ${formatarDataHoraBr(dados.inicio)} no ${instituicao.nome}.`,
      };
    }

    // Perdeu a corrida (outro pedido ficou com o horário ou o doador agendou em outro aparelho): desfaz o pedido à instituição.
    await agenda()
      .cancelar(confirmacao.protocolo)
      .catch(() => undefined);
    if (resultado.tipo === "ja-tem-agendamento") throw jaTemAgendamento(resultado.agendamento);
    throw new AppError(409, MSG_HORARIO_INDISPONIVEL);
  },

  // O agendamento que ainda vai acontecer, ou nulo.
  async proximo(doadorId: string): Promise<AgendamentoResposta | null> {
    const agendamento = await AgendamentoRepository.proximoDoDoador(doadorId, agora());
    return agendamento ? paraResposta(agendamento) : null;
  },

  // Todos os agendamentos do doador, do mais recente para o mais antigo (base da HU-06).
  async listar(doadorId: string, status?: StatusAgendamento): Promise<AgendamentoResposta[]> {
    return (await AgendamentoRepository.listarDoDoador(doadorId, status)).map(paraResposta);
  },

  // HU-06, cenário 3 / RN-006: só cancela o que está Agendado e ainda não aconteceu, e avisa a instituição.
  async cancelar(doadorId: string, agendamentoId: string): Promise<{ agendamento: AgendamentoResposta; mensagem: string }> {
    const agendamento = await AgendamentoRepository.buscarDoDoador(agendamentoId, doadorId);
    if (!agendamento) throw new AppError(404, "Agendamento não encontrado.");
    if (agendamento.status !== "AGENDADO") throw new AppError(409, MSG_NAO_CANCELAVEL);

    const momento = agora();
    if (agendamento.inicio.getTime() <= momento.getTime()) throw new AppError(409, MSG_JA_PASSOU);

    await daInstituicao(() => agenda().cancelar(agendamento.protocolo), MSG_CANCELAMENTO_FALHOU);

    const cancelado = await AgendamentoRepository.cancelar(agendamento.id, momento);
    if (!cancelado) throw new AppError(409, MSG_NAO_CANCELAVEL);
    return { agendamento: paraResposta(cancelado), mensagem: MSG_CANCELADO };
  },

  // RN-007 e RN-008: a instituição confirma que a doação aconteceu. O agendamento vira Finalizado, a pessoa ganha pontos
  // e pode subir de patente. Quem confirma é a instituição (numa integração real, ela chamaria o VITTA); por enquanto a
  // instituição é simulada e o app tem um botão de demonstração que faz esse papel. Com uma instituição de verdade,
  // esta rota deixa de valer para o doador (403).
  async simularDoacao(doadorId: string, agendamentoId: string): Promise<RespostaDaDoacao> {
    if (!agenda().simulado) throw new AppError(403, MSG_SO_A_INSTITUICAO);

    const agendamento = await AgendamentoRepository.buscarDoDoador(agendamentoId, doadorId);
    if (!agendamento) throw new AppError(404, "Agendamento não encontrado.");
    if (agendamento.status === "FINALIZADO") throw new AppError(409, MSG_DOACAO_JA_CONFIRMADA);
    if (agendamento.status !== "AGENDADO") throw new AppError(409, MSG_NAO_CONFIRMAVEL);

    const finalizado = await AgendamentoRepository.finalizar(agendamento.id, agora(), PONTOS_POR_DOACAO);
    // Outro pedido confirmou ou cancelou no mesmo instante: os pontos só são dados uma vez.
    if (!finalizado) throw new AppError(409, MSG_DOACAO_JA_CONFIRMADA);

    const { doacoes, pontos } = await AgendamentoRepository.totaisDeDoacoes(doadorId);
    const gamificacao = resumoParaDoacoes(doacoes, pontos);
    const subiuDePatente = gamificacao.patente.nivel > calcularProgresso(doacoes - 1).patente.nivel;
    return {
      agendamento: paraResposta(finalizado),
      mensagem:
        `Doação confirmada! Você ganhou ${PONTOS_POR_DOACAO} pontos.` +
        (subiuDePatente ? ` Parabéns, você subiu para a patente ${gamificacao.patente.nome}!` : ""),
      gamificacao,
      subiuDePatente,
    };
  },
};
