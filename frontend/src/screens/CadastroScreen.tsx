import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { BarraForca } from "../components/BarraForca";
import { Botao } from "../components/Botao";
import { Campo, type EntradaRef } from "../components/Campo";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, tamanhos } from "../theme";
import {
  EMAIL_INVALIDO,
  OBRIGATORIO,
  REGRA_SENHA,
  dataParaIso,
  emailValido,
  mascararData,
  senhaAtendeRegra,
} from "../validation/campos";

type Props = NativeStackScreenProps<RootStackParamList, "Cadastro">;
type NomeDoCampo = "nome" | "email" | "dataNascimento" | "senha" | "confirmarSenha";
type Erros = Partial<Record<NomeDoCampo, string>>;

export function CadastroScreen(_: Props) {
  const { cadastrar } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const emailRef = useRef<EntradaRef>(null);
  const dataRef = useRef<EntradaRef>(null);
  const senhaRef = useRef<EntradaRef>(null);
  const confirmarRef = useRef<EntradaRef>(null);

  // Quando a pessoa volta a digitar num campo, o erro dele some.
  function limparErro(campo: NomeDoCampo) {
    setErros(({ [campo]: _removido, ...resto }) => resto);
  }

  function validar(): Erros {
    const novos: Erros = {};
    if (!nome.trim()) novos.nome = OBRIGATORIO;
    else if (nome.trim().length < 3) novos.nome = "Informe seu nome completo.";

    if (!email.trim()) novos.email = OBRIGATORIO;
    else if (!emailValido(email)) novos.email = EMAIL_INVALIDO;

    if (!data) novos.dataNascimento = OBRIGATORIO;
    else if (!dataParaIso(data)) novos.dataNascimento = "Informe uma data de nascimento válida (DD/MM/AAAA).";

    if (!senha) novos.senha = OBRIGATORIO;
    else if (!senhaAtendeRegra(senha)) novos.senha = REGRA_SENHA;

    if (!confirmar) novos.confirmarSenha = OBRIGATORIO;
    else if (confirmar !== senha) novos.confirmarSenha = "As senhas não coincidem.";
    return novos;
  }

  async function enviar() {
    setErroGeral(null);
    const novos = validar();
    setErros(novos);
    // HU-01, cenário 4: com campo faltando, nem chama o servidor.
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    try {
      await cadastrar({
        nome: nome.trim(),
        email: email.trim(),
        dataNascimento: dataParaIso(data)!,
        senha,
        confirmarSenha: confirmar,
      });
      // Deu certo: o app troca sozinho para a tela inicial (a pessoa já entra logada).
    } catch (erro) {
      if (erro instanceof ApiError && erro.campos) setErros(erro.campos as Erros);
      else setErroGeral(erro instanceof ApiError ? erro.message : "Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>Criar conta</Text>
      <Text style={estilos.subtitulo}>Informe seus dados para começar a doar.</Text>

      {erroGeral && <Aviso tipo="erro" texto={erroGeral} />}

      <Campo
        rotulo="Nome Completo"
        icone="person-outline"
        value={nome}
        onChangeText={(t) => {
          setNome(t);
          limparErro("nome");
        }}
        erro={erros.nome}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />

      <Campo
        ref={emailRef}
        rotulo="E-mail"
        icone="mail-outline"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          limparErro("email");
        }}
        // HU-01, cenário 6: o formato do e-mail é conferido ao sair do campo.
        onBlur={() => {
          if (email.trim() && !emailValido(email)) setErros((atual) => ({ ...atual, email: EMAIL_INVALIDO }));
        }}
        erro={erros.email}
        keyboardType="email-address"
        autoComplete="email"
        autoCorrect={false}
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => dataRef.current?.focus()}
      />

      <Campo
        ref={dataRef}
        rotulo="Data de Nascimento"
        icone="calendar-outline"
        placeholder="DD/MM/AAAA"
        value={data}
        onChangeText={(t) => {
          setData(mascararData(t));
          limparErro("dataNascimento");
        }}
        erro={erros.dataNascimento}
        keyboardType="number-pad"
        maxLength={10}
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
          limparErro("senha");
        }}
        erro={erros.senha}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmarRef.current?.focus()}
      />
      <BarraForca senha={senha} />
      {!erros.senha && <Text style={estilos.dica}>{REGRA_SENHA}</Text>}

      <Campo
        ref={confirmarRef}
        rotulo="Confirmar Senha"
        icone="lock-closed-outline"
        ehSenha
        value={confirmar}
        onChangeText={(t) => {
          setConfirmar(t);
          limparErro("confirmarSenha");
        }}
        erro={erros.confirmarSenha}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={enviar}
      />

      <Botao titulo="Cadastrar" aoPressionar={enviar} carregando={enviando} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
  dica: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, marginTop: -8, marginBottom: 16 },
});
