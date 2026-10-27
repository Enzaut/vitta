import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Campo } from "../components/Campo";
import { LinhaDado } from "../components/LinhaDado";
import { SeletorTipoSanguineo } from "../components/SeletorTipoSanguineo";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { MSG_TELEFONE, mascararTelefone, telefoneValido } from "../validation/campos";

type Props = NativeStackScreenProps<RootStackParamList, "Dados">;
type Erros = { telefone?: string; tipoSanguineo?: string };

// HU-11: o doador vê e altera o telefone e o tipo sanguíneo.
// Nome e e-mail só aparecem aqui (vêm do cadastro).
export function DadosScreen(_: Props) {
  const { doador, atualizarPerfil } = useAuth();

  // O que está salvo hoje. Depois de salvar, o doador do contexto é atualizado e estes valores acompanham.
  const salvoTelefone = doador?.telefone ? mascararTelefone(doador.telefone) : "";
  const salvoTipo = doador?.tipoSanguineo ?? null;

  const [telefone, setTelefone] = useState(salvoTelefone);
  const [tipo, setTipo] = useState<string | null>(salvoTipo);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const mudou = telefone !== salvoTelefone || tipo !== salvoTipo;

  async function salvar() {
    setErroGeral(null);
    setSucesso(false);

    const novos: Erros = {};
    if (telefone.trim() && !telefoneValido(telefone)) novos.telefone = MSG_TELEFONE;
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setSalvando(true);
    try {
      // Telefone vazio apaga o dado; tipo nulo também.
      await atualizarPerfil({ telefone: telefone.trim() ? telefone : null, tipoSanguineo: tipo });
      setSucesso(true);
    } catch (erro) {
      if (erro instanceof ApiError && (erro.campos?.telefone || erro.campos?.tipoSanguineo)) {
        setErros({ telefone: erro.campos.telefone, tipoSanguineo: erro.campos.tipoSanguineo });
      } else {
        setErroGeral(erro instanceof ApiError ? erro.message : "Não foi possível salvar. Tente novamente.");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>Meus dados</Text>
      <Text style={estilos.subtitulo}>Mantenha seu telefone e seu tipo sanguíneo em dia.</Text>

      {sucesso && <Aviso tipo="sucesso" texto="Dados atualizados com sucesso." aoFechar={() => setSucesso(false)} />}
      {erroGeral && <Aviso tipo="erro" texto={erroGeral} />}

      <View style={estilos.cartao}>
        <LinhaDado rotulo="Nome" valor={doador?.nome ?? ""} />
        <LinhaDado rotulo="E-mail" valor={doador?.email ?? ""} />
        <Text style={estilos.nota}>Nome e e-mail vêm do cadastro e não podem ser alterados aqui.</Text>
      </View>

      <Campo
        rotulo="Telefone"
        icone="call-outline"
        placeholder="(00) 00000-0000"
        value={telefone}
        onChangeText={(t) => {
          setTelefone(mascararTelefone(t));
          setErros((atual) => ({ ...atual, telefone: undefined }));
          setSucesso(false);
        }}
        // O formato é conferido ao sair do campo.
        onBlur={() => {
          if (telefone.trim() && !telefoneValido(telefone)) setErros((atual) => ({ ...atual, telefone: MSG_TELEFONE }));
        }}
        erro={erros.telefone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={15}
        returnKeyType="done"
      />

      <SeletorTipoSanguineo
        valor={tipo}
        aoMudar={(novo) => {
          setTipo(novo);
          setErros((atual) => ({ ...atual, tipoSanguineo: undefined }));
          setSucesso(false);
        }}
        erro={erros.tipoSanguineo}
      />

      <Botao titulo="Salvar alterações" aoPressionar={salvar} carregando={salvando} desabilitado={!mudou} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 12, marginBottom: 24 },
  nota: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario },
});
