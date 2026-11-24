import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ApiError } from "../api/client";
import { Aviso } from "../components/Aviso";
import { BarraForca } from "../components/BarraForca";
import { Botao } from "../components/Botao";
import { Campo, type EntradaRef } from "../components/Campo";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, tamanhos } from "../theme";
import {
  EMAIL_INVALIDO,
  MSG_CNPJ,
  MSG_TELEFONE,
  OBRIGATORIO,
  REGRA_SENHA,
  cnpjValido,
  emailValido,
  mascararCnpj,
  mascararTelefone,
  senhaAtendeRegra,
  telefoneValido,
} from "../validation/campos";
import { useInstituicao } from "./InstituicaoContext";

type Props = NativeStackScreenProps<RootStackParamList, "CadastroInstituicao">;
type NomeDoCampo = "nome" | "cnpj" | "email" | "telefone" | "senha" | "confirmarSenha";
type Erros = Partial<Record<NomeDoCampo, string>>;

// Cadastro de quem representa uma instituição de coleta de sangue.
export function CadastroInstituicaoScreen(_: Props) {
  const { cadastrar } = useInstituicao();

  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cnpjRef = useRef<EntradaRef>(null);
  const emailRef = useRef<EntradaRef>(null);
  const telefoneRef = useRef<EntradaRef>(null);
  const senhaRef = useRef<EntradaRef>(null);
  const confirmarRef = useRef<EntradaRef>(null);

  function limparErro(campo: NomeDoCampo) {
    setErros(({ [campo]: _removido, ...resto }) => resto);
  }

  function validar(): Erros {
    const novos: Erros = {};
    if (!nome.trim()) novos.nome = OBRIGATORIO;
    else if (nome.trim().length < 3) novos.nome = "Informe o nome da instituição.";

    if (!cnpj) novos.cnpj = OBRIGATORIO;
    else if (!cnpjValido(cnpj)) novos.cnpj = MSG_CNPJ;

    if (!email.trim()) novos.email = OBRIGATORIO;
    else if (!emailValido(email)) novos.email = EMAIL_INVALIDO;

    if (telefone && !telefoneValido(telefone)) novos.telefone = MSG_TELEFONE;

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
    // Com campo faltando ou inválido, nem chama o servidor.
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    try {
      await cadastrar({
        nome: nome.trim(),
        cnpj,
        email: email.trim(),
        ...(telefone && { telefone }),
        senha,
        confirmarSenha: confirmar,
      });
      // Deu certo: o app troca sozinho para o painel da instituição.
    } catch (erro) {
      if (erro instanceof ApiError && erro.campos) setErros(erro.campos as Erros);
      else setErroGeral(erro instanceof ApiError ? erro.message : "Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>Cadastrar instituição</Text>
      <Text style={estilos.subtitulo}>Crie a conta para pedir a inclusão no mapa e criar campanhas de doação.</Text>

      {erroGeral && <Aviso tipo="erro" texto={erroGeral} />}

      <Campo
        rotulo="Nome da instituição"
        icone="business-outline"
        value={nome}
        onChangeText={(t) => {
          setNome(t);
          limparErro("nome");
        }}
        erro={erros.nome}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => cnpjRef.current?.focus()}
      />

      <Campo
        ref={cnpjRef}
        rotulo="CNPJ"
        icone="document-text-outline"
        placeholder="00.000.000/0000-00"
        value={cnpj}
        onChangeText={(t) => {
          setCnpj(mascararCnpj(t));
          limparErro("cnpj");
        }}
        erro={erros.cnpj}
        keyboardType="number-pad"
        maxLength={18}
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
        onBlur={() => {
          if (email.trim() && !emailValido(email)) setErros((atual) => ({ ...atual, email: EMAIL_INVALIDO }));
        }}
        erro={erros.email}
        keyboardType="email-address"
        autoComplete="email"
        autoCorrect={false}
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => telefoneRef.current?.focus()}
      />

      <Campo
        ref={telefoneRef}
        rotulo="Telefone (opcional)"
        icone="call-outline"
        placeholder="(61) 3327-4413"
        value={telefone}
        onChangeText={(t) => {
          setTelefone(mascararTelefone(t));
          limparErro("telefone");
        }}
        erro={erros.telefone}
        keyboardType="phone-pad"
        maxLength={15}
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

      <Botao titulo="Cadastrar instituição" aoPressionar={enviar} carregando={enviando} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
  dica: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, marginTop: -8, marginBottom: 16 },
});
