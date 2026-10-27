// Coloca (ou atualiza) as instituições do mapa no banco. Pode rodar quantas vezes quiser: não duplica.
//   npm run seed                      -> instituições reais + de demonstração
//   INSTITUICOES_DEMO=false npm run seed   -> só as reais (e apaga as de demonstração do banco)
import { prisma } from "../src/db";
import { tipoParaBanco } from "../src/utils/tipoSanguineo";
import { INSTITUICOES, type DadosInstituicao } from "./dados/instituicoes";

const incluirDemonstracao = process.env.INSTITUICOES_DEMO !== "false";

function paraBanco(i: DadosInstituicao) {
  return {
    nome: i.nome,
    endereco: i.endereco,
    cidade: i.cidade,
    uf: i.uf,
    telefone: i.telefone,
    horario: i.horario,
    latitude: i.latitude,
    longitude: i.longitude,
    tiposEmFalta: i.tiposEmFalta.map(tipoParaBanco),
    estoqueAtualizadoEm: i.estoqueAtualizadoEm ? new Date(`${i.estoqueAtualizadoEm}T00:00:00.000Z`) : null,
    demonstracao: i.demonstracao,
    fonte: i.fonte,
  };
}

async function main() {
  const lista = INSTITUICOES.filter((i) => incluirDemonstracao || !i.demonstracao);
  for (const instituicao of lista) {
    const dados = paraBanco(instituicao);
    await prisma.instituicao.upsert({
      where: { codigo: instituicao.codigo },
      create: { codigo: instituicao.codigo, ...dados },
      update: dados,
    });
  }

  let removidas = 0;
  if (!incluirDemonstracao) {
    removidas = (await prisma.instituicao.deleteMany({ where: { demonstracao: true } })).count;
  }

  const reais = lista.filter((i) => !i.demonstracao).length;
  console.log(
    `Instituições no banco: ${reais} reais e ${lista.length - reais} de demonstração` +
      (removidas > 0 ? ` (${removidas} de demonstração removidas)` : "") +
      ".",
  );
}

main()
  .catch((erro) => {
    console.error("Não foi possível carregar as instituições:", erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
