// Confere as respostas do formulário contra o modelo (modelo.ts) e devolve só o que vale:
//  - pergunta obrigatória sem resposta, tipo errado ou data impossível: erro 400, com a mensagem de cada campo;
//  - pergunta que não aparece (ex.: a data do fim da gripe de quem não teve gripe): a resposta é descartada.
import { AppError } from "../errors/AppError";
import { lerData, type DataISO } from "./datas";
import { condicaoAtendida, type Campo, type CampoMultipla, type Modelo, type Respostas } from "./modelo";

// Mensagem da HU-03, cenário 4.
export const MSG_OBRIGATORIAS = "Responda todas as perguntas obrigatórias para continuar.";
const MSG_PERGUNTA = "Esta pergunta é obrigatória.";
const MSG_DECLARACAO = "Marque para confirmar e enviar.";
const MSG_DATA_FUTURA = "Informe uma data válida, que não esteja no futuro.";
const MSG_DATA_ANTES_NASCIMENTO = "A data não pode ser anterior ao seu nascimento.";

type Mapa = Record<string, unknown>;
type Contexto = { nascimento: DataISO; hoje: DataISO };

const mapa = (valor: unknown): Mapa | null =>
  valor !== null && typeof valor === "object" && !Array.isArray(valor) ? (valor as Mapa) : null;

export function validarRespostas(modelo: Modelo, brutas: unknown, contexto: Contexto): Respostas {
  const origem = mapa(brutas) ?? {};
  const validas: Respostas = {};
  const erros: Record<string, string> = {};

  for (const bloco of modelo.blocos) {
    // Bloco que não aparece (ex.: gestação para quem informou sexo masculino) fica de fora.
    if (!condicaoAtendida(bloco.quando, validas)) continue;
    for (const campo of bloco.campos) validarCampo(campo, origem, validas, campo.id, contexto, erros);
  }

  if (Object.keys(erros).length > 0) {
    const faltou = Object.values(erros).some((erro) => erro === MSG_PERGUNTA || erro === MSG_DECLARACAO);
    throw new AppError(400, faltou ? MSG_OBRIGATORIAS : "Confira as respostas destacadas.", erros);
  }
  return validas;
}

// "escopo" é onde estão as respostas irmãs deste campo (o formulário todo ou os campos de uma opção marcada).
function validarCampo(campo: Campo, origem: Mapa, escopo: Mapa, caminho: string, contexto: Contexto, erros: Record<string, string>) {
  if (!condicaoAtendida(campo.quando, escopo)) return;

  const valor = origem[campo.id];
  if (valor === undefined || valor === null) {
    erros[caminho] = MSG_PERGUNTA;
    return;
  }

  switch (campo.tipo) {
    case "simNao":
      if (typeof valor === "boolean") escopo[campo.id] = valor;
      else erros[caminho] = "Responda sim ou não.";
      return;

    case "escolha":
      if (typeof valor === "string" && campo.opcoes.some((o) => o.id === valor)) escopo[campo.id] = valor;
      else erros[caminho] = "Escolha uma das opções.";
      return;

    case "data": {
      const erro = erroDeData(valor, contexto);
      if (erro) erros[caminho] = erro;
      else escopo[campo.id] = valor;
      return;
    }

    case "numero": {
      const faixa = `${campo.minimo} e ${campo.maximo} ${campo.unidade}`;
      const valido =
        typeof valor === "number" &&
        Number.isFinite(valor) &&
        valor >= campo.minimo &&
        valor <= campo.maximo &&
        Math.round(valor * 10) / 10 === valor; // no máximo uma casa decimal
      if (valido) escopo[campo.id] = valor;
      else erros[caminho] = `Informe um valor entre ${faixa}.`;
      return;
    }

    case "declaracao":
      if (valor === true) escopo[campo.id] = true;
      else erros[caminho] = MSG_DECLARACAO;
      return;

    case "multipla":
      validarMultipla(campo, valor, escopo, caminho, contexto, erros);
      return;
  }
}

function erroDeData(valor: unknown, { nascimento, hoje }: Contexto): string | null {
  const data = lerData(valor);
  if (!data) return "Informe uma data válida.";
  const texto = valor as DataISO;
  if (texto > hoje) return MSG_DATA_FUTURA;
  if (texto < nascimento) return MSG_DATA_ANTES_NASCIMENTO;
  return null;
}

// Pergunta de marcar várias: { opção: { campo: valor } }. Objeto vazio = "nenhuma destas".
function validarMultipla(campo: CampoMultipla, valor: unknown, escopo: Mapa, caminho: string, contexto: Contexto, erros: Record<string, string>) {
  const marcadas = mapa(valor);
  if (!marcadas) {
    erros[caminho] = "Escolha as opções que se aplicam ou marque a opção de nenhuma.";
    return;
  }

  const resultado: Mapa = {};
  for (const [opcaoId, detalhes] of Object.entries(marcadas)) {
    const opcao = campo.opcoes.find((o) => o.id === opcaoId);
    if (!opcao) {
      erros[caminho] = "Opção inválida.";
      continue;
    }

    const origemOpcao = mapa(detalhes) ?? {};
    const validasOpcao: Mapa = {};
    for (const sub of opcao.campos ?? []) {
      validarCampo(sub, origemOpcao, validasOpcao, `${caminho}.${opcaoId}.${sub.id}`, contexto, erros);
    }
    resultado[opcaoId] = validasOpcao;
  }
  escopo[campo.id] = resultado;
}
