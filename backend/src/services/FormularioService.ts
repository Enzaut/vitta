import type { FormularioElegibilidade } from "../../generated/prisma/client";
import { AppError } from "../errors/AppError";
import { DoadorRepository } from "../repositories/DoadorRepository";
import { FormularioRepository } from "../repositories/FormularioRepository";
import { situacaoDoAgendamento } from "../triagem/agendamento";
import { analisar, type Achado, type Resultado } from "../triagem/analisar";
import { hojeNoBrasil, paraTexto, somarDias, type DataISO } from "../triagem/datas";
import { MODELO, VALIDADE_DIAS, VERSAO_REGRAS, type Modelo } from "../triagem/modelo";
import { validarRespostas } from "../triagem/validarRespostas";
import { agora } from "../utils/relogio";

// O que a API devolve sobre o formulário. Não devolve as respostas: o doador já as conhece
// e o app não precisa delas de volta (guardar e expor o mínimo de dados de saúde).
export type FormularioResposta = {
  id: string;
  preenchidoEm: string; // data e hora do preenchimento (ISO)
  validoAte: DataISO; // último dia de validade (RN-003)
  resultado: Resultado;
  liberadoEm: DataISO | null;
  mensagem: string;
  motivos: Achado[];
  avisos: string[];
  versaoRegras: string;
  // RN-004: o doador pode agendar hoje?
  vencido: boolean;
  agendamentoLiberado: boolean;
  bloqueioAgendamento: string | null;
};

const dia = (data: Date | null): DataISO | null => (data ? paraTexto(data) : null);
const comoData = (texto: DataISO) => new Date(`${texto}T00:00:00.000Z`);

function paraResposta(registro: FormularioElegibilidade, hoje: DataISO): FormularioResposta {
  const validoAte = paraTexto(registro.validoAte);
  const liberadoEm = dia(registro.liberadoEm);
  const situacao = situacaoDoAgendamento({ resultado: registro.resultado, liberadoEm, validoAte }, hoje);

  return {
    id: registro.id,
    preenchidoEm: registro.preenchidoEm.toISOString(),
    validoAte,
    resultado: registro.resultado,
    liberadoEm,
    mensagem: registro.mensagem,
    motivos: registro.motivos as Achado[],
    avisos: registro.avisos as string[],
    versaoRegras: registro.versaoRegras,
    vencido: situacao.vencido,
    agendamentoLiberado: situacao.agendamentoLiberado,
    bloqueioAgendamento: situacao.bloqueio,
  };
}

export const FormularioService = {
  // As perguntas, para o app montar as telas.
  modelo(): Modelo {
    return MODELO;
  },

  // HU-03: confere as respostas, calcula o resultado e guarda (substituindo o formulário anterior).
  async enviar(doadorId: string, respostas: unknown): Promise<FormularioResposta> {
    const doador = await DoadorRepository.buscarPorId(doadorId);
    if (!doador) throw new AppError(401, "Sessão inválida ou expirada. Faça login novamente.");

    const momento = agora();
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
    return paraResposta(registro, hoje);
  },

  // O formulário mais recente do doador, ou nulo se ele ainda não respondeu.
  async obterAtual(doadorId: string): Promise<FormularioResposta | null> {
    const registro = await FormularioRepository.buscarPorDoador(doadorId);
    return registro ? paraResposta(registro, hojeNoBrasil(agora())) : null;
  },
};
