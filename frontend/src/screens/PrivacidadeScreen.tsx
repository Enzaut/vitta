import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Privacidade">;
type Etapa = 1 | 2;

const TEXTO_ETAPA_1 =
  "Atenção: Esta ação é permanente e irreversível. Todos os seus dados pessoais, histórico de agendamentos, pontos e vouchers serão removidos definitivamente do sistema.";
const TEXTO_ETAPA_2 = "Tem certeza absoluta? Não será possível desfazer esta ação.";

// HU-02: exclusão da conta e dos dados, com duas confirmações antes de apagar.
export function PrivacidadeScreen(_: Props) {
  const { excluirConta } = useAuth();
  // "aberto" e "etapa" são separados: ao fechar, a etapa não muda, e o texto não pisca durante a animação.
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrir() {
    setErro(null);
    setEtapa(1);
    setAberto(true);
  }

  // Cancelar (botão, "X" ou voltar do Android) fecha o modal sem mudar nada.
  function cancelar() {
    if (excluindo) return;
    setAberto(false);
    setErro(null);
  }

  async function confirmarExclusao() {
    setExcluindo(true);
    setErro(null);
    try {
      await excluirConta();
      // Deu certo: a sessão termina e o app volta sozinho para a tela inicial, com a mensagem de sucesso.
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível excluir a conta. Tente novamente.");
      setExcluindo(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>Privacidade e Dados</Text>
      <Text style={estilos.texto}>
        Pela LGPD (Lei nº 13.709/2018), você pode pedir a exclusão completa e irreversível dos seus dados pessoais.
      </Text>

      <View style={estilos.acao}>
        <Botao titulo="Solicitar Exclusão da Minha Conta e Dados" variante="perigo" aoPressionar={abrir} />
      </View>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={cancelar}>
        <View style={estilos.fundoModal}>
          <View style={estilos.modal} accessibilityViewIsModal>
            <Pressable
              onPress={cancelar}
              hitSlop={12}
              style={estilos.fechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={24} color={cores.textoSecundario} />
            </Pressable>

            <Ionicons name="warning-outline" size={36} color={cores.primariaEscura} />
            <Text style={estilos.modalTitulo}>{etapa === 1 ? "Excluir conta" : "Última confirmação"}</Text>
            <Text style={estilos.modalTexto}>{etapa === 1 ? TEXTO_ETAPA_1 : TEXTO_ETAPA_2}</Text>

            {erro && <Aviso tipo="erro" texto={erro} />}

            <View style={estilos.modalBotoes}>
              {etapa === 1 ? (
                <Botao titulo="Confirmar Exclusão Definitiva" variante="perigo" aoPressionar={() => setEtapa(2)} />
              ) : (
                <Botao titulo="Sim, excluir tudo" variante="perigo" carregando={excluindo} aoPressionar={confirmarExclusao} />
              )}
              <Botao titulo="Cancelar" variante="secundario" desabilitado={excluindo} aoPressionar={cancelar} />
            </View>
          </View>
        </View>
      </Modal>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, lineHeight: 24, marginTop: 8 },
  acao: { marginTop: 32 },
  fundoModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: cores.fundo, borderRadius: raio + 4, padding: 24, alignItems: "center", gap: 12 },
  fechar: { position: "absolute", top: 12, right: 12 },
  modalTitulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo, color: cores.texto, textAlign: "center" },
  modalTexto: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.texto, textAlign: "center", lineHeight: 24 },
  modalBotoes: { alignSelf: "stretch", gap: 12, marginTop: 8 },
});
