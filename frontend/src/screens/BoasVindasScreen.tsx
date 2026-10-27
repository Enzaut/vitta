import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import { API_URL } from "../config";
import { useServidor } from "../hooks/useServidor";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, tamanhos } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "BoasVindas">;

export function BoasVindasScreen({ navigation }: Props) {
  const { aviso, limparAviso } = useAuth();
  const { estado, verificar } = useServidor();

  const textoServidor =
    estado === "ok"
      ? "Servidor conectado"
      : estado === "erro"
        ? "Sem conexão com o servidor. Toque para tentar de novo."
        : estado === "acordando"
          ? "Acordando o servidor, pode levar até 1 minuto..."
          : "Verificando o servidor...";
  const corServidor = estado === "ok" ? cores.sucesso : estado === "erro" ? cores.erro : cores.textoSecundario;

  return (
    <Tela comTopo centralizar>
      <View style={estilos.marca}>
        <View style={estilos.logo}>
          <Ionicons name="water" size={46} color="#FFFFFF" />
        </View>
        <Text style={estilos.nome}>VITTA</Text>
        <Text style={estilos.slogan}>Incentivo à doação de sangue</Text>
      </View>

      {aviso && <Aviso tipo={aviso.tipo} texto={aviso.texto} aoFechar={limparAviso} />}

      <View style={estilos.botoes}>
        <Botao titulo="Criar Conta" aoPressionar={() => navigation.navigate("Cadastro")} />
        <Botao titulo="Já tenho uma conta — Entrar" variante="secundario" aoPressionar={() => navigation.navigate("Login")} />
      </View>

      <Pressable
        onPress={verificar}
        style={estilos.servidor}
        accessibilityRole="button"
        accessibilityLabel={textoServidor}
      >
        <View style={[estilos.ponto, { backgroundColor: corServidor }]} />
        <Text style={[estilos.servidorTexto, { color: corServidor }]}>{textoServidor}</Text>
      </Pressable>

      {__DEV__ && <Text style={estilos.dev}>API: {API_URL || "não configurada (veja frontend/.env)"}</Text>}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  marca: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: cores.primaria,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  nome: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.primariaEscura, letterSpacing: 2 },
  slogan: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4 },
  botoes: { gap: 12 },
  servidor: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 28, padding: 8 },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  servidorTexto: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario },
  dev: { fontFamily: fontes.texto, fontSize: 12, color: cores.textoSecundario, textAlign: "center" },
});
