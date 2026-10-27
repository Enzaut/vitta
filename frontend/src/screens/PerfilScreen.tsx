import { StyleSheet, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { Botao } from "../components/Botao";
import { LinhaDado } from "../components/LinhaDado";
import { Tela } from "../components/Tela";
import type { AbaProps } from "../navigation/types";
import { cores, raio } from "../theme";
import { formatarDataBr, mascararTelefone } from "../validation/campos";

type Props = AbaProps<"Perfil">;

const NAO_INFORMADO = "Não informado";

export function PerfilScreen({ navigation }: Props) {
  const { doador, sair } = useAuth();

  return (
    <Tela>
      <View style={estilos.cartao}>
        <LinhaDado rotulo="Nome" valor={doador?.nome ?? ""} />
        <LinhaDado rotulo="E-mail" valor={doador?.email ?? ""} />
        <LinhaDado rotulo="Data de nascimento" valor={doador ? formatarDataBr(doador.dataNascimento) : ""} />
        <LinhaDado rotulo="Telefone" valor={doador?.telefone ? mascararTelefone(doador.telefone) : NAO_INFORMADO} />
        <LinhaDado rotulo="Tipo sanguíneo" valor={doador?.tipoSanguineo ?? NAO_INFORMADO} />
      </View>

      <View style={estilos.botoes}>
        <Botao titulo="Editar dados" aoPressionar={() => navigation.navigate("Dados")} />
        <Botao titulo="Como o VITTA funciona" variante="secundario" aoPressionar={() => navigation.navigate("Apresentacao")} />
        <Botao titulo="Privacidade e Dados" variante="secundario" aoPressionar={() => navigation.navigate("Privacidade")} />
        <Botao titulo="Sair" variante="secundario" aoPressionar={sair} />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 16, marginBottom: 24 },
  botoes: { gap: 12 },
});
