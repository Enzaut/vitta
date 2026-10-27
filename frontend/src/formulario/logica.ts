import type { Bloco, Campo, CampoMultipla, Condicao, Modelo, Respostas } from "../api/formulario";
import { dataParaIso } from "../validation/campos";

// Lógica do formulário (HU-03) sem tela: o que aparece, o que falta responder e como montar o envio.
// O estado de tela tem o mesmo formato das respostas da API, com duas diferenças:
//  datas ficam como a pessoa digita (DD/MM/AAAA) e o peso fica como texto (ex.: "68,5").

export type Estado = Record<string, unknown>;
// Erros por pergunta. A chave é o id da pergunta; em campo de uma opção marcada, "pergunta.opcao.campo".
export type Erros = Record<string, string>;

// Mensagens da HU-03 (cenário 4).
export const MSG_OBRIGATORIAS = "Responda todas as perguntas obrigatórias para continuar.";
export const MSG_CONFIRA = "Confira as respostas destacadas.";
export const MSG_PERGUNTA = "Esta pergunta é obrigatória.";
export const MSG_DATA = "Informe uma data válida (dia/mês/ano), que não esteja no futuro.";
export const MSG_DECLARACAO = "Marque para confirmar e enviar.";

const mapa = (valor: unknown): Estado => (valor !== null && typeof valor === "object" ? (valor as Estado) : {});

// Mesma regra da API: pergunta ainda sem resposta nunca é igual a nada.
export function condicaoAtendida(condicao: Condicao | undefined, escopo: Estado): boolean {
  if (!condicao) return true;
  if ("e" in condicao) return condicao.e.every((c) => condicaoAtendida(c, escopo));
  const valor = escopo[condicao.id];
  return "igual" in condicao ? valor === condicao.igual : valor !== condicao.diferente;
}

export const blocosVisiveis = (modelo: Modelo, estado: Estado): Bloco[] =>
  modelo.blocos.filter((bloco) => condicaoAtendida(bloco.quando, estado));

// "68,5" ou "68.5" -> 68.5 (no máximo uma casa decimal).
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  return /^\d+(\.\d)?$/.test(limpo) ? Number(limpo) : null;
}

function erroDoCampo(campo: Campo, valor: unknown): string | null {
  switch (campo.tipo) {
    case "simNao":
      return typeof valor === "boolean" ? null : MSG_PERGUNTA;
    case "escolha":
      return typeof valor === "string" && campo.opcoes.some((o) => o.id === valor) ? null : MSG_PERGUNTA;
    case "data":
      if (typeof valor !== "string" || valor.trim() === "") return MSG_PERGUNTA;
      return dataParaIso(valor) ? null : MSG_DATA;
    case "numero": {
      if (typeof valor !== "string" || valor.trim() === "") return MSG_PERGUNTA;
      const numero = lerNumero(valor);
      if (numero !== null && numero >= campo.minimo && numero <= campo.maximo) return null;
      return `Informe um valor entre ${campo.minimo} e ${campo.maximo} ${campo.unidade}, com no máximo uma casa decimal (por exemplo, 68,5).`;
    }
    case "declaracao":
      return valor === true ? null : MSG_DECLARACAO;
    case "multipla":
      return null; // tratada à parte (cada opção marcada tem os seus campos)
  }
}

// Confere os campos que aparecem. "escopo" são as respostas irmãs; "prefixo" monta a chave do erro.
export function validarCampos(campos: Campo[], escopo: Estado, prefixo: string, erros: Erros) {
  for (const campo of campos) {
    if (!condicaoAtendida(campo.quando, escopo)) continue;
    const chave = prefixo + campo.id;
    const valor = escopo[campo.id];

    if (campo.tipo === "multipla") {
      if (valor === undefined || valor === null) {
        erros[chave] = MSG_PERGUNTA;
        continue;
      }
      const marcadas = mapa(valor);
      for (const opcao of campo.opcoes) {
        if (opcao.id in marcadas) validarCampos(opcao.campos ?? [], mapa(marcadas[opcao.id]), `${chave}.${opcao.id}.`, erros);
      }
      continue;
    }

    const erro = erroDoCampo(campo, valor);
    if (erro) erros[chave] = erro;
  }
}

export function validarBloco(bloco: Bloco, estado: Estado): Erros {
  const erros: Erros = {};
  validarCampos(bloco.campos, estado, "", erros);
  return erros;
}

// A mensagem de cima da tela: a do documento quando falta resposta; senão, pede para conferir.
export const mensagemGeral = (erros: Erros) =>
  Object.values(erros).some((erro) => erro === MSG_PERGUNTA || erro === MSG_DECLARACAO) ? MSG_OBRIGATORIAS : MSG_CONFIRA;

// ---------------------------------------------------------------- envio
function montarCampos(campos: Campo[], escopo: Estado): Respostas {
  const saida: Respostas = {};
  for (const campo of campos) {
    if (!condicaoAtendida(campo.quando, escopo)) continue;
    const valor = escopo[campo.id];
    if (valor === undefined || valor === null) continue;

    switch (campo.tipo) {
      case "data":
        saida[campo.id] = dataParaIso(String(valor)) ?? valor;
        break;
      case "numero":
        saida[campo.id] = lerNumero(String(valor)) ?? valor;
        break;
      case "multipla":
        saida[campo.id] = montarMultipla(campo, mapa(valor));
        break;
      default:
        saida[campo.id] = valor;
    }
  }
  return saida;
}

function montarMultipla(campo: CampoMultipla, marcadas: Estado): Respostas {
  const saida: Respostas = {};
  for (const opcao of campo.opcoes) {
    if (opcao.id in marcadas) saida[opcao.id] = montarCampos(opcao.campos ?? [], mapa(marcadas[opcao.id]));
  }
  return saida;
}

// Só o que aparece para a pessoa vai para a API, com as datas em AAAA-MM-DD e o peso como número.
export function montarRespostas(modelo: Modelo, estado: Estado): Respostas {
  const respostas: Respostas = {};
  for (const bloco of blocosVisiveis(modelo, estado)) Object.assign(respostas, montarCampos(bloco.campos, estado));
  return respostas;
}

// Em qual dos blocos a pergunta de uma chave de erro está (para voltar até ela). -1 se não achar.
export function blocoDoErro(blocos: Bloco[], chave: string): number {
  const id = chave.split(".")[0];
  return blocos.findIndex((bloco) => bloco.campos.some((campo) => campo.id === id));
}
