import type { FormularioElegibilidade } from "../../generated/prisma/client";
import { AppError } from "../errors/AppError";
import { DoadorRepository } from "../repositories/DoadorRepository";
import { FormularioRepository } from "../repositories/FormularioRepository";
import {
  podeResponderEm,
  situacaoDoAgendamento,
  type CodigoDaSituacao,
  type SituacaoDoAgendamento,
} from "../triagem/agendamento";
import { analisar, type Achado, type Resultado } from "../triagem/analisar";
import { formatarDataHoraBr, hojeNoBrasil, paraTexto, somarDias, type DataISO } from "../triagem/datas";
import { ESPERA_APOS_REPROVACAO_DIAS, MODELO, VALIDADE_DIAS, VERSAO_REGRAS, type Modelo } from "../triagem/modelo";
import { validarRespostas } from "../triagem/validarRespostas";
import { agora } from "../utils/relogio";

// O que a API devolve sobre o formulário. Não devolve as respostas: o doador já as conhece
// e o app não precisa delas de volta (guardar e expor o mínimo de dados de saúde).
export type FormularioResposta = {
  id: string;
  preenchidoEm: string; // data e hora do preenchimento (ISO)
  validoAte: DataISO; // último dia de validade (RN-003: 7 dias)
  resultado: Resultado;
  liberadoEm: DataISO | null;
  mensagem: string;
  motivos: Achado[];
  avisos: string[];
  versaoRegras: string;
  // A resposta do formulário: positiva (passou) ou negativa (não passou).
  aprovado: boolean;
  // RN-004: o doador pode agendar hoje?
  vencido: boolean;
  agendamentoLiberado: boolean;
  bloqueioAgendamento: string | null;
  // RN-005: quem não passou espera 3 dias para responder de novo. Nulo para quem passou.
  podeResponderEm: string | null;
  podeResponderAgora: boolean;
};

// O que o app pergunta antes de deixar a pessoa marcar uma doação.
export type VerificacaoDeAgendamento = {
  liberado: boolean;
  codigo: CodigoDaSituacao;
  // Por que não está liberado (nulo quando está).
  mensagem: string | null;
  validoAte: DataISO | null;
  podeResponderEm: string | null;
};

const dia = (data: Date | null): DataISO | null => (data ? paraTexto(data) : null);
const comoData = (texto: DataISO) => new Date(`${texto}T00:00:00.000Z`);

function situacaoDo(registro: FormularioElegibilidade | null, momento: Date): SituacaoDoAgendamento {
  return situacaoDoAgendamento(
    registro
      ? { resultado: registro.resultado, preenchidoEm: registro.preenchidoEm, validoAte: paraTexto(registro.validoAte), liberadoEm: dia(registro.liberadoEm) }
      : null,
    momento,
  );
}

function paraResposta(registro: FormularioElegibilidade, momento: Date): FormularioResposta {
  const situacao = situacaoDo(registro, momento);

  return {
    id: registro.id,
    preenchidoEm: registro.preenchidoEm.toISOString(),
    validoAte: paraTexto(registro.validoAte),
    resultado: registro.resultado,
    liberadoEm: dia(registro.liberadoEm),
    mensagem: registro.mensagem,
    motivos: registro.motivos as Achado[],
    avisos: registro.avisos as string[],
    versaoRegras: registro.versaoRegras,
    aprovado: situacao.aprovado,
    vencido: situacao.vencido,
    agendamentoLiberado: situacao.agendamentoLiberado,
    bloqueioAgendamento: situacao.bloqueio,
    podeResponderEm: situacao.podeResponderEm?.toISOString() ?? null,
    podeResponderAgora: situacao.podeResponderAgora,
  };
}

export const FormularioService = {
  // As perguntas, para o app montar as telas.
  modelo(): Modelo {
    return MODELO;
  },

  // HU-03: confere as respostas, calcula o resultado e guarda (substituindo o formulário anterior).
  // RN-005: quem não passou só responde de novo depois de 3 dias.
  async enviar(doadorId: string, respostas: unknown): Promise<FormularioResposta> {
    const doador = await DoadorRepository.buscarPorId(doadorId);
    if (!doador) throw new AppError(401, "Sessão inválida ou expirada. Faça login novamente.");

    const momento = agora();

    const anterior = await FormularioRepository.buscarPorDoador(doadorId);
    const espera = anterior ? podeResponderEm(anterior) : null;
    if (espera && espera.getTime() > momento.getTime()) {
      const segundos = Math.ceil((espera.getTime() - momento.getTime()) / 1000);
      throw new AppError(
        429,
        `Você não passou no formulário da última vez. Para responder de novo, aguarde até ${formatarDataHoraBr(espera)} (${ESPERA_APOS_REPROVACAO_DIAS} dias depois da última resposta).`,
        undefined,
        { corpo: { podeResponderEm: espera.toISOString() }, cabecalhos: { "Retry-After": String(segundos) } },
      );
    }

    const hoje = hojeNoBrasil(momento);
    const nascimento = paraTexto(doador.dataNascimento);

    const validas = validarRespostas(MODELO, respostas, { nascimento, hoje });
    const analise = analisar(validas, { nascimento, hoje });

    const registro = await FormularioRepository.salvar(doadorId, {
      preenchidoEm: momento,
      validoAte: comoData(somarDias(hoje, VALIDADE_DIAS)),
      resultado: analise.resultado,
      liberadoEm: analise.liberadoEm ? comoData(analise.liberadoEm) : null,
      mensagem: analise.mensagem,
      motivos: analise.motivos,
      avisos: analise.avisos,
      versaoRegras: VERSAO_REGRAS,
      respostas: validas as object,
    });
    return paraResposta(registro, momento);
  },

  // O formulário mais recente do doador, ou nulo se ele ainda não respondeu.
  async obterAtual(doadorId: string): Promise<FormularioResposta | null> {
    const registro = await FormularioRepository.buscarPorDoador(doadorId);
    return registro ? paraResposta(registro, agora()) : null;
  },

  // RN-004: a conferência que vem antes de marcar uma doação. Olha o formulário no momento da pergunta
  // (passou? ainda vale?), nunca um resultado guardado de antes.
  async verificarAgendamento(doadorId: string): Promise<VerificacaoDeAgendamento> {
    const registro = await FormularioRepository.buscarPorDoador(doadorId);
    const situacao = situacaoDo(registro, agora());

    return {
      liberado: situacao.agendamentoLiberado,
      codigo: situacao.codigo,
      mensagem: situacao.bloqueio,
      validoAte: registro ? paraTexto(registro.validoAte) : null,
      podeResponderEm: situacao.podeResponderEm?.toISOString() ?? null,
    };
  },

  // Para a futura HU-04 (agendar doação): chame antes de gravar um agendamento. Quem não está liberado leva 403.
  async exigirAprovadoParaAgendar(doadorId: string): Promise<void> {
    const verificacao = await FormularioService.verificarAgendamento(doadorId);
    if (!verificacao.liberado) throw new AppError(403, verificacao.mensagem ?? "Responda ao formulário de elegibilidade para agendar.");
  },
};
