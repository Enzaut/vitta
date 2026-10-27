import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Campo, CampoEscolha, CampoMultipla } from "../api/formulario";
import { Campo as CampoDeTexto } from "../components/Campo";
import { cores, fontes, raio, tamanhos } from "../theme";
import { mascararData } from "../validation/campos";
import { condicaoAtendida, type Erros, type Estado } from "./logica";

const mapa = (valor: unknown): Estado => (valor !== null && typeof valor === "object" ? (valor as Estado) : {});

type ListaProps = {
  campos: Campo[];
  // Respostas deste grupo (o formulário todo, ou os campos de uma opção marcada).
  escopo: Estado;
  aoMudar: (id: string, valor: unknown) => void;
  erros: Erros;
  // Começo da chave dos erros deste grupo ("" no formulário; "remedios.antibiotico." dentro de uma opção).
  prefixo: string;
};

// Mostra, na ordem, as perguntas que aparecem para a pessoa agora.
export function ListaDeCampos({ campos, escopo, aoMudar, erros, prefixo }: ListaProps) {
  return (
    <>
      {campos
        .filter((campo) => condicaoAtendida(campo.quando, escopo))
        .map((campo) => (
          <Pergunta
            key={campo.id}
            campo={campo}
            valor={escopo[campo.id]}
            aoMudar={(valor) => aoMudar(campo.id, valor)}
            erros={erros}
            chave={prefixo + campo.id}
          />
        ))}
    </>
  );
}

type PerguntaProps = {
  campo: Campo;
  valor: unknown;
  aoMudar: (valor: unknown) => void;
  erros: Erros;
  chave: string;
};

function Pergunta({ campo, valor, aoMudar, erros, chave }: PerguntaProps) {
  const erro = erros[chave];

  // Data e número usam o campo de texto padrão do app (ele já mostra o rótulo e o erro).
  if (campo.tipo === "data") {
    return (
      <CampoDeTexto
        rotulo={campo.rotulo}
        icone="calendar-outline"
        placeholder="DD/MM/AAAA"
        value={typeof valor === "string" ? valor : ""}
        onChangeText={(texto) => aoMudar(mascararData(texto))}
        erro={erro}
        keyboardType="number-pad"
        maxLength={10}
      />
    );
  }

  if (campo.tipo === "numero") {
    return (
      <CampoDeTexto
        rotulo={`${campo.rotulo} (${campo.unidade})`}
        icone="speedometer-outline"
        placeholder="Ex.: 68,5"
        value={typeof valor === "string" ? valor : ""}
        onChangeText={(texto) => aoMudar(texto.replace(/[^\d.,]/g, ""))}
        erro={erro}
        keyboardType="decimal-pad"
        maxLength={5}
      />
    );
  }

  if (campo.tipo === "declaracao") {
    return (
      <View style={estilos.grupo}>
        <LinhaSelecionavel tipo="checkbox" texto={campo.rotulo} selecionado={valor === true} aoPressionar={() => aoMudar(valor === true ? false : true)} />
        {!!erro && <Erro texto={erro} />}
      </View>
    );
  }

  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>{campo.rotulo}</Text>
      {!!campo.ajuda && <Text style={estilos.ajuda}>{campo.ajuda}</Text>}

      {campo.tipo === "simNao" && <SimNao valor={valor} aoMudar={aoMudar} rotulo={campo.rotulo} />}
      {campo.tipo === "escolha" && <Escolha campo={campo} valor={valor} aoMudar={aoMudar} />}
      {campo.tipo === "multipla" && <Multipla campo={campo} valor={valor} aoMudar={aoMudar} erros={erros} chave={chave} />}

      {!!erro && <Erro texto={erro} />}
    </View>
  );
}

const Erro = ({ texto }: { texto: string }) => (
  <Text style={estilos.erro} accessibilityRole="alert">
    {texto}
  </Text>
);

// ---------------------------------------------------------------- sim ou não
function SimNao({ valor, aoMudar, rotulo }: { valor: unknown; aoMudar: (v: unknown) => void; rotulo: string }) {
  return (
    <View style={estilos.simNao} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      {([true, false] as const).map((opcao) => {
        const selecionado = valor === opcao;
        return (
          <Pressable
            key={String(opcao)}
            onPress={() => aoMudar(opcao)}
            accessibilityRole="radio"
            accessibilityLabel={opcao ? "Sim" : "Não"}
            aria-checked={selecionado}
            style={({ pressed }) => [estilos.botaoSimNao, selecionado && estilos.botaoSimNaoSelecionado, pressed && !selecionado && estilos.pressionado]}
          >
            <Text style={[estilos.botaoSimNaoTexto, selecionado && estilos.textoSelecionado]}>{opcao ? "Sim" : "Não"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- escolher uma opção
function Escolha({ campo, valor, aoMudar }: { campo: CampoEscolha; valor: unknown; aoMudar: (v: unknown) => void }) {
  return (
    <View style={estilos.linhas} accessibilityRole="radiogroup">
      {campo.opcoes.map((opcao) => (
        <LinhaSelecionavel key={opcao.id} tipo="radio" texto={opcao.rotulo} selecionado={valor === opcao.id} aoPressionar={() => aoMudar(opcao.id)} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- marcar várias opções
type MultiplaProps = { campo: CampoMultipla; valor: unknown; aoMudar: (v: unknown) => void; erros: Erros; chave: string };

function Multipla({ campo, valor, aoMudar, erros, chave }: MultiplaProps) {
  // valor: { opção: { campo: valor } }. Objeto vazio = "nenhum destes"; sem valor = ainda não respondeu.
  const marcadas = valor === undefined || valor === null ? null : mapa(valor);
  const nenhumMarcado = marcadas !== null && Object.keys(marcadas).length === 0;

  function alternar(opcaoId: string) {
    const atuais = { ...(marcadas ?? {}) };
    if (opcaoId in atuais) delete atuais[opcaoId];
    else atuais[opcaoId] = {};
    // Desmarcar a última opção volta ao "sem resposta" (o “nenhum” precisa ser marcado de propósito).
    aoMudar(Object.keys(atuais).length === 0 ? undefined : atuais);
  }

  return (
    <View style={estilos.linhas}>
      {campo.opcoes.map((opcao) => {
        const selecionada = marcadas !== null && opcao.id in marcadas;
        const subcampos = opcao.campos ?? [];
        return (
          <View key={opcao.id}>
            <LinhaSelecionavel tipo="checkbox" texto={opcao.rotulo} selecionado={selecionada} aoPressionar={() => alternar(opcao.id)} />
            {selecionada && subcampos.length > 0 && marcadas && (
              <View style={estilos.detalhes}>
                <ListaDeCampos
                  campos={subcampos}
                  escopo={mapa(marcadas[opcao.id])}
                  aoMudar={(id, v) => aoMudar({ ...marcadas, [opcao.id]: { ...mapa(marcadas[opcao.id]), [id]: v } })}
                  erros={erros}
                  prefixo={`${chave}.${opcao.id}.`}
                />
              </View>
            )}
          </View>
        );
      })}
      <LinhaSelecionavel tipo="checkbox" texto={campo.nenhumRotulo} selecionado={nenhumMarcado} aoPressionar={() => aoMudar(nenhumMarcado ? undefined : {})} />
    </View>
  );
}

// ---------------------------------------------------------------- linha que a pessoa toca para marcar
type LinhaProps = { texto: string; selecionado: boolean; aoPressionar: () => void; tipo: "radio" | "checkbox" };

function LinhaSelecionavel({ texto, selecionado, aoPressionar, tipo }: LinhaProps) {
  return (
    <Pressable
      onPress={aoPressionar}
      accessibilityRole={tipo}
      accessibilityLabel={texto}
      aria-checked={selecionado}
      style={({ pressed }) => [estilos.linha, selecionado && estilos.linhaSelecionada, pressed && !selecionado && estilos.pressionado]}
    >
      <View style={[estilos.marca, tipo === "radio" ? estilos.marcaRedonda : estilos.marcaQuadrada, selecionado && estilos.marcaSelecionada]}>
        {selecionado && (tipo === "radio" ? <View style={estilos.miolo} /> : <Ionicons name="checkmark" size={16} color="#FFFFFF" />)}
      </View>
      <Text style={estilos.linhaTexto}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  grupo: { marginBottom: 22 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.texto, lineHeight: 22 },
  ajuda: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, marginTop: 4, lineHeight: 19 },
  erro: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.erro, marginTop: 6 },
  linhas: { gap: 8, marginTop: 10 },
  simNao: { flexDirection: "row", gap: 12, marginTop: 10 },
  botaoSimNao: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  botaoSimNaoSelecionado: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  botaoSimNaoTexto: { fontFamily: fontes.botao, fontSize: tamanhos.texto, color: cores.texto },
  textoSelecionado: { color: "#FFFFFF" },
  pressionado: { backgroundColor: cores.fundoErro },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: raio,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  linhaSelecionada: { borderColor: cores.primaria, backgroundColor: cores.fundoErro },
  linhaTexto: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario + 1, color: cores.texto, lineHeight: 21 },
  marca: { width: 22, height: 22, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: cores.borda, backgroundColor: cores.fundo },
  marcaRedonda: { borderRadius: 11 },
  marcaQuadrada: { borderRadius: 6 },
  marcaSelecionada: { borderColor: cores.primaria, backgroundColor: cores.primaria },
  miolo: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
  detalhes: { marginTop: 10, marginBottom: 4, marginLeft: 10, paddingLeft: 14, borderLeftWidth: 3, borderLeftColor: cores.primaria },
});
