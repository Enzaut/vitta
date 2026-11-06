import type { Prisma } from "../../generated/prisma/client";
import { StatusAgendamento, type TipoSanguineo } from "../../generated/prisma/enums";
import { prisma } from "../db";

// Todo agendamento é lido junto com a instituição, porque o app mostra o nome e o endereço dela.
const comInstituicao = { instituicao: true } satisfies Prisma.AgendamentoInclude;
export type AgendamentoComInstituicao = Prisma.AgendamentoGetPayload<{ include: typeof comInstituicao }>;

export type DadosDoAgendamento = {
  doadorId: string;
  instituicaoId: string;
  medicoCodigo: string;
  medicoNome: string;
  medicoEspecialidade: string;
  inicio: Date;
  duracaoMin: number;
  tipoSanguineo: TipoSanguineo;
  protocolo: string;
  // "instituição|médico|horário": única enquanto o agendamento está AGENDADO (veja o schema).
  reservaDoHorario: string;
};

export type ResultadoDaCriacao =
  | { tipo: "criado"; agendamento: AgendamentoComInstituicao }
  | { tipo: "ja-tem-agendamento"; agendamento: AgendamentoComInstituicao }
  | { tipo: "horario-ocupado" };

const violouChaveUnica = (erro: unknown) => typeof erro === "object" && erro !== null && "code" in erro && erro.code === "P2002";

// Camada de acesso ao banco: só conversa com o Prisma, sem regra de negócio.
export const AgendamentoRepository = {
  // Os horários que o VITTA já reservou numa instituição no período: ficam ocupados para os outros doadores.
  horariosReservados(instituicaoId: string, de: Date, ate: Date) {
    return prisma.agendamento.findMany({
      where: { instituicaoId, status: StatusAgendamento.AGENDADO, inicio: { gte: de, lt: ate } },
      select: { medicoCodigo: true, inicio: true },
    });
  },

  // O agendamento que ainda vai acontecer (no máximo um por doador).
  proximoDoDoador(doadorId: string, agora: Date) {
    return prisma.agendamento.findFirst({
      where: { doadorId, status: StatusAgendamento.AGENDADO, inicio: { gt: agora } },
      orderBy: { inicio: "asc" },
      include: comInstituicao,
    });
  },

  // Do mais recente para o mais antigo, como pede a HU-06.
  listarDoDoador(doadorId: string, status?: StatusAgendamento) {
    return prisma.agendamento.findMany({
      where: { doadorId, ...(status && { status }) },
      orderBy: { inicio: "desc" },
      include: comInstituicao,
    });
  },

  // Só acha se o agendamento for do doador: o de outra pessoa nem aparece.
  buscarDoDoador(id: string, doadorId: string) {
    return prisma.agendamento.findFirst({ where: { id, doadorId }, include: comInstituicao });
  },

  // Cria o agendamento, a menos que o doador já tenha outro por vir ou que o horário tenha acabado de ser reservado.
  // Tudo numa transação, para dois pedidos ao mesmo tempo não passarem juntos.
  async criarSeNaoTemAgendado(dados: DadosDoAgendamento, agora: Date, atualizarTipoNoPerfil: boolean): Promise<ResultadoDaCriacao> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Um pedido por vez para o mesmo doador: o segundo espera o primeiro terminar e então enxerga o que ele gravou.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dados.doadorId}))`;

        const existente = await tx.agendamento.findFirst({
          where: { doadorId: dados.doadorId, status: StatusAgendamento.AGENDADO, inicio: { gt: agora } },
          include: comInstituicao,
        });
        if (existente) return { tipo: "ja-tem-agendamento" as const, agendamento: existente };

        const agendamento = await tx.agendamento.create({ data: dados, include: comInstituicao });
        // HU-04: quem confirma ou atualiza o tipo sanguíneo ao agendar também atualiza o perfil.
        if (atualizarTipoNoPerfil) await tx.doador.update({ where: { id: dados.doadorId }, data: { tipoSanguineo: dados.tipoSanguineo } });
        return { tipo: "criado" as const, agendamento };
      });
    } catch (erro) {
      // Outro doador ficou com o mesmo horário no mesmo instante.
      if (violouChaveUnica(erro)) return { tipo: "horario-ocupado" };
      throw erro;
    }
  },

  // Só cancela se ainda estiver AGENDADO. Devolve nulo se outro pedido já tinha cancelado.
  async cancelar(id: string, canceladoEm: Date) {
    const { count } = await prisma.agendamento.updateMany({
      where: { id, status: StatusAgendamento.AGENDADO },
      // Sem a chave de reserva, o horário volta a ficar livre para outras pessoas.
      data: { status: StatusAgendamento.CANCELADO, canceladoEm, reservaDoHorario: null },
    });
    if (count === 0) return null;
    return prisma.agendamento.findUnique({ where: { id }, include: comInstituicao });
  },
};
