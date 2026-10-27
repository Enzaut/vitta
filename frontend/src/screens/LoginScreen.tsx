import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Campo, type EntradaRef } from "../components/Campo";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, tamanhos } from "../theme";
import { EMAIL_INVALIDO, OBRIGATORIO, emailValido } from "../validation/campos";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;
type Erros = { email?: string; senha?: string };

export function LoginScreen(_: Props) {
  const { entrar } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const senhaRef = useRef<EntradaRef>(null);

  async function enviar() {
    setErroGeral(null);

    const novos: Erros = {};
    if (!email.trim()) novos.email = OBRIGATORIO;
    else if (!emailValido(email)) novos.email = EMAIL_INVALIDO;
    if (!senha) novos.senha = OBRIGATORIO;
    setErros(novos);
    // HU-01, cenário 4: com campo faltando, nem chama o servidor.
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      // Deu certo: o app troca sozinho para a tela inicial.
    } catch (erro) {
      if (erro instanceof ApiError) {
        if (erro.campos) setErros(erro.campos as Erros);
        else setErroGeral(erro.message);
        // HU-01, cenário 3: senha errada (ou conta bloqueada) esvazia o campo e devolve o foco.
        if (erro.status === 401 || erro.status === 429) {
          setSenha("");
          senhaRef.current?.focus();
        }
      } else {
        setErroGeral("Não foi possível entrar. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>Entrar</Text>
      <Text style={estilos.subtitulo}>Use o e-mail e a senha do seu cadastro.</Text>

      {erroGeral && <Aviso tipo="erro" texto={erroGeral} />}

      <Campo
        rotulo="E-mail"
        icone="mail-outline"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setErros((atual) => ({ ...atual, email: undefined }));
        }}
        onBlur={() => {
          if (email.trim() && !emailValido(email)) setErros((atual) => ({ ...atual, email: EMAIL_INVALIDO }));
        }}
        erro={erros.email}
        keyboardType="email-address"
        autoComplete="email"
        autoCorrect={false}
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => senhaRef.current?.focus()}
      />

      <Campo
        ref={senhaRef}
        rotulo="Senha"
        icone="lock-closed-outline"
        ehSenha
        value={senha}
        onChangeText={(t) => {
          setSenha(t);
          setErros((atual) => ({ ...atual, senha: undefined }));
        }}
        erro={erros.senha}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={enviar}
      />

      <Botao titulo="Entrar" aoPressionar={enviar} carregando={enviando} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
});
